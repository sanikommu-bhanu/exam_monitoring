import cv2
import numpy as np
import base64
from typing import Tuple

class EnrollmentValidator:
    def __init__(self):
        # Validation focuses on image quality (blur, lighting).
        # Face detection is handled by DeepFace in face_service.
        pass

    def validate_image(self, base64_img: str) -> Tuple[bool, str]:
        """
        Validates the base64 image for enrollment.
        Checks for blur, lighting.
        """
        try:
            if "data:image" in base64_img:
                base64_img = base64_img.split(",", 1)[1]
            img_data = base64.b64decode(base64_img)
            np_arr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                return False, "Invalid image format."

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Check Blur (Variance of Laplacian)
            blur_val = cv2.Laplacian(gray, cv2.CV_64F).var()
            if blur_val < 30:  # Threshold for blurriness
                return False, "Image is too blurry. Please capture a clear image."

            # Check Lighting (Brightness)
            brightness = np.mean(gray)
            if brightness < 30:
                return False, "Image is too dark. Improve lighting."
            if brightness > 240:
                return False, "Image is too bright/overexposed."

            return True, "Valid"

        except Exception as e:
            return False, f"Failed to validate image: {str(e)}"
