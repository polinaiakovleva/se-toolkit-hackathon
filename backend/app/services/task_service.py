from datetime import datetime
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import logging

from app.models.task import Task, Priority, Status
from app.models.tag import Tag
from app.schemas.task import TaskCreate, TaskUpdate, ParsedTask
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class TaskService:
    """Service for task operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm_service = LLMService()

    async def get_or_create_tag(self, name: str) -> Tag:
        """Get existing tag or create new one."""
        # Normalize tag name
        tag_name = name.lower().strip()
        if tag_name.startswith("#"):
            tag_name = tag_name[1:]

        result = await self.db.execute(select(Tag).where(Tag.name == tag_name))
        tag = result.scalar_one_or_none()

        if not tag:
            tag = Tag(name=tag_name)
            self.db.add(tag)
            await self.db.flush()

        return tag

    async def create_task_from_parsed(
        self, parsed_task: ParsedTask, source_text: str
    ) -> Task:
        """Create a task from parsed data."""
        # Don't use source_text as description - only use the parsed description
        task = Task(
            title=parsed_task.title,
            description=parsed_task.description if parsed_task.description else None,
            priority=parsed_task.priority,
            is_all_day=parsed_task.is_all_day,
        )

        # Parse deadline
        if parsed_task.deadline:
            try:
                task.deadline = datetime.fromisoformat(
                    parsed_task.deadline.replace("Z", "+00:00")
                )
            except ValueError as e:
                logger.warning(f"Invalid deadline format '{parsed_task.deadline}': {e}. Task will be created without deadline.")

        # Add tags
        for tag_name in parsed_task.tags:
            tag = await self.get_or_create_tag(tag_name)
            task.tags.append(tag)

        self.db.add(task)
        await self.db.flush()
        await self.db.refresh(task, ["tags"])

        return task

    async def parse_and_create_tasks(
        self, text: str, current_date: Optional[datetime] = None
    ) -> List[Task]:
        """Parse text and create tasks."""
        if current_date is None:
            current_date = datetime.now()

        parsed_tasks = await self.llm_service.parse_tasks(text, current_date)
        tasks = []

        for parsed_task in parsed_tasks:
            task = await self.create_task_from_parsed(parsed_task, text)
            tasks.append(task)

        return tasks

    async def create_tasks_from_parsed_data(
        self, parsed_tasks: List[ParsedTask]
    ) -> List[Task]:
        """Create tasks from already-parsed data."""
        tasks = []
        for parsed_task in parsed_tasks:
            task = await self.create_task_from_parsed(parsed_task, parsed_task.title)
            tasks.append(task)
        await self.db.commit()
        return tasks

    async def get_tasks(
        self,
        status: Optional[Status] = None,
        priority: Optional[Priority] = None,
        tag: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Task]:
        """Get tasks with optional filters."""
        query = select(Task).options(selectinload(Task.tags))

        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)
        if tag:
            query = query.join(Task.tags).where(Tag.name == tag.lower())

        query = query.order_by(Task.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_task(self, task_id: UUID) -> Optional[Task]:
        """Get a single task by ID."""
        result = await self.db.execute(
            select(Task).where(Task.id == task_id).options(selectinload(Task.tags))
        )
        return result.scalar_one_or_none()

    async def update_task(self, task_id: UUID, task_update: TaskUpdate) -> Optional[Task]:
        """Update a task."""
        task = await self.get_task(task_id)
        if not task:
            return None

        update_data = task_update.model_dump(exclude_unset=True)

        # Handle tags separately
        if "tags" in update_data:
            tag_names = update_data.pop("tags")
            task.tags.clear()
            for tag_name in tag_names:
                tag = await self.get_or_create_tag(tag_name)
                task.tags.append(tag)

        # Update other fields
        for field, value in update_data.items():
            setattr(task, field, value)

        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def delete_task(self, task_id: UUID) -> bool:
        """Delete a task."""
        task = await self.get_task(task_id)
        if not task:
            return False

        await self.db.delete(task)
        return True

    async def generate_briefing(self) -> str:
        """Generate AI briefing for all tasks."""
        tasks = await self.get_tasks(limit=1000)
        tasks_data = [
            {
                "title": t.title,
                "priority": t.priority.value,
                "deadline": t.deadline.isoformat() if t.deadline else None,
                "status": t.status.value,
            }
            for t in tasks
        ]
        return await self.llm_service.generate_briefing(tasks_data)

    async def get_all_tags(self) -> List[dict]:
        """Get all unique tags with their usage count."""
        result = await self.db.execute(select(Tag))
        tags = result.scalars().all()
        return [{"name": tag.name, "color": tag.color} for tag in tags]