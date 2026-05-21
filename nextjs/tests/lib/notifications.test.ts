jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: jest.fn() },
    notification: { create: jest.fn(), createMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import {
  parseMentions,
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyMentions,
} from "@/lib/notifications";

const mockCreate = prisma.notification.create as jest.Mock;
const mockCreateMany = prisma.notification.createMany as jest.Mock;
const mockUserFindMany = prisma.user.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("parseMentions", () => {
  it("extracts single mention", () => {
    expect(parseMentions("hello @alice")).toEqual(["alice"]);
  });

  it("extracts multiple mentions", () => {
    expect(parseMentions("hello @alice and @bob")).toEqual(["alice", "bob"]);
  });

  it("returns empty array when no mentions", () => {
    expect(parseMentions("no mentions here")).toEqual([]);
  });

  it("deduplicates repeated mentions", () => {
    expect(parseMentions("@alice and @alice again")).toEqual(["alice"]);
  });

  it("handles mention at start of string", () => {
    expect(parseMentions("@alice great work")).toEqual(["alice"]);
  });

  it("handles underscore and numbers in username", () => {
    expect(parseMentions("ping @user_123")).toEqual(["user_123"]);
  });
});

describe("unread count derivation", () => {
  it("counts notifications where read is false", () => {
    const notifications = [
      { id: "1", read: false },
      { id: "2", read: true },
      { id: "3", read: false },
    ];
    const count = notifications.filter((n) => !n.read).length;
    expect(count).toBe(2);
  });

  it("returns 0 when all are read", () => {
    const notifications = [{ id: "1", read: true }];
    expect(notifications.filter((n) => !n.read).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// notifyTaskAssigned
// ---------------------------------------------------------------------------

describe("notifyTaskAssigned", () => {
  it("creates TASK_ASSIGNED notification for assignee", async () => {
    mockCreate.mockResolvedValue({});
    await notifyTaskAssigned("t1", "Fix bug", "p1", "user2", "user1");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user2",
        type: "TASK_ASSIGNED",
        taskId: "t1",
        projectId: "p1",
      }),
    });
  });

  it("skips when actor is the assignee (self-assign)", async () => {
    await notifyTaskAssigned("t1", "Fix bug", "p1", "user1", "user1");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// notifyTaskCompleted
// ---------------------------------------------------------------------------

describe("notifyTaskCompleted", () => {
  it("notifies distinct assignee and project owner", async () => {
    mockCreateMany.mockResolvedValue({ count: 2 });
    await notifyTaskCompleted("t1", "Fix bug", "p1", "user2", "user3", "actor");
    const { data } = mockCreateMany.mock.calls[0][0];
    expect(data.map((d: { userId: string }) => d.userId)).toEqual(
      expect.arrayContaining(["user2", "user3"])
    );
  });

  it("excludes actor from recipients", async () => {
    mockCreateMany.mockResolvedValue({ count: 1 });
    await notifyTaskCompleted("t1", "Fix bug", "p1", "actor", "owner", "actor");
    const { data } = mockCreateMany.mock.calls[0][0];
    expect(data.map((d: { userId: string }) => d.userId)).not.toContain("actor");
  });

  it("does nothing when actor is both assignee and owner", async () => {
    await notifyTaskCompleted("t1", "Fix bug", "p1", "actor", "actor", "actor");
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("handles null assignee gracefully", async () => {
    mockCreateMany.mockResolvedValue({ count: 1 });
    await notifyTaskCompleted("t1", "Fix bug", "p1", null, "owner", "actor");
    const { data } = mockCreateMany.mock.calls[0][0];
    expect(data).toHaveLength(1);
    expect(data[0].userId).toBe("owner");
  });
});

// ---------------------------------------------------------------------------
// notifyMentions
// ---------------------------------------------------------------------------

describe("notifyMentions", () => {
  it("creates MENTION notifications for resolved users", async () => {
    mockUserFindMany.mockResolvedValue([{ id: "user2" }, { id: "user3" }]);
    mockCreateMany.mockResolvedValue({ count: 2 });
    await notifyMentions("t1", "p1", "hey @alice and @bob", "user1");
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ type: "MENTION" }),
      ]),
    });
  });

  it("excludes actor from mention recipients", async () => {
    mockUserFindMany.mockResolvedValue([{ id: "user1" }]);
    await notifyMentions("t1", "p1", "hey @self", "user1");
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("does nothing when content has no mentions", async () => {
    await notifyMentions("t1", "p1", "plain comment", "user1");
    expect(mockUserFindMany).not.toHaveBeenCalled();
    expect(mockCreateMany).not.toHaveBeenCalled();
  });
});
