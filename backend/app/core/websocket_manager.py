"""
WebSocket Connection Manager
Handles real-time bidirectional communication between students and admin
"""
import asyncio
import json
import logging
from typing import Dict, List, Set, Optional
from fastapi import WebSocket
from datetime import datetime
import base64

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Student connections: session_id -> WebSocket
        self.student_connections: Dict[str, WebSocket] = {}
        # Admin connections: admin_id -> WebSocket
        self.admin_connections: Dict[str, WebSocket] = {}
        # Which sessions an admin is watching
        self.admin_watches: Dict[str, Set[str]] = {}
        
        # Import ML services lazily to avoid circular imports
        self._eye_service = None
        self._object_service = None
        self._scoring_engine = None
    
    def _get_services(self):
        if self._eye_service is None:
            from ml.eye_tracking.eye_service import eye_tracking_service
            from ml.object_detection.detection_service import object_detection_service
            from ml.scoring.scoring_engine import scoring_engine
            self._eye_service = eye_tracking_service
            self._object_service = object_detection_service
            self._scoring_engine = scoring_engine
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.student_connections[session_id] = websocket
        logger.info(f"Student session {session_id} connected")
        
        await websocket.send_json({
            "type": "connection_established",
            "session_id": session_id,
            "message": "Monitoring connection established",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def connect_admin(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        self.admin_connections[admin_id] = websocket
        self.admin_watches[admin_id] = set()
        logger.info(f"Admin {admin_id} connected")
        
        await websocket.send_json({
            "type": "admin_connected",
            "admin_id": admin_id,
            "active_sessions": list(self.student_connections.keys()),
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.student_connections:
            del self.student_connections[session_id]
        logger.info(f"Student session {session_id} disconnected")
    
    def disconnect_admin(self, websocket: WebSocket, admin_id: str):
        if admin_id in self.admin_connections:
            del self.admin_connections[admin_id]
        if admin_id in self.admin_watches:
            del self.admin_watches[admin_id]
        logger.info(f"Admin {admin_id} disconnected")
    
    async def process_frame(self, session_id: str, data: dict, websocket: WebSocket):
        """
        Process incoming frame from student
        Runs AI analysis and returns results
        """
        try:
            self._get_services()
            
            frame_type = data.get("type")
            
            if frame_type == "frame_analysis":
                frame_base64 = data.get("frame")
                if not frame_base64:
                    return
                
                # Parallel analysis
                eye_task = asyncio.get_event_loop().run_in_executor(
                    None, self._eye_service.analyze_frame, frame_base64
                )
                obj_task = asyncio.get_event_loop().run_in_executor(
                    None, self._object_service.detect_objects, frame_base64
                )
                
                eye_results, obj_results = await asyncio.gather(eye_task, obj_task)
                
                # Merge results
                frame_data = {
                    **eye_results,
                    **obj_results,
                }
                
                # Calculate suspicion score
                scoring_result = self._scoring_engine.analyze_frame(session_id, frame_data)
                
                # Build response
                response = {
                    "type": "analysis_result",
                    "session_id": session_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    
                    # AI Monitoring Status
                    "monitoring": {
                        "face_detected": eye_results.get("face_detected", False),
                        "eye_contact": eye_results.get("eye_contact", True),
                        "eye_contact_score": eye_results.get("eye_contact_score", 100),
                        "gaze_direction": eye_results.get("gaze_direction", "center"),
                        "head_position": eye_results.get("head_position", "centered"),
                        "head_yaw": eye_results.get("head_yaw", 0),
                        "head_pitch": eye_results.get("head_pitch", 0),
                        "phone_detected": obj_results.get("phone_detected", False),
                        "multiple_persons": obj_results.get("multiple_persons", False),
                        "persons_count": obj_results.get("persons_detected", 1),
                    },
                    
                    # Suspicion scoring
                    "scoring": {
                        "suspicion_score": scoring_result["suspicion_score"],
                        "risk_level": scoring_result["risk_level"],
                        "violations_detected": scoring_result["violations_this_frame"],
                        "cumulative_stats": scoring_result["cumulative_stats"],
                    },
                    
                    # Alerts to trigger
                    "alerts": scoring_result.get("alerts", []),
                }
                
                # Send response to student
                await websocket.send_json(response)
                
                # Broadcast to watching admins
                await self.broadcast_to_watching_admins(session_id, {
                    "type": "live_update",
                    "session_id": session_id,
                    "data": response
                })
                
                # Save to DB asynchronously (fire and forget)
                asyncio.create_task(
                    self.save_session_update(session_id, response)
                )
            
            elif frame_type == "tab_switch":
                alert_data = {
                    "type": "alert",
                    "session_id": session_id,
                    "alert": {
                        "type": "tab_switch",
                        "severity": "medium",
                        "message": "Student switched browser tab"
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
                await self.broadcast_to_watching_admins(session_id, alert_data)
            
            elif frame_type == "heartbeat":
                await websocket.send_json({
                    "type": "heartbeat_ack",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
        except Exception as e:
            logger.error(f"Frame processing error for session {session_id}: {e}")
            await websocket.send_json({
                "type": "error",
                "message": "Frame processing failed",
                "error": str(e)
            })
    
    async def handle_admin_command(self, admin_id: str, data: dict):
        """Handle commands from admin"""
        command = data.get("type")
        
        if command == "watch_session":
            session_id = data.get("session_id")
            if admin_id in self.admin_watches:
                self.admin_watches[admin_id].add(session_id)
        
        elif command == "unwatch_session":
            session_id = data.get("session_id")
            if admin_id in self.admin_watches and session_id in self.admin_watches[admin_id]:
                self.admin_watches[admin_id].remove(session_id)
        
        elif command == "send_warning":
            session_id = data.get("session_id")
            message = data.get("message", "Please focus on your exam")
            await self.send_warning_to_student(session_id, message, admin_id)
        
        elif command == "end_exam":
            session_id = data.get("session_id")
            reason = data.get("reason", "Terminated by proctor")
            await self.terminate_session(session_id, reason, admin_id)
        
        elif command == "get_active_sessions":
            admin_ws = self.admin_connections.get(admin_id)
            if admin_ws:
                await admin_ws.send_json({
                    "type": "active_sessions",
                    "sessions": list(self.student_connections.keys())
                })
    
    async def send_warning_to_student(self, session_id: str, message: str, admin_id: str):
        """Send warning message to a specific student"""
        student_ws = self.student_connections.get(session_id)
        if student_ws:
            await student_ws.send_json({
                "type": "admin_warning",
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    async def terminate_session(self, session_id: str, reason: str, admin_id: str):
        """Terminate a student's exam session"""
        student_ws = self.student_connections.get(session_id)
        if student_ws:
            await student_ws.send_json({
                "type": "exam_terminated",
                "reason": reason,
                "terminated_by": admin_id,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    async def broadcast_to_admins(self, message: dict):
        """Broadcast to all connected admins"""
        disconnected = []
        for admin_id, ws in self.admin_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(admin_id)
        
        for admin_id in disconnected:
            self.disconnect_admin(None, admin_id)
    
    async def broadcast_to_watching_admins(self, session_id: str, message: dict):
        """Broadcast to admins watching a specific session"""
        for admin_id, watched_sessions in self.admin_watches.items():
            if session_id in watched_sessions or len(watched_sessions) == 0:
                admin_ws = self.admin_connections.get(admin_id)
                if admin_ws:
                    try:
                        await admin_ws.send_json(message)
                    except Exception:
                        pass
    
    async def save_session_update(self, session_id: str, response: dict):
        """Save session data to SQLite"""
        try:
            from models.exam import ExamSession
            from app.db.database import engine
            from sqlmodel.ext.asyncio.session import AsyncSession
            from sqlmodel import select
            
            async with AsyncSession(engine) as db_session:
                session_obj = (await db_session.exec(select(ExamSession).where(ExamSession.id == session_id))).first()
                if session_obj:
                    scoring = response.get("scoring", {})
                    session_obj.suspicion_score = scoring.get("suspicion_score", session_obj.suspicion_score)
                    session_obj.risk_level = scoring.get("risk_level", session_obj.risk_level)
                    from datetime import datetime
                    session_obj.updated_at = datetime.utcnow()
                    db_session.add(session_obj)
                    await db_session.commit()
        except Exception as e:
            logger.error(f"Failed to save session update: {e}")
    
    def get_stats(self) -> dict:
        return {
            "active_student_sessions": len(self.student_connections),
            "active_admin_connections": len(self.admin_connections),
            "session_ids": list(self.student_connections.keys())
        }
