# TaskForge — Architecture Document

## 1. System Overview

TaskForge is a project management application implemented as two independent, feature-equivalent backends — a Next.js full-stack monolith and a FastAPI REST API. Both share the same domain model and exist as parallel reference implementations for tutorial purposes.

Neither track uses microservices, serverless functions, or an external database server. Each is a single-process application with an embedded SQLite database, designed to run locally with minimal setup.

---

## 2. Component Diagrams

### 2a. Next.js Track

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Auth Pages  │  │ Project Pages│  │  Task Board UI   │  │
│  │  /auth/login │  │  /projects   │  │  (Kanban view)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │  HTTP / fetch   │                   │
┌─────────▼─────────────────▼───────────────────▼────────────┐
│                   Next.js 15 Server Process                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              App Router (SSR + RSC)                 │   │
│  │  app/page.tsx  app/projects/[id]/page.tsx           │   │
│  │  app/auth/login  app/auth/register                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API Route Handlers                     │   │
│  │  POST /api/auth/register                            │   │
│  │  [...nextauth] — NextAuth.js JWT session            │   │
│  │  GET/POST /api/projects                             │   │
│  │  GET/PATCH/DELETE /api/projects/[id]                │   │
│  │  GET/POST /api/tasks                                │   │
│  │  GET/PATCH/DELETE /api/tasks/[id]                   │   │
│  │  POST /api/comments                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────┐   ┌───────────────────────────────┐ │
│  │  lib/auth.ts      │   │  lib/db.ts                    │ │
│  │  NextAuth config  │   │  Prisma Client singleton      │ │
│  │  JWT callbacks    │   └──────────────┬────────────────┘ │
│  └───────────────────┘                  │                  │
└─────────────────────────────────────────┼──────────────────┘
                                          │ Prisma ORM
                                ┌─────────▼──────────┐
                                │   SQLite Database  │
                                │   (dev.db file)    │
                                └────────────────────┘
```

**React component tree (UI layer):**
```
app/layout.tsx  (SessionProvider)
└── app/page.tsx  (dashboard / redirect)
└── app/projects/[id]/page.tsx
    ├── components/project-list.tsx
    ├── components/task-board.tsx
    │   └── components/task-card.tsx
    └── components/comment-thread.tsx
```

---

### 2b. FastAPI Track

```
┌─────────────────────────────────────────────────────────────┐
│                  HTTP Client (browser / curl / frontend)    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP + Bearer JWT
┌───────────────────────────▼─────────────────────────────────┐
│                   FastAPI Server Process                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   app/main.py                       │   │
│  │  CORS middleware → Router mounting                  │   │
│  └────────┬────────────┬──────────────┬───────────────┘   │
│           │            │              │                     │
│  ┌────────▼──┐  ┌──────▼──┐  ┌───────▼────┐  ┌─────────┐ │
│  │  routers/ │  │routers/ │  │  routers/  │  │routers/ │ │
│  │  auth.py  │  │projects │  │  tasks.py  │  │comments │ │
│  └────────┬──┘  └──────┬──┘  └───────┬────┘  └────┬────┘ │
│           │            │              │             │       │
│  ┌────────▼──┐  ┌──────▼──────────────▼─────────────▼───┐ │
│  │ services/ │  │           services/                    │ │
│  │auth_svc   │  │  project_service  task_service         │ │
│  └────────┬──┘  └──────────────────┬─────────────────────┘ │
│           │                        │                        │
│  ┌────────▼────────────────────────▼─────────────────────┐ │
│  │                  app/database.py                      │ │
│  │           SQLAlchemy Session / Engine                 │ │
│  └───────────────────────┬────────────────────────────────┘ │
│                          │                                  │
│  ┌───────────────────────▼────────────────────────────────┐ │
│  │               app/models/  (ORM models)                │ │
│  │  user.py  project.py  task.py  comment.py  label.py   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ SQLAlchemy ORM
                 ┌─────────▼──────────┐
                 │   SQLite Database  │
                 │   (taskforge.db)   │
                 └────────────────────┘
