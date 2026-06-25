"""
Authentication API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import Optional
import jwt
import bcrypt
import base64
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.database import get_db
from models.user import User, UserCreate, UserLogin, UserResponse, TokenResponse, UserRole
from app.core.config import settings
from ml.face_auth.face_service import face_auth_service
import logging

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

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = (await session.exec(select(User).where(User.id == user_id))).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PROCTOR]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: AsyncSession = Depends(get_db)):
    """Register a new user"""
    existing = (await session.exec(select(User).where(User.email == user_data.email))).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user_data.student_id:
        existing_student = (await session.exec(select(User).where(User.student_id == user_data.student_id))).first()
        if existing_student:
            raise HTTPException(status_code=400, detail="Student ID already registered")
    
    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        student_id=user_data.student_id,
        department=user_data.department,
        semester=user_data.semester,
    )
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return {"message": "User registered successfully", "user_id": user.id}

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, session: AsyncSession = Depends(get_db)):
    """Login and get JWT tokens"""
    user = (await session.exec(select(User).where(User.email == credentials.email))).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    user.last_login = datetime.utcnow()
    session.add(user)
    await session.commit()
    
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
            department=user.department,
            profile_image_url=user.profile_image_url,
            face_verified=user.face_verified,
            is_active=user.is_active,
            created_at=user.created_at,
        )
    )

@router.post("/register-face")
async def register_face(
    image_base64: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Register face encoding for a student"""
    success, embedding, result_msg = await face_auth_service.register_face(
        current_user.id, image_base64
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=result_msg)
    
    from models.user import FaceEncoding
    face_enc = FaceEncoding(
        encoding=embedding,
        image_url=result_msg,
        created_at=datetime.utcnow()
    ).model_dump()
    
    # create a new list and append because SQLAlchemy JSON mutability can be tricky
    encodings = current_user.face_encodings.copy() if current_user.face_encodings else []
    encodings.append(face_enc)
    
    current_user.face_encodings = encodings
    current_user.face_verified = True
    session.add(current_user)
    await session.commit()
    
    return {"message": "Face registered successfully", "image_url": result_msg}

@router.post("/verify-face")
async def verify_face(
    image_base64: str,
    current_user: User = Depends(get_current_user)
):
    """Verify identity at exam start"""
    if not current_user.face_encodings:
        raise HTTPException(status_code=400, detail="No face registered. Please register face first.")
    
    stored_embeddings = [enc["encoding"] for enc in current_user.face_encodings]
    
    verified, confidence, message = await face_auth_service.verify_identity(
        current_user.id,
        image_base64,
        stored_embeddings
    )
    
    return {
        "verified": verified,
        "confidence": confidence,
        "message": message,
        "student_id": current_user.student_id,
        "student_name": current_user.full_name
    }

@router.post("/refresh")
async def refresh_token(refresh_tok: str, session: AsyncSession = Depends(get_db)):
    """Refresh access token"""
    try:
        payload = jwt.decode(refresh_tok, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        user_id = payload.get("sub")
        user = (await session.exec(select(User).where(User.id == user_id))).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        token_data = {"sub": user.id, "email": user.email, "role": user.role}
        access_token = create_access_token(token_data)
        
        return {"access_token": access_token, "token_type": "bearer"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        student_id=current_user.student_id,
        department=current_user.department,
        profile_image_url=current_user.profile_image_url,
        face_verified=current_user.face_verified,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )
