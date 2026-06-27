from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime, UTC
from app.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    task_type = Column(String)
    payload = Column(String, nullable=True)
    priority = Column(Integer)
    status = Column(String)
    result = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    deadline_hours = Column(Integer, default=24)

    # Audio conversion specific fields
    original_filename = Column(String, nullable=True)
    output_filename = Column(String, nullable=True)
    output_path = Column(String, nullable=True)
    target_format = Column(String, nullable=True)
    conversion_status = Column(String, nullable=True)
    
    # Execution metrics and errors
    error_message = Column(String, nullable=True)
    output_size_bytes = Column(Integer, nullable=True)
    conversion_duration = Column(Integer, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC)
    )

    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC)
    )