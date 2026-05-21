# CLAUDE.md

> This file provides context for Claude Code when working in this repository.

## Project Overview

TaskForge is a project management application (think lightweight Jira) that exists as two independent, feature-equivalent implementations:

- `nextjs/` — Next.js 15 full-stack monolith (UI + API + DB in one process)
- `fastapi/` — Python FastAPI REST backend (API-only, no frontend)

Both share the same domain model and are used as tutorial reference implementations. Neither has external service integrations — everything runs locally with SQLite.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full component diagrams and data flow.

---

## Quick Commands

### Next.js

```bash
cd nextjs
npm install
cp .env.example .env          # configure DATABASE_URL and NEXTAUTH_SECRET
npm run db:push               # create/sync SQLite schema
npm run seed                  # seed demo data
npm run dev                   # start dev server → http://localhost:3000
npm test                      # run Jest tests
```

### FastAPI

```bash
cd fastapi
pip install -e ".[dev]"       # install with dev dependencies
cp .env.example .env          # configure SECRET_KEY etc.
make migrate                  # run Alembic migrations
make seed                     # seed demo data
make run                      # start Uvicorn → http://localhost:8000
make test                     # run pytest
make test-cov                 # pytest with HTML coverage report
```

### FastAPI interactive docs

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Environment Variables

### Next.js (`.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Prisma SQLite path — `file:./dev.db` |
| `NEXTAUTH_URL` | App base URL — `http://localhost:3000` |
| `NEXTAUTH_SECRET` | JWT signing secret — generate with `openssl rand -base64 32` |

### FastAPI (`.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./taskforge.db` | SQLAlchemy DB URL |
| `SECRET_KEY` | *(must change)* | JWT signing secret |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Comma-separated allowed origins |

---

## Tech Stack

### Next.js Track

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, RSC) |
| Language | TypeScript 5 |
| Auth | NextAuth.js 4 — credentials + JWT cookie |
| ORM | Prisma 5 |
| Database | SQLite (`dev.db`) |
| Validation | Zod |
| UI | Tailwind CSS + shadcn/ui + Radix UI primitives |
| Tests | Jest + React Testing Library |

### FastAPI Track

| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| Language | Python 3.12+ |
| Auth | JWT Bearer tokens via `python-jose` + `passlib[bcrypt]` |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Database | SQLite (`taskforge.db`) |
| Validation | Pydantic v2 |
| Tests | pytest + httpx |

---

## Architecture

Both tracks are **single-process monoliths** with embedded SQLite — no external services.

**Next.js layers:** Browser → App Router (SSR/RSC) → API Route Handlers → Prisma → SQLite

**FastAPI layers:** HTTP client → Router → Service → SQLAlchemy → SQLite

Auth strategy differs:
- Next.js: HttpOnly cookie containing a NextAuth JWT
- FastAPI: `Authorization: Bearer <token>` header, token returned at login

---

## Data Model

All entities exist in both tracks with the same shape:

```
User        — email, password (bcrypt), name, role (ADMIN | MEMBER | VIEWER)
Project     — name, description, status (ACTIVE | ARCHIVED), ownerId → User
Task        — title, description, status (TODO | IN_PROGRESS | DONE),
              priority (LOW | MEDIUM | HIGH | URGENT), projectId, assigneeId
Comment     — content, taskId, authorId
Label       — name, color, projectId
TaskLabel   — join table (taskId, labelId)
```

Types are sourced from Prisma in the Next.js track (`lib/types.ts`) and from SQLAlchemy models + Pydantic schemas in FastAPI.

---

## Code Conventions

### Next.js / TypeScript

- No `any` types — use explicit types or extend Prisma-generated types from `lib/types.ts`
- No `console.log/error/warn` — use the project logger
- Use `<Link>` for navigation, never `onClick={() => router.push()}`
- API route handlers check auth via `getServerSession(authOptions)` before any DB access
- All Prisma queries go through the singleton in `lib/db.ts`
- Files < 500 lines; functions < 50 lines
- Unit tests required for new code (Jest, ≥ 99.9% coverage target)

### FastAPI / Python

- Auth guard is `Depends(get_current_user)` on every protected router
- Business logic lives in `app/services/`, not in routers
- ORM models in `app/models/`, Pydantic schemas in `app/schemas/`
- Add Alembic migrations for every schema change (`alembic revision --autogenerate -m "..."`)
- Lint with `ruff` before committing
- Tests use an in-memory SQLite DB (`conftest.py` handles setup/teardown)

---

## Security Guidelines

### Credentials and Secrets

- **Never hardcode credentials** — no passwords, tokens, API keys, or secrets in source files
- Reference secrets exclusively via environment variables (`process.env.KEY` / `os.environ["KEY"]`)
- `.env` files are gitignored; copy from `.env.example` which contains only placeholder values
- If a secret is accidentally committed, rotate it immediately — git history is public

### Environment File Rules

| File | Committed | Purpose |
|---|---|---|
| `.env.example` | Yes | Placeholder template — no real values |
| `.env` | No | Local dev secrets |
| `.env.production` | No | Production secrets — never edit via Claude |

### Authentication Patterns

- Next.js: every API route handler must call `getServerSession(authOptions)` before touching the DB; return `401` if session is null
- FastAPI: every protected endpoint must declare `Depends(get_current_user)`; never skip this on new routes
- Passwords are always hashed with bcrypt — never store or log plaintext passwords
- JWT secrets (`NEXTAUTH_SECRET` / `SECRET_KEY`) must be ≥ 32 random bytes; generate with `openssl rand -base64 32`

### Input Validation

- Next.js: validate all request bodies with Zod before passing to Prisma
- FastAPI: Pydantic schemas on every request body; never pass raw `dict` to ORM layer
- Never construct SQL strings with string interpolation — use parameterized queries (Prisma / SQLAlchemy handle this)
- Sanitize user-supplied content before rendering in the UI to prevent XSS

### Claude Code Permissions (`.claude/settings.local.json`)

The project settings block several risky operations by default:
- Force-pushes (`git push --force`) — require explicit user override
- `npm publish` / `docker push` — prevent accidental artifact publication
- Editing `.env.production` or `secrets/` paths — production config is off-limits
- `curl | bash` / `wget | bash` patterns — remote code execution guard

To temporarily lift a deny rule, add an explicit allow for the exact command in your personal `~/.claude/settings.json` (not committed).

---

## Project Structure

```
claude-code-tutorials-apps/
├── CLAUDE.md               ← you are here
├── ARCHITECTURE.md         ← component diagrams and data flow
├── nextjs/
│   ├── app/
│   │   ├── api/            ← Route Handlers (auth, projects, tasks, comments)
│   │   ├── auth/           ← login + register pages
│   │   └── projects/       ← project detail page
│   ├── components/         ← project-list, task-board, task-card, comment-thread
│   ├── lib/                ← auth.ts, db.ts, types.ts, utils.ts
│   ├── prisma/             ← schema.prisma, seed.ts
│   └── tests/
├── fastapi/
│   ├── app/
│   │   ├── routers/        ← auth, projects, tasks, comments
│   │   ├── services/       ← auth_service, project_service, task_service
│   │   ├── models/         ← SQLAlchemy ORM models
│   │   ├── schemas/        ← Pydantic request/response schemas
│   │   ├── config.py       ← pydantic-settings env config
│   │   ├── database.py     ← SQLAlchemy engine + session
│   │   └── main.py         ← app factory, middleware, router mounting
│   ├── alembic/            ← migration scripts
│   └── tests/              ← pytest suite (auth, projects, tasks)
└── README.md
```
