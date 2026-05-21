# Add Notification System

## Overview

Build a notification system for TaskForge that keeps users informed of activity
relevant to them. Notifications are persisted in the database and fetched via
polling. A badge in the app header shows the unread count; a dropdown lets users
view and dismiss individual notifications.

## Why

Users currently have no way to know when a task is assigned to them, when
something they own is completed, or when they are mentioned in a comment without
manually checking every project. This creates friction and causes missed work.

## Assumptions

- MVP scope: Next.js track only. FastAPI track can be added in a follow-up.
- Polling interval: 30 seconds is sufficient for MVP; real-time (WebSockets/SSE)
  is out of scope.
- Triggers are server-side only — notifications are created inside existing API
  route handlers at the point the event occurs (task creation, task status
  update, comment creation).
- "Mention" means `@username` substring match in a comment's content field.
- A user does not receive a notification for their own actions (e.g., assigning
  themselves, completing their own task).
- Dismissing a notification marks it read; there is no hard delete from the UI.
- No email or push notifications — in-app only.
- Unread badge caps display at 99+.

## Acceptance Criteria

### Database
- [x] `Notification` model added to `prisma/schema.prisma` with fields:
  `id`, `userId`, `type` (String), `message`, `read` (boolean, default false),
  `taskId` (nullable FK → Task), `projectId` (nullable FK → Project), `createdAt`
  — Note: SQLite (Prisma 5.22) doesn't support native enums; type stored as String
- [x] Migration applied (`prisma db push`)

### API
- [x] `GET /api/notifications` — returns all notifications for the session user,
  ordered by `createdAt` desc; includes total unread count
- [x] `PATCH /api/notifications/[id]` — marks a single notification as read
- [x] `PATCH /api/notifications/read-all` — marks all notifications as read
- [x] Notification created when a task is assigned to a user
  (`POST /api/tasks`, `PATCH /api/tasks/[id]` when `assigneeId` changes)
- [x] Notification created when a task is moved to `DONE`
  (`PATCH /api/tasks/[id]` when `status` changes to `DONE`) — notifies the
  assignee (if any) and the project owner
- [x] Notification created for each `@username` mention found in a new comment
  (`POST /api/comments`) — notifies the mentioned user(s)

### UI
- [x] Notification bell icon added to the app header
- [x] Badge on the bell shows unread count; hidden when count is 0; shows `99+`
  when count exceeds 99
- [x] Clicking the bell opens a dropdown listing the 20 most recent notifications
- [x] Each notification entry shows: message text, relative timestamp, and a
  visual distinction for unread vs. read state
- [x] Clicking a notification marks it read and navigates to the relevant task
- [x] "Mark all as read" button in the dropdown header
- [x] Dropdown closes on outside click or Escape key (Radix built-in)
- [x] Polling fetches fresh notifications every 30 seconds while the page is
  focused (`visibilitychange` / `document.hidden` guard to pause when tab is
  backgrounded)

### Quality
- [x] No TypeScript `any` — explicit types for all new code
- [x] No `console.log/error/warn`
- [x] Unit tests cover: notification creation helpers, unread-count derivation,
  mention-parsing logic
- [x] Existing tests continue to pass (29/29)

## Plan

### Phase 1 — Database & Schema

**Goal:** Persistent storage for notifications, no application code yet.

1. Add `NotificationType` enum to `prisma/schema.prisma`:
   ```
   enum NotificationType { TASK_ASSIGNED  TASK_COMPLETED  MENTION }
   ```
2. Add `Notification` model:
   ```
   model Notification {
     id        String           @id @default(cuid())
     userId    String
     type      NotificationType
     message   String
     read      Boolean          @default(false)
     taskId    String?
     createdAt DateTime         @default(now())

     user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
     task      Task?            @relation(fields: [taskId], references: [id], onDelete: SetNull)
   }
   ```
3. Add back-relations to `User` (`notifications Notification[]`) and
   `Task` (`notifications Notification[]`).
4. Run `npm run db:push` to sync the schema.

**Exit criterion:** `prisma.notification.create(...)` works in a test script
without errors.

---

### Phase 2 — Notification Service

**Goal:** A pure, testable helper module that creates notifications. No HTTP
layer yet — this keeps trigger logic out of route handlers and makes it unit
testable.

File: `nextjs/lib/notifications.ts`

Functions to implement:

