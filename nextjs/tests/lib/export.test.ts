import { exportTasksToCSV, tasksToCSVString } from "@/lib/export";
import type { TaskForBoard } from "@/lib/types";

// jsdom does not implement URL.createObjectURL / revokeObjectURL
if (!URL.createObjectURL) {
  Object.defineProperty(URL, "createObjectURL", { value: jest.fn(), writable: true });
}
if (!URL.revokeObjectURL) {
  Object.defineProperty(URL, "revokeObjectURL", { value: jest.fn(), writable: true });
}

const makeTask = (overrides: Partial<TaskForBoard> = {}): TaskForBoard =>
  ({
    id: "task-1",
    title: "Test Task",
    description: "A description",
    status: "TODO",
    priority: "MEDIUM",
    projectId: "proj-1",
    assigneeId: null,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:00Z"),
    assignee: { id: "user-1", name: "Alice", email: "alice@example.com" },
    dependencies: [],
    ...overrides,
  } as unknown as TaskForBoard);

// ─── Pure CSV generation ──────────────────────────────────────────────────────

describe("tasksToCSVString", () => {
  it("produces the correct header row", () => {
    const csv = tasksToCSVString([makeTask()]);
    expect(csv.split("\n")[0]).toBe(
      '"Title","Description","Status","Priority","Assignee","Created At"'
    );
  });

  it("writes all task fields correctly", () => {
    const line = tasksToCSVString([makeTask()]).split("\n")[1];
    expect(line).toContain('"Test Task"');
    expect(line).toContain('"A description"');
    expect(line).toContain('"TODO"');
    expect(line).toContain('"MEDIUM"');
    expect(line).toContain('"Alice"');
    expect(line).toContain('"2024-01-15T10:00:00.000Z"');
  });

  it("falls back to Unassigned when no assignee", () => {
    const csv = tasksToCSVString([makeTask({ assignee: null })]);
    expect(csv).toContain('"Unassigned"');
  });

  it("uses empty string when description is null", () => {
    const csv = tasksToCSVString([makeTask({ description: null } as Partial<TaskForBoard>)]);
    const fields = csv.split("\n")[1].split(",");
    expect(fields[1]).toBe('""');
  });

  it('escapes double quotes inside cell values', () => {
    const csv = tasksToCSVString([makeTask({ title: 'Say "hello"' })]);
    expect(csv).toContain('"Say ""hello"""');
  });

  it("exports multiple tasks as separate rows", () => {
    const t1 = makeTask({ id: "1", title: "Alpha" });
    const t2 = makeTask({ id: "2", title: "Beta" });
    const lines = tasksToCSVString([t1, t2]).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"Alpha"');
    expect(lines[2]).toContain('"Beta"');
  });
});

// ─── DOM interaction ──────────────────────────────────────────────────────────

describe("exportTasksToCSV", () => {
  let createObjectURL: jest.SpyInstance;
  let revokeObjectURL: jest.SpyInstance;
  let createElementSpy: jest.SpyInstance;
  let clickMock: jest.Mock;
  let alertSpy: jest.SpyInstance;
  let anchor: { href: string; download: string; click: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    clickMock = jest.fn();
    anchor = { href: "", download: "", click: clickMock };
    createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation((tag: string) => {
        if (tag === "a") return anchor as unknown as HTMLElement;
        return document.createElement(tag);
      });
    createObjectURL = jest
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock-url");
    revokeObjectURL = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("with populated tasks", () => {
    it("creates a Blob and triggers a download click", () => {
      exportTasksToCSV([makeTask()]);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("text/csv;charset=utf-8;");
      expect(clickMock).toHaveBeenCalledTimes(1);
    });

    it("revokes the object URL after clicking", () => {
      exportTasksToCSV([makeTask()]);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("sets default filename tasks.csv on the anchor", () => {
      exportTasksToCSV([makeTask()]);
      expect(anchor.download).toBe("tasks.csv");
    });

    it("sets a custom filename on the anchor when provided", () => {
      exportTasksToCSV([makeTask()], "my-tasks.csv");
      expect(anchor.download).toBe("my-tasks.csv");
    });

    it("sets the blob URL as href on the anchor", () => {
      exportTasksToCSV([makeTask()]);
      expect(anchor.href).toBe("blob:mock-url");
    });
  });

  describe("with empty task list", () => {
    it("calls alert when no onEmpty callback is provided", () => {
      exportTasksToCSV([]);
      expect(alertSpy).toHaveBeenCalledWith("No tasks to export.");
    });

    it("calls the onEmpty callback instead of alert when provided", () => {
      const onEmpty = jest.fn();
      exportTasksToCSV([], "tasks.csv", onEmpty);
      expect(onEmpty).toHaveBeenCalledTimes(1);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("does not create a Blob or click the anchor", () => {
      exportTasksToCSV([]);
      expect(createObjectURL).not.toHaveBeenCalled();
      expect(clickMock).not.toHaveBeenCalled();
    });

    it("does not call createElement for empty list", () => {
      exportTasksToCSV([]);
      expect(createElementSpy).not.toHaveBeenCalled();
    });
  });
});
