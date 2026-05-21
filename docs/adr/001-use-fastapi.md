# ADR 001: Use FastAPI as the Python Web Framework

**Status:** Accepted  
**Date:** 2026-05-18  
**Deciders:** TaskForge backend team

---

## Context

TaskForge needed a Python REST API backend to serve as a feature-equivalent reference implementation alongside the Next.js frontend. The framework had to support:

- Async request handling to avoid blocking I/O under concurrent load
- First-class type safety so that request/response contracts could be enforced at runtime, not just by convention
- Automatic OpenAPI documentation generation for a self-documenting API that could be used as a tutorial reference
- Low ceremony — routing, dependency injection, and validation should not require significant boilerplate
- Good test ergonomics with an async-capable test client

The Python web framework ecosystem offered three mainstream options: Flask, Django (with Django REST Framework), and FastAPI.

---

## Decision

We will use **FastAPI** as the HTTP layer for the Python backend.

Business logic lives in `app/services/`, ORM models in `app/models/`, and Pydantic schemas in `app/schemas/`. FastAPI routers in `app/routers/` are thin: they validate input, call a service, and return the response. Auth is enforced via `Depends(get_current_user)` on every protected route.

---

## Alternatives Considered

### Flask

Flask is a micro-framework that gives full control over every layer. It is synchronous by default (WSGI), though async support exists via `asgiref` or `Quart`. Its minimal surface area is an advantage for simple services but a liability here: validation, serialization, and OpenAPI docs all require third-party extensions (`flask-pydantic`, `flask-restx`, `flasgger`). Integrating and maintaining those extensions adds friction and version-coupling that does not exist in FastAPI's batteries-included design.

**Rejected because:** no built-in validation or docs, sync-first design requires extra wiring for async, and the extension ecosystem adds dependency risk.

### Django + Django REST Framework (DRF)

Django is a full-stack framework with a mature ORM, admin interface, and a large ecosystem. DRF adds serializers, viewsets, and browsable API support. However, Django's ORM and migration system duplicate functionality already covered by SQLAlchemy and Alembic — the chosen ORM stack — and adopting Django's ORM instead would require abandoning SQLAlchemy's explicit, composable query model. Django is also synchronous at its core; async views exist in Django 4.1+ but DRF does not fully support them. The total footprint is significantly larger than what a REST-only backend needs.

**Rejected because:** heavier footprint than required, ORM conflict with SQLAlchemy, and incomplete async support in DRF.

---

## Consequences

### Positive

- **Async support:** FastAPI is built on Starlette (ASGI), so all route handlers can be `async def` without additional configuration. This maps directly to `asyncpg` or async SQLAlchemy sessions if the project later migrates off SQLite.
- **Type safety:** Pydantic v2 models validate every request body and response at runtime. Type errors surface as HTTP 422 responses with field-level detail rather than runtime exceptions deep in service code.
- **Auto-generated docs:** Swagger UI at `/docs` and ReDoc at `/redoc` are produced directly from route signatures and Pydantic schemas with no extra configuration. This is especially useful as a tutorial reference where readers inspect the API contract without reading the source.
- **Dependency injection:** FastAPI's `Depends()` system makes auth, DB sessions, and shared config composable and easy to override in tests.
- **Test ergonomics:** `httpx.AsyncClient` with the ASGI transport lets tests hit the full application stack — including middleware and dependency injection — without starting a real server.

### Negative / Trade-offs

- **Smaller ecosystem than Django:** FastAPI does not have a built-in admin panel, Django signals, or the breadth of third-party Django apps. Functionality like admin UIs or background task queues requires separate packages (e.g., SQLAdmin, Celery).
- **Less opinionated structure:** FastAPI does not enforce a project layout. The `services/` + `routers/` convention used here is a team decision, not a framework constraint, so new contributors must read `CLAUDE.md` rather than relying on Django convention.
- **Pydantic v2 migration cost:** Future upgrades within the Pydantic v2 line or to v3 may introduce breaking schema changes; Flask projects using simple dict serialization would not face this risk.
