import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, SQLModel
from datetime import datetime, timedelta
import bcrypt
import uuid

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.config import settings
from models.user import User, UserRole
from models.exam import Exam, ExamStatus

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

engine = create_async_engine(settings.SQLITE_DB_URL, echo=False, future=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
    async with async_session() as session:
        # Create student
        student_email = "student@example.com"
        student = (await session.exec(select(User).where(User.email == student_email))).first()
        if not student:
            student = User(
                email=student_email,
                hashed_password=hash_password("password123"),
                full_name="Test Student",
                role=UserRole.STUDENT,
                student_id="STU12345",
                department="Computer Science",
                face_verified=False
            )
            session.add(student)
        else:
            student.hashed_password = hash_password("password123")
            session.add(student)
            
        # Create admin
        admin_email = "admin@example.com"
        admin = (await session.exec(select(User).where(User.email == admin_email))).first()
        if not admin:
            admin = User(
                email=admin_email,
                hashed_password=hash_password("admin123"),
                full_name="System Admin",
                role=UserRole.ADMIN,
                department="Examination Board"
            )
            session.add(admin)
        else:
            admin.hashed_password = hash_password("admin123")
            session.add(admin)
            
        await session.commit()
        await session.refresh(student)
        await session.refresh(admin)
        
        # Create an exam if none exists
        exam = (await session.exec(select(Exam))).first()
        if not exam:
            exam = Exam(
                exam_code=f"EXAM-{uuid.uuid4().hex[:8].upper()}",
                title="Data Structures Mid-Term",
                subject="Computer Science",
                start_time=datetime.utcnow() - timedelta(minutes=5),
                end_time=datetime.utcnow() + timedelta(hours=2),
                duration_minutes=120,
                allowed_students=[student.student_id],
                created_by=admin.id,
                status=ExamStatus.ACTIVE
            )
            session.add(exam)
            await session.commit()
        else:
            # Add student to existing exam
            allowed = list(exam.allowed_students) if exam.allowed_students else []
            if student.student_id not in allowed:
                allowed.append(student.student_id)
                exam.allowed_students = allowed
                session.add(exam)
                await session.commit()

        print("Seed data created successfully.")
        print(f"Student: {student_email} / password123")
        print(f"Admin: {admin_email} / admin123")

if __name__ == "__main__":
    asyncio.run(seed())
