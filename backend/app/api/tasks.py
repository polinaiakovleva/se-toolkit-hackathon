from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.task import Priority, Status
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskParseRequest,
    TaskParseResponse,
    ParsedTask,
    TasksCreateRequest,
)
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/parse", response_model=list[TaskResponse])
async def parse_text_and_create_tasks(
    request: TaskParseRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Parse natural language text and create tasks.
    This is the main endpoint for the smart input feature.
    """
    service = TaskService(db)
    try:
        tasks = await service.parse_and_create_tasks(request.text)
        return tasks
    except ConnectionError as e:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to AI service. Please make sure Ollama is running (ollama serve)"
        )
    except TimeoutError as e:
        raise HTTPException(
            status_code=504,
            detail="AI request timed out. The model may still be loading. Please try again in a moment."
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing text: {str(e)}")


@router.post("/create", response_model=list[TaskResponse])
async def create_tasks_from_parsed(
    request: TasksCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create tasks from already-parsed data.
    Used after user confirms/edits parsed tasks.
    """
    service = TaskService(db)
    try:
        tasks = await service.create_tasks_from_parsed_data(request.tasks)
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating tasks: {str(e)}")


@router.post("/parse/preview", response_model=TaskParseResponse)
async def preview_parsed_tasks(
    request: TaskParseRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Parse text and return parsed tasks without creating them.
    Useful for preview before confirmation.
    """
    from app.services.llm_service import LLMService

    llm_service = LLMService()
    try:
        parsed_tasks = await llm_service.parse_tasks(request.text)
        return TaskParseResponse(
            tasks=parsed_tasks,
        )
    except ConnectionError as e:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to AI service. Please make sure Ollama is running (ollama serve)"
        )
    except TimeoutError as e:
        raise HTTPException(
            status_code=504,
            detail="AI request timed out. The model may still be loading. Please try again in a moment."
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing text: {str(e)}")


@router.get("", response_model=list[TaskResponse])
async def get_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get tasks with optional filters."""
    service = TaskService(db)

    # Convert string filters to enums if provided
    status_enum = None
    if status:
        try:
            status_enum = Status(status.lower())
        except ValueError:
            pass

    priority_enum = None
    if priority:
        try:
            priority_enum = Priority(priority.lower())
        except ValueError:
            pass

    tasks = await service.get_tasks(
        status=status_enum,
        priority=priority_enum,
        tag=tag,
        limit=100
    )
    return tasks


@router.get("/tags/list")
async def get_tags(
    db: AsyncSession = Depends(get_db),
):
    """Get all unique tags."""
    service = TaskService(db)
    tags = await service.get_all_tags()
    return {"tags": tags}


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single task by ID."""
    service = TaskService(db)
    task = await service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a task."""
    service = TaskService(db)
    task = await service.update_task(task_id, task_update)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/{task_id}")
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a task."""
    service = TaskService(db)
    success = await service.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}


@router.post("/briefing")
async def get_daily_briefing(
    db: AsyncSession = Depends(get_db),
):
    """
    Generate AI-powered daily briefing.
    Analyzes all tasks and provides a summary.
    """
    service = TaskService(db)
    try:
        briefing = await service.generate_briefing()
        return {"briefing": briefing}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating briefing: {str(e)}"
        )