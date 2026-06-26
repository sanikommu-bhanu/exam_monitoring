"""
WebSocket Connection Manager
Handles real-time bidirectional communication between students and admin
"""
import asyncio
import json
import logging
from typing import Dict, List, Set, Optional, Any
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
        # Tracking auto warnings
        self.auto_warnings: Dict[str, int] = {}
        
        # Identity verification tracking
        self.student_encodings: Dict[str, list] = {}
        self.last_verified: Dict[str, datetime] = {}
        self.session_student_ids: Dict[str, str] = {}
        self.session_identity_status: Dict[str, bool] = {}
        
        # Import ML services lazily to avoid circular imports
        self._eye_service: Any = None
        self._object_service: Any = None
        self._scoring_engine: Any = None
    
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
        
        # Fetch student encodings from DB
        try:
            from models.exam import ExamSession
            from models.user import User
            from app.db.database import engine
            from sqlmodel.ext.asyncio.session import AsyncSession
            from sqlmodel import select
            
            async with AsyncSession(engine) as db_session:
                exam_session = (await db_session.exec(select(ExamSession).where(ExamSession.id == session_id))).first()
                if exam_session:
                    student_id = exam_session.student_id
                    self.session_student_ids[session_id] = student_id
                    user = (await db_session.exec(select(User).where(User.id == student_id))).first()
                    if user and user.face_encodings:
                        embeddings = [enc.get("encoding") for enc in user.face_encodings if "encoding" in enc]
                        self.student_encodings[session_id] = embeddings
        except Exception as e:
            logger.error(f"Failed to fetch encodings for session {session_id}: {e}")
            
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
                
                # Parallel analysis using ThreadPool via run_in_executor to avoid blocking
                eye_task = asyncio.get_event_loop().run_in_executor(
                    None, self._eye_service.analyze_frame, frame_base64
                )
                obj_task = asyncio.get_event_loop().run_in_executor(
                    None, self._object_service.detect_objects, frame_base64
                )
                
                eye_results, obj_results = await asyncio.gather(eye_task, obj_task)
                
                # Periodically verify identity (every 5 seconds)
                now = datetime.utcnow()
                last_ver = self.last_verified.get(session_id)
                current_id_status = self.session_identity_status.get(session_id, True)
                
                if eye_results.get("face_detected", False):
                    if last_ver is None or (now - last_ver).total_seconds() > 5:
                        embeddings = self.student_encodings.get(session_id)
                        student_id = self.session_student_ids.get(session_id)
                        if embeddings and student_id:
                            try:
                                from ml.face_auth.face_service import face_auth_service
                                is_verified, score, msg = await face_auth_service.verify_identity(student_id, frame_base64, embeddings)
                                current_id_status = is_verified
                                self.session_identity_status[session_id] = is_verified
                                self.last_verified[session_id] = now
                            except Exception as e:
                                logger.error(f"Identity verification failed for session {session_id}: {e}")
                
                # Merge results
                frame_data = {
                    **eye_results,
                    **obj_results,
                    "identity_verified": current_id_status,
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
                
                # Auto-warning and termination logic (exactly 3 warnings)
                high_sev_alerts = [a for a in scoring_result.get("alerts", []) if a.get("severity") in ("high", "critical")]
                warning_issued_this_frame = False
                
                if high_sev_alerts:
                    if session_id not in self.auto_warnings:
                        # Will sync this properly in save_session_update if missed
                        self.auto_warnings[session_id] = 0
                    
                    # Group alerts per frame to trigger at most one warning per frame cycle
                    self.auto_warnings[session_id] += 1
                    warning_count = self.auto_warnings[session_id]
                    warning_issued_this_frame = True
                    
                    primary_alert = high_sev_alerts[0]
                    response["warning_count"] = warning_count
                    
                    if warning_count > 3:
                        await self.terminate_session(session_id, "Maximum warnings exceeded. Exam auto-terminated.", "System")
                    else:
                        await self.send_warning_to_student(
                            session_id, 
                            f"WARNING {warning_count}/3: {primary_alert['message']}. Exam will be terminated after 3 warnings.", 
                            "System"
                        )
                
                # Save to DB asynchronously (fire and forget)
                asyncio.create_task(
                    self.save_session_update(session_id, response, high_sev_alerts if warning_issued_this_frame else None)
                )
                
            elif frame_type == "tab_switch" or frame_type == "fullscreen_exit" or frame_type == "window_switch":
                alert_data = {
                    "type": "alert",
                    "session_id": session_id,
                    "alert": {
                        "type": frame_type,
                        "severity": "high",
                        "message": f"Student performed {frame_type.replace('_', ' ')}"
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
                await self.broadcast_to_watching_admins(session_id, alert_data)
                
                if session_id not in self.auto_warnings:
                    self.auto_warnings[session_id] = 0
                self.auto_warnings[session_id] += 1
                warning_count = self.auto_warnings[session_id]
                
                if warning_count > 3:
                    await self.terminate_session(session_id, "Maximum warnings exceeded. Exam auto-terminated.", "System")
                else:
                    await self.send_warning_to_student(
                        session_id, 
                        f"WARNING {warning_count}/3: Window/Tab violation. Exam will be terminated after 3 warnings.", 
                        "System"
                    )
                
                asyncio.create_task(
                    self.save_session_update(session_id, alert_data, [alert_data["alert"]])
                )

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
            if session_id and admin_id in self.admin_watches:
                self.admin_watches[admin_id].add(session_id)
        
        elif command == "unwatch_session":
            session_id = data.get("session_id")
            if session_id and admin_id in self.admin_watches and session_id in self.admin_watches[admin_id]:
                self.admin_watches[admin_id].remove(session_id)
        
        elif command == "send_warning":
            session_id = data.get("session_id")
            if session_id:
                message = data.get("message", "Please focus on your exam")
                await self.send_warning_to_student(session_id, message, admin_id)
        
        elif command == "end_exam":
            session_id = data.get("session_id")
            if session_id:
                reason = data.get("reason", "Terminated by proctor")
                await self.terminate_session(session_id, reason, admin_id)
        
        elif command == "get_active_sessions":
            admin_ws = self.admin_connections.get(admin_id)
            if admin_ws:
                await admin_ws.send_json({
                    "type": "active_sessions",
                    "sessions": list(self.student_connections.keys())
                })
    
    async def broadcast_to_watching_admins(self, session_id: str, message: dict):
        """Broadcast a message to all admins who are watching the given session."""
        for admin_id, watching_sessions in self.admin_watches.items():
            if session_id in watching_sessions:
                admin_ws = self.admin_connections.get(admin_id)
                if admin_ws:
                    try:
                        await admin_ws.send_json(message)
                    except Exception as e:
                        logger.error(f"Failed to send to admin {admin_id}: {e}")

    async def broadcast_to_admins(self, message: dict):
        """Broadcast a message to all connected admins."""
        for admin_id, admin_ws in self.admin_connections.items():
            try:
                await admin_ws.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to admin {admin_id}: {e}")

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
            # Disconnect the student gracefully
            try:
                await asyncio.sleep(0.5)
                await student_ws.close()
            except Exception:
                pass
            self.disconnect(student_ws, session_id)
            
            # Save terminated status to DB
            try:
                from models.exam import ExamSession, SessionStatus
                from app.db.database import engine
                from sqlmodel.ext.asyncio.session import AsyncSession
                from sqlmodel import select
                async with AsyncSession(engine) as db_session:
                    session_obj = (await db_session.exec(select(ExamSession).where(ExamSession.id == session_id))).first()
                    if session_obj:
                        session_obj.status = SessionStatus.TERMINATED
                        session_obj.terminated_reason = reason
                        if admin_id != "System":
                            session_obj.terminated_by_admin = True
                        session_obj.end_time = datetime.utcnow()
                        db_session.add(session_obj)
                        await db_session.commit()
            except Exception as e:
                logger.error(f"Failed to save terminated status: {e}")

    async def save_session_update(self, session_id: str, response: dict, alerts: Optional[List[dict]] = None):
        """Save session data to SQLite and track violations"""
        try:
            from models.exam import ExamSession
            from models.violation import Violation, ViolationSeverity
            from app.db.database import engine
            from sqlmodel.ext.asyncio.session import AsyncSession
            from sqlmodel import select
            
            async with AsyncSession(engine) as db_session:
                session_obj = (await db_session.exec(select(ExamSession).where(ExamSession.id == session_id))).first()
                if session_obj:
                    scoring = response.get("scoring", {})
                    if scoring:
                        session_obj.suspicion_score = scoring.get("suspicion_score", session_obj.suspicion_score)
                        session_obj.risk_level = scoring.get("risk_level", session_obj.risk_level)
                    
                    if "warning_count" in response:
                        session_obj.warning_count = response["warning_count"]
                    elif session_id in self.auto_warnings:
                        session_obj.warning_count = self.auto_warnings[session_id]
                        
                    session_obj.updated_at = datetime.utcnow()
                    db_session.add(session_obj)
                    
                    if alerts:
                        for alert in alerts:
                            v = Violation(
                                session_id=session_id,
                                exam_id=session_obj.exam_id,
                                student_id=session_obj.student_id,
                                violation_type=alert.get("type", "unknown"),
                                severity=ViolationSeverity(alert.get("severity", "medium")),
                                message=alert.get("message", "Violation detected"),
                                is_warning_issued=True
                            )
                            db_session.add(v)
                            
                    await db_session.commit()
        except Exception as e:
            logger.error(f"Failed to save session update: {e}")
    
    def get_stats(self) -> dict:
        return {
            "active_student_sessions": len(self.student_connections),
            "active_admin_connections": len(self.admin_connections),
            "session_ids": list(self.student_connections.keys())
        }
