# TaskForge

A project management application — think lightweight Linear/Jira — built as the hands-on companion project for the **Claude Code Tutorial Series**.

TaskForge exists as two feature-equivalent, side-by-side implementations. Pick the stack you know:

| Track | Tech Stack | Directory |
|---|---|---|
| **Next.js** | Next.js 15, TypeScript, Prisma, SQLite, Tailwind, shadcn/ui | `./nextjs` |
| **FastAPI** | Python 3.12+, FastAPI, SQLAlchemy, SQLite, Pydantic v2 | `./fastapi` |

Both tracks implement the same features and the same API contract — tutorial concepts apply regardless of which track you choose. Everything runs on local SQLite; no external services required.

---

## Features

- **Projects** — create, archive, and manage projects with status tracking
- **Tasks** — board-style task management with status (`TODO`, `IN_PROGRESS`, `DONE`) and priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- **Comments** — threaded comments on tasks
- **Labels** — color-coded labels scoped to projects, applied to tasks
- **Notifications** — in-app notifications when tasks are assigned to you
- **Roles** — `ADMIN`, `MEMBER`, `VIEWER` per user
- **Auth** — JWT-based authentication (HttpOnly cookie in Next.js; Bearer token in FastAPI)

---

## Quick Start

### Next.js Track

```bash
cd nextjs
npm install
cp .env.example .env          # set DATABASE_URL and NEXTAUTH_SECRET
npm run db:push               # create SQLite schema via Prisma
npm run seed                  # load demo data
npm run dev                   # → http://localhost:3000
```

### FastAPI Track

```bash
cd fastapi
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env          # set SECRET_KEY
make migrate                  # run Alembic migrations
make seed                     # load demo data
make run                      # → http://localhost:8000
```

Interactive API docs:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Default Credentials (after seeding)

| Email | Password | Role |
|---|---|---|
| admin@taskforge.dev | password123 | Admin |
| alice@taskforge.dev | password123 | Member |
| bob@taskforge.dev | password123 | Member |
| viewer@taskforge.dev | password123 | Viewer |

---

## Project Structure

```
claude-code-tutorials-apps/
├── README.md               ← you are here
├── CLAUDE.md               ← project context for Claude Code
├── ARCHITECTURE.md         ← component diagrams and data flow
├── .claude/                ← Claude Code rules and settings
├── nextjs/
│   ├── app/
│   │   ├── api/            ← Route Handlers
│   │   │   ├── auth/       ← register, [...nextauth]
│   │   │   ├── projects/   ← CRUD + [id]
│   │   │   ├── tasks/      ← CRUD + [id]
│   │   │   ├── comments/   ← CRUD
│   │   │   └── notifications/ ← list, [id], read-all
│   │   ├── auth/           ← login + register pages
│   │   └── projects/       ← [id] project detail page
│   ├── components/         ← project-list, task-board, task-card,
│   │                          comment-thread, notification-bell
│   ├── lib/                ← auth.ts, db.ts, types.ts, utils.ts, hooks/
│   ├── prisma/             ← schema.prisma, seed.ts
│   └── tests/
└── fastapi/
    ├── app/
    │   ├── routers/        ← auth, projects, tasks, comments
    │   ├── services/       ← auth_service, project_service, task_service
    │   ├── models/         ← SQLAlchemy ORM models
    │   ├── schemas/        ← Pydantic request/response schemas
    │   ├── config.py       ← pydantic-settings env config
    │   ├── database.py     ← SQLAlchemy engine + session
    │   └── main.py         ← app factory, CORS, router mounting
    ├── alembic/            ← migration scripts
    └── tests/
```

---

## API Endpoints

Both tracks expose the same resource model. Paths below use the `/api` prefix that both implementations share.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Obtain a JWT token (FastAPI) / session cookie (Next.js) |

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List projects for the current user |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/:id` | Get a project by ID |
| `PATCH` | `/api/projects/:id` | Update a project |
| `DELETE` | `/api/projects/:id` | Delete a project |

### Tasks

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tasks?projectId=` | List tasks, filtered by project |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/:id` | Get a task by ID |
| `PATCH` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |

### Comments

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/comments?taskId=` | List comments for a task |
| `POST` | `/api/comments` | Add a comment |
| `DELETE` | `/api/comments/:id` | Delete a comment |

