import pytest


def test_create_task(client, auth_headers):
    """Test creating a new task"""
    # Create a project first
    project_response = client.post(
        "/api/projects", json={"name": "Task Test Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    # Create a task
    response = client.post(
        "/api/tasks",
        json={
            "title": "Test Task",
            "description": "A test task",
            "status": "TODO",
            "priority": "MEDIUM",
            "project_id": project_id,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["status"] == "TODO"
    assert data["priority"] == "MEDIUM"
    assert data["project_id"] == project_id


def test_list_tasks(client, auth_headers):
    """Test listing tasks"""
    # Create a project
    project_response = client.post(
        "/api/projects", json={"name": "List Tasks Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    # Create tasks
    client.post(
        "/api/tasks",
        json={"title": "Task 1", "project_id": project_id},
        headers=auth_headers,
    )
    client.post(
        "/api/tasks",
        json={"title": "Task 2", "project_id": project_id},
        headers=auth_headers,
    )

    # List all tasks
    response = client.get("/api/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_list_tasks_by_project(client, auth_headers):
    """Test filtering tasks by project"""
    # Create two projects
    project1_response = client.post(
        "/api/projects", json={"name": "Project 1"}, headers=auth_headers
    )
    project1_id = project1_response.json()["id"]

    project2_response = client.post(
        "/api/projects", json={"name": "Project 2"}, headers=auth_headers
    )
    project2_id = project2_response.json()["id"]

    # Create tasks in different projects
    client.post(
        "/api/tasks", json={"title": "Task P1", "project_id": project1_id}, headers=auth_headers
    )
    client.post(
        "/api/tasks", json={"title": "Task P2", "project_id": project2_id}, headers=auth_headers
    )

    # Filter by project
    response = client.get(f"/api/tasks?project_id={project1_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Task P1"


def test_get_task(client, auth_headers):
    """Test getting a specific task"""
    project_response = client.post(
        "/api/projects", json={"name": "Task Detail Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    task_response = client.post(
        "/api/tasks",
        json={"title": "Get Test Task", "project_id": project_id},
        headers=auth_headers,
    )
    task_id = task_response.json()["id"]

    response = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task_id
    assert data["title"] == "Get Test Task"


def test_update_task(client, auth_headers):
    """Test updating a task"""
    project_response = client.post(
        "/api/projects", json={"name": "Update Task Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    task_response = client.post(
        "/api/tasks", json={"title": "Original Title", "project_id": project_id}, headers=auth_headers
    )
    task_id = task_response.json()["id"]

    response = client.put(
        f"/api/tasks/{task_id}",
        json={"title": "Updated Title", "status": "IN_PROGRESS"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["status"] == "IN_PROGRESS"


def test_delete_task(client, auth_headers):
    """Test deleting a task"""
    project_response = client.post(
        "/api/projects", json={"name": "Delete Task Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    task_response = client.post(
        "/api/tasks", json={"title": "Task to Delete", "project_id": project_id}, headers=auth_headers
    )
    task_id = task_response.json()["id"]

    response = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify task is deleted
    response = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 404


def test_get_task_not_found(client, auth_headers):
    """Test getting a non-existent task returns 404"""
    response = client.get("/api/tasks/99999", headers=auth_headers)
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


def test_create_task_project_not_found(client, auth_headers):
    """Test creating a task with non-existent project returns 404"""
    response = client.post(
        "/api/tasks",
        json={"title": "Task", "project_id": 99999},
        headers=auth_headers,
    )
    assert response.status_code == 404
    data = response.json()
    assert "project" in data["detail"].lower()


def test_create_task_assignee_not_found(client, auth_headers):
    """Test creating a task with non-existent assignee returns 404"""
    project_response = client.post(
        "/api/projects", json={"name": "Assignee Test Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    response = client.post(
        "/api/tasks",
        json={"title": "Task", "project_id": project_id, "assignee_id": 99999},
        headers=auth_headers,
    )
    assert response.status_code == 404
    data = response.json()
    assert "user" in data["detail"].lower()


def test_list_tasks_project_not_found(client, auth_headers):
    """Test listing tasks with non-existent project returns 404"""
    response = client.get("/api/tasks?project_id=99999", headers=auth_headers)
    assert response.status_code == 404
    data = response.json()
    assert "project" in data["detail"].lower()


def test_update_task_assignee_not_found(client, auth_headers):
    """Test updating task with non-existent assignee returns 404"""
    project_response = client.post(
        "/api/projects", json={"name": "Update Assignee Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    task_response = client.post(
        "/api/tasks", json={"title": "Task", "project_id": project_id}, headers=auth_headers
    )
    task_id = task_response.json()["id"]

    response = client.put(
        f"/api/tasks/{task_id}",
        json={"assignee_id": 99999},
        headers=auth_headers,
    )
    assert response.status_code == 404
    data = response.json()
    assert "user" in data["detail"].lower()


def test_delete_task_not_found(client, auth_headers):
    """Test deleting a non-existent task returns 404"""
    response = client.delete("/api/tasks/99999", headers=auth_headers)
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


def test_list_tasks_sorted_by_priority(client, auth_headers):
    """Test that ?sort_by=priority returns tasks ordered URGENT→HIGH→MEDIUM→LOW"""
    project_response = client.post(
        "/api/projects", json={"name": "Sort Priority Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    for title, priority in [
        ("Low task", "LOW"),
        ("Urgent task", "URGENT"),
        ("Medium task", "MEDIUM"),
        ("High task", "HIGH"),
    ]:
        client.post(
            "/api/tasks",
            json={"title": title, "priority": priority, "project_id": project_id},
            headers=auth_headers,
        )

    response = client.get(
        f"/api/tasks?project_id={project_id}&sort_by=priority", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    assert [t["priority"] for t in data] == ["URGENT", "HIGH", "MEDIUM", "LOW"]


def test_list_tasks_no_sort_preserves_insertion_order(client, auth_headers):
    """Test that without sort_by the order is not forced to priority"""
    project_response = client.post(
        "/api/projects", json={"name": "No Sort Project"}, headers=auth_headers
    )
    project_id = project_response.json()["id"]

    for title, priority in [("First", "LOW"), ("Second", "URGENT")]:
        client.post(
            "/api/tasks",
            json={"title": title, "priority": priority, "project_id": project_id},
            headers=auth_headers,
        )

    response = client.get(f"/api/tasks?project_id={project_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "First"
    assert data[1]["title"] == "Second"
