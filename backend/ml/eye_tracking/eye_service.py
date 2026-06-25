"""
Eye Tracking & Head Pose Estimation Service
Using MediaPipe Face Mesh + OpenCV
"""
import cv2
import numpy as np
import mediapipe as mp
import base64
from typing import Dict, Tuple, Optional
import logging
import math

logger = logging.getLogger(__name__)

# MediaPipe landmark indices
LEFT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
RIGHT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
LEFT_IRIS_INDICES = [474, 475, 476, 477]
RIGHT_IRIS_INDICES = [469, 470, 471, 472]

# 3D model points for head pose (nose, chin, left eye corner, right eye corner, left mouth, right mouth)
FACE_3D_POINTS = np.array([
    (0.0, 0.0, 0.0),           # Nose tip
    (0.0, -330.0, -65.0),      # Chin
    (-225.0, 170.0, -135.0),   # Left eye corner
    (225.0, 170.0, -135.0),    # Right eye corner
    (-150.0, -150.0, -125.0),  # Left mouth corner
    (150.0, -150.0, -125.0)    # Right mouth corner
], dtype=np.float64)

# Corresponding MediaPipe landmarks
HEAD_POSE_LANDMARK_IDS = [4, 152, 263, 33, 287, 57]

class EyeTrackingService:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,  # Enables iris tracking
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Gaze thresholds
        self.gaze_threshold_x = 0.35  # Left/right gaze threshold
        self.gaze_threshold_y = 0.25  # Up/down gaze threshold
        
        # Head pose thresholds (degrees)
        self.yaw_threshold = 30.0    # Left/right head turn
        self.pitch_threshold = 25.0  # Up/down head tilt
        self.roll_threshold = 20.0   # Head tilt sideways
    
    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        if "data:image" in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        return cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    def get_iris_position(self, landmarks, iris_indices, eye_indices, img_w, img_h) -> Tuple[float, float]:
        """Get normalized iris position relative to eye"""
        # Get iris center
        iris_pts = np.array([
            [landmarks[i].x * img_w, landmarks[i].y * img_h]
            for i in iris_indices
        ])
        iris_center = iris_pts.mean(axis=0)
        
        # Get eye bounding box
        eye_pts = np.array([
            [landmarks[i].x * img_w, landmarks[i].y * img_h]
            for i in eye_indices
        ])
        
        eye_min = eye_pts.min(axis=0)
        eye_max = eye_pts.max(axis=0)
        eye_range = eye_max - eye_min
        
        if eye_range[0] < 1 or eye_range[1] < 1:
            return 0.5, 0.5
        
        # Normalized position (0-1, 0.5 = center)
        norm_x = (iris_center[0] - eye_min[0]) / eye_range[0]
        norm_y = (iris_center[1] - eye_min[1]) / eye_range[1]
        
        return float(norm_x), float(norm_y)
    
    def estimate_head_pose(self, landmarks, img_w, img_h) -> Dict[str, float]:
        """Estimate head pose using solvePnP"""
        img_points = np.array([
            [landmarks[i].x * img_w, landmarks[i].y * img_h]
            for i in HEAD_POSE_LANDMARK_IDS
        ], dtype=np.float64)
        
        focal_length = img_w
        center = (img_w / 2, img_h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)
        
        dist_coeffs = np.zeros((4, 1))
        
        success, rotation_vector, translation_vector = cv2.solvePnP(
            FACE_3D_POINTS,
            img_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_MINMAX
        )
        
        if not success:
            return {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}
        
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        
        # Decompose rotation matrix to Euler angles
        sy = math.sqrt(rotation_matrix[0,0]**2 + rotation_matrix[1,0]**2)
        singular = sy < 1e-6
        
        if not singular:
            pitch = math.atan2(rotation_matrix[2,1], rotation_matrix[2,2])
            yaw = math.atan2(-rotation_matrix[2,0], sy)
            roll = math.atan2(rotation_matrix[1,0], rotation_matrix[0,0])
        else:
            pitch = math.atan2(-rotation_matrix[1,2], rotation_matrix[1,1])
            yaw = math.atan2(-rotation_matrix[2,0], sy)
            roll = 0
        
        return {
            "yaw": math.degrees(yaw),
            "pitch": math.degrees(pitch),
            "roll": math.degrees(roll)
        }
    
    def analyze_frame(self, frame_base64: str) -> Dict:
        """
        Analyze a frame for eye tracking and head pose
        Returns comprehensive behavioral data
        """
        try:
            img = self.decode_base64_image(frame_base64)
            img_h, img_w = img.shape[:2]
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            results = self.face_mesh.process(rgb_img)
            
            analysis = {
                "face_detected": False,
                "landmarks_count": 0,
                # Eye tracking
                "gaze_direction": "center",
                "left_gaze_x": 0.5,
                "left_gaze_y": 0.5,
                "right_gaze_x": 0.5,
                "right_gaze_y": 0.5,
                "is_looking_away": False,
                "eye_contact": True,
                # Head pose
                "head_yaw": 0.0,
                "head_pitch": 0.0,
                "head_roll": 0.0,
                "head_position": "centered",
                "head_pose_violation": False,
                # Blink detection
                "left_eye_open": True,
                "right_eye_open": True,
                # Scores
                "eye_contact_score": 100.0,
                "head_position_score": 100.0,
            }
            
            if not results.multi_face_landmarks:
                return analysis
            
            face_landmarks = results.multi_face_landmarks[0]
            landmarks = face_landmarks.landmark
            
            analysis["face_detected"] = True
            analysis["landmarks_count"] = len(landmarks)
            
            # Eye tracking with iris
            l_gaze_x, l_gaze_y = self.get_iris_position(
                landmarks, LEFT_IRIS_INDICES, LEFT_EYE_INDICES, img_w, img_h
            )
            r_gaze_x, r_gaze_y = self.get_iris_position(
                landmarks, RIGHT_IRIS_INDICES, RIGHT_EYE_INDICES, img_w, img_h
            )
            
            avg_gaze_x = (l_gaze_x + r_gaze_x) / 2
            avg_gaze_y = (l_gaze_y + r_gaze_y) / 2
            
            analysis["left_gaze_x"] = l_gaze_x
            analysis["left_gaze_y"] = l_gaze_y
            analysis["right_gaze_x"] = r_gaze_x
            analysis["right_gaze_y"] = r_gaze_y
            
            # Determine gaze direction
            is_looking_left = avg_gaze_x < (0.5 - self.gaze_threshold_x)
            is_looking_right = avg_gaze_x > (0.5 + self.gaze_threshold_x)
            is_looking_up = avg_gaze_y < (0.5 - self.gaze_threshold_y)
            is_looking_down = avg_gaze_y > (0.5 + self.gaze_threshold_y)
            
            if is_looking_left:
                analysis["gaze_direction"] = "left"
            elif is_looking_right:
                analysis["gaze_direction"] = "right"
            elif is_looking_up:
                analysis["gaze_direction"] = "up"
            elif is_looking_down:
                analysis["gaze_direction"] = "down"
            else:
                analysis["gaze_direction"] = "center"
            
            is_looking_away = is_looking_left or is_looking_right or is_looking_up
            analysis["is_looking_away"] = is_looking_away
            analysis["eye_contact"] = not is_looking_away
            
            # Head pose estimation
            head_pose = self.estimate_head_pose(landmarks, img_w, img_h)
            analysis["head_yaw"] = head_pose["yaw"]
            analysis["head_pitch"] = head_pose["pitch"]
            analysis["head_roll"] = head_pose["roll"]
            
            # Head pose classification
            yaw_violation = abs(head_pose["yaw"]) > self.yaw_threshold
            pitch_violation = abs(head_pose["pitch"]) > self.pitch_threshold
            
            analysis["head_pose_violation"] = yaw_violation or pitch_violation
            
            if abs(head_pose["yaw"]) < 10 and abs(head_pose["pitch"]) < 10:
                analysis["head_position"] = "centered"
            elif head_pose["yaw"] > self.yaw_threshold:
                analysis["head_position"] = "right"
            elif head_pose["yaw"] < -self.yaw_threshold:
                analysis["head_position"] = "left"
            elif head_pose["pitch"] > self.pitch_threshold:
                analysis["head_position"] = "down"
            elif head_pose["pitch"] < -self.pitch_threshold:
                analysis["head_position"] = "up"
            else:
                analysis["head_position"] = "tilted"
            
            # Calculate scores
            gaze_deviation = max(
                abs(avg_gaze_x - 0.5) / self.gaze_threshold_x,
                abs(avg_gaze_y - 0.5) / self.gaze_threshold_y
            )
            analysis["eye_contact_score"] = max(0, 100 - (gaze_deviation * 100))
            
            pose_deviation = max(
                abs(head_pose["yaw"]) / self.yaw_threshold,
                abs(head_pose["pitch"]) / self.pitch_threshold
            )
            analysis["head_position_score"] = max(0, 100 - (pose_deviation * 50))
            
            return analysis
            
        except Exception as e:
            logger.error(f"Frame analysis error: {e}")
            return {
                "face_detected": False,
                "error": str(e),
                "gaze_direction": "unknown",
                "is_looking_away": False,
                "head_position": "unknown",
                "head_pose_violation": False,
                "eye_contact": False,
                "eye_contact_score": 0.0,
                "head_position_score": 0.0
            }

eye_tracking_service = EyeTrackingService()
