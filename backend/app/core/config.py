"""
ProctorAI Configuration Settings
"""
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = "ProctorAI"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-to-a-secure-long-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ADMIN_EMAIL: str = "admin@saveetha.com"
    ADMIN_PASSWORD: str = "Admin@123"
    SAVEETHA_DOMAIN: str = "saveetha.com"

    SQLITE_DB_URL: str = "sqlite+aiosqlite:///./proctorai.db"

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001"
    ]

    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024

    FACE_RECOGNITION_THRESHOLD: float = 0.6
    YOLO_CONFIDENCE_THRESHOLD: float = 0.5
    SUSPICIOUS_SCORE_THRESHOLD: int = 60
    HIGH_RISK_SCORE_THRESHOLD: int = 80

    SCORE_WEIGHT_FACE_MISSING: int = 25
    SCORE_WEIGHT_LOOKING_AWAY: int = 15
    SCORE_WEIGHT_MULTIPLE_PERSONS: int = 30
    SCORE_WEIGHT_PHONE_DETECTED: int = 30
    SCORE_WEIGHT_HEAD_POSE: int = 10

    LOOKING_AWAY_ALERT_THRESHOLD: int = 5
    FACE_MISSING_ALERT_THRESHOLD: int = 3

    REDIS_URL: str = "redis://localhost:6379"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""



settings = Settings()
