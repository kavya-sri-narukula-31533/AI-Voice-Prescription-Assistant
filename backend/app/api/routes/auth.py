from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.pharmacist import Pharmacist
from app.schemas.auth import (
    LoginRequest, TokenResponse, RefreshRequest,
    DoctorRegisterRequest, RegisterRequest, ChangePasswordRequest,
    UpdateDoctorProfileRequest, UpdatePharmacistProfileRequest, UpdatePatientProfileRequest,
    DoctorProfileResponse, PharmacistProfileResponse, PatientProfileResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        phone=payload.phone,
    )
    db.add(user)
    await db.flush()

    # Create role-specific profile
    if payload.role == UserRole.PATIENT:
        patient = Patient(user_id=user.id, full_name=payload.full_name, phone=payload.phone)
        db.add(patient)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
    )


@router.post("/register/doctor", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_doctor(payload: DoctorRegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.DOCTOR,
        phone=payload.phone,
    )
    db.add(user)
    await db.flush()

    doctor = Doctor(
        user_id=user.id,
        specialization=payload.specialization,
        hospital=payload.hospital,
        registration_number=payload.registration_number,
        qualifications=payload.qualifications,
    )
    db.add(doctor)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email == payload.email)
    )
    user = result.scalar_one_or_none()

    

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    access_token = create_access_token(
        {"sub": user.id, "role": user.role}
    )
    refresh_token = create_refresh_token(
        {"sub": user.id, "role": user.role}
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.refresh_token)
    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid token type")

    user_id = token_data.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({"sub": user.id, "role": user.role})
    new_refresh = create_refresh_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
    )


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone": current_user.phone,
        "profile_picture": current_user.profile_picture,
        "is_active": current_user.is_active,
    }


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


# ── Profile endpoints ─────────────────────────────────────────────────────────

@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return full profile including role-specific fields."""
    base = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone": current_user.phone,
        "profile_picture": current_user.profile_picture,
        "is_active": current_user.is_active,
    }

    if current_user.role == UserRole.DOCTOR:
        result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
        doc = result.scalar_one_or_none()
        base.update({
            "specialization": doc.specialization if doc else None,
            "hospital": doc.hospital if doc else None,
            "registration_number": doc.registration_number if doc else None,
            "qualifications": doc.qualifications if doc else None,
        })

    elif current_user.role == UserRole.PHARMACIST:
        result = await db.execute(select(Pharmacist).where(Pharmacist.user_id == current_user.id))
        ph = result.scalar_one_or_none()
        base.update({
            "pharmacy_name": ph.pharmacy_name if ph else None,
            "license_number": ph.license_number if ph else None,
            "address": ph.address if ph else None,
        })

    elif current_user.role == UserRole.PATIENT:
        result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        patient = result.scalar_one_or_none()
        base.update({
            "age": patient.age if patient else None,
            "gender": patient.gender if patient else None,
            "blood_group": patient.blood_group if patient else None,
            "allergies": patient.allergies if patient else None,
            "address": patient.address if patient else None,
        })

    return base


@router.put("/profile")
async def update_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile for any role."""
    payload = await request.json()
    # Update base user fields
    if "full_name" in payload and payload["full_name"]:
        current_user.full_name = payload["full_name"]
    if "phone" in payload:
        current_user.phone = payload["phone"]
    await db.flush()

    if current_user.role == UserRole.DOCTOR:
        result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
        doc = result.scalar_one_or_none()
        if doc:
            for field in ("specialization", "hospital", "registration_number", "qualifications"):
                if field in payload and payload[field] is not None:
                    setattr(doc, field, payload[field])

    elif current_user.role == UserRole.PHARMACIST:
        result = await db.execute(select(Pharmacist).where(Pharmacist.user_id == current_user.id))
        ph = result.scalar_one_or_none()
        if not ph:
            ph = Pharmacist(user_id=current_user.id)
            db.add(ph)
            await db.flush()
        for field in ("pharmacy_name", "license_number", "address"):
            if field in payload:
                setattr(ph, field, payload[field])

    elif current_user.role == UserRole.PATIENT:
        result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        patient = result.scalar_one_or_none()
        if patient:
            for field in ("age", "gender", "blood_group", "allergies", "address"):
                if field in payload:
                    setattr(patient, field, payload[field])
            # Keep full_name in sync
            if "full_name" in payload and payload["full_name"]:
                patient.full_name = payload["full_name"]

    await db.commit()
    await db.refresh(current_user)

    # Return updated profile
    return await get_profile(current_user=current_user, db=db)
