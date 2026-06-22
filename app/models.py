from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime, UTC
from app.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    task_type = Column(String)
    payload = Column(String)
    priority = Column(Integer)
    status = Column(String)
    result = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC)
    )

    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC)
    )