```ts
// Parse @username tokens from comment text; return list of matched user names
parseMentions(content: string): string[]

// Look up users by name array, return their ids
resolveUserIds(names: string[]): Promise<string[]>

// Create a TASK_ASSIGNED notification (skip if actorId === assigneeId)
notifyTaskAssigned(taskId: string, taskTitle: string, assigneeId: string, actorId: string): Promise<void>

// Create TASK_COMPLETED notifications for assignee + project owner (skip self)
notifyTaskCompleted(taskId: string, taskTitle: string, assigneeId: string | null, projectOwnerId: string, actorId: string): Promise<void>

// Create MENTION notifications for each resolved user (skip self-mentions)
notifyMentions(taskId: string, commentContent: string, actorId: string): Promise<void>
```

All functions write via `prisma.notification.createMany` (or `create`) and
return `void` — callers do not need to await results if fire-and-forget is
acceptable.

**Exit criterion:** Unit tests pass for `parseMentions` (pure), and integration
tests pass for the three `notify*` helpers using a test DB.

---

### Phase 3 — API Routes

**Goal:** Three HTTP endpoints the frontend will call.

#### `GET /api/notifications`
File: `nextjs/app/api/notifications/route.ts`
- Auth-guard with `getServerSession`
- Query: `prisma.notification.findMany` where `userId === session.user.id`,
  `orderBy: { createdAt: 'desc' }`, `take: 50`
- Response: `{ notifications: Notification[], unreadCount: number }`
- `unreadCount` = `prisma.notification.count` where `userId` + `read: false`
  (run in parallel with `findMany`)

#### `PATCH /api/notifications/[id]`
File: `nextjs/app/api/notifications/[id]/route.ts`
- Auth-guard; verify `notification.userId === session.user.id` before update
- Body: `{ read: true }` (only field settable via API)
- Response: updated notification

#### `PATCH /api/notifications/read-all`
File: `nextjs/app/api/notifications/read-all/route.ts`
- Auth-guard
- `prisma.notification.updateMany` where `userId` + `read: false`
- Response: `{ updated: number }`

**Route conflict note:** Next.js resolves static segments before dynamic ones,
so `read-all` must be a sibling directory of `[id]`, not a child. File layout:
```
app/api/notifications/
  route.ts           ← GET
  [id]/route.ts      ← PATCH /:id
  read-all/route.ts  ← PATCH /read-all
```

**Exit criterion:** All three routes return correct responses via `curl`/
Postman; auth-guard returns 401 without a session.

---

### Phase 4 — Trigger Integration

**Goal:** Wire notification creation into existing route handlers without
changing their response contracts.

#### `POST /api/tasks` (`nextjs/app/api/tasks/route.ts`)
After `prisma.task.create` succeeds, if `data.assigneeId` is set:
```ts
await notifyTaskAssigned(task.id, task.title, data.assigneeId, session.user.id)
```

#### `PATCH /api/tasks/[id]` (`nextjs/app/api/tasks/[id]/route.ts`)
Fetch the task *before* the update (already done: `task` variable exists).
After `prisma.task.update` succeeds:

- If `data.assigneeId` changed and is non-null:
  ```ts
  await notifyTaskAssigned(updatedTask.id, updatedTask.title, data.assigneeId, session.user.id)
  ```
- If `data.status === 'DONE'` and previous status was not `DONE`:
  Need project owner — add `include: { project: { select: { ownerId: true } } }`
  to the pre-update fetch.
  ```ts
  await notifyTaskCompleted(task.id, task.title, task.assigneeId, task.project.ownerId, session.user.id)
  ```

#### `POST /api/comments` (`nextjs/app/api/comments/route.ts`)
After `prisma.comment.create` succeeds:
```ts
await notifyMentions(comment.taskId, comment.content, session.user.id)
```

**Key constraint:** The `notifyTaskCompleted` handler must fetch
`task.project.ownerId` in the pre-update query — the current handler only
fetches `{ id }`. Extend the `findUnique` include, not a second query.

**Exit criterion:** Manually trigger each event (assign, complete, comment with
@mention) and verify rows appear in the `Notification` table.

---

### Phase 5 — Frontend State: Notification Hook

**Goal:** Client-side state and polling, isolated from UI rendering.

File: `nextjs/lib/hooks/use-notifications.ts`

```ts
interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  loading: boolean
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export function useNotifications(): NotificationState
```

