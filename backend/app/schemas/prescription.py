from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.prescription import PrescriptionStatus


class MedicineCreate(BaseModel):
    medicine_name: str
    generic_name: Optional[str] = None
    strength: Optional[str] = None
    quantity: Optional[int] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    sort_order: int = 0


class MedicineResponse(MedicineCreate):
    id: str
    patient_instructions: Optional[str] = None
    is_available: Optional[bool] = None

    class Config:
        from_attributes = True


class PrescriptionCreate(BaseModel):
    patient_id: str
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    medicines: List[MedicineCreate] = []
    voice_transcript: Optional[str] = None


class PrescriptionUpdate(BaseModel):
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    medicines: Optional[List[MedicineCreate]] = None


class PrescriptionApprove(BaseModel):
    notes: Optional[str] = None


class PharmacistUpdate(BaseModel):
    status: PrescriptionStatus
    pharmacist_notes: Optional[str] = None
    medicine_availability: Optional[dict] = None  # {medicine_id: bool}

class PatientResponse(BaseModel):
    id: str
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None

    class Config:
        from_attributes = True

class PrescriptionResponse(BaseModel):
    id: str
    patient_id: str
    patient: Optional[PatientResponse] = None
    doctor_id: str
    status: PrescriptionStatus
    diagnosis: Optional[str]
    notes: Optional[str]
    voice_transcript: Optional[str]
    ai_summary: Optional[str]
    drug_interaction_warnings: Optional[list]
    qr_code_url: Optional[str]
    pdf_url: Optional[str]
    pharmacist_notes: Optional[str]
    medicines: List[MedicineResponse] = []
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime]
    dispensed_at: Optional[datetime]

    class Config:
        from_attributes = True

class VoiceTranscriptRequest(BaseModel):
    transcript: str
    language: str = "en"

class NLPExtractionResponse(BaseModel):
    patient_name: Optional[str] = None
    medicines: List[MedicineCreate] = []
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    confidence_score: float = 0.0
    warnings: List[str] = []
