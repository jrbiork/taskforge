jest.mock("@/lib/db", () => ({
  prisma: {
    activityEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  emitTaskCreated,
  emitTaskStatusChanged,
  emitTaskAssigned,
  emitTaskUpdated,
  emitTaskDeleted,
  emitCommentAdded,
  emitProjectUpdated,
  getProjectActivity,
  formatActivityDescription,
} from "@/lib/activity";
import type { ActivityEventItem } from "@/lib/types";

const mockCreate = prisma.activityEvent.create as jest.Mock;
const mockFindMany = prisma.activityEvent.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

function makeEvent(overrides: Partial<ActivityEventItem> = {}): ActivityEventItem {
  return {
    id: "evt-1",
    projectId: "proj-1",
    actorId: "user-1",
    action: "TASK_CREATED",
    entityId: "task-1",
    entityType: "TASK",
    metadata: JSON.stringify({ taskTitle: "Fix login" }),
    createdAt: new Date("2026-05-20T10:00:00Z"),
    actor: { id: "user-1", name: "Alice", email: "alice@example.com" },
    ...overrides,
  };
}

describe("emitTaskCreated", () => {
  it("calls prisma.activityEvent.create with TASK_CREATED action", async () => {
    mockCreate.mockResolvedValue({});
    await emitTaskCreated("proj-1", "user-1", "task-1", "Fix login");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "TASK_CREATED",
        entityType: "TASK",
        entityId: "task-1",
        projectId: "proj-1",
        actorId: "user-1",
      }),
    });
  });

  it("embeds taskTitle in metadata JSON", async () => {
    mockCreate.mockResolvedValue({});
    await emitTaskCreated("proj-1", "user-1", "task-1", "Fix login");
    const call = mockCreate.mock.calls[0][0];
    expect(JSON.parse(call.data.metadata)).toEqual({ taskTitle: "Fix login" });
  });

  it("does not throw when DB rejects", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));
    await expect(emitTaskCreated("proj-1", "user-1", "task-1", "Fix login")).resolves.toBeUndefined();
  });
});

describe("emitTaskStatusChanged", () => {
  it("embeds oldStatus and newStatus in metadata", async () => {
    mockCreate.mockResolvedValue({});
    await emitTaskStatusChanged("proj-1", "user-1", "task-1", "Fix login", "TODO", "IN_PROGRESS");
    const call = mockCreate.mock.calls[0][0];
    const meta = JSON.parse(call.data.metadata);
    expect(meta.oldStatus).toBe("TODO");
    expect(meta.newStatus).toBe("IN_PROGRESS");
    expect(meta.taskTitle).toBe("Fix login");
  });

  it("does not throw when DB rejects", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));
    await expect(
      emitTaskStatusChanged("proj-1", "user-1", "task-1", "Fix login", "TODO", "DONE")
    ).resolves.toBeUndefined();
  });
});

describe("emitTaskAssigned", () => {
  it("embeds assigneeName (can be null) in metadata", async () => {
    mockCreate.mockResolvedValue({});
    await emitTaskAssigned("proj-1", "user-1", "task-1", "Fix login", null);
    const meta = JSON.parse(mockCreate.mock.calls[0][0].data.metadata);
    expect(meta.assigneeName).toBeNull();
    expect(meta.taskTitle).toBe("Fix login");
  });

  it("stores assigneeName when provided", async () => {
    mockCreate.mockResolvedValue({});
    await emitTaskAssigned("proj-1", "user-1", "task-1", "Fix login", "Dave");
    const meta = JSON.parse(mockCreate.mock.calls[0][0].data.metadata);
    expect(meta.assigneeName).toBe("Dave");
  });
});

describe("emitTaskUpdated", () => {
  it("uses TASK_UPDATED action with changedFields in metadata", async () => {
    mockCreate.mockResolvedValue({});
    await emitTaskUpdated("proj-1", "user-1", "task-1", "Fix login", ["priority"]);
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.action).toBe("TASK_UPDATED");
    const meta = JSON.parse(call.data.metadata);
    expect(meta.changedFields).toEqual(["priority"]);
    expect(meta.taskTitle).toBe("Fix login");
  });

  it("does not throw when DB rejects", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));
    await expect(emitTaskUpdated("proj-1", "user-1", "task-1", "Fix login", ["title"])).resolves.toBeUndefined();
  });
});

describe("emitTaskDeleted", () => {
  it("uses TASK_DELETED action with correct entityId", async () => {
    mockCreate.mockResolvedValue({});
    await emitTaskDeleted("proj-1", "user-1", "task-99", "Old task");
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.action).toBe("TASK_DELETED");
    expect(call.data.entityId).toBe("task-99");
  });
});

describe("emitCommentAdded", () => {
  it("uses COMMENT entityType", async () => {
    mockCreate.mockResolvedValue({});
    await emitCommentAdded("proj-1", "user-1", "cmt-1", "Fix login", "Looks good to me");
    expect(mockCreate.mock.calls[0][0].data.entityType).toBe("COMMENT");
  });

  it("truncates commentPreview to 80 chars", async () => {
    mockCreate.mockResolvedValue({});
    const long = "a".repeat(100);
    await emitCommentAdded("proj-1", "user-1", "cmt-1", "Fix login", long);
    const meta = JSON.parse(mockCreate.mock.calls[0][0].data.metadata);
    expect(meta.commentPreview).toHaveLength(80);
  });
});

