"""
Face Authentication Service using DeepFace
Supports: FaceNet, ArcFace, VGG-Face, DeepFace models
"""
import cv2
import numpy as np
import base64
from deepface import DeepFace
from typing import Optional, Tuple, List
import logging
import asyncio
from pathlib import Path
import uuid

logger = logging.getLogger(__name__)

class FaceAuthService:
    def __init__(self):
        self.model_name = "ArcFace"  # Best accuracy
        self.detector_backend = "retinaface"  # Most accurate detector
        self.distance_metric = "cosine"
        self.threshold = 0.40  # Cosine threshold for ArcFace
        self.upload_dir = Path("uploads/face_images")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        """Decode base64 image to numpy array"""
        if "data:image" in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return img
    
    def encode_image_to_base64(self, img: np.ndarray) -> str:
        """Encode numpy array to base64"""
        _, buffer = cv2.imencode('.jpg', img)
        return base64.b64encode(buffer).decode('utf-8')
    
    async def register_face(
        self, 
        student_id: str, 
        image_base64: str
    ) -> Tuple[bool, Optional[List[float]], str]:
        """
        Register student face for future authentication
        Returns: (success, embedding, message)
        """
        try:
            img = self.decode_base64_image(image_base64)
            
            # Verify face is detected
            faces = DeepFace.extract_faces(
                img_path=img,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )
            
            if len(faces) == 0:
                return False, None, "No face detected in image"
            
            if len(faces) > 1:
                return False, None, "Multiple faces detected. Please ensure only one person is in frame"
            
            # Get face embedding
            embedding_result = DeepFace.represent(
                img_path=img,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )
            
            embedding = embedding_result[0]["embedding"]
            
            # Save face image
            save_path = self.upload_dir / f"{student_id}_{uuid.uuid4().hex[:8]}.jpg"
            cv2.imwrite(str(save_path), img)
            
            return True, embedding, f"/uploads/face_images/{save_path.name}"
            
        except Exception as e:
            logger.error(f"Face registration error: {e}")
            return False, None, f"Face registration failed: {str(e)}"
    
    async def verify_identity(
        self,
        student_id: str,
        live_image_base64: str,
        stored_embeddings: List[List[float]]
    ) -> Tuple[bool, float, str]:
        """
        Verify student identity during exam start
        Returns: (verified, confidence_score, message)
        """
        try:
            live_img = self.decode_base64_image(live_image_base64)
            
            # Get embedding from live image
            live_result = DeepFace.represent(
                img_path=live_img,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )
            
            live_embedding = np.array(live_result[0]["embedding"])
            
            # Compare with all stored embeddings
            best_match_score = 0.0
            
            for stored_emb in stored_embeddings:
                stored_array = np.array(stored_emb)
                
                # Cosine similarity
                cosine_sim = np.dot(live_embedding, stored_array) / (
                    np.linalg.norm(live_embedding) * np.linalg.norm(stored_array)
                )
                
                confidence = float(cosine_sim) * 100
                
                if confidence > best_match_score:
                    best_match_score = confidence
            
            is_verified = best_match_score >= (1 - self.threshold) * 100
            
            if is_verified:
                return True, best_match_score, "Identity verified successfully"
            else:
                return False, best_match_score, f"Identity verification failed. Match: {best_match_score:.1f}%"
                
        except Exception as e:
            logger.error(f"Identity verification error: {e}")
            return False, 0.0, f"Verification error: {str(e)}"
    
    async def detect_face_in_frame(self, frame_base64: str) -> dict:
        """
        Detect and analyze face in a live frame
        Returns face detection status and attributes
        """
        try:
            img = self.decode_base64_image(frame_base64)
            
            result = {
                "face_detected": False,
                "face_count": 0,
                "face_region": None,
                "face_confidence": 0.0,
                "liveness_score": 0.0,
            }
            
            faces = DeepFace.extract_faces(
                img_path=img,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                anti_spoofing=False  # Set True for production with model
            )
            
            result["face_count"] = len(faces)
            
            if len(faces) >= 1:
                result["face_detected"] = True
                result["face_region"] = faces[0].get("facial_area", {})
                result["face_confidence"] = float(faces[0].get("confidence", 0.0))
                
                # Attempt age/emotion analysis (optional, may slow down)
                # analysis = DeepFace.analyze(img, actions=["age", "gender"])
            
            return result
            
        except Exception as e:
            logger.warning(f"Face detection error in frame: {e}")
            return {
                "face_detected": False,
                "face_count": 0,
                "face_region": None,
                "face_confidence": 0.0,
                "error": str(e)
            }

face_auth_service = FaceAuthService()
