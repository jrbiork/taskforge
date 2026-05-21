# TaskForge API Reference

This document covers all API endpoints for both implementations of TaskForge:

- **[Next.js API](#nextjs-api)** — Route Handlers under `/api/*`, authenticated via NextAuth session cookie
- **[FastAPI](#fastapi-api)** — REST API under `/api/*`, authenticated via `Authorization: Bearer <token>` header

---

## Authentication Overview

### Next.js

All protected endpoints require an active NextAuth session (HttpOnly cookie set after login). Requests without a valid session return `401 Unauthorized`.

**Login flow:**
```bash
# Sign in via NextAuth credentials provider
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret"}'
```

### FastAPI

All protected endpoints require a JWT Bearer token obtained from `POST /api/auth/login`. Pass it as:
```
Authorization: Bearer <access_token>
```

Requests without a valid token return `401 Unauthorized`.

---

## Next.js API

Base URL: `http://localhost:3000`

---

### Authentication

#### Register

```
POST /api/auth/register
```

Creates a new user account. Passwords are hashed with bcrypt.

**Authentication:** None

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Minimum 6 characters |
| `name` | string | Yes | Minimum 2 characters |

**Response `201 Created`:**
```json
{
  "user": {
    "id": "cuid_abc123",
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

**Error responses:**

| Status | Reason |
|---|---|
| `400` | Validation error or email already in use |
| `500` | Internal server error |

**Example:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secret123", "name": "Alice"}'
```

---

### Projects

#### List projects

```
GET /api/projects
```

Returns all projects owned by the authenticated user, sorted by creation date descending. Includes task counts.

**Authentication:** Required

**Response `200 OK`:**
```json
[
  {
    "id": "cuid_proj1",
    "name": "Website Redesign",
    "description": "Q3 redesign initiative",
    "status": "ACTIVE",
    "ownerId": "cuid_user1",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-05-01T12:00:00.000Z",
    "owner": { "id": "cuid_user1", "name": "Alice", "email": "alice@example.com" },
    "tasks": [...]
  }
]
```

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Not authenticated |
| `500` | Internal server error |

**Example:**
```bash
curl http://localhost:3000/api/projects \
  -H "Cookie: next-auth.session-token=<session>"
```

---

#### Create project

```
POST /api/projects
```

**Authentication:** Required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Minimum 1 character |
| `description` | string | No | Project description |

**Response `201 Created`:**
```json
{
  "id": "cuid_proj2",
  "name": "Mobile App",
  "description": null,
  "status": "ACTIVE",
  "ownerId": "cuid_user1",
  "createdAt": "2026-05-18T09:00:00.000Z",
  "updatedAt": "2026-05-18T09:00:00.000Z",
  "owner": { "id": "cuid_user1", "name": "Alice", "email": "alice@example.com" }
}
```

**Error responses:**

| Status | Reason |
|---|---|
| `400` | Validation error |
| `401` | Not authenticated |
| `500` | Internal server error |

**Example:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session>" \
  -d '{"name": "Mobile App", "description": "iOS and Android app"}'
```

---

#### Get project

```
GET /api/projects/:id
```

Returns a single project with its tasks (ordered by creation date descending), task assignees, and labels.

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Project CUID |

**Response `200 OK`:**
```json
{
  "id": "cuid_proj1",
  "name": "Website Redesign",
  "status": "ACTIVE",
  "owner": { "id": "cuid_user1", "name": "Alice", "email": "alice@example.com" },
  "tasks": [
    {
      "id": "cuid_task1",
      "title": "Design mockups",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "assignee": { "id": "cuid_user2", "name": "Bob", "email": "bob@example.com" },
      "labels": []
    }
  ]
}
```

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Not authenticated |
| `404` | Project not found |
| `500` | Internal server error |

**Example:**
```bash
curl http://localhost:3000/api/projects/cuid_proj1 \
  -H "Cookie: next-auth.session-token=<session>"
```

---

#### Update project

```
PATCH /api/projects/:id
```

Partially updates a project. Only the project owner may update it.

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Project CUID |

**Request body** (all fields optional):

| Field | Type | Description |
|---|---|---|
| `name` | string | New project name (min 1 char) |
| `description` | string | New description |
| `status` | `"ACTIVE"` \| `"ARCHIVED"` | New status |

**Response `200 OK`:** Updated project object with owner.

**Error responses:**

| Status | Reason |
|---|---|
| `400` | Validation error |
| `401` | Not authenticated |
| `403` | Not the project owner |
| `404` | Project not found |
| `500` | Internal server error |

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/projects/cuid_proj1 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session>" \
  -d '{"status": "ARCHIVED"}'
```

---

#### Delete project

```
DELETE /api/projects/:id
```

Permanently deletes a project and all associated tasks, comments, and labels. Only the project owner may delete it.

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Project CUID |

**Response `200 OK`:**
```json
{ "success": true }
```

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Not authenticated |
| `403` | Not the project owner |
| `404` | Project not found |
| `500` | Internal server error |

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/projects/cuid_proj1 \
  -H "Cookie: next-auth.session-token=<session>"
```

---

### Tasks

#### List tasks

```
GET /api/tasks
```

Returns tasks visible to the authenticated user. Optionally filtered by project. Each task includes its assignee, project, and comments (newest first).

**Authentication:** Required

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | string | No | Filter tasks by project CUID |

**Response `200 OK`:**
```json
[
  {
    "id": "cuid_task1",
    "title": "Design mockups",
    "description": "Create Figma wireframes",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "projectId": "cuid_proj1",
    "assigneeId": "cuid_user2",
    "createdAt": "2026-04-01T08:00:00.000Z",
    "updatedAt": "2026-05-10T14:00:00.000Z",
    "assignee": { "id": "cuid_user2", "name": "Bob", "email": "bob@example.com" },
    "project": { "id": "cuid_proj1", "name": "Website Redesign" },
    "comments": [...]
  }
]
```

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Not authenticated |
| `500` | Internal server error |

**Example:**
```bash
curl "http://localhost:3000/api/tasks?projectId=cuid_proj1" \
  -H "Cookie: next-auth.session-token=<session>"
```

---

#### Create task

```
POST /api/tasks
```

Creates a new task. If `assigneeId` is provided, a `TASK_ASSIGNED` notification is sent to that user.

**Authentication:** Required

**Request body:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string | Yes | — | Minimum 1 character |
| `description` | string | No | — | Task description |
| `status` | `"TODO"` \| `"IN_PROGRESS"` \| `"DONE"` | No | `"TODO"` | Task status |
| `priority` | `"LOW"` \| `"MEDIUM"` \| `"HIGH"` \| `"URGENT"` | No | `"MEDIUM"` | Task priority |
| `projectId` | string | Yes | — | Project CUID |
| `assigneeId` | string | No | — | User CUID of assignee |

**Response `201 Created`:** Task object with assignee and project.

**Error responses:**

| Status | Reason |
|---|---|
| `400` | Validation error |
| `401` | Not authenticated |
| `500` | Internal server error |

**Example:**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session>" \
  -d '{
    "title": "Design mockups",
    "priority": "HIGH",
    "projectId": "cuid_proj1",
    "assigneeId": "cuid_user2"
  }'
```

---

#### Get task

```
GET /api/tasks/:id
```

Returns a single task with its assignee, project, and comments (oldest first).

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Task CUID |

**Response `200 OK`:** Task object with assignee, project, and comments array.

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Not authenticated |
| `404` | Task not found |
| `500` | Internal server error |

**Example:**
```bash
curl http://localhost:3000/api/tasks/cuid_task1 \
  -H "Cookie: next-auth.session-token=<session>"
```

---

#### Update task

```
PATCH /api/tasks/:id
```

Partially updates a task. Triggers notifications on assignment changes and status transitions to `DONE`.

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Task CUID |

**Request body** (all fields optional):

| Field | Type | Description |
|---|---|---|
| `title` | string | New title (min 1 char) |
| `description` | string | New description |
| `status` | `"TODO"` \| `"IN_PROGRESS"` \| `"DONE"` | New status |
| `priority` | `"LOW"` \| `"MEDIUM"` \| `"HIGH"` \| `"URGENT"` | New priority |
| `assigneeId` | string \| null | New assignee CUID, or null to unassign |

**Side effects:**
- If `assigneeId` changes to a new user → `TASK_ASSIGNED` notification sent to the new assignee
- If `status` changes to `"DONE"` → `TASK_COMPLETED` notification sent to the assignee

**Response `200 OK`:** Updated task object with assignee and project.

**Error responses:**

| Status | Reason |
|---|---|
| `400` | Validation error |
| `401` | Not authenticated |
| `404` | Task not found |
| `500` | Internal server error |

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/tasks/cuid_task1 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session>" \
  -d '{"status": "DONE"}'
```

---

#### Delete task

```
DELETE /api/tasks/:id
```

Permanently deletes a task and its comments.

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Task CUID |

**Response `200 OK`:**
```json
{ "success": true }
```

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Not authenticated |
| `404` | Task not found |
| `500` | Internal server error |

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/tasks/cuid_task1 \
  -H "Cookie: next-auth.session-token=<session>"
```

---

### Comments

#### Create comment

```
POST /api/comments
```

Adds a comment to a task. Parses `@username` mentions and sends `MENTION` notifications to the mentioned users.

**Authentication:** Required

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | Minimum 1 character. Supports `@name` mentions. |
| `taskId` | string | Yes | Task CUID |

**Response `201 Created`:**
```json
{
  "id": "cuid_comment1",
  "content": "Looks good @bob, approved!",
  "taskId": "cuid_task1",
  "authorId": "cuid_user1",
  "createdAt": "2026-05-18T10:30:00.000Z",
  "updatedAt": "2026-05-18T10:30:00.000Z",
  "author": { "id": "cuid_user1", "name": "Alice", "email": "alice@example.com" }
}
```

**Error responses:**

| Status | Reason |
|---|---|
| `400` | Validation error |
| `401` | Not authenticated |
| `500` | Internal server error |

**Example:**
```bash
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session>" \
  -d '{"content": "Ready for review @bob", "taskId": "cuid_task1"}'
```

---

### Notifications

#### List notifications

```
GET /api/notifications
```

Returns the 50 most recent notifications for the authenticated user, newest first.

**Authentication:** Required

**Response `200 OK`:**
```json
{
  "notifications": [
    {
      "id": "cuid_notif1",
      "type": "TASK_ASSIGNED",
      "message": "You were assigned to \"Design mockups\"",
      "read": false,
      "userId": "cuid_user2",
      "taskId": "cuid_task1",
      "createdAt": "2026-05-18T09:00:00.000Z",
      "task": { "id": "cuid_task1", "title": "Design mockups" }
    }
  ],
  "unreadCount": 3
}
```

**Notification types:**

| Type | Trigger |
|---|---|
| `TASK_ASSIGNED` | A task was assigned to you |
| `TASK_COMPLETED` | A task assigned to you was marked done |
| `MENTION` | You were `@mentioned` in a comment |

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Not authenticated |

**Example:**
```bash
curl http://localhost:3000/api/notifications \
  -H "Cookie: next-auth.session-token=<session>"
```

---

#### Mark notification as read

```
PATCH /api/notifications/:id
```

Marks a single notification as read. Only the notification's owner may update it.

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Notification CUID |

**Response `200 OK`:** Updated notification object with `read: true`.

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Not authenticated |
| `403` | Not the notification owner |
| `404` | Notification not found |

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/notifications/cuid_notif1 \
  -H "Cookie: next-auth.session-token=<session>"
```

---

#### Mark all notifications as read

```
PATCH /api/notifications/read-all
```

Marks all unread notifications as read for the authenticated user.

**Authentication:** Required

**Response `200 OK`:**
```json
{ "updated": 3 }
```

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Not authenticated |

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/notifications/read-all \
  -H "Cookie: next-auth.session-token=<session>"
```

---

---

## FastAPI API

Base URL: `http://localhost:8000`

Interactive docs: [`/docs`](http://localhost:8000/docs) (Swagger UI) · [`/redoc`](http://localhost:8000/redoc) (ReDoc)

All IDs are integers. All protected endpoints require `Authorization: Bearer <token>`.

---

### Authentication

#### Register

```
POST /api/auth/register
```

Creates a new user account.

**Authentication:** None

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Plain text (hashed server-side with bcrypt) |
| `name` | string | Yes | Display name |

**Response `201 Created`:**
```json
{
  "id": 1,
  "email": "alice@example.com",
  "name": "Alice",
  "role": "MEMBER",
  "created_at": "2026-05-18T09:00:00",
  "updated_at": "2026-05-18T09:00:00"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secret123", "name": "Alice"}'
```

---

#### Login

```
POST /api/auth/login
```

Authenticates a user and returns a JWT access token.

**Authentication:** None

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Registered email |
| `password` | string | Yes | Account password |

**Response `200 OK`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "alice@example.com",
    "name": "Alice",
    "role": "MEMBER"
  }
}
```

**Error responses:**

| Status | Reason |
|---|---|
| `401` | Invalid credentials |

**Example:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secret123"}'
```

---

#### Get current user

```
GET /api/auth/me
```

Returns the authenticated user's profile.

**Authentication:** Required

**Response `200 OK`:** User object (same shape as register response).

**Example:**
```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

---

### Projects

#### List projects

```
GET /api/projects
```

Returns all projects accessible to the authenticated user.

**Authentication:** Required

**Response `200 OK`:** Array of project objects.

```json
[
  {
    "id": 1,
    "name": "Website Redesign",
    "description": "Q3 redesign initiative",
    "status": "ACTIVE",
    "owner_id": 1,
    "created_at": "2026-01-15T10:00:00",
    "updated_at": "2026-05-01T12:00:00"
  }
]
```

**Example:**
```bash
curl http://localhost:8000/api/projects \
  -H "Authorization: Bearer <token>"
```

---

#### Create project

```
POST /api/projects
```

**Authentication:** Required

**Request body:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | Yes | — | Project name |
| `description` | string | No | — | Project description |
| `status` | `"ACTIVE"` \| `"ARCHIVED"` | No | `"ACTIVE"` | Initial status |

**Response `201 Created`:** Created project object.

**Example:**
```bash
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Mobile App", "description": "iOS and Android app"}'
```

---

#### Get project

```
GET /api/projects/{project_id}
```

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `project_id` | integer | Project ID |

**Response `200 OK`:** Project object.

**Error responses:**

| Status | Reason |
|---|---|
| `404` | Project not found or access denied |

**Example:**
```bash
curl http://localhost:8000/api/projects/1 \
  -H "Authorization: Bearer <token>"
```

---

#### Update project

```
PUT /api/projects/{project_id}
```

Fully replaces project fields. Omitted optional fields retain their current values.

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `project_id` | integer | Project ID |

**Request body** (all fields optional):

| Field | Type | Description |
|---|---|---|
| `name` | string | New project name |
| `description` | string | New description |
| `status` | `"ACTIVE"` \| `"ARCHIVED"` | New status |

**Response `200 OK`:** Updated project object.

**Example:**
```bash
curl -X PUT http://localhost:8000/api/projects/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "ARCHIVED"}'
```

---

#### Delete project

```
DELETE /api/projects/{project_id}
```

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `project_id` | integer | Project ID |

**Response `204 No Content`**

**Example:**
```bash
curl -X DELETE http://localhost:8000/api/projects/1 \
  -H "Authorization: Bearer <token>"
```

---

#### List project labels

```
GET /api/projects/{project_id}/labels
```

Returns all labels defined for a project.

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `project_id` | integer | Project ID |

**Response `200 OK`:**
```json
[
  { "id": 1, "project_id": 1, "name": "bug", "color": "#e11d48" },
  { "id": 2, "project_id": 1, "name": "feature", "color": "#16a34a" }
]
```

**Example:**
```bash
curl http://localhost:8000/api/projects/1/labels \
  -H "Authorization: Bearer <token>"
```

---

#### Create project label

```
POST /api/projects/{project_id}/labels
```

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `project_id` | integer | Project ID |

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Label name (e.g. `"bug"`) |
| `color` | string | Yes | Hex color code (e.g. `"#e11d48"`) |

**Response `201 Created`:** Created label object.

**Example:**
```bash
curl -X POST http://localhost:8000/api/projects/1/labels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "bug", "color": "#e11d48"}'
```

---

### Tasks

#### List tasks

```
GET /api/tasks
```

Returns tasks accessible to the authenticated user, optionally scoped to a project.

**Authentication:** Required

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_id` | integer | No | Filter tasks by project |

**Response `200 OK`:** Array of task objects.

```json
[
  {
    "id": 1,
    "title": "Design mockups",
    "description": "Create Figma wireframes",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "project_id": 1,
    "assignee_id": 2,
    "created_at": "2026-04-01T08:00:00",
    "updated_at": "2026-05-10T14:00:00"
  }
]
```

**Error responses:**

| Status | Reason |
|---|---|
| `403` | Access denied to specified project |
| `404` | Specified project not found |

**Example:**
```bash
curl "http://localhost:8000/api/tasks?project_id=1" \
  -H "Authorization: Bearer <token>"
```

---

#### Create task

```
POST /api/tasks
```

**Authentication:** Required

**Request body:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string | Yes | — | Task title |
| `description` | string | No | — | Task description |
| `status` | `"TODO"` \| `"IN_PROGRESS"` \| `"DONE"` | No | `"TODO"` | Task status |
| `priority` | `"LOW"` \| `"MEDIUM"` \| `"HIGH"` \| `"URGENT"` | No | `"MEDIUM"` | Task priority |
| `project_id` | integer | Yes | — | Project ID |
| `assignee_id` | integer | No | — | User ID of assignee |

**Response `201 Created`:** Created task object.

**Error responses:**

| Status | Reason |
|---|---|
| `403` | Access denied to project |
| `404` | Project or assignee not found |

**Example:**
```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Design mockups",
    "priority": "HIGH",
    "project_id": 1,
    "assignee_id": 2
  }'
```

---

#### Get task

```
GET /api/tasks/{task_id}
```

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `task_id` | integer | Task ID |

**Response `200 OK`:** Task object.

**Error responses:**

| Status | Reason |
|---|---|
| `404` | Task not found or access denied |

**Example:**
```bash
curl http://localhost:8000/api/tasks/1 \
  -H "Authorization: Bearer <token>"
```

---

#### Update task

```
PUT /api/tasks/{task_id}
```

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `task_id` | integer | Task ID |

**Request body** (all fields optional):

| Field | Type | Description |
|---|---|---|
| `title` | string | New title |
| `description` | string | New description |
| `status` | `"TODO"` \| `"IN_PROGRESS"` \| `"DONE"` | New status |
| `priority` | `"LOW"` \| `"MEDIUM"` \| `"HIGH"` \| `"URGENT"` | New priority |
| `assignee_id` | integer \| null | New assignee ID, or null to unassign |

**Response `200 OK`:** Updated task object.

**Error responses:**

| Status | Reason |
|---|---|
| `404` | Task or assignee not found |

**Example:**
```bash
curl -X PUT http://localhost:8000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "DONE", "assignee_id": 3}'
```

---

#### Delete task

```
DELETE /api/tasks/{task_id}
```

**Authentication:** Required

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `task_id` | integer | Task ID |

**Response `204 No Content`**

**Error responses:**

| Status | Reason |
|---|---|
| `404` | Task not found or access denied |

**Example:**
```bash
curl -X DELETE http://localhost:8000/api/tasks/1 \
  -H "Authorization: Bearer <token>"
```

---

### Comments

#### List comments for a task

```
GET /api/tasks/{task_id}/comments
```

Returns all comments on a task, ordered by creation date ascending.

**Authentication:** Required — user must own the task's project.

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `task_id` | integer | Task ID |

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "task_id": 1,
    "author_id": 1,
    "content": "First pass looks good",
    "created_at": "2026-05-10T09:00:00",
    "updated_at": "2026-05-10T09:00:00"
  }
]
```

**Example:**
```bash
curl http://localhost:8000/api/tasks/1/comments \
  -H "Authorization: Bearer <token>"
