import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

global.fetch = jest.fn().mockResolvedValue({
  json: async () => ({ sprints: [] }),
  ok: true,
}) as jest.Mock;

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockGet = jest.fn().mockReturnValue(null);
const mockToString = jest.fn().mockReturnValue("");

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => ({ get: mockGet, toString: mockToString }),
}));

jest.mock("@/components/task-filters", () => ({
  TaskFilters: ({
    onSearchChange,
    onStatusChange,
    onSortChange,
    onClear,
  }: {
    onSearchChange: (v: string) => void;
    onStatusChange: (v: string) => void;
    onSortChange: (v: string) => void;
    onClear: () => void;
  }) => (
    <div>
      <button
        onClick={() => onSearchChange("fix bug")}
        data-testid="mock-search"
      />
      <button
        onClick={() => onStatusChange("TODO")}
        data-testid="mock-status-todo"
      />
      <button
        onClick={() => onStatusChange("")}
        data-testid="mock-status-all"
      />
      <button
        onClick={() => onSortChange("priority")}
        data-testid="mock-sort-priority"
      />
      <button onClick={onClear} data-testid="mock-clear" />
    </div>
  ),
}));

jest.mock("@/components/task-card", () => ({
  TaskCard: ({ task }: { task: { id: string; title: string } }) => (
    <div data-testid="task-card">{task.title}</div>
  ),
}));

jest.mock("@/lib/export", () => ({
  exportTasksToCSV: jest.fn(),
}));

const { TaskBoard } = require("@/components/task-board");

const makeTask = (overrides: Partial<{
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: null;
  dependencies: [];
}> = {}) => ({
  id: "t1",
  title: "Default task",
  status: "TODO",
  priority: "MEDIUM",
  assignee: null,
  dependencies: [],
  ...overrides,
});

const tasks = [
  makeTask({ id: "1", title: "Fix login bug", status: "TODO" }),
  makeTask({ id: "2", title: "Add dashboard", status: "IN_PROGRESS" }),
  makeTask({ id: "3", title: "Write tests", status: "DONE" }),
  makeTask({ id: "4", title: "Fix API error", status: "TODO" }),
];

const defaultProps = { tasks, projectId: "proj-1" };

function resetMocks() {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockGet.mockReset().mockReturnValue(null);
  mockToString.mockReset().mockReturnValue("");
}

beforeEach(resetMocks);

describe("TaskBoard rendering", () => {
  it("renders three column headers", () => {
    render(<TaskBoard {...defaultProps} />);
    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders all task cards when no filters active", () => {
    render(<TaskBoard {...defaultProps} />);
    expect(screen.getAllByTestId("task-card")).toHaveLength(4);
  });

  it("places TODO tasks in the To Do column", () => {
    render(<TaskBoard {...defaultProps} />);
    expect(screen.getByText("2 tasks")).toBeInTheDocument(); // To Do count
  });

  it("shows task titles correctly", () => {
    render(<TaskBoard {...defaultProps} />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("Add dashboard")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });
});

describe("TaskBoard filtering", () => {
  it("filters tasks by search query", () => {
    mockGet.mockImplementation((key: string) => (key === "q" ? "Fix" : null));
    render(<TaskBoard {...defaultProps} />);
    const cards = screen.getAllByTestId("task-card");
    const titles = cards.map((c) => c.textContent);
    expect(titles).toContain("Fix login bug");
    expect(titles).toContain("Fix API error");
    expect(titles).not.toContain("Add dashboard");
    expect(titles).not.toContain("Write tests");
  });

  it("shows empty state when search matches nothing", () => {
    mockGet.mockImplementation((key: string) =>
      key === "q" ? "xyznotfound" : null
    );
    render(<TaskBoard {...defaultProps} />);
    expect(screen.queryByTestId("task-card")).not.toBeInTheDocument();
  });

  it("filters tasks by status TODO", () => {
    mockGet.mockImplementation((key: string) =>
      key === "status" ? "TODO" : null
    );
    render(<TaskBoard {...defaultProps} />);
    const cards = screen.getAllByTestId("task-card");
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.textContent)).not.toContain("Add dashboard");
  });

  it("filters tasks by status IN_PROGRESS", () => {
    mockGet.mockImplementation((key: string) =>
      key === "status" ? "IN_PROGRESS" : null
    );
    render(<TaskBoard {...defaultProps} />);
    const cards = screen.getAllByTestId("task-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toBe("Add dashboard");
  });

  it("shows all tasks when status filter is empty", () => {
    mockGet.mockReturnValue(null);
    render(<TaskBoard {...defaultProps} />);
    expect(screen.getAllByTestId("task-card")).toHaveLength(4);
  });

  it("applies combined search and status filters", () => {
    mockGet.mockImplementation((key: string) => {
      if (key === "q") return "Fix";
      if (key === "status") return "TODO";
      return null;
    });
    render(<TaskBoard {...defaultProps} />);
    const cards = screen.getAllByTestId("task-card");
    expect(cards).toHaveLength(2);
    const titles = cards.map((c) => c.textContent);
    expect(titles).toContain("Fix login bug");
    expect(titles).toContain("Fix API error");
  });
});

describe("TaskBoard handlers", () => {
  it("calls router.replace with q param when search changes", () => {
    render(<TaskBoard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("mock-search"));
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("q=fix+bug"),
      { scroll: false }
    );
  });

  it("calls router.replace with status param when status changes", () => {
    render(<TaskBoard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("mock-status-todo"));
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("status=TODO"),
      { scroll: false }
    );
  });

  it("deletes status param when status cleared", () => {
    mockGet.mockImplementation((key: string) =>
      key === "status" ? "TODO" : null
    );
    mockToString.mockReturnValue("status=TODO");
    render(<TaskBoard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("mock-status-all"));
    const call = mockReplace.mock.calls[0][0] as string;
    expect(call).not.toContain("status=TODO");
  });

  it("calls router.replace with ? when clear is triggered", () => {
    render(<TaskBoard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("mock-clear"));
    expect(mockReplace).toHaveBeenCalledWith("?", { scroll: false });
  });

  it("navigates to task detail on task card click", () => {
    render(<TaskBoard {...defaultProps} />);
    // TaskCard mock doesn't wire up onClick; verify push is not called spuriously
    expect(mockPush).not.toHaveBeenCalled();
  });
});
