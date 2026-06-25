"""Students API"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.database import get_db
from models.user import User, UserRole
from app.api.auth import get_current_user, require_admin

router = APIRouter()

@router.get("/")
async def list_students(
    limit: int = Query(50, le=200),
    skip: int = 0,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db)
):
    students = (await session.exec(select(User).where(User.role == UserRole.STUDENT).offset(skip).limit(limit))).all()
    return [
        {
            "id": s.id,
            "student_id": s.student_id,
            "full_name": s.full_name,
            "email": s.email,
            "department": s.department,
            "semester": s.semester,
            "face_verified": s.face_verified,
            "total_exams_taken": s.total_exams_taken,
            "average_suspicion_score": s.average_suspicion_score,
            "total_violations": s.total_violations,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat(),
        }
        for s in students
    ]

@router.get("/{student_id}/sessions")
async def get_student_sessions(
    student_id: str, 
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db)
):
    from models.exam import ExamSession
    sessions = (await session.exec(select(ExamSession).where(ExamSession.student_id == student_id))).all()
    return [
        {
            "id": s.id,
            "exam_id": s.exam_id,
            "status": s.status,
            "suspicion_score": s.suspicion_score,
            "risk_level": s.risk_level,
            "start_time": s.start_time.isoformat() if s.start_time else None,
        }
        for s in sessions
    ]
