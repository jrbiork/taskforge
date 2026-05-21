import pytest


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def project(client, auth_headers):
    """Create a project owned by the authenticated test user"""
    response = client.post(
        "/api/projects",
        json={"name": "Comment Test Project"},
        headers=auth_headers,
    )
    return response.json()


@pytest.fixture
def task(client, auth_headers, project):
    """Create a task inside the test project"""
    response = client.post(
        "/api/tasks",
        json={"title": "Comment Test Task", "project_id": project["id"]},
        headers=auth_headers,
    )
    return response.json()


@pytest.fixture
def second_user_headers(client):
    """Register a second user and return their auth headers"""
    client.post(
        "/api/auth/register",
        json={
            "email": "other@example.com",
            "name": "Other User",
            "password": "otherpass123",
            "role": "MEMBER",
        },
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "other@example.com", "password": "otherpass123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# POST /api/tasks/{task_id}/comments
# ---------------------------------------------------------------------------


def test_create_comment(client, auth_headers, task):
    """Test creating a comment on a task returns 201 with correct fields"""
    response = client.post(
        f"/api/tasks/{task['id']}/comments",
        json={"content": "This is a comment"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["content"] == "This is a comment"
    assert data["task_id"] == task["id"]
    assert "id" in data
    assert "author_id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_comment_unauthenticated(client, task):
    """Test that creating a comment without a token returns 401"""
    response = client.post(
        f"/api/tasks/{task['id']}/comments",
        json={"content": "No auth"},
    )
    assert response.status_code == 401


def test_create_comment_task_not_found(client, auth_headers):
    """Test that creating a comment on a non-existent task returns 404"""
    response = client.post(
        "/api/tasks/99999/comments",
        json={"content": "Ghost task"},
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_create_comment_on_another_users_task(client, second_user_headers, task):
    """Test that a user cannot comment on a task in another user's project"""
    response = client.post(
        f"/api/tasks/{task['id']}/comments",
        json={"content": "Sneaky comment"},
        headers=second_user_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/tasks/{task_id}/comments
# ---------------------------------------------------------------------------


def test_list_comments_empty(client, auth_headers, task):
    """Test that a task with no comments returns an empty list"""
    response = client.get(f"/api/tasks/{task['id']}/comments", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_comments_returns_all(client, auth_headers, task):
    """Test that all comments for a task are returned in order"""
    for content in ("First comment", "Second comment", "Third comment"):
        client.post(
            f"/api/tasks/{task['id']}/comments",
            json={"content": content},
            headers=auth_headers,
        )

    response = client.get(f"/api/tasks/{task['id']}/comments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["content"] == "First comment"
    assert data[2]["content"] == "Third comment"


def test_list_comments_unauthenticated(client, task):
    """Test that listing comments without a token returns 401"""
    response = client.get(f"/api/tasks/{task['id']}/comments")
    assert response.status_code == 401


def test_list_comments_task_not_found(client, auth_headers):
    """Test that listing comments for a non-existent task returns 404"""
    response = client.get("/api/tasks/99999/comments", headers=auth_headers)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_list_comments_on_another_users_task(client, second_user_headers, task):
    """Test that a user cannot list comments on a task in another user's project"""
    response = client.get(
        f"/api/tasks/{task['id']}/comments",
        headers=second_user_headers,
    )
    assert response.status_code == 404


def test_comments_isolated_between_tasks(client, auth_headers, project):
    """Test that comments on one task do not appear on another task"""
    task_a = client.post(
        "/api/tasks",
        json={"title": "Task A", "project_id": project["id"]},
        headers=auth_headers,
    ).json()
    task_b = client.post(
        "/api/tasks",
        json={"title": "Task B", "project_id": project["id"]},
        headers=auth_headers,
    ).json()

    client.post(
        f"/api/tasks/{task_a['id']}/comments",
        json={"content": "Only for Task A"},
        headers=auth_headers,
    )

    response = client.get(f"/api/tasks/{task_b['id']}/comments", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []
