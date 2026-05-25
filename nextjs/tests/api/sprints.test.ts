/**
 * @jest-environment node
 */

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => ({
  prisma: {
    sprint: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { GET, POST } from "@/app/api/sprints/route";
import { NextRequest } from "next/server";

const mockSession = { user: { id: "user-1", name: "Test" } };
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFindMany = prisma.sprint.findMany as jest.MockedFunction<typeof prisma.sprint.findMany>;
const mockCreate = prisma.sprint.create as jest.MockedFunction<typeof prisma.sprint.create>;
const mockCount = prisma.sprint.count as jest.MockedFunction<typeof prisma.sprint.count>;

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/sprints", {
    method: body ? "POST" : "GET",
    ...(body
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const baseSprint = {
  id: "sprint-1",
  name: "Sprint 1",
  startDate: "2024-01-01",
  endDate: "2024-01-14",
  goal: null,
  status: "PLANNING",
  order: 1,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(mockSession as never);
});

describe("GET /api/sprints", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with empty sprints array", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sprints).toEqual([]);
  });

  it("maps _count.tasks to taskCount", async () => {
    mockFindMany.mockResolvedValueOnce([
      { ...baseSprint, _count: { tasks: 3 } } as never,
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data.sprints[0].taskCount).toBe(3);
    expect(data.sprints[0]._count).toBeUndefined();
  });

  it("returns 500 when prisma throws", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("db error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/sprints", () => {
  const validBody = { name: "Sprint 1", startDate: "2024-01-01", endDate: "2024-01-14" };

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 201 with created sprint", async () => {
    mockCount.mockResolvedValueOnce(0);
    mockCreate.mockResolvedValueOnce(baseSprint as never);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.sprint).toBeDefined();
  });

  it("sets order to count + 1", async () => {
    mockCount.mockResolvedValueOnce(2);
    mockCreate.mockResolvedValueOnce(baseSprint as never);
    await POST(makeRequest(validBody));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 3 }) }),
    );
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ startDate: "2024-01-01", endDate: "2024-01-14" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is empty", async () => {
    const res = await POST(makeRequest({ ...validBody, name: "" }));
    expect(res.status).toBe(400);
  });

  it("does not call prisma.create on invalid body", async () => {
    await POST(makeRequest({ startDate: "2024-01-01" }));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns 500 when prisma throws", async () => {
    mockCount.mockResolvedValueOnce(0);
    mockCreate.mockRejectedValueOnce(new Error("db error"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });
});
