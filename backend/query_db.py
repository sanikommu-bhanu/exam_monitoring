import asyncio
import sys
from sqlmodel import select
from app.db.database import async_session
from models.exam import ExamSession
from models.user import User

async def main():
    async with async_session() as s:
        sessions = (await s.exec(select(ExamSession))).all()
        print('Sessions:', [(s.id, s.student_id) for s in sessions])
        users = (await s.exec(select(User))).all()
        print('Users:', [(u.id, u.student_id, u.email) for u in users])

if __name__ == "__main__":
    asyncio.run(main())
