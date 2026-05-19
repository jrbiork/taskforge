import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    value: string;
  }) => (
    <select
      data-testid="status-select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

const { TaskFilters } = require("@/components/task-filters");

const defaultProps = {
  searchQuery: "",
  statusFilter: "" as const,
  onSearchChange: jest.fn(),
  onStatusChange: jest.fn(),
  onClear: jest.fn(),
};

describe("TaskFilters rendering", () => {
  it("renders search input", () => {
    render(<TaskFilters {...defaultProps} />);
    expect(
      screen.getByRole("textbox", { name: /search tasks/i })
    ).toBeInTheDocument();
  });

  it("renders status select", () => {
    render(<TaskFilters {...defaultProps} />);
    expect(screen.getByTestId("status-select")).toBeInTheDocument();
  });

  it("does not render clear button when no filters are active", () => {
    render(<TaskFilters {...defaultProps} />);
    expect(
      screen.queryByRole("button", { name: /clear filters/i })
    ).not.toBeInTheDocument();
  });

  it("renders clear button when searchQuery is non-empty", () => {
    render(<TaskFilters {...defaultProps} searchQuery="bug" />);
    expect(
      screen.getByRole("button", { name: /clear filters/i })
    ).toBeInTheDocument();
  });

  it("renders clear button when statusFilter is non-empty", () => {
    render(<TaskFilters {...defaultProps} statusFilter="TODO" />);
    expect(
      screen.getByRole("button", { name: /clear filters/i })
    ).toBeInTheDocument();
  });

  it("renders clear button when both filters are active", () => {
    render(<TaskFilters {...defaultProps} searchQuery="bug" statusFilter="DONE" />);
    expect(
      screen.getByRole("button", { name: /clear filters/i })
    ).toBeInTheDocument();
  });
});

describe("TaskFilters interactions", () => {
  beforeEach(() => {
    defaultProps.onSearchChange.mockClear();
    defaultProps.onStatusChange.mockClear();
    defaultProps.onClear.mockClear();
  });

  it("calls onSearchChange with typed value", () => {
    render(<TaskFilters {...defaultProps} />);
    fireEvent.change(screen.getByRole("textbox", { name: /search tasks/i }), {
      target: { value: "fix" },
    });
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith("fix");
  });

  it("calls onStatusChange with TODO when TODO option selected", () => {
    render(<TaskFilters {...defaultProps} />);
    fireEvent.change(screen.getByTestId("status-select"), {
      target: { value: "TODO" },
    });
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith("TODO");
  });

  it("calls onStatusChange with empty string when All Statuses selected", () => {
    render(<TaskFilters {...defaultProps} statusFilter="TODO" />);
    fireEvent.change(screen.getByTestId("status-select"), {
      target: { value: "" },
    });
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith("");
  });

  it("calls onClear when clear button is clicked", () => {
    render(<TaskFilters {...defaultProps} searchQuery="bug" />);
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
  });
});
