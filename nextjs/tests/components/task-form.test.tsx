import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/ui/select", () => {
  const React = require("react");
  return {
    Select: ({
      children,
      onValueChange,
      value,
      disabled,
    }: {
      children: React.ReactNode;
      onValueChange?: (v: string) => void;
      value?: string;
      disabled?: boolean;
    }) => {
      let ariaLabel = "";
      React.Children.forEach(children, (child: React.ReactElement) => {
        if (child?.props?.["aria-label"]) ariaLabel = child.props["aria-label"];
      });
      return (
        <select
          aria-label={ariaLabel}
          value={value}
          disabled={disabled}
          onChange={(e) => onValueChange?.(e.target.value)}
        >
          {children}
        </select>
      );
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <option value="">{placeholder}</option>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
  };
});

jest.mock("@/components/task-dependency-selector", () => ({
  TaskDependencySelector: ({
    selectedIds,
    onChange,
    tasks,
  }: {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    tasks: { id: string; title: string }[];
  }) => (
    <div>
      {tasks.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange([...selectedIds, t.id])}>
          Add {t.title}
        </button>
      ))}
      <div data-testid="selected-deps">{selectedIds.join(",")}</div>
    </div>
  ),
}));

const { TaskForm } = require("@/components/task-form");

const projectTasks = [
  { id: "t1", title: "Existing Task", status: "TODO", dependencies: [] },
];

const defaultProps = {
  projectId: "proj-1",
  projectTasks,
  onSuccess: jest.fn(),
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("TaskForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    defaultProps.onSuccess.mockReset();
  });

  it("renders title, description, and priority fields", () => {
    render(<TaskForm {...defaultProps} />);
    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /select priority/i })).toBeInTheDocument();
  });

  it("renders the dependency selector when projectTasks are provided", () => {
    render(<TaskForm {...defaultProps} />);
    expect(screen.getByText(/add existing task/i)).toBeInTheDocument();
  });

  it("does not render the dependency selector when projectTasks is empty", () => {
    render(<TaskForm {...defaultProps} projectTasks={[]} />);
    expect(screen.queryByText(/add existing task/i)).not.toBeInTheDocument();
  });

  it("submits task and calls onSuccess on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "new-task-id" }),
    });

    render(<TaskForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: "My New Task" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({ method: "POST" })
      );
      expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("creates dependency links after task creation when deps are selected", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "new-task-id" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<TaskForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: "Dependent Task" },
    });
    fireEvent.click(screen.getByText(/add existing task/i));
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "/api/tasks/new-task-id/dependencies",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ dependsOnId: "t1" }),
        })
      );
    });
  });

  it("shows error message when task creation fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Validation failed" }),
    });

    render(<TaskForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: "Bad Task" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => {
      expect(screen.getByText("Validation failed")).toBeInTheDocument();
    });
  });

  it("shows network error on fetch exception", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network down"));

    render(<TaskForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: "Another Task" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("disables the submit button while submitting", async () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    render(<TaskForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: "Pending Task" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });
  });
});
