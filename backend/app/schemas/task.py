from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.models.task import Priority, Status


class TagSchema(BaseModel):
    """Tag schema for nested serialization."""

    id: UUID
    name: str
    color: str

    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    """Base task schema."""

    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    is_all_day: Optional[bool] = None
    priority: Priority = Priority.MEDIUM


class TaskCreate(TaskBase):
    """Schema for creating a task."""

    tags: Optional[List[str]] = []
    source_text: Optional[str] = None


class TaskUpdate(BaseModel):
    """Schema for updating a task."""

    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    is_all_day: Optional[bool] = None
    priority: Optional[Priority] = None
    status: Optional[Status] = None
    tags: Optional[List[str]] = None


class TaskResponse(TaskBase):
    """Schema for task response."""

    id: UUID
    status: Status
    tags: List[TagSchema] = []
    source_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskParseRequest(BaseModel):
    """Request for parsing text into tasks."""

    text: str = Field(..., min_length=1, max_length=10000)


class ParsedTask(BaseModel):
    """A single parsed task from LLM."""

    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    deadline: Optional[str] = None  # ISO date string
    is_all_day: Optional[bool] = None
    tags: List[str] = []

    @field_validator('priority', mode='before')
    @classmethod
    def normalize_priority(cls, v):
        """Normalize priority to lowercase."""
        if isinstance(v, str):
            v_lower = v.lower()
            priority_map = {
                'low': Priority.LOW,
                'medium': Priority.MEDIUM,
                'high': Priority.HIGH,
                'critical': Priority.CRITICAL
            }
            return priority_map.get(v_lower, Priority.MEDIUM)
        return v


class TaskParseResponse(BaseModel):
    """Response from parsing text into tasks."""

    tasks: List[ParsedTask]
    raw_response: Optional[str] = None


class TasksCreateRequest(BaseModel):
    """Request for creating tasks from parsed data."""

    tasks: List[ParsedTask]