### Notifications (Next.js)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notifications` | List notifications + unread count |
| `PATCH` | `/api/notifications/:id` | Mark one notification as read |
| `POST` | `/api/notifications/read-all` | Mark all notifications as read |

---

## Data Model

```
User        — email (unique), password (bcrypt), name, role
Project     — name, description, status (ACTIVE | ARCHIVED), owner → User
Task        — title, description, status, priority, project, assignee → User
Comment     — content, task, author → User
Label       — name, color, project
TaskLabel   — join: task ↔ label
Notification — type, message, read, user, task?, project?
```

Status values: `TODO` | `IN_PROGRESS` | `DONE`  
Priority values: `LOW` | `MEDIUM` | `HIGH` | `URGENT`  
Role values: `ADMIN` | `MEMBER` | `VIEWER`

---

## Configuration

### Next.js (`.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Prisma SQLite path — `file:./dev.db` |
| `NEXTAUTH_URL` | App base URL — `http://localhost:3000` |
| `NEXTAUTH_SECRET` | JWT signing secret — `openssl rand -base64 32` |

### FastAPI (`.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./taskforge.db` | SQLAlchemy DB URL |
| `SECRET_KEY` | *(required)* | JWT signing secret |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime in minutes |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Comma-separated allowed origins |

---

## Tech Stack

### Next.js

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, RSC) |
| Language | TypeScript 5 |
| Auth | NextAuth.js 4 — credentials provider + JWT cookie |
| ORM | Prisma 5 |
| Database | SQLite |
| Validation | Zod |
| UI | Tailwind CSS + shadcn/ui + Radix UI primitives |
| Tests | Jest + React Testing Library |

### FastAPI

| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| Language | Python 3.12+ |
| Auth | JWT Bearer tokens via `python-jose` + `passlib[bcrypt]` |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Database | SQLite |
| Validation | Pydantic v2 |
| Tests | pytest + httpx |

---

## Development Workflow

### Running Tests

```bash
# Next.js
cd nextjs && npm test

# FastAPI
cd fastapi && make test
cd fastapi && make test-cov   # generates HTML coverage report
```

### Database Operations

```bash
# Next.js — push schema changes (no migration files)
npm run db:push

# FastAPI — generate and apply a migration after model changes
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

### Code Quality

```bash
# FastAPI
ruff check app/

# Next.js
npx tsc --noEmit
```

### Conventions

- No `console.log/error/warn` — use the project logger
- No `any` types in TypeScript — use explicit types or extend Prisma-generated types from `lib/types.ts`
- Files < 500 lines; functions < 50 lines
- New code requires unit tests at ≥ 99.9% coverage

---

## Tutorial Progression

The starter code is intentionally imperfect — tutorials progressively improve it:

| Tutorial | What You'll Add or Fix |
|---|---|
| T2: CLAUDE.md | Write and improve the project's CLAUDE.md |
| T4: Define → Plan → Iterate | Add task filtering and search |
| T5: Rules / Commands / Skills | Build custom slash commands |
| T7: Refactoring | Extract shared API client / repository pattern |
| T8: Documentation | Auto-generate API docs, README, ADRs |
| T9–T17 | Advanced features: notifications, activity feed, MCP, sub-agents, agent teams |

---

## Contributing

1. Create a feature branch from `main`: `feature/short-description` or `fix/issue-name`
2. Make changes — keep files under 500 lines, functions under 50 lines
3. Add tests for new code (≥ 99.9% coverage target)
4. Run the full test suite and ensure all tests pass
5. Write a commit message that explains the **why**, not just what changed
6. Open a PR against `main` with a clear description
7. Changes to the data model require parallel updates in **both** tracks

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for full component diagrams, request lifecycle comparisons, and architectural trade-off notes.

---

## License

MIT — Built for the Claude Code Tutorial Series by Lumenalta.
# taskforge
