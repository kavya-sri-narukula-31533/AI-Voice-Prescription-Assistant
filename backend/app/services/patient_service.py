from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import Patient
from app.schemas.patient import PatientCreate


async def create_patient(db: AsyncSession, patient: PatientCreate):
    db_patient = Patient(**patient.model_dump())

    db.add(db_patient)

    await db.commit()

    await db.refresh(db_patient)

    return db_patient