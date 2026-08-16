from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.patient import Gender


class PatientCreate(BaseModel):
    full_name: str
    age: Optional[int] = None
    gender: Optional[Gender] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    medical_history: Optional[str] = None


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Gender] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    medical_history: Optional[str] = None


class PatientResponse(BaseModel):
    id: str
    full_name: str
    age: Optional[int]
    gender: Optional[Gender]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    blood_group: Optional[str]
    allergies: Optional[str]
    chronic_conditions: Optional[str]
    medical_history: Optional[str]
    user_id: Optional[str]

    class Config:
        from_attributes = True
