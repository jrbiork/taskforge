import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("@/components/ui/select", () => {
  const React = require("react");

  return {
    // Select scans its direct children to find the aria-label on SelectTrigger,
    // then renders a native <select> wrapping all children so options land inside it.
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (v: string) => void;
      value: string;
    }) => {
      let ariaLabel = "";
      React.Children.forEach(children, (child: any) => {
        if (child?.props?.["aria-label"]) {
          ariaLabel = child.props["aria-label"];
        }
      });
      return (
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            onValueChange?.(e.target.value)
          }
        >
          {children}
        </select>
      );
    },
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
  };
});

const { TaskFilters } = require("@/components/task-filters");

const defaultProps = {
  searchQuery: "",
  statusFilter: "" as const,
  sortBy: "default" as const,
  onSearchChange: jest.fn(),
  onStatusChange: jest.fn(),
  onSortChange: jest.fn(),
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
    expect(
      screen.getByRole("combobox", { name: /filter by status/i })
    ).toBeInTheDocument();
  });

  it("renders sort select", () => {
    render(<TaskFilters {...defaultProps} />);
    expect(
      screen.getByRole("combobox", { name: /sort tasks/i })
    ).toBeInTheDocument();
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

  it("renders clear button when sortBy is priority", () => {
    render(<TaskFilters {...defaultProps} sortBy="priority" />);
    expect(
      screen.getByRole("button", { name: /clear filters/i })
    ).toBeInTheDocument();
  });

  it("renders clear button when both filters are active", () => {
    render(
      <TaskFilters {...defaultProps} searchQuery="bug" statusFilter="DONE" />
    );
    expect(
      screen.getByRole("button", { name: /clear filters/i })
    ).toBeInTheDocument();
  });
});

describe("TaskFilters interactions", () => {
  beforeEach(() => {
    defaultProps.onSearchChange.mockClear();
    defaultProps.onStatusChange.mockClear();
    defaultProps.onSortChange.mockClear();
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
    fireEvent.change(
      screen.getByRole("combobox", { name: /filter by status/i }),
      { target: { value: "TODO" } }
    );
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith("TODO");
  });

  it("calls onStatusChange with empty string when All Statuses selected", () => {
    render(<TaskFilters {...defaultProps} statusFilter="TODO" />);
    fireEvent.change(
      screen.getByRole("combobox", { name: /filter by status/i }),
      { target: { value: "ALL" } }
    );
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith("");
  });

  it("calls onSortChange with priority when priority option selected", () => {
    render(<TaskFilters {...defaultProps} />);
    fireEvent.change(screen.getByRole("combobox", { name: /sort tasks/i }), {
      target: { value: "priority" },
    });
    expect(defaultProps.onSortChange).toHaveBeenCalledWith("priority");
  });

  it("calls onSortChange with default when default option selected", () => {
    render(<TaskFilters {...defaultProps} sortBy="priority" />);
    fireEvent.change(screen.getByRole("combobox", { name: /sort tasks/i }), {
      target: { value: "default" },
    });
    expect(defaultProps.onSortChange).toHaveBeenCalledWith("default");
  });

  it("calls onClear when clear button is clicked", () => {
    render(<TaskFilters {...defaultProps} searchQuery="bug" />);
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
  });
});
