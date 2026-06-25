"""
ProctorAI - Advanced Examination Monitoring System
FastAPI Backend Entry Point
"""

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import uvicorn
import asyncio
import logging
from app.core.config import settings
from app.db.database import connect_db, disconnect_db
from app.api import auth, exams, students, monitoring, alerts, analytics, admin
from app.core.websocket_manager import ConnectionManager

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

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(exams.router, prefix="/api/v1/exams", tags=["Exams"])
app.include_router(students.router, prefix="/api/v1/students", tags=["Students"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["Monitoring"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])

@app.websocket("/ws/monitoring/{session_id}")
async def websocket_monitoring(websocket: WebSocket, session_id: str):
    """Real-time monitoring WebSocket for live exam sessions"""
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.process_frame(session_id, data, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        await manager.broadcast_to_admins({
            "type": "student_disconnected",
            "session_id": session_id
        })

@app.websocket("/ws/admin/{admin_id}")
async def websocket_admin(websocket: WebSocket, admin_id: str):
    """Admin real-time monitoring WebSocket"""
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
        "version": "2.0.0",
        "ai_modules": {
            "face_auth": "active",
            "eye_tracking": "active",
            "head_pose": "active",
            "object_detection": "active",
            "scoring_engine": "active"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=4
    )
