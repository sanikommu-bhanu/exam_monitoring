"""
ProctorAI Configuration Settings
"""
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # App
    APP_NAME: str = "ProctorAI"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    SQLITE_DB_URL: str = os.getenv("SQLITE_DB_URL", "sqlite+aiosqlite:///./proctorai.db")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://proctorAI.university.edu"
    ]
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # ML Models
    FACE_RECOGNITION_THRESHOLD: float = 0.6
    YOLO_CONFIDENCE_THRESHOLD: float = 0.5
    SUSPICIOUS_SCORE_THRESHOLD: int = 60
    HIGH_RISK_SCORE_THRESHOLD: int = 80
    
    # Scoring weights
    SCORE_WEIGHT_FACE_MISSING: int = 25
    SCORE_WEIGHT_LOOKING_AWAY: int = 15
    SCORE_WEIGHT_MULTIPLE_PERSONS: int = 30
    SCORE_WEIGHT_PHONE_DETECTED: int = 30
    SCORE_WEIGHT_HEAD_POSE: int = 10
    
    # Alert thresholds (seconds)
    LOOKING_AWAY_ALERT_THRESHOLD: int = 5
    FACE_MISSING_ALERT_THRESHOLD: int = 3
    
    # Redis (for real-time)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Email
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = 587
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
