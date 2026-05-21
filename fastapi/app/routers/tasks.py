from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.task import Task, TaskCreate, TaskUpdate
from app.services.task_service import get_tasks, get_task, create_task, update_task, delete_task
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[Task])
def list_tasks(
    project_id: int | None = Query(None),
    sort_by: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all tasks, optionally filtered by project_id.

    Returns:
        - 200: List of tasks (may be empty)
        - 401: Unauthorized
        - 404: Project not found (if project_id provided)
        - 403: Access denied to project (if project_id provided)
    """
    return get_tasks(db, current_user, project_id, sort_by)


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_new_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new task.

    Returns:
        - 201: Task created successfully
        - 400: Invalid input data
        - 401: Unauthorized
        - 403: Access denied to project
        - 404: Project or assignee not found
    """
    return create_task(db, task_data, current_user)


@router.get("/{task_id}", response_model=Task)
def get_task_by_id(
    task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get a specific task by ID.

    Returns:
        - 200: Task retrieved successfully
        - 401: Unauthorized
        - 404: Task not found or access denied
    """
    return get_task(db, task_id, current_user)


@router.put("/{task_id}", response_model=Task)
def update_task_by_id(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a task.

    Returns:
        - 200: Task updated successfully
        - 400: Invalid input data
        - 401: Unauthorized
        - 404: Task not found or assignee not found
    """
    return update_task(db, task_id, task_data, current_user)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_by_id(
    task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Delete a task.

    Returns:
        - 204: Task deleted successfully
        - 401: Unauthorized
        - 404: Task not found or access denied
    """
    delete_task(db, task_id, current_user)
    return None
