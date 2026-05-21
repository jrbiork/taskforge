# Add Task Priority Levels

## Overview

Add priority levels (low, medium, high, urgent) to tasks in both the Next.js and FastAPI tracks. Users will be able to set a priority when creating or editing a task, see a visual indicator in the task list, and sort tasks by priority. New tasks default to "medium" priority.

## Why

Tasks currently have no priority field, making it impossible to communicate urgency or triage work. Adding priority levels gives teams a lightweight way to surface what needs attention first without requiring a full sprint/backlog workflow.

## Acceptance Criteria

- [x] Priority selector (low / medium / high / urgent) appears in the task create form — already in `app/projects/[id]/page.tsx`
- [x] Task cards in the task list display a color-coded priority badge — already in `task-card.tsx`
- [x] Task list supports sorting by priority (urgent → high → medium → low)
- [x] New tasks default to "medium" priority — already the default in Prisma schema and Pydantic `TaskBase`
- [x] Prisma schema has `priority` field with `@default("MEDIUM")` — already present
- [x] No Alembic migration needed — `priority` column already exists in FastAPI model
- [x] Unit tests written with ≥ 99.9% coverage on new code
- [x] All existing tests continue to pass
- [x] TypeScript compiles without errors (Next.js track)
- [ ] Linting passes with no warnings (both tracks)

## Notes

- **Most of the data layer is already done.** Prisma schema has `priority String @default("MEDIUM")`, `lib/types.ts` exports `Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"`, the FastAPI `TaskPriority` enum and SQLAlchemy column already exist, and both Pydantic schemas (`TaskBase`, `TaskUpdate`) already carry the field. No migrations needed.
- The Next.js API routes (`POST /api/tasks`, `PATCH /api/tasks/[id]`) already accept and persist `priority` via Zod validation.
- `task-card.tsx` already renders a color-coded priority badge (`priorityColors` map). Visual indicator is complete.
- The create-task form in `app/projects/[id]/page.tsx` already has a `<Select>` with all four options defaulting to `MEDIUM`.
- **The only missing piece is priority-based sorting.** `TaskFilters` currently supports search + status filter but has no sort control. That is the sole remaining work.
- Out of scope: bulk priority editing, SLA/due-date automation based on priority.

## Plan

### Audit (5 min)
1. Read `nextjs/components/task-filters.tsx` — confirm current props/state shape (`filters` object, `onChange` callback) and what sort options, if any, exist.
2. Read `nextjs/app/projects/[id]/page.tsx` — confirm how `TaskFilters` output is consumed and how the task list is currently sorted before display.

### Next.js — Add Priority Sort (main work)
3. **Extend `TaskFilters` props** — add `sortBy: "priority" | "status" | "default"` (or extend the existing filters type in `lib/types.ts`) and a matching `<Select>` in the UI. Order of sort values for priority: `URGENT → HIGH → MEDIUM → LOW` (map to numeric weights 4→3→2→1).
4. **Apply sort in the project page** — after tasks are fetched/filtered, add a `useMemo` sort step keyed on `sortBy`. Keep existing status-filter and search-filter logic intact.
5. **Update `TaskFilters` tests** (`nextjs/tests/` or wherever the 10-case test suite lives) — add cases for the new sort prop and verify rendered output.

### FastAPI — Add Sort Query Param (parity)
6. **Extend `GET /tasks`** in `fastapi/app/routers/tasks.py` — add optional `sort_by: str | None = Query(None)` param; pass it to the service.
7. **Sort in `task_service.py`** — if `sort_by == "priority"`, apply `ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 END` (or use a Python-side sort on the returned list).
8. **Update `fastapi/tests/test_tasks.py`** — add test cases asserting tasks are returned in priority order when `?sort_by=priority` is passed.

### Acceptance check-off
9. Run `npm test` in `nextjs/` — all tests green, coverage ≥ 99.9% on changed files.
10. Run `make test` in `fastapi/` — all tests green.
11. Run `npm run build` in `nextjs/` — TypeScript compiles without errors.
12. Tick off acceptance criteria checkboxes above and update the Progress Log.

## Progress Log

- **2026-05-19** — Task created. No implementation started.
- **2026-05-19** — Audit complete (steps 1–2). Implemented Next.js priority sort (steps 3–4): added `SortBy` type to `lib/types.ts`, added sort `<Select>` to `TaskFilters`, wired `?sort=priority` URL param + client-side sort into `TaskBoard`. TypeScript compiles clean. Tests and FastAPI sort param still pending.
- **2026-05-19** — Steps 5–11 complete. Updated `task-filters.test.tsx` (14 tests, fixed Select mock to use context + aria-label, added sort select and sort interaction cases). Added `sort_by` query param to FastAPI router and Python-side priority sort in `task_service.py`. Added 2 FastAPI test cases (`test_list_tasks_sorted_by_priority`, `test_list_tasks_no_sort_preserves_insertion_order`). All 43 Next.js tests green, all 44 FastAPI tests green, TypeScript build clean. Linting pending.
