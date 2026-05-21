import { wouldCreateCycle } from "@/lib/dependencies";

jest.mock("@/lib/db", () => ({
  prisma: {
    taskDependency: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

const mockFindMany = prisma.taskDependency.findMany as jest.Mock;

describe("wouldCreateCycle", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  it("returns true for self-dependency", async () => {
    expect(await wouldCreateCycle("A", "A")).toBe(true);
  });

  it("returns false for two unrelated tasks", async () => {
    mockFindMany.mockResolvedValue([]);
    expect(await wouldCreateCycle("A", "B")).toBe(false);
  });

  it("returns false for a simple non-cyclic chain A→B→C adding D→B", async () => {
    // D depends on B; B has no further deps
    mockFindMany.mockImplementation(({ where }: { where: { taskId: string } }) => {
      if (where.taskId === "B") return Promise.resolve([]);
      return Promise.resolve([]);
    });
    expect(await wouldCreateCycle("D", "B")).toBe(false);
  });

  it("detects a direct cycle: would make A depend on B while B already depends on A", async () => {
    // existing graph: B → A
    mockFindMany.mockImplementation(({ where }: { where: { taskId: string } }) => {
      if (where.taskId === "B") return Promise.resolve([{ dependsOnId: "A" }]);
      return Promise.resolve([]);
    });
    // adding A → B would create A → B → A
    expect(await wouldCreateCycle("A", "B")).toBe(true);
  });

  it("detects a longer cycle A→B→C→A", async () => {
    // existing graph: B → C, C → A
    mockFindMany.mockImplementation(({ where }: { where: { taskId: string } }) => {
      if (where.taskId === "B") return Promise.resolve([{ dependsOnId: "C" }]);
      if (where.taskId === "C") return Promise.resolve([{ dependsOnId: "A" }]);
      return Promise.resolve([]);
    });
    // adding A → B would create A → B → C → A
    expect(await wouldCreateCycle("A", "B")).toBe(true);
  });

  it("handles diamond shaped DAG without falsely flagging a cycle", async () => {
    // A → B, A → C, B → D, C → D (diamond)
    // adding E → A should be fine
    mockFindMany.mockImplementation(({ where }: { where: { taskId: string } }) => {
      if (where.taskId === "A") return Promise.resolve([{ dependsOnId: "B" }, { dependsOnId: "C" }]);
      if (where.taskId === "B") return Promise.resolve([{ dependsOnId: "D" }]);
      if (where.taskId === "C") return Promise.resolve([{ dependsOnId: "D" }]);
      return Promise.resolve([]);
    });
    expect(await wouldCreateCycle("E", "A")).toBe(false);
  });

  it("avoids revisiting nodes in a diamond (no infinite loop)", async () => {
    // D ← B ← A, D ← C ← A (both paths converge at D)
    mockFindMany.mockImplementation(({ where }: { where: { taskId: string } }) => {
      if (where.taskId === "A") return Promise.resolve([{ dependsOnId: "B" }, { dependsOnId: "C" }]);
      if (where.taskId === "B") return Promise.resolve([{ dependsOnId: "D" }]);
      if (where.taskId === "C") return Promise.resolve([{ dependsOnId: "D" }]);
      return Promise.resolve([]);
    });
    // D should not have been processed twice
    expect(await wouldCreateCycle("X", "A")).toBe(false);
    // D visited once, not twice
    const taskIds = mockFindMany.mock.calls.map((c: [{ where: { taskId: string } }]) => c[0].where.taskId);
    expect(taskIds.filter((id: string) => id === "D").length).toBeLessThanOrEqual(1);
  });
});
