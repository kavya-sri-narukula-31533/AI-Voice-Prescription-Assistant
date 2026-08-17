import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
import io

from app.core.database import get_db
from app.core.deps import get_current_user, require_doctor, require_pharmacist
from app.models.user import User, UserRole
from app.models.prescription import Prescription, PrescriptionMedicine, PrescriptionStatus
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.audit_log import AuditLog
from app.schemas.prescription import (
    PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse,
    PharmacistUpdate, VoiceTranscriptRequest, NLPExtractionResponse,
    MedicineCreate
)
from app.ai.speech_to_text import speech_service
from app.ai.nlp_extractor import nlp_extractor
from app.utils.pdf_generator import generate_prescription_pdf, generate_qr_code
from app.utils.storage import storage_service

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


async def _get_prescription_with_relations(
    prescription_id: str, db: AsyncSession
) -> Prescription:
    result = await db.execute(
        select(Prescription)
        .options(
            selectinload(Prescription.medicines),
            selectinload(Prescription.patient),
            selectinload(Prescription.doctor).selectinload(Doctor.user),
        )
        .where(Prescription.id == prescription_id)
    )
    prescription = result.scalar_one_or_none()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription


def _log_audit(db: AsyncSession, user_id: str, action: str, resource_id: str, changes: dict = None):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type="prescription",
        resource_id=resource_id,
        changes=changes,
    )
    db.add(log)


# ── Voice Transcription ──────────────────────────────────────────────────────

@router.post("/transcribe", response_model=dict)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("en"),
    _: User = Depends(require_doctor),
):
    """Upload audio and receive transcript."""
    audio_bytes = await audio.read()
    if len(audio_bytes) > 25 * 1024 * 1024:  # 25 MB limit
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    result = await speech_service.transcribe_audio(
    audio_bytes,
    language,
    use_local=True
)

    return result


@router.post("/extract-nlp", response_model=NLPExtractionResponse)
async def extract_prescription_from_text(
    payload: VoiceTranscriptRequest,
    _: User = Depends(require_doctor),
):
    """Extract structured prescription from transcript text."""
    return await nlp_extractor.extract(payload.transcript, payload.language)


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    payload: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor),
):
    # Get doctor profile
    result = await db.execute(
        select(Doctor).where(Doctor.user_id == current_user.id)
    )
    doctor = result.scalar_one_or_none()

    if not doctor:
        raise HTTPException(
            status_code=400,
            detail="Doctor profile not found"
        )

    # Check patient
    result = await db.execute(
        select(Patient).where(Patient.id == payload.patient_id)
    )

    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    # Create prescription
    prescription = Prescription(
        patient_id=payload.patient_id,
        doctor_id=doctor.id,
        diagnosis=payload.diagnosis,
        notes=payload.notes,
        voice_transcript=payload.voice_transcript,
        status=PrescriptionStatus.DRAFT,
    )

    db.add(prescription)
    await db.flush()

    print("TOTAL MEDICINES:", len(payload.medicines))

    # Save medicines
    for idx, med_data in enumerate(payload.medicines):

        print("Saving:", med_data.medicine_name)

        medicine_data = med_data.model_dump(
            exclude={"sort_order"}
        )

        medicine = PrescriptionMedicine(
            prescription_id=prescription.id,
            sort_order=idx,
            **medicine_data
        )

        try:
            medicine.patient_instructions = (
                await nlp_extractor.generate_patient_instructions(
                    med_data
                )
            )
        except Exception:
            pass

        db.add(medicine)

    await db.flush()

    # Verify medicines were saved
    result = await db.execute(
        select(PrescriptionMedicine).where(
            PrescriptionMedicine.prescription_id == prescription.id
        )
    )

    medicines = result.scalars().all()

    print("TOTAL SAVED:", len(medicines))

    # AI Summary
    if payload.voice_transcript:
        try:
            prescription.ai_summary = (
                await nlp_extractor.generate_summary(
                    payload.voice_transcript,
                    payload.medicines
                )
            )
        except Exception:
            pass

    _log_audit(
        db,
        current_user.id,
        "create",
        prescription.id,
    )

    await db.commit()

    return await _get_prescription_with_relations(
        prescription.id,
        db
    )