```

---

#### Create comment

```
POST /api/tasks/{task_id}/comments
```

Adds a comment to a task.

**Authentication:** Required — user must own the task's project.

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `task_id` | integer | Task ID |

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | Yes | Comment text |

**Response `201 Created`:** Created comment object.

**Example:**
```bash
curl -X POST http://localhost:8000/api/tasks/1/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"content": "Ready for review"}'
```

---

## Shared Data Models

### Enumerations

| Enum | Values |
|---|---|
| `Role` | `ADMIN`, `MEMBER`, `VIEWER` |
| `ProjectStatus` | `ACTIVE`, `ARCHIVED` |
| `TaskStatus` | `TODO`, `IN_PROGRESS`, `DONE` |
| `Priority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `NotificationType` *(Next.js only)* | `TASK_ASSIGNED`, `TASK_COMPLETED`, `MENTION` |

### Implementation differences

| Feature | Next.js | FastAPI |
|---|---|---|
| Auth mechanism | NextAuth session cookie | JWT Bearer token |
| IDs | CUID strings | Auto-increment integers |
| Comment routes | `POST /api/comments` | `GET/POST /api/tasks/{id}/comments` |
| Notifications | Yes (`/api/notifications`) | Not implemented |
| Labels | Via project detail response | `GET/POST /api/projects/{id}/labels` |
| Update method | `PATCH` (partial) | `PUT` (partial fields also accepted) |
