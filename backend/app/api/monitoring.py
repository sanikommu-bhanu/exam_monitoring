"""Monitoring API"""
from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.database import get_db
from models.user import User
from app.api.auth import get_current_user, require_admin

router = APIRouter()

@router.get("/active-sessions")
async def get_active_sessions(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db)
):
    from models.exam import ExamSession, SessionStatus
    sessions = (await session.exec(select(ExamSession).where(ExamSession.status == SessionStatus.IN_PROGRESS))).all()
    return [
        {
            "id": s.id,
            "student_id": s.student_id,
            "student_name": s.student_name,
            "exam_id": s.exam_id,
            "suspicion_score": s.suspicion_score,
            "risk_level": s.risk_level,
            "time_elapsed_seconds": s.time_elapsed_seconds,
        }
        for s in sessions
    ]

@router.get("/session/{session_id}")
async def get_session_details(
    session_id: str, 
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db)
):
    from models.exam import ExamSession
    exam_session = (await session.exec(select(ExamSession).where(ExamSession.id == session_id))).first()
    if not exam_session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": exam_session.id,
        "student_id": exam_session.student_id,
        "student_name": exam_session.student_name,
        "status": exam_session.status,
        "suspicion_score": exam_session.suspicion_score,
        "risk_level": exam_session.risk_level,
        "identity_verified": exam_session.identity_verified,
        "behavior_metrics": exam_session.behavior_metrics.model_dump(),
        "score_timeline": exam_session.score_timeline,
        "admin_warnings_sent": exam_session.admin_warnings_sent,
    }
