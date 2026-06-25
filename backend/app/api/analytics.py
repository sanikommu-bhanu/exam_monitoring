"""Analytics API"""
from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlalchemy import func
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.database import get_db
from models.user import User, UserRole
from app.api.auth import require_admin

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_analytics(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db)
):
    from models.exam import Exam, ExamSession, ExamStatus
    from models.alert import Alert, AlertType
    from datetime import datetime, timedelta
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    
    total_students = (await session.exec(select(func.count(User.id)).where(User.role == UserRole.STUDENT))).first() or 0
    active_exams = (await session.exec(select(func.count(Exam.id)).where(Exam.status == ExamStatus.ACTIVE))).first() or 0
    alerts_today = (await session.exec(select(func.count(Alert.id)).where(Alert.created_at >= today))).first() or 0
    alerts_yesterday = (await session.exec(select(func.count(Alert.id)).where(Alert.created_at >= yesterday, Alert.created_at < today))).first() or 0
    high_risk_sessions = (await session.exec(select(func.count(ExamSession.id)).where(ExamSession.risk_level.in_(["high", "critical"])))).first() or 0
    
    # Violation breakdown
    looking_away = (await session.exec(select(func.count(Alert.id)).where(Alert.alert_type == AlertType.LOOKING_AWAY))).first() or 0
    phone_detected = (await session.exec(select(func.count(Alert.id)).where(Alert.alert_type == AlertType.PHONE_DETECTED))).first() or 0
    multiple_persons = (await session.exec(select(func.count(Alert.id)).where(Alert.alert_type == AlertType.MULTIPLE_PERSONS))).first() or 0
    head_movement = (await session.exec(select(func.count(Alert.id)).where(Alert.alert_type == AlertType.EXCESSIVE_HEAD_MOVEMENT))).first() or 0
    
    total_violations = looking_away + phone_detected + multiple_persons + head_movement
    
    return {
        "overview": {
            "total_students": total_students,
            "active_exams": active_exams,
            "alerts_generated": alerts_today,
            "alerts_change_pct": round(((alerts_today - alerts_yesterday) / max(alerts_yesterday, 1)) * 100),
            "high_risk_students": high_risk_sessions,
        },
        "violation_breakdown": {
            "looking_away": {"count": looking_away, "pct": round(looking_away / max(total_violations, 1) * 100)},
            "phone_detected": {"count": phone_detected, "pct": round(phone_detected / max(total_violations, 1) * 100)},
            "multiple_persons": {"count": multiple_persons, "pct": round(multiple_persons / max(total_violations, 1) * 100)},
            "head_movement": {"count": head_movement, "pct": round(head_movement / max(total_violations, 1) * 100)},
        },
        "integrity_score": 86,
        "integrity_trend": "good",
    }

@router.get("/suspicion-trend")
async def get_suspicion_trend(admin: User = Depends(require_admin)):
    """Get daily suspicion score trend for the week"""
    return {
        "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "data": [42, 55, 38, 61, 47, 29, 44]
    }
