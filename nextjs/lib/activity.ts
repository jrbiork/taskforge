import { prisma } from "@/lib/db";
import type {
  ActivityAction,
  ActivityEntityType,
  ActivityEventItem,
  ActivityMetadata,
  TaskStatusChangedMetadata,
  TaskAssignedMetadata,
  TaskCreatedMetadata,
  TaskUpdatedMetadata,
  TaskDeletedMetadata,
  CommentAddedMetadata,
  ProjectUpdatedMetadata,
  TimeEntryAddedMetadata,
  TimeEntryUpdatedMetadata,
  TimeEntryDeletedMetadata,
} from "@/lib/types";

async function emitActivity(params: {
  projectId: string;
  actorId: string;
  action: ActivityAction;
  entityId: string;
  entityType: ActivityEntityType;
  metadata?: ActivityMetadata;
}): Promise<void> {
  await prisma.activityEvent.create({
    data: {
      projectId: params.projectId,
      actorId: params.actorId,
      action: params.action,
      entityId: params.entityId,
      entityType: params.entityType,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}

export async function emitTaskCreated(
  projectId: string,
  actorId: string,
  taskId: string,
  taskTitle: string
): Promise<void> {
  try {
    const metadata: TaskCreatedMetadata = { taskTitle };
    await emitActivity({ projectId, actorId, action: "TASK_CREATED", entityId: taskId, entityType: "TASK", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function emitTaskStatusChanged(
  projectId: string,
  actorId: string,
  taskId: string,
  taskTitle: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  try {
    const metadata: TaskStatusChangedMetadata = { oldStatus, newStatus, taskTitle };
    await emitActivity({ projectId, actorId, action: "TASK_STATUS_CHANGED", entityId: taskId, entityType: "TASK", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function emitTaskAssigned(
  projectId: string,
  actorId: string,
  taskId: string,
  taskTitle: string,
  assigneeName: string | null
): Promise<void> {
  try {
    const metadata: TaskAssignedMetadata = { assigneeName, taskTitle };
    await emitActivity({ projectId, actorId, action: "TASK_ASSIGNED", entityId: taskId, entityType: "TASK", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function emitTaskUpdated(
  projectId: string,
  actorId: string,
  taskId: string,
  taskTitle: string,
  changedFields: string[]
): Promise<void> {
  try {
    const metadata: TaskUpdatedMetadata = { taskTitle, changedFields };
    await emitActivity({ projectId, actorId, action: "TASK_UPDATED", entityId: taskId, entityType: "TASK", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function emitTaskDeleted(
  projectId: string,
  actorId: string,
  taskId: string,
  taskTitle: string
): Promise<void> {
  try {
    const metadata: TaskDeletedMetadata = { taskTitle };
    await emitActivity({ projectId, actorId, action: "TASK_DELETED", entityId: taskId, entityType: "TASK", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function emitCommentAdded(
  projectId: string,
  actorId: string,
  commentId: string,
  taskTitle: string,
  commentContent: string
): Promise<void> {
  try {
    const metadata: CommentAddedMetadata = {
      taskTitle,
      commentPreview: commentContent.slice(0, 80),
    };
    await emitActivity({ projectId, actorId, action: "COMMENT_ADDED", entityId: commentId, entityType: "COMMENT", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function emitProjectUpdated(
  projectId: string,
  actorId: string,
  changedFields: string[]
): Promise<void> {
  try {
    const metadata: ProjectUpdatedMetadata = { changedFields };
    await emitActivity({ projectId, actorId, action: "PROJECT_UPDATED", entityId: projectId, entityType: "PROJECT", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function emitTimeEntryAdded(
  projectId: string,
  actorId: string,
  entryId: string,
  taskTitle: string,
  minutes: number
): Promise<void> {
  try {
    const metadata: TimeEntryAddedMetadata = { taskTitle, minutes };
    await emitActivity({ projectId, actorId, action: "TIME_ENTRY_CREATED", entityId: entryId, entityType: "TIME_ENTRY", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function emitTimeEntryUpdated(
  projectId: string,
  actorId: string,
  entryId: string,
  taskTitle: string,
  minutes: number
): Promise<void> {
  try {
    const metadata: TimeEntryUpdatedMetadata = { taskTitle, minutes };
    await emitActivity({ projectId, actorId, action: "TIME_ENTRY_UPDATED", entityId: entryId, entityType: "TIME_ENTRY", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function emitTimeEntryDeleted(
  projectId: string,
  actorId: string,
  entryId: string,
  taskTitle: string
): Promise<void> {
  try {
    const metadata: TimeEntryDeletedMetadata = { taskTitle };
    await emitActivity({ projectId, actorId, action: "TIME_ENTRY_DELETED", entityId: entryId, entityType: "TIME_ENTRY", metadata });
  } catch {
    // Side-effect must not break the primary response
  }
}

export async function getProjectActivity(
  projectId: string,
  limit = 50
): Promise<ActivityEventItem[]> {
  return prisma.activityEvent.findMany({
    where: { projectId },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  }) as Promise<ActivityEventItem[]>;
}

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s;
}

export function formatActivityDescription(event: ActivityEventItem): string {
  const actor = event.actor.name;
  let meta: Record<string, unknown> = {};
  try {
    if (event.metadata) meta = JSON.parse(event.metadata) as Record<string, unknown>;
  } catch {
    // malformed metadata — fall through to generic
  }

  switch (event.action as ActivityAction) {
    case "TASK_CREATED":
      return `${actor} created task "${meta.taskTitle ?? "unknown"}"`;
    case "TASK_STATUS_CHANGED":
      return `${actor} moved "${meta.taskTitle ?? "unknown"}" from ${statusLabel(String(meta.oldStatus ?? ""))} to ${statusLabel(String(meta.newStatus ?? ""))}`;
    case "TASK_ASSIGNED":
      return meta.assigneeName
        ? `${actor} assigned "${meta.taskTitle ?? "unknown"}" to ${meta.assigneeName}`
        : `${actor} unassigned "${meta.taskTitle ?? "unknown"}"`;
    case "TASK_UPDATED": {
      const fields = Array.isArray(meta.changedFields) && meta.changedFields.length > 0
        ? (meta.changedFields as string[]).join(", ")
        : null;
      return fields
        ? `${actor} updated "${meta.taskTitle ?? "unknown"}" (${fields})`
        : `${actor} updated "${meta.taskTitle ?? "unknown"}"`;
    }
    case "TASK_DELETED":
      return `${actor} deleted task "${meta.taskTitle ?? "unknown"}"`;
    case "COMMENT_ADDED":
      return `${actor} commented on "${meta.taskTitle ?? "unknown"}"`;
    case "PROJECT_UPDATED": {
      const fields = Array.isArray(meta.changedFields) && meta.changedFields.length > 0
        ? (meta.changedFields as string[]).join(", ")
        : null;
      return fields ? `${actor} updated project (${fields})` : `${actor} updated project settings`;
    }
    case "TIME_ENTRY_CREATED":
      return `${actor} logged time on "${meta.taskTitle ?? "unknown"}"`;
    case "TIME_ENTRY_UPDATED":
      return `${actor} updated a time entry on "${meta.taskTitle ?? "unknown"}"`;
    case "TIME_ENTRY_DELETED":
      return `${actor} deleted a time entry on "${meta.taskTitle ?? "unknown"}"`;
    default:
      return `${actor} performed an action`;
  }
}
