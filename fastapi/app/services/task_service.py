from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate
from app.utils.exceptions import NotFoundException, ForbiddenException


_PRIORITY_ORDER = {"URGENT": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4}


def get_tasks(
    db: Session,
    user: User,
    project_id: int | None = None,
    sort_by: str | None = None,
) -> list[Task]:
    """Get tasks, optionally filtered by project and sorted by priority"""
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise NotFoundException(f"Project {project_id} not found")
        if project.owner_id != user.id:
            raise ForbiddenException("Access denied to this project")

    query = db.query(Task).join(Project).filter(Project.owner_id == user.id)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    tasks = query.all()
    if sort_by == "priority":
        tasks = sorted(tasks, key=lambda t: _PRIORITY_ORDER.get(t.priority, 5))
    return tasks


def get_task(db: Session, task_id: int, user: User) -> Task:
    """Get a specific task"""
    task = (
        db.query(Task)
        .join(Project)
        .filter(Task.id == task_id, Project.owner_id == user.id)
        .first()
    )
    if not task:
        raise NotFoundException(f"Task {task_id} not found or you do not have access")
    return task


def create_task(db: Session, task_data: TaskCreate, user: User) -> Task:
    """Create a new task"""
    project = db.query(Project).filter(Project.id == task_data.project_id).first()
    if not project:
        raise NotFoundException(f"Project {task_data.project_id} not found")
    if project.owner_id != user.id:
        raise ForbiddenException("Access denied to this project")

    if task_data.assignee_id:
        assignee = db.query(User).filter(User.id == task_data.assignee_id).first()
        if not assignee:
            raise NotFoundException(f"User {task_data.assignee_id} not found")

    task = Task(**task_data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task_id: int, task_data: TaskUpdate, user: User) -> Task:
    """Update a task"""
    task = get_task(db, task_id, user)

    if task_data.assignee_id:
        assignee = db.query(User).filter(User.id == task_data.assignee_id).first()
        if not assignee:
            raise NotFoundException(f"User {task_data.assignee_id} not found")

    update_data = task_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int, user: User) -> None:
    """Delete a task"""
    task = get_task(db, task_id, user)
    db.delete(task)
    db.commit()
