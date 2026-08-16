from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.deps import require_doctor_or_admin
from app.models.user import User
from app.models.prescription import Prescription, PrescriptionMedicine, PrescriptionStatus
from app.models.patient import Patient

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_doctor_or_admin),
):
    """Return overview stats for the doctor dashboard."""
    # Total prescriptions
    total_rx = await db.execute(select(func.count(Prescription.id)))
    total_patients = await db.execute(select(func.count(Patient.id)))

    # By status
    status_counts = await db.execute(
        select(Prescription.status, func.count(Prescription.id))
        .group_by(Prescription.status)
    )
    status_map = {s.value: c for s, c in status_counts.all()}

    # Top 10 prescribed medicines
    top_meds = await db.execute(
        select(PrescriptionMedicine.medicine_name, func.count(PrescriptionMedicine.id).label("count"))
        .group_by(PrescriptionMedicine.medicine_name)
        .order_by(desc("count"))
        .limit(10)
    )

    # Prescriptions per day (last 30 days)
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import cast, Date
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    daily = await db.execute(
        select(
            cast(Prescription.created_at, Date).label("date"),
            func.count(Prescription.id).label("count")
        )
        .where(Prescription.created_at >= thirty_days_ago)
        .group_by("date")
        .order_by("date")
    )

    return {
        "total_prescriptions": total_rx.scalar(),
        "total_patients": total_patients.scalar(),
        "by_status": status_map,
        "top_medicines": [
            {"name": name, "count": count} for name, count in top_meds.all()
        ],
        "daily_prescriptions": [
            {"date": str(date), "count": count} for date, count in daily.all()
        ],
    }


@router.get("/audit-logs")
async def get_audit_logs(
    resource_id: str = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_doctor_or_admin),
):
    from app.models.audit_log import AuditLog
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit)
    if resource_id:
        query = query.where(AuditLog.resource_id == resource_id)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "changes": log.changes,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]