describe("emitProjectUpdated", () => {
  it("stores changedFields array in metadata", async () => {
    mockCreate.mockResolvedValue({});
    await emitProjectUpdated("proj-1", "user-1", ["name", "status"]);
    const meta = JSON.parse(mockCreate.mock.calls[0][0].data.metadata);
    expect(meta.changedFields).toEqual(["name", "status"]);
  });

  it("uses PROJECT entityType and entityId equal to projectId", async () => {
    mockCreate.mockResolvedValue({});
    await emitProjectUpdated("proj-1", "user-1", []);
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.entityType).toBe("PROJECT");
    expect(call.data.entityId).toBe("proj-1");
  });
});

describe("getProjectActivity", () => {
  it("calls findMany with correct where, include, orderBy, and take", async () => {
    mockFindMany.mockResolvedValue([]);
    await getProjectActivity("proj-1");
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { projectId: "proj-1" },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  it("respects custom limit", async () => {
    mockFindMany.mockResolvedValue([]);
    await getProjectActivity("proj-1", 10);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
  });

  it("returns the array directly", async () => {
    const events = [makeEvent()];
    mockFindMany.mockResolvedValue(events);
    const result = await getProjectActivity("proj-1");
    expect(result).toEqual(events);
  });
});

describe("formatActivityDescription", () => {
  it("TASK_CREATED includes actor name and task title", () => {
    const desc = formatActivityDescription(makeEvent());
    expect(desc).toContain("Alice");
    expect(desc).toContain("Fix login");
  });

  it("TASK_STATUS_CHANGED includes human-readable status labels", () => {
    const event = makeEvent({
      action: "TASK_STATUS_CHANGED",
      metadata: JSON.stringify({ taskTitle: "Fix login", oldStatus: "TODO", newStatus: "IN_PROGRESS" }),
    });
    const desc = formatActivityDescription(event);
    expect(desc).toContain("To Do");
    expect(desc).toContain("In Progress");
  });

  it("TASK_ASSIGNED with name shows assignee", () => {
    const event = makeEvent({
      action: "TASK_ASSIGNED",
      metadata: JSON.stringify({ taskTitle: "Fix login", assigneeName: "Dave" }),
    });
    expect(formatActivityDescription(event)).toContain("Dave");
  });

  it("TASK_ASSIGNED with null shows unassigned text", () => {
    const event = makeEvent({
      action: "TASK_ASSIGNED",
      metadata: JSON.stringify({ taskTitle: "Fix login", assigneeName: null }),
    });
    expect(formatActivityDescription(event)).toContain("unassigned");
  });

  it("TASK_UPDATED with fields includes them in description", () => {
    const event = makeEvent({
      action: "TASK_UPDATED",
      metadata: JSON.stringify({ taskTitle: "Fix login", changedFields: ["priority"] }),
    });
    const desc = formatActivityDescription(event);
    expect(desc).toContain("priority");
    expect(desc).toContain("Fix login");
  });

  it("TASK_UPDATED with empty fields uses generic text", () => {
    const event = makeEvent({
      action: "TASK_UPDATED",
      metadata: JSON.stringify({ taskTitle: "Fix login", changedFields: [] }),
    });
    expect(formatActivityDescription(event)).toContain("updated");
  });

  it("TASK_DELETED includes task title", () => {
    const event = makeEvent({
      action: "TASK_DELETED",
      metadata: JSON.stringify({ taskTitle: "Old task" }),
    });
    expect(formatActivityDescription(event)).toContain("Old task");
  });

  it("COMMENT_ADDED includes task title", () => {
    const event = makeEvent({
      action: "COMMENT_ADDED",
      metadata: JSON.stringify({ taskTitle: "Fix login", commentPreview: "Looks good" }),
    });
    expect(formatActivityDescription(event)).toContain("Fix login");
  });

  it("PROJECT_UPDATED with fields lists them", () => {
    const event = makeEvent({
      action: "PROJECT_UPDATED",
      entityType: "PROJECT",
      metadata: JSON.stringify({ changedFields: ["name", "status"] }),
    });
    const desc = formatActivityDescription(event);
    expect(desc).toContain("name");
    expect(desc).toContain("status");
  });

  it("PROJECT_UPDATED with empty fields uses generic text", () => {
    const event = makeEvent({
      action: "PROJECT_UPDATED",
      entityType: "PROJECT",
      metadata: JSON.stringify({ changedFields: [] }),
    });
    expect(formatActivityDescription(event)).toContain("settings");
  });

  it("handles null metadata without throwing", () => {
    const event = makeEvent({ metadata: null });
    expect(() => formatActivityDescription(event)).not.toThrow();
  });

  it("handles malformed metadata JSON without throwing", () => {
    const event = makeEvent({ metadata: "{not valid json" });
    expect(() => formatActivityDescription(event)).not.toThrow();
  });
});
