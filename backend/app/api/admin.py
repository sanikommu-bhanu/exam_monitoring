"""Admin API"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import select
from sqlalchemy import func
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.database import get_db
from typing import List, Optional
from models.user import User, UserRole
from app.api.auth import require_admin

router = APIRouter()

@router.get("/stats")
async def get_admin_stats(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db)
):
    from models.exam import Exam, ExamSession, ExamStatus, SessionStatus
    from models.alert import Alert
    
    total_students = (await session.exec(select(func.count(User.id)).where(User.role == UserRole.STUDENT))).first() or 0
    active_sessions = (await session.exec(select(func.count(ExamSession.id)).where(ExamSession.status == SessionStatus.IN_PROGRESS))).first() or 0
    active_exams = (await session.exec(select(func.count(Exam.id)).where(Exam.status == ExamStatus.ACTIVE))).first() or 0
    unreviewed_alerts = (await session.exec(select(func.count(Alert.id)).where(Alert.is_reviewed == False))).first() or 0
    
    return {
        "total_students": total_students,
        "active_sessions": active_sessions,
        "active_exams": active_exams,
        "unreviewed_alerts": unreviewed_alerts,
    }