Implementation notes:
- `useState` for `notifications` and `unreadCount`
- Initial fetch on mount
- `setInterval` (30 s) that skips when `document.hidden` is true
- `visibilitychange` listener that fires an immediate fetch when tab regains
  focus after being hidden
- `markRead` calls `PATCH /api/notifications/[id]`, then optimistically sets
  `read: true` in local state and decrements `unreadCount`
- `markAllRead` calls `PATCH /api/notifications/read-all`, then sets all
  local notifications to `read: true` and `unreadCount` to 0
- Cleanup: `clearInterval` + `removeEventListener` in `useEffect` teardown

**Exit criterion:** Hook fetches on mount and polls correctly; marking read
updates state without a full re-fetch.

---

### Phase 6 — UI Components

**Goal:** Bell icon, badge, dropdown — all wired to the hook.

#### `components/notification-bell.tsx` (new)
- `'use client'` directive (needs state/effects)
- Consumes `useNotifications()`
- Renders:
  - `<Bell />` icon from `lucide-react` wrapped in a `<button>`
  - Red badge showing `unreadCount` (hidden at 0, capped at `99+`)
  - Dropdown panel (via Radix `@radix-ui/react-dropdown-menu` — already a
    dependency) listing the 20 most recent notifications
  - Each row: message, relative time (use `lib/utils.ts` or `Intl.RelativeTimeFormat`), bold/normal weight for unread/read distinction
  - Click on row: call `markRead(id)` then `router.push` to `/projects/[projectId]` derived from `notification.taskId` (may need a `projectId` field — see note below)
  - "Mark all as read" button in dropdown header
  - Close on outside click and Escape (built into Radix `DropdownMenu`)

**Note on navigation:** The current `Notification` model links to `taskId` but
not `projectId`. To navigate to a task, either:
  - (a) Add `projectId` to the `Notification` model in Phase 1 (preferred — avoids a client-side lookup), or
  - (b) Fetch the project from the task on click (adds latency)

Recommendation: go with (a) — add `projectId String?` to the schema in Phase 1
and populate it in each `notify*` helper.

#### `app/layout.tsx` (modify)
The nav is a Server Component. `NotificationBell` is a Client Component.
Add it to the authenticated nav bar between the user name and Sign Out:
```tsx
import NotificationBell from "@/components/notification-bell"
// ...
<NotificationBell />
```
The rest of the layout stays server-rendered.

**Exit criterion:** Bell renders in the header, badge increments when
notifications exist, dropdown opens/closes correctly, clicking a row navigates
and marks it read.

---

### Phase 7 — Tests

**Goal:** Cover the units called out in the acceptance criteria.

#### Unit tests (`tests/lib/notifications.test.ts`)
- `parseMentions`:
  - `"hello @alice and @bob"` → `["alice", "bob"]`
  - `"no mentions here"` → `[]`
  - Duplicate mentions deduplicated → single entry
  - Self-mention suppressed when actorId resolves to same user
- Unread count derivation: given a `notifications` array, count where
  `read === false`

#### Unit tests (`tests/components/notification-bell.test.tsx`)
- Renders null badge when `unreadCount === 0`
- Renders `"5"` when `unreadCount === 5`
- Renders `"99+"` when `unreadCount === 100`
- Calls `markAllRead` when "Mark all as read" is clicked

#### Integration (manual/e2e checklist — automated stretch goal)
- Assign a task → notification appears for assignee
- Complete a task → notification appears for assignee and project owner
- Write a comment with `@username` → mentioned user sees notification
- Marking one read → badge decrements by 1
- Marking all read → badge disappears

**Exit criterion:** `npm test` passes with no regressions; new test files reach
≥ 99.9% coverage on new `lib/notifications.ts` helpers.

---

### Phase Summary

| Phase | Files touched | Deliverable |
|---|---|---|
| 1 — Schema | `prisma/schema.prisma` | `Notification` table in DB |
| 2 — Service | `lib/notifications.ts` | Testable notification helpers |
| 3 — API | `app/api/notifications/` (3 files) | REST endpoints |
| 4 — Triggers | `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/comments/route.ts` | Events fire notifications |
| 5 — Hook | `lib/hooks/use-notifications.ts` | Polling state management |
| 6 — UI | `components/notification-bell.tsx`, `app/layout.tsx` | Bell + dropdown in header |
| 7 — Tests | `tests/lib/notifications.test.ts`, `tests/components/notification-bell.test.tsx` | Full test coverage |

Each phase is independently deployable and verifiable before starting the next.
