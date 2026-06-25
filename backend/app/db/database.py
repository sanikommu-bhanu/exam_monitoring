"""
SQLite Database Connection and Setup using SQLModel
"""
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.SQLITE_DB_URL, echo=False, future=True)

async def connect_db():
    try:
        # Import models here to ensure they are registered with SQLModel.metadata
        from models.user import User
        from models.exam import Exam
        from models.session import ExamSession
        from models.alert import Alert
        from models.violation import Violation
        
        async with engine.begin() as conn:
            # Create all tables
            await conn.run_sync(SQLModel.metadata.create_all)
            
        logger.info(f"Connected to SQLite Database at {settings.SQLITE_DB_URL}")
    except Exception as e:
        logger.error(f"Failed to connect to SQLite: {e}")
        raise

async def disconnect_db():
    await engine.dispose()
    logger.info("Disconnected from SQLite")

async def get_db() -> AsyncSession:
    """Dependency for getting async DB session"""
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
