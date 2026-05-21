# Notification System — Backend Handoff

## What was built

Phases 1–4 of the notification plan are complete and all 29 tests pass.

---

## Schema (Phase 1)

**File:** `nextjs/prisma/schema.prisma`

Added `Notification` model with fields: `id`, `userId`, `type` (stored as `String`), `message`, `read` (default `false`), `taskId?`, `projectId?`, `createdAt`. Back-relations added to `User`, `Task`, and `Project`.

`NotificationType` is enforced as a TypeScript union type (`"TASK_ASSIGNED" | "TASK_COMPLETED" | "MENTION"`) in `lib/types.ts` rather than a Prisma enum — required because Prisma 5.x dropped SQLite enum emulation.

The `Notification` table exists in `prisma/dev.db`.

---

## Notification Service (Phase 2)

**File:** `nextjs/lib/notifications.ts`

| Export | Behaviour |
|---|---|
| `parseMentions(content)` | Returns deduplicated `@username` tokens from a string |
| `notifyTaskAssigned(taskId, taskTitle, projectId, assigneeId, actorId)` | Creates `TASK_ASSIGNED` notification; no-op if actor === assignee |
| `notifyTaskCompleted(taskId, taskTitle, projectId, assigneeId\|null, ownerId, actorId)` | Creates `TASK_COMPLETED` notifications for assignee + owner, skipping actor |
| `notifyMentions(taskId, projectId, content, actorId)` | Resolves `@username` to user IDs, creates `MENTION` notifications, skipping self |

**Tests:** `nextjs/tests/lib/notifications.test.ts` — 17 tests covering all helpers.

---

## API Routes (Phase 3)

| Route | Method | File | Behaviour |
|---|---|---|---|
| `/api/notifications` | GET | `app/api/notifications/route.ts` | Returns `{ notifications[], unreadCount }` for session user (50 most recent) |
| `/api/notifications/[id]` | PATCH | `app/api/notifications/[id]/route.ts` | Marks single notification read; 403 if not owner |
| `/api/notifications/read-all` | PATCH | `app/api/notifications/read-all/route.ts` | Marks all user notifications read; returns `{ updated: number }` |

All routes auth-guard with `getServerSession`; return 401 without session.

---

## Trigger Integration (Phase 4)

| Handler | File | Trigger |
|---|---|---|
| `POST /api/tasks` | `app/api/tasks/route.ts` | `notifyTaskAssigned` when `assigneeId` present |
| `PATCH /api/tasks/[id]` | `app/api/tasks/[id]/route.ts` | `notifyTaskAssigned` when `assigneeId` changes; `notifyTaskCompleted` when status changes to `DONE` |
| `POST /api/comments` | `app/api/comments/route.ts` | `notifyMentions` after comment created |

The `PATCH /api/tasks/[id]` pre-update fetch now includes `project: { select: { ownerId: true } }` to supply the owner ID to `notifyTaskCompleted` without a second query.

---

## Known differences from the original plan

- **Enums → strings**: Prisma 5.22 + SQLite does not support enum emulation. All enum fields in the schema are `String` with string default values. Type safety is maintained via TypeScript literal union types in `lib/types.ts`.
- **`resolveUserIds` not exported**: It is an internal helper inside `notifications.ts`; tested indirectly through `notifyMentions`.

---

## What's next (Phases 5–7)

- **Phase 5** — `lib/hooks/use-notifications.ts`: polling hook with 30 s interval, visibility guard, optimistic `markRead`/`markAllRead`.
- **Phase 6** — `components/notification-bell.tsx` + `app/layout.tsx`: bell icon, unread badge (capped at 99+), Radix dropdown, "Mark all as read" button.
- **Phase 7** — `tests/components/notification-bell.test.tsx`: badge render tests (0, 5, 100 → "99+"), markAllRead click.

The backend API is ready to consume; the frontend can be built and tested independently.
