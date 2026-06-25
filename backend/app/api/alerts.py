"""Alerts API"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.database import get_db
from typing import List, Optional
from models.alert import Alert, AlertSeverity
from models.user import User
from app.api.auth import get_current_user, require_admin

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_alerts(
    severity: Optional[str] = None,
    is_reviewed: Optional[bool] = None,
    limit: int = Query(50, le=200),
    skip: int = 0,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(Alert)
    if severity:
        stmt = stmt.where(Alert.severity == severity)
    if is_reviewed is not None:
        stmt = stmt.where(Alert.is_reviewed == is_reviewed)
    
    stmt = stmt.order_by(Alert.created_at.desc()).offset(skip).limit(limit)
    alerts = (await session.exec(stmt)).all()
    
    return [
        {
            "id": a.id,
            "session_id": a.session_id,
            "student_id": a.student_id,
            "student_name": a.student_name,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "snapshot_url": a.snapshot_url,
            "suspicion_score_at_alert": a.suspicion_score_at_alert,
            "is_reviewed": a.is_reviewed,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]

@router.patch("/{alert_id}/review")
async def review_alert(
    alert_id: str, 
    action: str, 
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db)
):
    from datetime import datetime
    alert = (await session.exec(select(Alert).where(Alert.id == alert_id))).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_reviewed = True
    alert.reviewed_by = admin.id
    alert.reviewed_at = datetime.utcnow()
    alert.admin_action_taken = action
    
    session.add(alert)
    await session.commit()
    
    return {"message": "Alert reviewed"}

@router.get("/stats")
async def get_alert_stats(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db)
):
    from datetime import datetime, timedelta
    from sqlalchemy import func
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total = (await session.exec(select(func.count(Alert.id)))).first() or 0
    today_count = (await session.exec(select(func.count(Alert.id)).where(Alert.created_at >= today))).first() or 0
    high_risk = (await session.exec(select(func.count(Alert.id)).where(Alert.severity == "high"))).first() or 0
    unreviewed = (await session.exec(select(func.count(Alert.id)).where(Alert.is_reviewed == False))).first() or 0
    
    return {
        "total": total,
        "today": today_count,
        "high_risk": high_risk,
        "unreviewed": unreviewed,
    }
