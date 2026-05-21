---
name: TaskForge Task Management
description: Manage TaskForge tasks — create, update, filter, assign, and track progress
allowed-tools:
  - Bash
  - Read
  - Edit
---

# TaskForge Task Management Skill

Comprehensive guide to working with TaskForge tasks across the Next.js and FastAPI implementations.

## Task Model

### Core Fields

```typescript
interface Task {
  id: string;                    // CUID
  title: string;                 // Required, ≥1 char
  description?: string;          // Optional
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  projectId: string;             // Required, FK to Project
  assigneeId?: string;           // Optional, FK to User
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  assignee?: User;
  project?: Project;
  comments?: Comment[];
  labels?: Label[];
}
```

### Status Lifecycle

```
TODO → IN_PROGRESS → DONE (or back to TODO)
```

- **TODO**: Not started, initial state
- **IN_PROGRESS**: Work has begun
- **DONE**: Completed (triggers notifications to assignee + owner)

### Priority Levels

- **LOW**: Backlog, nice-to-have
- **MEDIUM**: Normal priority (default)
- **HIGH**: Important, should be done soon
- **URGENT**: Critical, blocker, do immediately

---

## API Operations

### Create Task

**Next.js:**
```typescript
POST /api/tasks
Content-Type: application/json

{
  "title": "Fix login bug",
  "description": "Session expires immediately",
  "status": "TODO",
  "priority": "HIGH",
  "projectId": "proj123",
  "assigneeId": "user456"  // Optional
}

// Response (201)
{ id, title, description, status, priority, projectId, assigneeId, ... }
```

**FastAPI:**
```python
POST /api/tasks
{
    "title": "Fix login bug",
    "description": "Session expires immediately",
    "status": "TODO",
    "priority": "HIGH",
    "project_id": "proj123",
    "assignee_id": "user456"
}
```

### Read Task

```bash
GET /api/tasks/{id}
# Returns: full task with assignee, project, comments, labels
```

### Update Task

**Next.js:**
```typescript
PATCH /api/tasks/{id}
{
  "title": "...",          // Optional
  "description": "...",    // Optional
  "status": "IN_PROGRESS", // Optional
  "priority": "HIGH",      // Optional
  "assigneeId": "user789"  // Optional (null to unassign)
}
```

**Triggers:**
- If `assigneeId` changes → `notifyTaskAssigned` to new assignee
- If `status` changes to DONE → `notifyTaskCompleted` to assignee + owner

### Delete Task

```bash
DELETE /api/tasks/{id}
# Response: { success: true }
```

### List Tasks (filtered)

```bash
GET /api/tasks?projectId=proj123
# Returns: array of tasks for project, ordered by creation (newest first)
```

---

## Common Operations

### Create task and assign to user

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Code review @alice PR",
    "projectId": "proj123",
    "assigneeId": "alice_id",
    "priority": "HIGH"
  }'
```

→ Sends `TASK_ASSIGNED` notification to alice

### Change task status to DONE

```bash
curl -X PATCH http://localhost:3000/api/tasks/task123 \
  -H "Content-Type: application/json" \
  -d '{ "status": "DONE" }'
```

→ Sends `TASK_COMPLETED` notification to assignee + project owner

### Reassign task

```bash
curl -X PATCH http://localhost:3000/api/tasks/task123 \
  -H "Content-Type: application/json" \
  -d '{ "assigneeId": "bob_id" }'
```

→ Sends `TASK_ASSIGNED` notification to bob (not to previous assignee)

### Unassign task

```bash
curl -X PATCH http://localhost:3000/api/tasks/task123 \
  -H "Content-Type: application/json" \
  -d '{ "assigneeId": null }'
```

→ No notification sent

### Add comment with mention

```bash
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task123",
    "content": "This needs review from @alice and @bob"
  }'
```

→ Sends `MENTION` notifications to alice and bob

---

## Filtering & Searching

### By Project
```bash
GET /api/tasks?projectId=proj123
```

### By Status (client-side)
```javascript
const doneTasks = tasks.filter(t => t.status === 'DONE');
const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS');
```

### By Priority (client-side)
```javascript
const urgent = tasks.filter(t => t.priority === 'URGENT');
const sorted = tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
```

### By Assignee (client-side)
```javascript
const myTasks = tasks.filter(t => t.assigneeId === currentUserId);
const unassigned = tasks.filter(t => !t.assigneeId);
```

---

## Best Practices

### Task Naming

- ✅ **Be specific**: "Fix null reference in task completion handler"
- ✅ **Include context**: "Add loading state to task card when submitting"
- ✅ **Be actionable**: "Refactor task service to use dependency injection"
- ❌ **Vague**: "Fix stuff", "Update code", "Work on tasks"

### Assignment

- **Assign early**: New task → immediately assign to owner/lead
- **One owner**: Assign to single responsible party (discuss in comments for others)
- **Unassign when blocked**: If waiting on someone else, unassign and note in comment
- **Match skill level**: Don't assign complex task to junior without mentorship

### Status Updates

- **Update frequently**: Move through statuses as work progresses
- **IN_PROGRESS = actively working**: Don't leave tasks stuck in IN_PROGRESS
- **DONE means done**: Peer reviewed, merged, deployed (or close to it)
- **Use comments for blockers**: "Blocked on #456" in comment instead of leaving in TODO

### Priority Levels

- **URGENT**: On-call page, production down, security issue → drop everything
- **HIGH**: Blocking other work, deadline pressure → this week
- **MEDIUM**: Normal work, backlog → next 2 weeks
- **LOW**: Nice-to-have, technical debt → when time available

### Comments & Mentions

- **Use @mentions** for visibility: "Hey @alice, need your input on database schema"
- **Link related tasks**: "See #123 for context"
- **Add decision rationale**: Why you chose solution X over Y
- **Update assignee if reassigning**: Tag in comment: "@bob taking over from here"

---

## Database Queries (Backend)

### Prisma (Next.js)

```typescript
// Find tasks for project
const tasks = await prisma.task.findMany({
  where: { projectId: 'proj123' },
  include: { assignee: true, project: true, comments: true }
});

// Find overdue/urgent tasks
const critical = await prisma.task.findMany({
  where: { status: { not: 'DONE' }, priority: 'URGENT' }
});

// Find tasks assigned to user
const myTasks = await prisma.task.findMany({
  where: { assigneeId: userId }
});
```

### SQLAlchemy (FastAPI)

```python
# Find tasks for project
tasks = db.query(Task).filter(Task.project_id == project_id).all()

# Find tasks assigned to user
my_tasks = db.query(Task).filter(Task.assignee_id == user_id).all()

# Count by status
counts = db.query(
    Task.status,
    func.count(Task.id)
).group_by(Task.status).all()
```

---

## Troubleshooting

**Notification not sent when assigning?**
- Check: Is assignee same as actor? (self-assign = no notification)
- Check: Is task in database? (try refresh)
- Check: Is assignee a real user?

**Status change not triggering completion notification?**
- Check: Did status actually change from non-DONE to DONE?
- Check: Does task have assignee and valid project owner?

**Comment mention not working?**
- Check: Username must be exact match (case-sensitive: `@alice` not `@Alice`)
- Check: Mentioned user must exist in database
- Check: Comment must have task.projectId (set before notifying)

---

## Related Documentation

- Architecture: `ARCHITECTURE.md`
- API Reference: `CLAUDE.md` → Tech Stack section
- Database Schema: `prisma/schema.prisma` or `app/models/`
- Tests: `tests/lib/notifications.test.ts` (task notification triggers)
