"""
ProctorAI - Advanced Examination Monitoring System
FastAPI Backend Entry Point
"""

import os

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.config import settings
from app.db.database import connect_db, disconnect_db, engine, async_session
from app.api import auth, exams, students, monitoring, alerts, analytics, admin
from app.core.websocket_manager import ConnectionManager
from models.exam import ExamSession
from models.user import User, UserRole

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ProctorAI Backend...")
    await connect_db()
    yield
    logger.info("Shutting down ProctorAI Backend...")
    await disconnect_db()

app = FastAPI(
    title="ProctorAI API",
    description="Advanced Examination Monitoring System with AI-powered proctoring",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(exams.router, prefix="/api/v1/exams", tags=["Exams"])
app.include_router(students.router, prefix="/api/v1/students", tags=["Students"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["Monitoring"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])

@app.websocket("/ws/monitoring/{session_id}")
async def websocket_monitoring(websocket: WebSocket, session_id: str, token: str = Query(None)):
    if not token:
        await websocket.close(code=1008)
        return

    async with async_session() as db_session:
        try:
            current_user = await auth.get_user_from_token(token, db_session)
            if current_user.role != UserRole.STUDENT:
                raise ValueError("Invalid student token")

            session_obj = (await db_session.exec(select(ExamSession).where(ExamSession.id == session_id))).first()
            if not session_obj:
                # Auto-create mock session since frontend routes to /student/exam/{user.id}
                session_obj = ExamSession(
                    id=session_id,
                    exam_id="mock_exam",
                    student_id=current_user.student_id,
                    student_name=current_user.full_name,
                    status="in_progress",
                    start_time=datetime.utcnow()
                )
                db_session.add(session_obj)
                await db_session.commit()
                await db_session.refresh(session_obj)

            if session_obj.student_id != current_user.student_id:
                raise ValueError("Session ID does not belong to current student")
        except Exception as exc:
            logger.warning(f"WebSocket authorization failed for session {session_id}: {exc}")
            await websocket.close(code=1008)
            return

    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.process_frame(session_id, data, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        await manager.broadcast_to_admins({
            "type": "student_disconnected",
            "session_id": session_id,
        })

@app.websocket("/ws/admin/{admin_id}")
async def websocket_admin(websocket: WebSocket, admin_id: str, token: str = Query(None)):
    if not token:
        await websocket.close(code=1008)
        return

    async with async_session() as db_session:
        try:
            current_user = await auth.get_user_from_token(token, db_session)
            if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PROCTOR]:
                raise ValueError("Invalid admin token")
            if current_user.id != admin_id:
                raise ValueError("Admin ID mismatch")
        except Exception as exc:
            logger.warning(f"WebSocket admin auth failed for admin {admin_id}: {exc}")
            await websocket.close(code=1008)
            return

    await manager.connect_admin(websocket, admin_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.handle_admin_command(admin_id, data)
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket, admin_id)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ProctorAI API",
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=1,
    )
