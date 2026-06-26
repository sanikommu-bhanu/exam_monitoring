"""
Real-Time Suspicion Scoring Engine
Aggregates multiple behavioral signals into a composite risk score
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
import asyncio
from collections import deque

logger = logging.getLogger(__name__)

class ScoringWeights:
    """Configurable weights for different violation types"""
    FACE_NOT_DETECTED = 20       # Per occurrence
    FACE_ABSENT_SUSTAINED = 25   # If absent for >3 seconds
    LOOKING_AWAY = 8             # Per occurrence
    LOOKING_AWAY_SUSTAINED = 15  # If looking away >5 seconds
    MULTIPLE_PERSONS = 30        # Immediate high impact
    PHONE_DETECTED = 30          # High impact
    HEAD_POSE_VIOLATION = 8      # Per occurrence
    EXCESSIVE_HEAD_MOVEMENT = 12 # Rapid head movements
    IDENTITY_MISMATCH = 50       # Very high impact
    TAB_SWITCH = 15              # Browser tab switch
    
    # Recovery (score reduction over time)
    RECOVERY_RATE_PER_SECOND = 0.5  # Score reduces if clean behavior
    MAX_RECOVERY_PER_CYCLE = 2       # Max points recovered per analysis cycle

class BehaviorWindow:
    """Sliding window for behavioral analysis"""
    def __init__(self, window_seconds: int = 30):
        self.window_seconds = window_seconds
        self.events = deque()
    
    def add_event(self, event_type: str, timestamp: datetime, metadata: dict = None):
        self.events.append({
            "type": event_type,
            "timestamp": timestamp,
            "metadata": metadata or {}
        })
        self.cleanup()
    
    def cleanup(self):
        """Remove events outside the window"""
        cutoff = datetime.utcnow() - timedelta(seconds=self.window_seconds)
        while self.events and self.events[0]["timestamp"] < cutoff:
            self.events.popleft()
    
    def get_event_count(self, event_type: str) -> int:
        self.cleanup()
        return sum(1 for e in self.events if e["type"] == event_type)
    
    def get_all_events(self) -> list:
        self.cleanup()
        return list(self.events)

class SuspicionScoringEngine:
    def __init__(self):
        self.weights = ScoringWeights()
        self.sessions: Dict[str, dict] = {}  # session_id -> state
    
    def initialize_session(self, session_id: str):
        """Initialize scoring state for a new session"""
        self.sessions[session_id] = {
            "score": 0,
            "raw_score": 0,          # Uncapped score
            "last_updated": datetime.utcnow(),
            "last_clean_time": datetime.utcnow(),
            "behavior_window": BehaviorWindow(window_seconds=60),
            "consecutive_violations": 0,
            "consecutive_clean_frames": 0,
            
            # Sustained violation trackers
            "face_absent_since": None,
            "looking_away_since": None,
            "phone_present_since": None,
            "multiple_persons_since": None,
            "identity_mismatch_since": None,
            "phone_alert_sent": False,
            "persons_alert_sent": False,
            "identity_alert_sent": False,
            
            # Cumulative stats
            "total_looking_away_events": 0,
            "total_phone_detections": 0,
            "total_multiple_person_events": 0,
            "total_face_absent_events": 0,
            "total_head_violations": 0,
            
            # Score timeline for chart
            "score_timeline": [],
        }
    
    def analyze_frame(self, session_id: str, frame_data: dict) -> dict:
        """
        Process a frame analysis result and update suspicion score
        
        frame_data contains:
        - face_detected: bool
        - is_looking_away: bool
        - gaze_direction: str
        - multiple_persons: bool
        - phone_detected: bool
        - head_pose_violation: bool
        - eye_contact_score: float
        - head_position_score: float
        """
        if session_id not in self.sessions:
            self.initialize_session(session_id)
        
        state = self.sessions[session_id]
        now = datetime.utcnow()
        score_delta = 0
        violations_this_frame = []
        alerts = []
        
        face_detected = frame_data.get("face_detected", True)
        is_looking_away = frame_data.get("is_looking_away", False)
        multiple_persons = frame_data.get("multiple_persons", False)
        phone_detected = frame_data.get("phone_detected", False)
        head_pose_violation = frame_data.get("head_pose_violation", False)
        identity_verified = frame_data.get("identity_verified", True)
        
        # --- Face Detection ---
        if not face_detected:
            violations_this_frame.append("face_not_detected")
            
            if state["face_absent_since"] is None:
                state["face_absent_since"] = now
                score_delta += self.weights.FACE_NOT_DETECTED
                state["total_face_absent_events"] += 1
            else:
                absent_duration = (now - state["face_absent_since"]).total_seconds()
                if absent_duration > 2:
                    score_delta += self.weights.FACE_ABSENT_SUSTAINED * 0.1  # per frame
                    if absent_duration > 2 and absent_duration < 2.5:
                        alerts.append({
                            "type": "face_not_detected",
                            "severity": "high",
                            "duration": absent_duration,
                            "message": "Face not detected for over 2 seconds"
                        })
        else:
            if state["face_absent_since"] is not None:
                state["face_absent_since"] = None
        
        # --- Eye Tracking / Looking Away ---
        if is_looking_away and face_detected:
            violations_this_frame.append("looking_away")
            
            if state["looking_away_since"] is None:
                state["looking_away_since"] = now
                score_delta += self.weights.LOOKING_AWAY
                state["total_looking_away_events"] += 1
            else:
                away_duration = (now - state["looking_away_since"]).total_seconds()
                if away_duration > 2:
                    score_delta += self.weights.LOOKING_AWAY_SUSTAINED * 0.1
                    if away_duration > 2 and away_duration < 2.5:
                        alerts.append({
                            "type": "looking_away",
                            "severity": "medium",
                            "duration": away_duration,
                            "message": f"Student looking away for {away_duration:.0f}s"
                        })
        else:
            if state["looking_away_since"] is not None:
                state["looking_away_since"] = None
        
        # --- Multiple Persons ---
        if multiple_persons:
            violations_this_frame.append("multiple_persons")
            state["total_multiple_person_events"] += 1
            
            if state["multiple_persons_since"] is None:
                state["multiple_persons_since"] = now
                score_delta += self.weights.MULTIPLE_PERSONS
            else:
                persons_duration = (now - state["multiple_persons_since"]).total_seconds()
                if persons_duration >= 0.5 and not state.get("persons_alert_sent"):
                    alerts.append({
                        "type": "multiple_persons",
                        "severity": "high",
                        "message": "Multiple persons detected in frame"
                    })
                    state["persons_alert_sent"] = True
        else:
            state["multiple_persons_since"] = None
            state["persons_alert_sent"] = False
        
        # --- Phone Detection ---
        if phone_detected:
            violations_this_frame.append("phone_detected")
            state["total_phone_detections"] += 1
            
            if state["phone_present_since"] is None:
                state["phone_present_since"] = now
                score_delta += self.weights.PHONE_DETECTED
            else:
                phone_duration = (now - state["phone_present_since"]).total_seconds()
                if phone_duration >= 0.5 and not state.get("phone_alert_sent"):
                    alerts.append({
                        "type": "phone_detected",
                        "severity": "high",
                        "message": "Mobile phone detected in frame"
                    })
                    state["phone_alert_sent"] = True
                if phone_duration > 0.5:
                    score_delta += self.weights.PHONE_DETECTED * 0.05
        else:
            state["phone_present_since"] = None
            state["phone_alert_sent"] = False
        
        # --- Identity Mismatch ---
        if not identity_verified and face_detected:
            violations_this_frame.append("identity_mismatch")
            
            if state.get("identity_mismatch_since") is None:
                state["identity_mismatch_since"] = now
                score_delta += self.weights.IDENTITY_MISMATCH
            else:
                mismatch_duration = (now - state["identity_mismatch_since"]).total_seconds()
                if mismatch_duration >= 2 and not state.get("identity_alert_sent"):
                    alerts.append({
                        "type": "identity_mismatch",
                        "severity": "high",
                        "message": "Unrecognized person detected for 2 seconds. Only the registered student is allowed."
                    })
                    state["identity_alert_sent"] = True
        else:
            state["identity_mismatch_since"] = None
            state["identity_alert_sent"] = False
        
        # --- Head Pose ---
        if head_pose_violation and face_detected:
            violations_this_frame.append("head_pose_violation")
            score_delta += self.weights.HEAD_POSE_VIOLATION * 0.3
            state["total_head_violations"] += 1
        
        # --- Clean frame recovery ---
        if not violations_this_frame:
            state["consecutive_clean_frames"] += 1
            state["consecutive_violations"] = 0
            
            # Gradual recovery
            if state["consecutive_clean_frames"] > 10:
                recovery = min(
                    self.weights.MAX_RECOVERY_PER_CYCLE,
                    state["consecutive_clean_frames"] * 0.1
                )
                score_delta -= recovery
        else:
            state["consecutive_violations"] += 1
            state["consecutive_clean_frames"] = 0
            
            # Multiplier for consecutive violations
            if state["consecutive_violations"] > 3:
                score_delta *= 1.2
        
        # Add to behavior window
        for v in violations_this_frame:
            state["behavior_window"].add_event(v, now)
        
        # Update score
        state["raw_score"] = max(0, state["raw_score"] + score_delta)
        state["score"] = min(100, int(state["raw_score"]))
        state["last_updated"] = now
        
        # Record timeline point (every 30 seconds)
        timeline = state["score_timeline"]
        if not timeline or (now - datetime.fromisoformat(timeline[-1]["time"])).total_seconds() > 30:
            timeline.append({
                "time": now.isoformat(),
                "score": state["score"]
            })
            if len(timeline) > 200:  # Keep last 200 points
                timeline.pop(0)
        
        risk_level = self.get_risk_level(state["score"])
        
        return {
            "session_id": session_id,
            "suspicion_score": state["score"],
            "risk_level": risk_level,
            "score_delta": score_delta,
            "violations_this_frame": violations_this_frame,
            "alerts": alerts,
            "cumulative_stats": {
                "looking_away_events": state["total_looking_away_events"],
                "phone_detections": state["total_phone_detections"],
                "multiple_person_events": state["total_multiple_person_events"],
                "face_absent_events": state["total_face_absent_events"],
                "head_violations": state["total_head_violations"],
            },
            "consecutive_violations": state["consecutive_violations"],
        }
    
    def get_risk_level(self, score: int) -> str:
        if score >= 80:
            return "critical"
        elif score >= 60:
            return "high"
        elif score >= 30:
            return "medium"
        else:
            return "low"
    
    def get_session_summary(self, session_id: str) -> Optional[dict]:
        if session_id not in self.sessions:
            return None
        state = self.sessions[session_id]
        return {
            "final_score": state["score"],
            "risk_level": self.get_risk_level(state["score"]),
            "total_violations": (
                state["total_looking_away_events"] +
                state["total_phone_detections"] +
                state["total_multiple_person_events"] +
                state["total_face_absent_events"]
            ),
            "score_timeline": state["score_timeline"],
            "violation_breakdown": {
                "looking_away": state["total_looking_away_events"],
                "phone_detected": state["total_phone_detections"],
                "multiple_persons": state["total_multiple_person_events"],
                "face_absent": state["total_face_absent_events"],
                "head_movement": state["total_head_violations"],
            }
        }
    
    def reset_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]

scoring_engine = SuspicionScoringEngine()
