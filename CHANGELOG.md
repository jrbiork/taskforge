# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CSV export for task lists (Next.js) — click "Export CSV" in the task board to download the current filtered task list as a `.csv` file with columns: Title, Description, Status, Priority, Assignee, Created At

## [1.0.0] - 2026-05-18

### Added

#### Authentication
- User registration with bcrypt password hashing (both tracks)
- JWT-based authentication — HttpOnly cookie session via NextAuth.js (Next.js) and Bearer token via python-jose (FastAPI)
- `GET /api/auth/me` endpoint to retrieve the authenticated user's profile
- Role-based user model with `ADMIN`, `MEMBER`, and `VIEWER` roles

#### Projects
- Full CRUD for projects (`GET`, `POST`, `PATCH`/`PUT`, `DELETE`)
- Project status lifecycle: `ACTIVE` and `ARCHIVED`
- Project ownership — users only access their own projects
- Label management: create and list labels per project (FastAPI: `POST /api/projects/{id}/labels`, `GET /api/projects/{id}/labels`)

#### Tasks
- Full CRUD for tasks (`GET`, `POST`, `PATCH`/`PUT`, `DELETE`)
- Task status workflow: `TODO` → `IN_PROGRESS` → `DONE`
- Four-level priority system: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- Task assignment to project members
- Optional filtering by project (`?projectId` / `?project_id` query param)

#### Comments
- Comment creation and listing per task
- Comment authorship tied to the authenticated user

#### Labels
- Labels scoped to a project with a name and hex color
- Many-to-many relationship between tasks and labels via `TaskLabel` join table

#### Notification System (Next.js)
- `Notification` data model with types: `TASK_ASSIGNED`, `TASK_COMPLETED`, `MENTION`
- `GET /api/notifications` — returns up to 50 recent notifications with an unread count
- `PATCH /api/notifications/[id]` — mark a single notification as read
- `PATCH /api/notifications/read-all` — mark all notifications as read
- `notifyTaskAssigned` — fires when a task is created or reassigned; skips self-assignment
- `notifyTaskCompleted` — fires when a task moves to `DONE`; notifies the assignee and project owner
- `notifyMentions` — parses `@username` tokens in comment content and notifies each mentioned user
- `useNotifications` hook — polls every 30 seconds with visibility-awareness and optimistic updates
- `NotificationBell` component — dropdown with unread badge (capped at `99+`) and "Mark all read" action
- `NotificationBell` integrated into the global app layout header

#### Security & Validation
- `getServerSession()` auth guard on every Next.js API route handler
- `Depends(get_current_user)` JWT guard on every protected FastAPI endpoint
- Zod schema validation on all Next.js request bodies
- Pydantic v2 schema validation on all FastAPI request bodies
- CORS middleware with configurable allowed origins (FastAPI)

#### Testing
- FastAPI: `test_auth.py` — registration, login, token flow
- FastAPI: `test_projects.py` — CRUD, ownership enforcement
- FastAPI: `test_tasks.py` — CRUD, assignment, project scoping
- FastAPI: `test_comments.py` — create/list, auth guards, task isolation (12 tests)
- FastAPI: `test_security.py` — password hashing, JWT encode/decode, token expiry (11 tests)
- Next.js: notification service unit tests — mention parsing, assign/complete triggers, actor exclusion (17 tests)
- Next.js: `NotificationBell` component tests — badge rendering, mark-all callback (4 tests)

#### Documentation
- `ARCHITECTURE.md` — component diagrams and data-flow documentation for both tracks
- `NOTIFICATIONS_FEATURE.md` — full specification, architecture notes, and manual test checklist
- `CLAUDE.md` — project context and conventions for AI-assisted development

### Changed

- `fastapi/app/routers/comments.py`, `projects.py`, `tasks.py` — refactored for consistency and improved test coverage
- `fastapi/app/services/auth_service.py`, `project_service.py`, `task_service.py` — extracted business logic from routers into service layer
- `fastapi/app/utils/security.py` — hardened for edge-case scenarios covered by new security tests
- `nextjs/app/api/tasks/route.ts`, `nextjs/app/api/tasks/[id]/route.ts` — integrated notification triggers on create, reassign, and status-change to `DONE`
- `nextjs/app/api/comments/route.ts` — integrated `@mention` notification trigger on comment creation
- `nextjs/lib/types.ts` — added `NotificationType` union type and `Notification` interface
- `nextjs/prisma/schema.prisma` — added `Notification` model and updated `User`, `Task`, and `Project` relations
- `nextjs/app/layout.tsx` — added `NotificationBell` to the global header

### Fixed

- FastAPI service layer now returns consistent error shapes via shared exception handlers, replacing ad-hoc inline `HTTPException` raises in routers

### Removed

- No features were removed in this initial release

---

## Data Model Reference

| Entity | Key Fields |
|---|---|
| `User` | `id`, `email`, `name`, `role` (`ADMIN` \| `MEMBER` \| `VIEWER`) |
| `Project` | `id`, `name`, `status` (`ACTIVE` \| `ARCHIVED`), `ownerId` |
| `Task` | `id`, `title`, `status` (`TODO` \| `IN_PROGRESS` \| `DONE`), `priority` (`LOW` \| `MEDIUM` \| `HIGH` \| `URGENT`), `projectId`, `assigneeId` |
| `Comment` | `id`, `content`, `taskId`, `authorId` |
| `Label` | `id`, `name`, `color` (hex), `projectId` |
| `TaskLabel` | `taskId`, `labelId` (composite key) |
| `Notification` | `id`, `type`, `message`, `read`, `userId`, `taskId`, `projectId` |

[Unreleased]: https://github.com/rubens-biork/claude-code-tutorials-apps/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/rubens-biork/claude-code-tutorials-apps/releases/tag/v1.0.0
