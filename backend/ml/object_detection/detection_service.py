"""
YOLOv8 Object Detection Service
Detects: Mobile phones, multiple persons, books, earphones
"""
import cv2
import numpy as np
import base64
from ultralytics import YOLO
from typing import Dict, List, Tuple
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# COCO class names
PHONE_CLASSES = ["cell phone"]
PERSON_CLASS = ["person"]
FORBIDDEN_OBJECTS = ["cell phone", "book", "laptop", "tablet"]

class ObjectDetectionService:
    def __init__(self):
        # Load YOLOv8 model
        model_path = Path("ml/models/yolov8n.pt")
        
        try:
            if model_path.exists():
                self.model = YOLO(str(model_path))
            else:
                # Download automatically to current working directory
                self.model = YOLO("yolov8n.pt")
                
            logger.info("YOLOv8 model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load YOLOv8: {e}")
            self.model = None
        
        self.confidence_threshold = 0.15  # Reduced from 0.5 for better webcam detection
        self.person_overlap_threshold = 0.3
    
    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        if "data:image" in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        return cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    def detect_objects(self, frame_base64: str) -> Dict:
        """
        Run YOLOv8 detection on frame
        Returns detection results
        """
        result = {
            "persons_detected": 0,
            "multiple_persons": False,
            "phone_detected": False,
            "phone_confidence": 0.0,
            "phone_bbox": None,
            "forbidden_objects": [],
            "all_detections": [],
            "person_boxes": [],
            "detection_error": None
        }
        
        if self.model is None:
            result["detection_error"] = "YOLO model not loaded"
            return result
        
        try:
            img = self.decode_base64_image(frame_base64)
            
            # Run inference
            detections = self.model(
                img,
                conf=self.confidence_threshold,
                verbose=False
            )
            
            persons = []
            phones = []
            forbidden = []
            all_dets = []
            
            for det in detections[0].boxes:
                cls_id = int(det.cls[0])
                cls_name = self.model.names[cls_id]
                conf = float(det.conf[0])
                bbox = det.xyxy[0].tolist()  # [x1, y1, x2, y2]
                
                detection_obj = {
                    "class": cls_name,
                    "confidence": conf,
                    "bbox": bbox
                }
                
                all_dets.append(detection_obj)
                
                if cls_name in PERSON_CLASS:
                    persons.append(detection_obj)
                
                if cls_name in PHONE_CLASSES:
                    phones.append(detection_obj)
                    
                if cls_name in FORBIDDEN_OBJECTS:
                    forbidden.append(detection_obj)
            
            result["persons_detected"] = len(persons)
            result["multiple_persons"] = len(persons) > 1
            result["person_boxes"] = [p["bbox"] for p in persons]
            result["all_detections"] = all_dets
            result["forbidden_objects"] = [f["class"] for f in forbidden]
            
            if phones:
                best_phone = max(phones, key=lambda x: x["confidence"])
                result["phone_detected"] = True
                result["phone_confidence"] = best_phone["confidence"]
                result["phone_bbox"] = best_phone["bbox"]
            
            return result
            
        except Exception as e:
            logger.error(f"Object detection error: {e}")
            result["detection_error"] = str(e)
            return result
    
    def detect_noise(self, audio_level: float) -> Dict:
        """Analyze audio level for noise detection"""
        return {
            "noise_detected": audio_level > 0.7,
            "noise_level": audio_level,
            "noise_severity": (
                "high" if audio_level > 0.8 else
                "medium" if audio_level > 0.6 else
                "low"
            )
        }

object_detection_service = ObjectDetectionService()
