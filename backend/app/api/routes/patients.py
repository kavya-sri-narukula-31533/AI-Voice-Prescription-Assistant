from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user, require_doctor_or_admin
from app.models.user import User
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("", response_model=list[PatientResponse])
async def list_patients(
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_doctor_or_admin),
):
    query = select(Patient)
    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                Patient.full_name.ilike(like),
                Patient.phone.ilike(like),
                Patient.email.ilike(like),
            )
        )
    query = query.offset(skip).limit(limit).order_by(Patient.full_name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    payload: PatientCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_doctor_or_admin),
):
    patient = Patient(**payload.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Patients can only view their own profile
    if current_user.role.value == "patient" and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_doctor_or_admin),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)

    await db.commit()
    await db.refresh(patient)
    return patient


@router.get("/count/total")
async def count_patients(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_doctor_or_admin),
):
    result = await db.execute(select(func.count(Patient.id)))
    return {"total": result.scalar()}
