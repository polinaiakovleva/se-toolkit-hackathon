from typing import List
from uuid import UUID
from pydantic import BaseModel, Field


class TagBase(BaseModel):
    """Base tag schema."""

    name: str = Field(..., max_length=50)
    color: str = Field(default="#3B82F6", pattern="^#[0-9A-Fa-f]{6}$")


class TagCreate(TagBase):
    """Schema for creating a tag."""

    pass


class TagResponse(TagBase):
    """Schema for tag response."""

    id: UUID

    class Config:
        from_attributes = True