/**
 * API route handler tests for time-entries endpoints.
 * Tests POST /api/tasks/[id]/time-entries,
 *       PATCH/DELETE /api/tasks/[id]/time-entries/[entryId],
 *       POST /api/tasks/[id]/timer (start/stop).
 *
 * @jest-environment node
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/db", () => ({
  prisma: {
    task: {
      findUnique: jest.fn(),
    },
    timeEntry: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/activity", () => ({
  emitTimeEntryAdded: jest.fn().mockResolvedValue(undefined),
  emitTimeEntryUpdated: jest.fn().mockResolvedValue(undefined),
  emitTimeEntryDeleted: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/time-utils", () => ({
  computeMinutes: jest.fn().mockReturnValue(30),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

// Route handler imports (after mocks are registered)
import { POST as timeEntriesPost } from "@/app/api/tasks/[id]/time-entries/route";
import {
  PATCH as entryPatch,
  DELETE as entryDelete,
} from "@/app/api/tasks/[id]/time-entries/[entryId]/route";
import { POST as timerPost } from "@/app/api/tasks/[id]/timer/route";

// Typed mock handles
const db = prisma as {
  task: { findUnique: jest.Mock };
  timeEntry: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Request;
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeEntryParams(
  id: string,
  entryId: string
): { params: Promise<{ id: string; entryId: string }> } {
  return { params: Promise.resolve({ id, entryId }) };
}

function sessionFor(role: string, id = "user-1") {
  return { user: { id, role, name: "Test User" } };
}

const pastDate = "2026-05-21T10:00:00.000Z";
const futureDate = "2099-01-01T00:00:00.000Z";

const baseTask = {
  id: "task-1",
  title: "My Task",
  project: { id: "proj-1", name: "My Project" },
};

const baseEntry = {
  id: "entry-1",
  taskId: "task-1",
  userId: "user-1",
  minutes: 30,
  startedAt: new Date(pastDate),
  stoppedAt: new Date(),
  description: null,
  user: { id: "user-1", name: "Test User" },
  task: {
    id: "task-1",
    title: "My Task",
    project: { id: "proj-1", name: "My Project" },
  },
};

// ─── POST /api/tasks/[id]/time-entries ───────────────────────────────────────

describe("POST /api/tasks/[id]/time-entries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.task.findUnique.mockResolvedValue(baseTask);
    db.timeEntry.create.mockResolvedValue(baseEntry);
  });

  it("returns 403 for VIEWER role", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("VIEWER"));

    const req = makeRequest({ minutes: 30, loggedAt: pastDate });
    const res = await timeEntriesPost(req, makeParams("task-1"));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 201 for MEMBER role with valid body", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER"));

    const req = makeRequest({ minutes: 30, loggedAt: pastDate });
    const res = await timeEntriesPost(req, makeParams("task-1"));

    expect(res.status).toBe(201);
    expect(db.timeEntry.create).toHaveBeenCalledTimes(1);
  });

  it("returns 422 when minutes field is missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER"));

    const req = makeRequest({ loggedAt: pastDate }); // missing minutes
    const res = await timeEntriesPost(req, makeParams("task-1"));

    expect(res.status).toBe(422);
  });

  it("returns 422 when loggedAt field is missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER"));

    const req = makeRequest({ minutes: 30 }); // missing loggedAt
    const res = await timeEntriesPost(req, makeParams("task-1"));

    expect(res.status).toBe(422);
  });

  it("returns 422 when loggedAt is in the future", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER"));

    const req = makeRequest({ minutes: 30, loggedAt: futureDate });
    const res = await timeEntriesPost(req, makeParams("task-1"));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(JSON.stringify(data)).toContain("loggedAt cannot be in the future");
  });

  it("returns 401 when no session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({ minutes: 30, loggedAt: pastDate });
    const res = await timeEntriesPost(req, makeParams("task-1"));

    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/tasks/[id]/time-entries/[entryId] ────────────────────────────

describe("PATCH /api/tasks/[id]/time-entries/[entryId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.timeEntry.findUnique.mockResolvedValue(baseEntry);
    db.timeEntry.update.mockResolvedValue(baseEntry);
  });

  it("returns 403 when MEMBER tries to edit another user's entry", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER", "other-user"));

    const req = makeRequest({ minutes: 45 });
    const res = await entryPatch(req, makeEntryParams("task-1", "entry-1"));

    expect(res.status).toBe(403);
  });

  it("returns 200 when MEMBER edits their own entry", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER", "user-1"));

    const req = makeRequest({ minutes: 45 });
    const res = await entryPatch(req, makeEntryParams("task-1", "entry-1"));

    expect(res.status).toBe(200);
    expect(db.timeEntry.update).toHaveBeenCalledTimes(1);
  });

  it("returns 200 when ADMIN edits another user's entry", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("ADMIN", "admin-user"));

    const req = makeRequest({ minutes: 45 });
    const res = await entryPatch(req, makeEntryParams("task-1", "entry-1"));

    expect(res.status).toBe(200);
  });

  it("returns 404 when entry does not exist", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("ADMIN", "admin-user"));
    db.timeEntry.findUnique.mockResolvedValue(null);

    const req = makeRequest({ minutes: 45 });
    const res = await entryPatch(req, makeEntryParams("task-1", "missing-entry"));

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/tasks/[id]/time-entries/[entryId] ───────────────────────────

describe("DELETE /api/tasks/[id]/time-entries/[entryId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.timeEntry.findUnique.mockResolvedValue(baseEntry);
    db.timeEntry.delete.mockResolvedValue(baseEntry);
  });

  it("returns 403 when MEMBER tries to delete another user's entry", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER", "other-user"));

    const req = makeRequest({});
    const res = await entryDelete(req, makeEntryParams("task-1", "entry-1"));

    expect(res.status).toBe(403);
  });

  it("returns 200 when MEMBER deletes their own entry", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER", "user-1"));

    const req = makeRequest({});
    const res = await entryDelete(req, makeEntryParams("task-1", "entry-1"));

    expect(res.status).toBe(200);
  });

  it("returns 200 when ADMIN deletes any entry", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("ADMIN", "admin-user"));

    const req = makeRequest({});
    const res = await entryDelete(req, makeEntryParams("task-1", "entry-1"));

    expect(res.status).toBe(200);
  });
});

// ─── POST /api/tasks/[id]/timer — start ──────────────────────────────────────

describe("POST /api/tasks/[id]/timer — start", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.task.findUnique.mockResolvedValue(baseTask);
  });

  it("returns 403 for VIEWER role", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("VIEWER"));

    const req = makeRequest({ action: "start" });
    const res = await timerPost(req, makeParams("task-1"));

    expect(res.status).toBe(403);
  });

  it("calls $transaction and returns 201 on start", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER"));

    const createdEntry = {
      id: "entry-new",
      startedAt: new Date(),
      stoppedAt: null,
      user: { id: "user-1", name: "Test User" },
    };
    db.$transaction.mockImplementation(
      async (fn: (tx: typeof db) => Promise<unknown>) => fn(db)
    );
    db.timeEntry.findFirst.mockResolvedValue(null);
    db.timeEntry.create.mockResolvedValue(createdEntry);

    const req = makeRequest({ action: "start" });
    const res = await timerPost(req, makeParams("task-1"));

    expect(res.status).toBe(201);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.timeEntry.create).toHaveBeenCalledTimes(1);
  });

  it("stops the previous open timer when starting a new one", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER"));

    const openTimer = {
      id: "entry-old",
      startedAt: new Date(Date.now() - 10 * 60 * 1000),
      stoppedAt: null,
    };
    const createdEntry = {
      id: "entry-new",
      startedAt: new Date(),
      stoppedAt: null,
      user: { id: "user-1", name: "Test User" },
    };

    db.$transaction.mockImplementation(
      async (fn: (tx: typeof db) => Promise<unknown>) => fn(db)
    );
    db.timeEntry.findFirst.mockResolvedValue(openTimer);
    db.timeEntry.update.mockResolvedValue({
      ...openTimer,
      stoppedAt: new Date(),
      minutes: 10,
    });
    db.timeEntry.create.mockResolvedValue(createdEntry);

    const req = makeRequest({ action: "start" });
    const res = await timerPost(req, makeParams("task-1"));

    expect(res.status).toBe(201);
    expect(db.timeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "entry-old" } })
    );
    expect(db.timeEntry.create).toHaveBeenCalledTimes(1);
  });
});

// ─── POST /api/tasks/[id]/timer — stop ───────────────────────────────────────

describe("POST /api/tasks/[id]/timer — stop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.task.findUnique.mockResolvedValue(baseTask);
  });

  it("returns 404 when no running timer exists", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER"));

    db.$transaction.mockImplementation(
      async (fn: (tx: typeof db) => Promise<unknown>) => fn(db)
    );
    db.timeEntry.findFirst.mockResolvedValue(null);

    const req = makeRequest({ action: "stop" });
    const res = await timerPost(req, makeParams("task-1"));

    expect(res.status).toBe(404);
  });

  it("stops the running timer atomically via $transaction and returns 200", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(sessionFor("MEMBER"));

    const openEntry = {
      id: "entry-1",
      startedAt: new Date(Date.now() - 30 * 60 * 1000),
      stoppedAt: null,
    };
    const stoppedEntry = {
      ...openEntry,
      stoppedAt: new Date(),
      minutes: 30,
      user: { id: "user-1", name: "Test User" },
    };

    db.$transaction.mockImplementation(
      async (fn: (tx: typeof db) => Promise<unknown>) => fn(db)
    );
    db.timeEntry.findFirst.mockResolvedValue(openEntry);
    db.timeEntry.update.mockResolvedValue(stoppedEntry);

    const req = makeRequest({ action: "stop" });
    const res = await timerPost(req, makeParams("task-1"));

    expect(res.status).toBe(200);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.timeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "entry-1" } })
    );
  });
});
