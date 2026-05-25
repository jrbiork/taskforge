# Spec: Time Tracking

**Status:** Draft  
**Priority:** High  
**Requested by:** 3 enterprise customers  
**Author:** pm-spec agent  
**Date:** 2026-05-22

---

## Overview

TaskForge users need a way to record, view, and manage time spent on individual tasks. This feature enables accurate client billing and team productivity reporting by providing start/stop timer controls on tasks, manual time entry editing, and aggregated time reports scoped to a project or user.

A new `TimeEntry` model will be introduced in the Prisma schema. Each entry records a duration (or open interval when a timer is running) linked to a specific task and the user who logged it. Time entries are the single source of truth for all reporting; the timer is a convenience mechanism that creates a `TimeEntry` on stop.

---

## User Stories

1. **As a team member,** I want to start a timer on a task so that my active work time is captured without manual calculation.

2. **As a team member,** I want to stop a running timer so that the elapsed time is saved as a completed time entry on that task.

3. **As a team member,** I want to manually add a time entry (date, duration, optional description) to a task so that I can log time I forgot to track with the timer.

4. **As a team member,** I want to edit or delete any of my own time entries on a task so that I can correct mistakes.

5. **As a project manager,** I want to view a time report for a project that shows total hours per task and per user so that I can analyze effort distribution and prepare client invoices.

6. **As a project manager,** I want to filter the time report by date range and by user so that I can generate period-specific billing summaries.

7. **As an admin,** I want to edit or delete any time entry (not only my own) so that I can correct data entry errors across the team.

8. **As a team member,** I want to see a running total of logged hours directly on the task card so that I have an at-a-glance view of effort spent.

---

## Acceptance Criteria

1. **Timer start/stop — single active timer per user:** A user can have at most one running timer at a time across all tasks. Starting a timer on a second task automatically stops the first timer and saves that entry before starting the new one.

2. **Timer persistence:** A running timer's start time is stored server-side (not in browser state). Refreshing the page or switching devices shows the correct elapsed time based on `startedAt` stored in the `TimeEntry` record.

3. **Manual entry validation:** When creating or editing a time entry manually, the duration must be a positive number of minutes (minimum 1, maximum 1440 per entry) and the logged date must not be in the future. Submitting an invalid entry returns a 422 response with a descriptive error message.

4. **Edit/delete authorization:** A `MEMBER` role user can only edit or delete their own time entries. An `ADMIN` role user can edit or delete any time entry. A `VIEWER` role user cannot create, edit, or delete any time entry. Unauthorized attempts return a 403 response.

5. **Time report aggregation:** The project time report endpoint returns, for a given project, the total minutes logged grouped by task and by user, filterable by `startDate` and `endDate` (ISO 8601 dates). The response includes `totalMinutes` at the project level, per-task level, and per-user level.

6. **Task card total:** The task card UI displays the sum of all completed time entries for that task (in hours and minutes, e.g. "2h 30m"). Open/running timers contribute their elapsed time to this total in real time (updated every 30 seconds via polling or on focus).

7. **Activity feed integration:** Creating, editing, and deleting a time entry produces an `ActivityEvent` record (entityType `"TIME_ENTRY"`) so that the project activity feed reflects time logging actions.

8. **No orphaned entries on task deletion:** When a task is deleted (cascade), all associated `TimeEntry` records are also deleted. When a user is deleted, their entries are retained but `userId` is set to null (soft reference) so project totals remain accurate.

---

## Technical Notes

### New Prisma Model — `nextjs/prisma/schema.prisma`

Add a `TimeEntry` model:

```prisma
model TimeEntry {
  id          String    @id @default(cuid())
  taskId      String
  userId      String?
  startedAt   DateTime
  stoppedAt   DateTime?          // null = timer is still running
  minutes     Int?               // computed and stored on stop, or set on manual entry
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  task Task  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

Also add the back-relations to `Task` (`timeEntries TimeEntry[]`) and `User` (`timeEntries TimeEntry[]`).

### API Routes — `nextjs/app/api/`

New route files following the existing pattern (auth check via `getServerSession` → Zod validation → Prisma):

| File | Methods | Purpose |
|---|---|---|
| `app/api/tasks/[id]/time-entries/route.ts` | `GET`, `POST` | List entries for a task; create a manual entry |
| `app/api/tasks/[id]/time-entries/[entryId]/route.ts` | `PATCH`, `DELETE` | Edit or delete a specific entry |
| `app/api/tasks/[id]/timer/route.ts` | `POST` | Start or stop the running timer for the current user on this task |
| `app/api/projects/[id]/time-report/route.ts` | `GET` | Aggregated time report for a project (query params: `userId`, `startDate`, `endDate`) |

### Zod Schemas

- `CreateTimeEntrySchema`: `{ minutes: z.number().int().min(1).max(1440), description: z.string().optional(), loggedAt: z.string().datetime() }`
- `UpdateTimeEntrySchema`: partial of the above
- `TimerActionSchema`: `{ action: z.enum(["start", "stop"]) }`

### Components — `nextjs/components/`

| File | Description |
|---|---|
| `time-entry-list.tsx` | List and inline-edit time entries on the task detail panel |
| `time-tracker-button.tsx` | Start/stop timer button with live elapsed display; accepts `taskId` prop |
| `time-report.tsx` | Project-level report table with date-range filter and user filter |

The `task-card.tsx` component will be updated to display the aggregated hours total fetched alongside task data. The `task-board.tsx` may need a minor update if task queries need to include `_count` or a computed `totalMinutes` field.

### Types — `nextjs/lib/types.ts`

Add `TimeEntry`, `TimeEntryWithUser`, and `TimeReportRow` types derived from Prisma-generated types, following the existing pattern used for `TaskWithDetails`.

### Activity Integration — `nextjs/lib/activity.ts`

Add a `logTimeEntryActivity` helper (analogous to existing helpers in `activity.ts`) called from the time-entry API routes to write `ActivityEvent` records for `TIME_ENTRY_CREATED`, `TIME_ENTRY_UPDATED`, and `TIME_ENTRY_DELETED` actions.

### FastAPI Track

Equivalent changes are required in the FastAPI implementation:
- New `TimeEntry` SQLAlchemy model in `fastapi/app/models/`
- New Pydantic schemas in `fastapi/app/schemas/`
- New service functions in `fastapi/app/services/time_entry_service.py`
- New router at `fastapi/app/routers/time_entries.py`
- Alembic migration: `alembic revision --autogenerate -m "add time entry model"`

### Testing

- Jest unit tests for new API route handlers in `nextjs/tests/`
- pytest tests for new FastAPI routes in `fastapi/tests/`
- Coverage target: ≥ 99.9% on all new files, consistent with project standards

---

## Out of Scope

- **Integrations with external time-tracking tools** (Toggl, Harvest, Clockify) — not in this release.
- **Billable/non-billable entry classification** — no billing rate or currency fields in this iteration.
- **Invoicing or billing document generation** — the report surfaces raw hours only; invoice creation is a separate feature.
- **Time budgets or estimates on tasks** — no "estimated vs. actual" comparison in this release.
- **Notifications triggered by time logging** — no Notification records created for time entries.
- **Mobile-specific offline timer** — timer relies on server-side `startedAt`; no offline/service-worker support.
- **Approval workflows** — no manager approval step before entries are counted in reports.
- **Team-wide or organization-wide time reports** — reports are scoped to a single project in this release.
