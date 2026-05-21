import { prisma } from "@/lib/db";

export function parseMentions(content: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_]+)/g) ?? [];
  const names = matches.map((m) => m.slice(1));
  return [...new Set(names)];
}

async function resolveUserIds(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { name: { in: names } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function notifyTaskAssigned(
  taskId: string,
  taskTitle: string,
  projectId: string,
  assigneeId: string,
  actorId: string
): Promise<void> {
  if (assigneeId === actorId) return;
  await prisma.notification.create({
    data: {
      userId: assigneeId,
      type: "TASK_ASSIGNED",
      message: `You were assigned to "${taskTitle}"`,
      taskId,
      projectId,
    },
  });
}

export async function notifyTaskCompleted(
  taskId: string,
  taskTitle: string,
  projectId: string,
  assigneeId: string | null,
  projectOwnerId: string,
  actorId: string
): Promise<void> {
  const recipients = new Set<string>();
  if (assigneeId && assigneeId !== actorId) recipients.add(assigneeId);
  if (projectOwnerId !== actorId) recipients.add(projectOwnerId);

  if (recipients.size === 0) return;

  await prisma.notification.createMany({
    data: Array.from(recipients).map((userId) => ({
      userId,
      type: "TASK_COMPLETED",
      message: `Task "${taskTitle}" was marked as done`,
      taskId,
      projectId,
    })),
  });
}

export async function notifyMentions(
  taskId: string,
  projectId: string,
  commentContent: string,
  actorId: string
): Promise<void> {
  const names = parseMentions(commentContent);
  if (names.length === 0) return;

  const userIds = await resolveUserIds(names);
  const recipients = userIds.filter((id) => id !== actorId);
  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type: "MENTION",
      message: `You were mentioned in a comment`,
      taskId,
      projectId,
    })),
  });
}
