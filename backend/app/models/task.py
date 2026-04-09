import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Table, Enum as SQLEnum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Status(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


# Many-to-Many relationship table
task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Task(Base):
    """Task model for storing extracted tasks."""

    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    is_all_day = Column(Boolean, default=False)  # Flag for all-day tasks
    priority = Column(SQLEnum(Priority, values_callable=lambda obj: [e.value for e in obj]), default=Priority.MEDIUM)
    status = Column(SQLEnum(Status, values_callable=lambda obj: [e.value for e in obj]), default=Status.PENDING)
    source_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Many-to-Many relationship with tags
    tags = relationship(
        "Tag",
        secondary=task_tags,
        back_populates="tasks",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}')>"