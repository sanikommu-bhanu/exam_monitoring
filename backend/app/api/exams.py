"""
Exams API Routes
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.database import get_db
from app.api.auth import get_current_user, require_admin
from models.exam import Exam, ExamSession, ExamStatus, SessionStatus
from models.user import User, UserRole
import uuid

router = APIRouter()

class ExamCreateRequest(BaseModel):
    exam_code: Optional[str] = None
    title: str
    subject: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    allowed_students: List[str] = []
    enable_face_detection: bool = True
    enable_eye_tracking: bool = True
    enable_head_pose: bool = True
    enable_phone_detection: bool = True
    enable_multiple_person_detection: bool = True
    auto_terminate_on_high_risk: bool = False


class ExamUpdateRequest(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    allowed_students: Optional[List[str]] = None
    enable_face_detection: Optional[bool] = None
    enable_eye_tracking: Optional[bool] = None
    enable_head_pose: Optional[bool] = None
    enable_phone_detection: Optional[bool] = None
    enable_multiple_person_detection: Optional[bool] = None
    auto_terminate_on_high_risk: Optional[bool] = None
    status: Optional[ExamStatus] = None


class AssignStudentsRequest(BaseModel):
    allowed_students: List[str]


@router.post("/", response_model=dict)
async def create_exam(
    exam_data: ExamCreateRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    exam_code = exam_data.exam_code or f"EXAM-{uuid.uuid4().hex[:8].upper()}"
    existing = (await session.exec(select(Exam).where(Exam.exam_code == exam_code))).first()
    if existing:
        raise HTTPException(status_code=400, detail="Exam code already exists")

    exam = Exam(
        exam_code=exam_code,
        title=exam_data.title,
        subject=exam_data.subject,
        description=exam_data.description,
        start_time=exam_data.start_time,
        end_time=exam_data.end_time,
        duration_minutes=exam_data.duration_minutes,
        allowed_students=exam_data.allowed_students,
        created_by=admin.id,
        enable_face_detection=exam_data.enable_face_detection,
        enable_eye_tracking=exam_data.enable_eye_tracking,
        enable_head_pose=exam_data.enable_head_pose,
        enable_phone_detection=exam_data.enable_phone_detection,
        enable_multiple_person_detection=exam_data.enable_multiple_person_detection,
        auto_terminate_on_high_risk=exam_data.auto_terminate_on_high_risk,
    )

    session.add(exam)
    await session.commit()
    await session.refresh(exam)
    return {"message": "Exam created successfully", "exam_id": exam.id, "exam_code": exam_code}


@router.get("/", response_model=List[dict])
async def list_exams(
    status: Optional[ExamStatus] = None,
    limit: int = Query(50, le=100),
    skip: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    exams = (await session.exec(select(Exam).offset(skip).limit(limit))).all()
    if current_user.role == UserRole.STUDENT:
        exams = [
            exam for exam in exams
            if current_user.student_id and current_user.student_id in (exam.allowed_students or [])
        ]

    return [
        {
            "id": e.id,
            "exam_code": e.exam_code,
            "title": e.title,
            "subject": e.subject,
            "description": e.description,
            "start_time": e.start_time.isoformat(),
            "end_time": e.end_time.isoformat(),
            "duration_minutes": e.duration_minutes,
            "status": e.status,
            "total_enrolled": e.total_enrolled,
            "total_appeared": e.total_appeared,
            "allowed_students": e.allowed_students,
        }
        for e in exams
    ]


@router.get("/{exam_id}", response_model=dict)
async def get_exam(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    exam = (await session.exec(select(Exam).where(Exam.id == exam_id))).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    return {
        "id": exam.id,
        "exam_code": exam.exam_code,
        "title": exam.title,
        "subject": exam.subject,
        "description": exam.description,
        "start_time": exam.start_time.isoformat(),
        "end_time": exam.end_time.isoformat(),
        "duration_minutes": exam.duration_minutes,
        "status": exam.status,
        "monitoring_config": {
            "face_detection": exam.enable_face_detection,
            "eye_tracking": exam.enable_eye_tracking,
            "head_pose": exam.enable_head_pose,
            "phone_detection": exam.enable_phone_detection,
            "multiple_person_detection": exam.enable_multiple_person_detection,
        },
        "total_enrolled": exam.total_enrolled,
        "total_appeared": exam.total_appeared,
        "allowed_students": exam.allowed_students,
    }


@router.post("/{exam_id}/start-session", response_model=dict)
async def start_exam_session(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    exam = (await session.exec(select(Exam).where(Exam.id == exam_id))).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if exam.status != ExamStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Exam is not currently active")

    if current_user.student_id not in (exam.allowed_students or []):
        raise HTTPException(status_code=403, detail="You are not enrolled in this exam")

    existing_session = (await session.exec(
        select(ExamSession).where(
            ExamSession.exam_id == exam_id,
            ExamSession.student_id == current_user.student_id,
            ExamSession.status.in_([SessionStatus.IN_PROGRESS, SessionStatus.IDENTITY_VERIFICATION]),
        )
    )).first()

    if existing_session:
        return {"session_id": existing_session.id, "status": existing_session.status}

    exam_session = ExamSession(
        exam_id=exam_id,
        student_id=current_user.student_id,
        student_name=current_user.full_name,
        status=SessionStatus.IDENTITY_VERIFICATION,
        start_time=datetime.utcnow(),
    )

    session.add(exam_session)
    exam.total_appeared += 1
    session.add(exam)
    await session.commit()
    await session.refresh(exam_session)

    return {
        "session_id": exam_session.id,
        "status": exam_session.status,
        "exam_title": exam.title,
        "duration_minutes": exam.duration_minutes,
        "monitoring_config": {
            "face_detection": exam.enable_face_detection,
            "eye_tracking": exam.enable_eye_tracking,
            "head_pose": exam.enable_head_pose,
        },
    }


@router.post("/{exam_id}/sessions/{session_id}/complete")
async def complete_session(
    exam_id: str,
    session_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    exam_session = (await session.exec(
        select(ExamSession).where(
            ExamSession.id == session_id,
            ExamSession.student_id == current_user.student_id,
        )
    )).first()

    if not exam_session:
        raise HTTPException(status_code=404, detail="Session not found")

    exam_session.status = SessionStatus.COMPLETED
    exam_session.end_time = datetime.utcnow()
    if exam_session.start_time:
        exam_session.time_elapsed_seconds = int((exam_session.end_time - exam_session.start_time).total_seconds())

    session.add(exam_session)
    await session.commit()

    from ml.scoring.scoring_engine import scoring_engine
    summary = scoring_engine.get_session_summary(session_id)
    scoring_engine.reset_session(session_id)

    return {"message": "Session completed", "summary": summary}


@router.get("/{exam_id}/sessions", response_model=List[dict])
async def get_exam_sessions(
    exam_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    sessions = (await session.exec(select(ExamSession).where(ExamSession.exam_id == exam_id))).all()

    return [
        {
            "id": s.id,
            "student_id": s.student_id,
            "student_name": s.student_name,
            "status": s.status,
            "suspicion_score": s.suspicion_score,
            "risk_level": s.risk_level,
            "identity_verified": s.identity_verified,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "time_elapsed_seconds": s.time_elapsed_seconds,
        }
        for s in sessions
    ]


@router.patch("/{exam_id}", response_model=dict)
async def update_exam(
    exam_id: str,
    exam_updates: ExamUpdateRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    exam = (await session.exec(select(Exam).where(Exam.id == exam_id))).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    exam_data = exam_updates.model_dump(exclude_none=True)
    for key, value in exam_data.items():
        setattr(exam, key, value)

    session.add(exam)
    await session.commit()
    await session.refresh(exam)
    return {"message": "Exam updated successfully", "exam_id": exam.id}


@router.delete("/{exam_id}", response_model=dict)
async def delete_exam(
    exam_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    exam = (await session.exec(select(Exam).where(Exam.id == exam_id))).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    await session.delete(exam)
    await session.commit()
    return {"message": "Exam deleted successfully"}


@router.post("/{exam_id}/assign-students", response_model=dict)
async def assign_students(
    exam_id: str,
    payload: AssignStudentsRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    exam = (await session.exec(select(Exam).where(Exam.id == exam_id))).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    exam.allowed_students = payload.allowed_students
    exam.total_enrolled = len(payload.allowed_students)
    session.add(exam)
    await session.commit()
    await session.refresh(exam)

    return {"message": "Student roster updated", "total_enrolled": exam.total_enrolled}
