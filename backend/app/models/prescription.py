import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, Text, DateTime, Enum as SAEnum, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class PrescriptionStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    SENT_TO_PHARMACY = "sent_to_pharmacy"
    PREPARING = "preparing"
    READY = "ready"
    DISPENSED = "dispensed"
    CANCELLED = "cancelled"


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    doctor_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[PrescriptionStatus] = mapped_column(
        SAEnum(PrescriptionStatus), default=PrescriptionStatus.DRAFT, nullable=False
    )
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    voice_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI-generated content
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    drug_interaction_warnings: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # QR code and PDF
    qr_code_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Pharmacy fields
    pharmacist_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    dispensed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="prescriptions")
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="prescriptions")
    medicines: Mapped[list["PrescriptionMedicine"]] = relationship(
        "PrescriptionMedicine", back_populates="prescription", cascade="all, delete-orphan"
    )


class PrescriptionMedicine(Base):
    __tablename__ = "prescription_medicines"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    prescription_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    generic_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    strength: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "500mg"
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dosage: Mapped[str | None] = mapped_column(String(255), nullable=True)  # e.g. "1 tablet"
    frequency: Mapped[str | None] = mapped_column(String(255), nullable=True)  # e.g. "twice daily"
    duration: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "5 days"
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)  # e.g. "after food"
    patient_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)  # AI-generated friendly text
    is_available: Mapped[bool | None] = mapped_column(default=None, nullable=True)  # Pharmacist marks
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    prescription: Mapped["Prescription"] = relationship("Prescription", back_populates="medicines")