```

---

## 3. Data Flow

### Authentication

**Next.js:**
```
Browser → POST /api/auth/register → bcryptjs hash → Prisma → SQLite
Browser → POST /api/auth/signin   → NextAuth CredentialsProvider
                                  → bcryptjs compare → Prisma → SQLite
                                  → JWT signed (NEXTAUTH_SECRET)
                                  → HttpOnly cookie set
Subsequent requests: cookie → NextAuth → decoded JWT → session object
```

**FastAPI:**
```
Client → POST /auth/register → passlib bcrypt hash → SQLAlchemy → SQLite
Client → POST /auth/login    → passlib compare → python-jose JWT minted
                             → Bearer token returned to client
Subsequent requests: Authorization: Bearer <token>
                   → Depends(get_current_user) → python-jose decode
                   → SQLAlchemy user lookup → request handler
```

---

### Core CRUD Flow (tasks, projects, comments)

**Next.js:**
```
React Component
  → fetch("/api/projects", { method: "POST", body })
  → Route Handler: getServerSession() [auth check]
  → Prisma Client (type-safe query)
  → SQLite
  ← Prisma result → JSON response
  ← Component re-renders with new data
```

**FastAPI:**
```
HTTP Client
  → e.g. POST /projects  (+ Bearer token header)
  → Router → Depends(get_current_user) [auth guard]
  → Service layer (project_service.py)
  → SQLAlchemy session.add() / session.query()
  → SQLite
  ← Pydantic schema serialization
  ← JSON response
```

---

### Request Lifecycle Comparison

| Step | Next.js | FastAPI |
|---|---|---|
| Auth check | `getServerSession(authOptions)` | `Depends(get_current_user)` |
| Validation | Zod schemas | Pydantic v2 models |
| DB access | Prisma Client | SQLAlchemy 2.0 Session |
| Serialization | `NextResponse.json()` | Pydantic response models |
| Error format | HTTP status + JSON body | FastAPI `HTTPException` |

---

## 4. External Dependencies and Integrations

### Next.js Track

| Package | Role | External? |
|---|---|---|
| `next` 15 | Framework, SSR, routing | No (local) |
| `next-auth` 4 | Authentication, JWT sessions | No (self-hosted) |
| `@prisma/client` 5 | ORM, type-safe DB access | No |
| `bcryptjs` | Password hashing | No |
| `zod` | Runtime schema validation | No |
| `@radix-ui/*` | Headless UI primitives | No |
| `lucide-react` | Icon set | No |
| `tailwindcss` | Utility CSS | No (build-time) |

There are **no external service integrations** (no email, no OAuth providers, no cloud storage, no analytics). NextAuth is configured with credentials-only — no Google/GitHub OAuth.

---

### FastAPI Track

| Package | Role | External? |
|---|---|---|
| `fastapi` | Web framework | No |
| `uvicorn` | ASGI server | No |
| `sqlalchemy` 2 | ORM | No |
| `alembic` | DB migrations | No |
| `pydantic` v2 | Validation + serialization | No |
| `pydantic-settings` | Config from env vars | No |
| `python-jose` | JWT signing/verification | No |
| `passlib[bcrypt]` | Password hashing | No |

Again, **no external service integrations**. All dependencies run in-process; the only I/O is to the local SQLite file.

---

## 5. Architectural Trade-offs

| Concern | Choice | Trade-off |
|---|---|---|
| Database | SQLite (file-based) | Zero-setup, not suitable for concurrent writes at scale |
| Auth | Self-hosted JWT | No third-party dependency, but no MFA/SSO out of the box |
| Monorepo layout | Two independent apps | Independently runnable, but no shared code between tracks |
| Migrations | Prisma `db push` / Alembic | Alembic gives versioned migrations; Prisma push is faster for dev |
| API style | REST | Simple and broadly understood; no GraphQL or tRPC |

---

*This document reflects the state of the codebase as of May 2026. Both tracks are tutorial reference implementations and not intended for production deployment.*
