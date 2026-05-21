import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/components/ui/select", () => {
  const React = require("react");
  return {
    Select: ({
      children,
      onValueChange,
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
          disabled={disabled}
          onChange={(e) => onValueChange?.(e.target.value)}
          defaultValue=""
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
    SelectItem: ({
      value,
      disabled,
    }: {
      children: React.ReactNode;
      value: string;
      disabled?: boolean;
    }) => (
      <option value={value} disabled={disabled}>
        {value}
      </option>
    ),
  };
});

const { TaskDependencySelector } = require("@/components/task-dependency-selector");

const taskA = { id: "A", title: "Task A", status: "TODO", dependsOnIds: [] };
const taskB = { id: "B", title: "Task B", status: "IN_PROGRESS", dependsOnIds: [] };
const taskC = { id: "C", title: "Task C", status: "DONE", dependsOnIds: [] };

describe("TaskDependencySelector", () => {
  it("renders the add-dependency dropdown when tasks are available", () => {
    render(
      <TaskDependencySelector
        tasks={[taskA, taskB]}
        selectedIds={[]}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByRole("combobox", { name: /add dependency/i })).toBeInTheDocument();
  });

  it("hides the dropdown when all tasks are already selected", () => {
    render(
      <TaskDependencySelector
        tasks={[taskA]}
        selectedIds={["A"]}
        onChange={jest.fn()}
      />
    );
    expect(screen.queryByRole("combobox", { name: /add dependency/i })).not.toBeInTheDocument();
  });

  it("shows selected tasks as chips and not unselected ones", () => {
    render(
      <TaskDependencySelector
        tasks={[taskA, taskB]}
        selectedIds={["A"]}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /remove dependency on task a/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove dependency on task b/i })).not.toBeInTheDocument();
  });

  it("calls onChange with new id when a task is selected from dropdown", () => {
    const onChange = jest.fn();
    render(
      <TaskDependencySelector
        tasks={[taskA, taskB]}
        selectedIds={[]}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByRole("combobox", { name: /add dependency/i }), {
      target: { value: "A" },
    });
    expect(onChange).toHaveBeenCalledWith(["A"]);
  });

  it("calls onChange without the id when remove button is clicked", () => {
    const onChange = jest.fn();
    render(
      <TaskDependencySelector
        tasks={[taskA, taskB]}
        selectedIds={["A", "B"]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /remove dependency on task a/i }));
    expect(onChange).toHaveBeenCalledWith(["B"]);
  });

  it("shows blocked warning when a selected dependency is not DONE", () => {
    render(
      <TaskDependencySelector
        tasks={[taskA]}
        selectedIds={["A"]}
        onChange={jest.fn()}
      />
    );
    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(/blocked until all dependencies are marked Done/i);
  });

  it("does not show blocked warning when all selected dependencies are DONE", () => {
    render(
      <TaskDependencySelector
        tasks={[taskC]}
        selectedIds={["C"]}
        onChange={jest.fn()}
      />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not show blocked warning with no selections", () => {
    render(
      <TaskDependencySelector
        tasks={[taskA]}
        selectedIds={[]}
        onChange={jest.fn()}
      />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables cyclic options in the dropdown", () => {
    // currentTaskId=C, graph has B→C meaning adding C→B would create C→B→C
    const taskBWithDep = { id: "B", title: "Task B", status: "TODO", dependsOnIds: ["C"] };
    render(
      <TaskDependencySelector
        tasks={[taskA, taskBWithDep]}
        selectedIds={[]}
        onChange={jest.fn()}
        currentTaskId="C"
      />
    );
    // SelectItem mock renders option text as the value string
    const optionB = screen.getByRole("option", { name: "B" }) as HTMLOptionElement;
    expect(optionB.disabled).toBe(true);
    const optionA = screen.getByRole("option", { name: "A" }) as HTMLOptionElement;
    expect(optionA.disabled).toBe(false);
  });

  it("disables the dropdown when disabled prop is true", () => {
    render(
      <TaskDependencySelector
        tasks={[taskA]}
        selectedIds={[]}
        onChange={jest.fn()}
        disabled
      />
    );
    expect(screen.getByRole("combobox", { name: /add dependency/i })).toBeDisabled();
  });
});
