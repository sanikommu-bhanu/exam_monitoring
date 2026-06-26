"""
Face Authentication Service using DeepFace
Supports: FaceNet, ArcFace, VGG-Face, DeepFace models
"""
import base64
import cv2
import numpy as np
from deepface import DeepFace
from pathlib import Path
from typing import List, Optional, Tuple
import logging
import uuid

logger = logging.getLogger(__name__)

class FaceAuthService:
    def __init__(self):
        self.model_name = "ArcFace"
        self.detector_backend = "opencv"
        self.distance_metric = "cosine"
        self.threshold = 0.50
        self.upload_dir = Path("uploads/face_images")
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        if "data:image" in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(base64_str)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Unable to decode image data")
        return img

    def encode_image_to_base64(self, img: np.ndarray) -> str:
        _, buffer = cv2.imencode('.jpg', img)
        return base64.b64encode(buffer).decode('utf-8')

    def validate_enrollment_image(self, img: np.ndarray) -> Tuple[bool, str]:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        brightness = float(np.mean(gray))

        if brightness < 30:
            return False, "Low lighting detected. Please improve room lighting."
        if blur_score < 50:
            return False, "Image is too blurry. Please retake the photo with a steady hand."

        faces = DeepFace.extract_faces(
            img_path=img,
            detector_backend=self.detector_backend,
            enforce_detection=False,
            align=False,
        )

        if not faces:
            return False, "No face detected. Please center your face in the frame."
        if len(faces) > 1:
            return False, "Multiple faces detected. Please ensure only one person is visible."

        return True, "Validation passed"

    async def register_face(
        self,
        student_id: str,
        image_base64: str,
    ) -> Tuple[bool, Optional[List[float]], Optional[str], str]:
        try:
            img = self.decode_base64_image(image_base64)
            is_valid, message = self.validate_enrollment_image(img)
            if not is_valid:
                return False, None, None, message

            embedding_result = DeepFace.represent(
                img_path=img,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True,
            )
            embedding = embedding_result[0]["embedding"]

            save_path = self.upload_dir / f"{student_id}_{uuid.uuid4().hex[:8]}.jpg"
            cv2.imwrite(str(save_path), img)

            return True, embedding, f"/uploads/face_images/{save_path.name}", "Face registered successfully"
        except Exception as e:
            logger.error(f"Face registration error: {e}")
            return False, None, None, f"Face registration failed: {str(e)}"

    async def verify_identity(
        self,
        student_id: str,
        live_image_base64: str,
        stored_embeddings: List[List[float]],
    ) -> Tuple[bool, float, str]:
        try:
            live_img = self.decode_base64_image(live_image_base64)
            live_result = DeepFace.represent(
                img_path=live_img,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True,
            )
            live_embedding = np.array(live_result[0]["embedding"])

            best_match_score = 0.0
            for stored_emb in stored_embeddings:
                stored_array = np.array(stored_emb)
                cosine_sim = np.dot(live_embedding, stored_array) / (
                    np.linalg.norm(live_embedding) * np.linalg.norm(stored_array)
                )
                confidence = float(cosine_sim) * 100
                if confidence > best_match_score:
                    best_match_score = confidence

            threshold_score = (1 - self.threshold) * 100
            if best_match_score >= threshold_score:
                return True, best_match_score, "Identity verified successfully"

            return False, best_match_score, f"Identity verification failed. Match: {best_match_score:.1f}%"
        except Exception as e:
            logger.error(f"Identity verification error: {e}")
            return False, 0.0, f"Verification error: {str(e)}"

    async def detect_face_in_frame(self, frame_base64: str) -> dict:
        try:
            img = self.decode_base64_image(frame_base64)
            faces = DeepFace.extract_faces(
                img_path=img,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=False,
            )

            result = {
                "face_detected": bool(faces),
                "face_count": len(faces),
                "face_region": None,
                "face_confidence": 0.0,
                "liveness_score": 0.0,
            }
            if faces:
                face = faces[0]
                if isinstance(face, dict):
                    result["face_region"] = face.get("facial_area")
                    result["face_confidence"] = float(face.get("confidence", 0.0))
            return result
        except Exception as e:
            logger.warning(f"Face detection error in frame: {e}")
            return {
                "face_detected": False,
                "face_count": 0,
                "face_region": None,
                "face_confidence": 0.0,
                "error": str(e),
            }

face_auth_service = FaceAuthService()
