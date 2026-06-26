"""
Authentication API Routes
"""
import base64
import bcrypt
import jwt
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.config import settings
from app.db.database import get_db
from ml.face_auth.face_service import face_auth_service
from models.user import (
    FaceEncoding,
    TokenResponse,
    User,
    UserCreate,
    UserLogin,
    UserProfileUpdate,
    UserResponse,
    UserRole,
)

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_jwt(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = (await session.exec(select(User).where(User.id == user_id))).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user

async def get_user_from_token(token: str, session: AsyncSession) -> User:
    payload = decode_jwt(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = (await session.exec(select(User).where(User.id == user_id))).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PROCTOR]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class FaceImageBody(BaseModel):
    image_base64: str

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: AsyncSession = Depends(get_db)):
    # Force student role during registration, prevent anyone from registering as admin
    if user_data.role != UserRole.STUDENT:
         raise HTTPException(status_code=403, detail="Only students can register")
         


    existing = (await session.exec(select(User).where(User.email == user_data.email))).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=UserRole.STUDENT,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return {"message": "User registered successfully", "user_id": user.id}

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, session: AsyncSession = Depends(get_db)):
    if credentials.email.lower() == settings.ADMIN_EMAIL.lower():
        user = (await session.exec(select(User).where(User.email == settings.ADMIN_EMAIL))).first()
        if not user:
            user = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=hash_password(credentials.password),
                full_name="ProctorAI Administrator",
                role=UserRole.ADMIN,
                is_active=True,
                is_profile_complete=True # Admin is always complete
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
    else:
        user = (await session.exec(select(User).where(User.email == credentials.email))).first()
        if not user:
            user = User(
                email=credentials.email,
                hashed_password=hash_password(credentials.password),
                role=UserRole.STUDENT,
                is_active=True,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    user.last_login = datetime.utcnow()
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            student_id=user.student_id,
            register_number=user.register_number,
            department=user.department,
            year=user.year,
            section=user.section,
            mobile_number=user.mobile_number,
            profile_image_url=user.profile_image_url,
            face_verified=user.face_verified,
            is_profile_complete=user.is_profile_complete,
            is_active=user.is_active,
            created_at=user.created_at,
            total_exams_taken=user.total_exams_taken,
            average_suspicion_score=user.average_suspicion_score,
            total_violations=user.total_violations,
        ),
    )

@router.patch("/me/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    current_user.full_name = profile_data.full_name.strip()
    current_user.register_number = profile_data.register_number.strip()
    current_user.student_id = profile_data.register_number.strip() # Map student_id to register_number
    current_user.department = profile_data.department.strip()
    current_user.year = profile_data.year
    current_user.section = profile_data.section.strip()
    current_user.mobile_number = profile_data.mobile_number.strip()

    if profile_data.profile_photo_base64:
        image_data = profile_data.profile_photo_base64
        if "data:image" in image_data:
            image_data = image_data.split(",", 1)[1]
        decoded = base64.b64decode(image_data)
        upload_dir = Path(settings.UPLOAD_DIR) / "profile_photos"
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / f"{current_user.id}.jpg"
        file_path.write_bytes(decoded)
        current_user.profile_image_url = f"/uploads/profile_photos/{file_path.name}"
        
    current_user.is_profile_complete = True
    current_user.updated_at = datetime.utcnow()
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        student_id=current_user.student_id,
        register_number=current_user.register_number,
        department=current_user.department,
        year=current_user.year,
        section=current_user.section,
        mobile_number=current_user.mobile_number,
        profile_image_url=current_user.profile_image_url,
        face_verified=current_user.face_verified,
        is_profile_complete=current_user.is_profile_complete,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        total_exams_taken=current_user.total_exams_taken,
        average_suspicion_score=current_user.average_suspicion_score,
        total_violations=current_user.total_violations,
    )

@router.post("/register-face")
async def register_face(
    body: FaceImageBody,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students may register face data")

    from ml.face_auth.enrollment_validator import EnrollmentValidator
    # Validate image first
    validator = EnrollmentValidator()
    is_valid, validation_msg = validator.validate_image(body.image_base64)
    if not is_valid:
        raise HTTPException(status_code=400, detail=validation_msg)

    success, embedding, image_url, message = await face_auth_service.register_face(
        current_user.id, body.image_base64
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    face_enc = FaceEncoding(
        encoding=embedding,
        image_url=image_url,
        created_at=datetime.utcnow(),
    ).model_dump(mode='json')

    encodings = list(current_user.face_encodings or [])
    encodings.append(face_enc)
    current_user.face_encodings = encodings
    current_user.face_verified = True
    current_user.updated_at = datetime.utcnow()

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(current_user, "face_encodings")

    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    return {"message": "Face registered successfully", "image_url": image_url}

@router.post("/verify-face")
async def verify_face(
    body: FaceImageBody,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students may verify face data")

    if not current_user.face_encodings:
        raise HTTPException(status_code=400, detail="No face registered. Please register face first.")

    stored_embeddings = [enc["encoding"] for enc in current_user.face_encodings]
    verified, confidence, message = await face_auth_service.verify_identity(
        current_user.id,
        body.image_base64,
        stored_embeddings,
    )

    return {
        "verified": verified,
        "confidence": confidence,
        "message": message,
        "student_id": current_user.student_id,
        "student_name": current_user.full_name,
    }

@router.post("/refresh")
async def refresh_token(
    payload: RefreshTokenRequest,
    session: AsyncSession = Depends(get_db),
):
    token_data = decode_jwt(payload.refresh_token)
    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = token_data.get("sub")
    user = (await session.exec(select(User).where(User.id == user_id))).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        student_id=current_user.student_id,
        register_number=current_user.register_number,
        department=current_user.department,
        year=current_user.year,
        section=current_user.section,
        mobile_number=current_user.mobile_number,
        profile_image_url=current_user.profile_image_url,
        face_verified=current_user.face_verified,
        is_profile_complete=current_user.is_profile_complete,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        total_exams_taken=current_user.total_exams_taken,
        average_suspicion_score=current_user.average_suspicion_score,
        total_violations=current_user.total_violations,
    )