@router.get("", response_model=list[PrescriptionResponse])
async def list_prescriptions(
    patient_id: Optional[str] = None,
    status: Optional[PrescriptionStatus] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Prescription).options(
        selectinload(Prescription.medicines),
        selectinload(Prescription.patient),
        selectinload(Prescription.doctor),
    )

    if current_user.role == UserRole.DOCTOR:
        result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
        doctor = result.scalar_one_or_none()
        if doctor:
            query = query.where(Prescription.doctor_id == doctor.id)

    elif current_user.role == UserRole.PATIENT:
        result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        patient = result.scalar_one_or_none()
        if patient:
            query = query.where(Prescription.patient_id == patient.id)

    elif current_user.role == UserRole.PHARMACIST:
        # Pharmacists see all approved/sent prescriptions
        query = query.where(
            Prescription.status.in_([
                PrescriptionStatus.SENT_TO_PHARMACY,
                PrescriptionStatus.PREPARING,
                PrescriptionStatus.READY,
                PrescriptionStatus.DISPENSED,
            ])
        )

    if patient_id:
        query = query.where(Prescription.patient_id == patient_id)
    if status:
        query = query.where(Prescription.status == status)

    query = query.order_by(Prescription.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_prescription_with_relations(prescription_id, db)


@router.put("/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription(
    prescription_id: str,
    payload: PrescriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor),
):
    prescription = await _get_prescription_with_relations(prescription_id, db)

    if prescription.status not in (PrescriptionStatus.DRAFT,):
        raise HTTPException(status_code=400, detail="Only draft prescriptions can be edited")

    if payload.diagnosis is not None:
        prescription.diagnosis = payload.diagnosis
    if payload.notes is not None:
        prescription.notes = payload.notes

    if payload.medicines is not None:
    # Delete old medicines
         for med in prescription.medicines:
             await db.delete(med)

    await db.flush()

    # Add new medicines
    for idx, med_data in enumerate(payload.medicines):
        medicine_data = med_data.model_dump(exclude={"sort_order"})

        med = PrescriptionMedicine(
            prescription_id=prescription.id,
            sort_order=idx,
            **medicine_data,
        )

        try:
            med.patient_instructions = await nlp_extractor.generate_patient_instructions(med_data)
        except Exception:
            pass

        db.add(med)

    _log_audit(db, current_user.id, "update", prescription_id)
    await db.commit()
    return await _get_prescription_with_relations(prescription_id, db)


# ── Approval ─────────────────────────────────────────────────────────────────

@router.post("/{prescription_id}/approve", response_model=PrescriptionResponse)
async def approve_prescription(
    prescription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor),
):
    """Doctor approves and sends prescription to pharmacy."""
    prescription = await _get_prescription_with_relations(prescription_id, db)

    if prescription.status != PrescriptionStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft prescriptions can be approved")

    if not prescription.medicines:
        raise HTTPException(status_code=400, detail="Cannot approve prescription with no medicines")

    prescription.status = PrescriptionStatus.SENT_TO_PHARMACY
    prescription.approved_at = datetime.now(timezone.utc)

    # Generate QR code
    try:
        qr_data = f"RX:{prescription_id}|PT:{prescription.patient_id}|DR:{prescription.doctor_id}"
        qr_bytes = generate_qr_code(qr_data)
        qr_filename = f"qr_{prescription_id}.png"
        prescription.qr_code_url = await storage_service.upload_file(
            qr_bytes, qr_filename, "image/png", "qrcodes"
        )
    except Exception as e:
        pass  # Non-critical

    _log_audit(db, current_user.id, "approve", prescription_id)
    await db.commit()
    return await _get_prescription_with_relations(prescription_id, db)


# ── Pharmacist Actions ────────────────────────────────────────────────────────

@router.patch("/{prescription_id}/pharmacy-status", response_model=PrescriptionResponse)
async def update_pharmacy_status(
    prescription_id: str,
    payload: PharmacistUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pharmacist),
):
    prescription = await _get_prescription_with_relations(prescription_id, db)

    prescription.status = payload.status
    if payload.pharmacist_notes:
        prescription.pharmacist_notes = payload.pharmacist_notes

    if payload.status == PrescriptionStatus.DISPENSED:
        prescription.dispensed_at = datetime.now(timezone.utc)

    if payload.medicine_availability:
        for med in prescription.medicines:
            if med.id in payload.medicine_availability:
                med.is_available = payload.medicine_availability[med.id]

    _log_audit(db, current_user.id, f"pharmacy_{payload.status.value}", prescription_id)
    await db.commit()
    return await _get_prescription_with_relations(prescription_id, db)


# ── PDF Download ──────────────────────────────────────────────────────────────

@router.get("/{prescription_id}/pdf")
async def download_pdf(
    prescription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prescription = await _get_prescription_with_relations(prescription_id, db)

    pdf_data = {
        "id": prescription.id,
        "created_at": prescription.created_at,
        "diagnosis": prescription.diagnosis,
        "notes": prescription.notes,
        "ai_summary": prescription.ai_summary,
        "doctor": {
            "name": prescription.doctor.user.full_name if prescription.doctor and prescription.doctor.user else "N/A",
            "specialization": prescription.doctor.specialization if prescription.doctor else "",
            "hospital": prescription.doctor.hospital if prescription.doctor else "",
            "registration_number": prescription.doctor.registration_number if prescription.doctor else "",
        },
        "patient": {
            "full_name": prescription.patient.full_name if prescription.patient else "N/A",
            "age": prescription.patient.age if prescription.patient else None,
            "gender": prescription.patient.gender.value if prescription.patient and prescription.patient.gender else None,
            "phone": prescription.patient.phone if prescription.patient else None,
            "blood_group": prescription.patient.blood_group if prescription.patient else None,
        },
        "medicines": [
            {
                "medicine_name": m.medicine_name,
                "strength": m.strength,
                "quantity": m.quantity,
                "dosage": m.dosage,
                "frequency": m.frequency,
                "duration": m.duration,
                "instructions": m.instructions,
                "patient_instructions": m.patient_instructions,
            }
            for m in sorted(prescription.medicines, key=lambda x: x.sort_order)
        ],
    }

    pdf_bytes = generate_prescription_pdf(pdf_data)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="prescription_{prescription_id[:8]}.pdf"'},
    )
