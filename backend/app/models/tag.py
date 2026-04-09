import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Tag(Base):
    """Tag model for task categorization."""

    __tablename__ = "tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    color = Column(String(7), default="#3B82F6")  # Default blue color

    # Many-to-Many relationship with tasks
    tasks = relationship(
        "Task",
        secondary="task_tags",
        back_populates="tags",
        lazy="selectin",
    )

    def __repr__(self):
        return f"<Tag(id={self.id}, name='{self.name}')>"