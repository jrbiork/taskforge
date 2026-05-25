# Architect Review: Time Tracking

Decision: APPROVED

---

## Architecture Alignment

The spec follows the established Next.js 15 / Prisma / SQLite patterns correctly and consistently. The proposed route structure (`app/api/tasks/[id]/time-entries/route.ts`, `[entryId]/route.ts`, `timer/route.ts`, `projects/[id]/time-report/route.ts`) mirrors the existing nested route convention seen in the task and comment handlers. Auth is correctly gated via `getServerSession(authOptions)`, Zod is used for validation, and all DB access routes through the Prisma singleton in `lib/db.ts`. The ActivityEvent integration follows the existing `emitTask*` helper pattern in `lib/activity.ts`. No architectural deviations identified.

**Assessment: PASS**

---

## Feasibility

All required capabilities are available in the current stack:

- **Prisma 5 + SQLite** supports all proposed field types (`String`, `DateTime`, `Int?`, nullable relations with `onDelete: SetNull`). The `@updatedAt` directive works as expected.
- **Zod** can express all required validation rules (`.int().min(1).max(1440)`, `.datetime()`, `.enum(["start", "stop"])`).
- **Next.js 15 App Router** supports all proposed route file locations and HTTP methods.
- **React** polling every 30 seconds (`setInterval` + `clearInterval` on unmount) is trivially implementable for the live elapsed timer display.
- The "single active timer per user" invariant (AC #1) requires a transactional read-then-write: find any open `TimeEntry` for the user (where `stoppedAt IS NULL`), stop it, then create a new one. Prisma's `$transaction` handles this correctly on SQLite.

One feasibility note: SQLite does not support true `GROUP BY` aggregations in Prisma's query API — the time report will need to either use `prisma.$queryRaw` with parameterized SQL or perform in-application grouping after fetching raw rows. Both approaches are workable; see Implementation Recommendations.

**Assessment: PASS (with caveat on aggregation approach)**

---

## Data Model

The proposed `TimeEntry` model is well-designed. Key observations:

**Strengths:**
- Using `userId String?` with `onDelete: SetNull` correctly preserves project totals when a user is deleted (AC #8), consistent with the pattern used by `Task.assigneeId`.
- Using `taskId String` with `onDelete: Cascade` ensures no orphaned entries (AC #8), consistent with how `Comment` and `TaskLabel` cascade.
- Storing `startedAt` and `stoppedAt` as separate `DateTime` fields (rather than only a pre-computed duration) allows reconstructing elapsed time for running timers and provides an audit trail.
- Storing `minutes Int?` on stop avoids re-computing duration from timestamps on every read. The field is nullable to represent an in-flight timer.

**Concerns:**
1. **Dual source of truth risk:** Both `minutes` and the `startedAt`/`stoppedAt` interval encode duration once a timer is stopped. The implementation MUST ensure these stay consistent (always compute `minutes` from the interval on stop, never allow independent edits to `minutes` that diverge from the timestamps). This should be enforced in the service layer.
2. **Manual entry ambiguity:** For manually-entered entries, `startedAt` is semantically misleading — it represents "the date work was done" rather than a clock-start event. The spec uses `loggedAt` in the Zod schema but maps to `startedAt` in the model. This needs explicit handling: on manual POST, set `startedAt = loggedAt`, `stoppedAt = startedAt + minutes * 60 seconds`, and mark `minutes` directly. Document this convention clearly in code comments.
3. **Missing index:** The `timeEntries` relation will be queried frequently by `taskId` (task detail panel) and by `userId` (active timer lookup). Add `@@index([taskId])` and `@@index([userId, stoppedAt])` to the model for SQLite performance at scale.
4. **Back-relations:** The spec correctly calls out that `Task` and `User` need `timeEntries TimeEntry[]` back-relations. Do not forget to add these or Prisma will reject the schema.

**Assessment: PASS with required fixes — add indexes, document manual-entry convention, enforce minutes/timestamp consistency in service layer**

---

## Security

The spec addresses authorization explicitly and correctly:

- `VIEWER` role: no create/edit/delete — return 403.
- `MEMBER` role: can only mutate their own entries — return 403 if `entry.userId !== session.user.id`.
- `ADMIN` role: unrestricted.

**Gaps to address:**
1. **Role check must be server-side, every route.** The existing `route.ts` pattern already does `getServerSession` first, but the role/ownership check must be implemented explicitly in each of the four new route files. There is no shared middleware enforcing this — it is easy to forget on the `timer/route.ts` endpoint.
2. **`loggedAt` future-date validation:** AC #3 requires rejecting dates in the future. Zod's `.datetime()` does not enforce this by default — add `.refine(d => new Date(d) <= new Date(), { message: "loggedAt cannot be in the future" })` to `CreateTimeEntrySchema`.
3. **`projectId` ownership:** The time report endpoint (`GET /api/projects/[id]/time-report`) must verify the requesting user has access to that project (i.e., is a member of the project's organization or is the owner). The existing project routes perform this check — replicate it here.
4. **No injection risk** — Prisma parameterizes all queries. If `$queryRaw` is used for aggregation, use `Prisma.sql` tagged templates, never string interpolation.
5. **No XSS risk** — `description` is rendered in React which escapes by default; no `dangerouslySetInnerHTML` should be introduced.

**Assessment: PASS with required fixes — future-date refine on schema, role checks on all routes, project membership check on report endpoint**

---

## Performance

**N+1 risks:**
- The task board (`task-board.tsx`) currently queries tasks and their assignees/dependencies. If `totalMinutes` is added to the task card display, the board query must include an aggregate — use Prisma's `_sum` on `include: { _count: false }` (not available) or a separate `groupBy` query, or include `timeEntries: { select: { minutes: true, startedAt: true, stoppedAt: true } }` in the task `findMany` and sum in-application. Do NOT add a second round-trip per task card — this would be a classic N+1.
- For the task detail panel (`time-entry-list.tsx`), fetching all entries for a single task is fine at reasonable scale.

**Aggregation performance:**
- The project time report groups by task and user. With SQLite and a project that has hundreds of tasks and thousands of entries, an in-application group is fine for the tutorial scale. If using `$queryRaw`, a single SQL query with `GROUP BY task_id, user_id` is more efficient and recommended.
- The 30-second polling on `time-tracker-button.tsx` should call a lightweight endpoint (ideally just the active timer record for the current user on this task), not re-fetch all time entries.

**Assessment: PASS with recommendations — avoid N+1 on board query, keep timer polling endpoint lightweight**

---

## Testing

The spec correctly targets ≥99.9% coverage on new files, consistent with project standards.

**What must be tested:**
- API route handlers for all four new route files using Jest + `msw` or Prisma mock (consistent with `nextjs/tests/` conventions).
- The "single active timer" transaction logic — test that starting a second timer correctly stops and saves the first.
- Role-based authorization — test VIEWER (403), MEMBER own entry (200), MEMBER other's entry (403), ADMIN any entry (200).
- Manual entry validation — test `minutes` boundary values (0 → 422, 1 → 201, 1440 → 201, 1441 → 422) and future `loggedAt` (422).
- Timer persistence — test that `startedAt` is stored server-side and elapsed time is computed correctly.
- Time report aggregation — test grouping, filtering by `startDate`/`endDate`, and the three-level totals (project, task, user).
- Activity event emission — test that `TIME_ENTRY_CREATED`, `TIME_ENTRY_UPDATED`, `TIME_ENTRY_DELETED` events are written.
- `task-card.tsx` update — test that `totalMinutes` prop is rendered correctly in h/m format and that running timers update via polling.

The existing `nextjs/tests/` directory follows Jest + direct Prisma mocking patterns (seen in task-board and activity-feed tests) — new tests should follow the same structure.

**Assessment: PASS — testable with existing tooling; checklist above gives the implementer clear targets**

---

## Scope Clarity

The spec is detailed and implementable. Acceptance criteria are specific with concrete constraints (min/max values, HTTP status codes, ISO 8601 date formats, 30-second polling interval). The out-of-scope section clearly delineates what is excluded (billable rates, invoicing, approvals, offline support).

**Minor ambiguities to resolve before implementation:**

1. **`loggedAt` field mapping:** The Zod schema uses `loggedAt` but the Prisma model uses `startedAt`. The spec should explicitly state how `loggedAt` maps to model fields on manual creation. Recommended: treat `loggedAt` as the wall-clock start of the work period; set `startedAt = loggedAt` and `stoppedAt = loggedAt + minutes * 60s`.

2. **Running timer contribution to task card total (AC #6):** "Open/running timers contribute their elapsed time to this total in real time (updated every 30 seconds)." This means the client must add `Date.now() - startedAt` for any open entry to the sum of `minutes` for completed entries. This client-side computation should be isolated in a utility function and unit-tested.

3. **`actorId` on `ActivityEvent` when `userId` is null:** The `ActivityEvent` model requires a non-null `actorId` (FK to `User`, `onDelete: Cascade`). If a time entry is deleted by an admin after its original author was deleted (and `userId` is null), the `logTimeEntryActivity` helper must still supply the admin's `session.user.id` as `actorId`. This is straightforward but must be explicit in the helper's implementation.

4. **Project membership gate on time report:** The spec does not specify which roles can access the time report. Based on the data model and AC #5 ("project manager"), ADMIN and MEMBER roles should have access; VIEWER should be read-only (GET allowed) or restricted. Clarify and implement consistently.

**Assessment: PASS — spec is implementable as-written; ambiguities above are resolvable without PM clarification**

---

## Implementation Recommendations

1. **Add DB indexes to the Prisma model before migrating:**
   ```prisma
   @@index([taskId])
   @@index([userId, stoppedAt])
   ```

2. **Use a Prisma `$transaction` for the timer start flow** to atomically stop any existing open timer and create the new one. Do not implement this as two separate Prisma calls — a crash between them would leave two open timers.

3. **For the time report aggregation**, use `$queryRaw` with `Prisma.sql` tagged templates rather than in-application grouping. Example pattern:
   ```ts
   const rows = await prisma.$queryRaw<ReportRow[]>(Prisma.sql`
     SELECT taskId, userId, SUM(minutes) as totalMinutes
     FROM TimeEntry
     WHERE taskId IN (SELECT id FROM Task WHERE projectId = ${projectId})
       AND stoppedAt IS NOT NULL
       ${startDate ? Prisma.sql`AND startedAt >= ${startDate}` : Prisma.empty}
       ${endDate ? Prisma.sql`AND stoppedAt <= ${endDate}` : Prisma.empty}
     GROUP BY taskId, userId
   `);
   ```

4. **Isolate the `minutes` computation** into a shared utility `lib/time-utils.ts` (e.g., `computeMinutes(startedAt, stoppedAt): number`, `formatDuration(totalMinutes): string`). Both the API layer (on timer stop) and the client (for running timer display) need this logic — keeping it in one place makes it testable and avoids drift.

5. **Extend `TaskForBoard` type** in `lib/types.ts` to include `totalMinutes: number` so the task card can display logged hours without a separate fetch. Populate this field in the board's `findMany` by including `timeEntries: { select: { minutes: true } }` and summing in the resolver, or via a subquery.

6. **Do not add `totalMinutes` to the live `TaskCard` props via a new fetch per card** — compute it server-side when loading the board and pass it down as a prop. This avoids N+1 queries on the board view.

7. **Extend `ActivityAction` and `ActivityEntityType` unions in `lib/types.ts`** to include the new values (`TIME_ENTRY_CREATED`, `TIME_ENTRY_UPDATED`, `TIME_ENTRY_DELETED` and `"TIME_ENTRY"`) before implementing routes, so TypeScript enforces correct usage.

8. **The `time-tracker-button.tsx` polling interval** should use `useEffect` with `setInterval` and clean up on unmount. Use a `ref` to track the interval ID. Do not poll if `stoppedAt` is non-null (timer is not running).

9. **For the FastAPI track**, ensure the Alembic migration runs `alembic revision --autogenerate -m "add time entry model"` and is reviewed before applying — SQLite `ALTER TABLE` has limited support; the migration may need manual adjustment.

10. **Cover the timer transaction in integration tests** — mock Prisma's `$transaction` or use an in-memory SQLite database (as the FastAPI `conftest.py` does) to test the atomic stop-and-start behavior end-to-end.
