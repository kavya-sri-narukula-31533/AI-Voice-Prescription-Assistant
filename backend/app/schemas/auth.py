from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: UserRole
    full_name: str


class RefreshRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    phone: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class DoctorRegisterRequest(RegisterRequest):
    role: UserRole = UserRole.DOCTOR
    specialization: str
    hospital: str | None = None
    registration_number: str
    qualifications: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ── Profile update schemas ────────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    """Fields shared by all roles."""
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UpdateDoctorProfileRequest(UpdateProfileRequest):
    specialization: Optional[str] = None
    hospital: Optional[str] = None
    registration_number: Optional[str] = None
    qualifications: Optional[str] = None


class UpdatePharmacistProfileRequest(UpdateProfileRequest):
    """Pharmacist-specific extended fields stored on User + extra metadata."""
    pharmacy_name: Optional[str] = None
    license_number: Optional[str] = None
    address: Optional[str] = None


class UpdatePatientProfileRequest(UpdateProfileRequest):
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    address: Optional[str] = None


class DoctorProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str]
    profile_picture: Optional[str]
    is_active: bool
    # Doctor-specific
    specialization: Optional[str]
    hospital: Optional[str]
    registration_number: Optional[str]
    qualifications: Optional[str]

    class Config:
        from_attributes = True


class PharmacistProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str]
    profile_picture: Optional[str]
    is_active: bool
    # Pharmacist metadata stored in user extra fields via JSON — here we pass through
    pharmacy_name: Optional[str] = None
    license_number: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True


class PatientProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str]
    profile_picture: Optional[str]
    is_active: bool
    # Patient-specific
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True
