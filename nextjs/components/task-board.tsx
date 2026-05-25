"use client";

import { useState, useEffect } from "react";
import { Task, User } from "@prisma/client";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { TaskStatus, SortBy, Priority, DependencyWithPrerequisite } from "@/lib/types";
import { exportTasksToCSV } from "@/lib/export";
import type { Sprint } from "@/components/sprint/types";

interface TaskBoardProps {
  tasks: (Task & {
    assignee: Pick<User, "id" | "name" | "email"> | null;
    dependencies?: DependencyWithPrerequisite[];
  })[];
  projectId: string;
}

export function TaskBoard({ tasks, projectId }: TaskBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintUpdating, setSprintUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((data) => setSprints(data.sprints ?? []));
  }, []);

  const searchQuery = searchParams.get("q") ?? "";
  const statusFilter = (searchParams.get("status") ?? "") as TaskStatus | "";
  const sortBy = (searchParams.get("sort") ?? "default") as SortBy;

  const PRIORITY_WEIGHT: Record<Priority, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy !== "priority") return 0;
      return (
        PRIORITY_WEIGHT[b.priority as Priority] -
        PRIORITY_WEIGHT[a.priority as Priority]
      );
    });

  const todoTasks = filteredTasks.filter((t) => t.status === "TODO");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = filteredTasks.filter((t) => t.status === "DONE");

  const handleTaskClick = (taskId: string) => {
    router.push(`/projects/${projectId}/tasks/${taskId}`);
  };

  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleStatusChange = (value: TaskStatus | "") => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleSortChange = (value: SortBy) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "default") {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleClear = () => router.replace("?", { scroll: false });

  const handleSprintChange = async (taskId: string, currentSprintId: string | null, newValue: string) => {
    setSprintUpdating(taskId);
    try {
      if (newValue === "none") {
        if (currentSprintId) {
          await fetch(`/api/sprints/${currentSprintId}/tasks`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId }),
          });
        }
      } else {
        if (currentSprintId && currentSprintId !== newValue) {
          await fetch(`/api/sprints/${currentSprintId}/tasks`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId }),
          });
        }
        await fetch(`/api/sprints/${newValue}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
      }
      router.refresh();
    } finally {
      setSprintUpdating(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start gap-3 mb-6">
        <TaskFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          sortBy={sortBy}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onSortChange={handleSortChange}
          onClear={handleClear}
        />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={filteredTasks.length === 0}
          title={filteredTasks.length === 0 ? "No tasks to export" : undefined}
          onClick={() =>
            exportTasksToCSV(
              filteredTasks.map((t) => ({ ...t, dependencies: t.dependencies ?? [] })),
              `tasks-${projectId}.csv`
            )
          }
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <div className="mb-4">
          <h3 className="font-semibold text-lg">To Do</h3>
          <p className="text-sm text-muted-foreground">{todoTasks.length} tasks</p>
        </div>
        <div className="space-y-3">
          {todoTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task.id)}
              sprints={sprints}
              onSprintChange={(val) => handleSprintChange(task.id, task.sprintId, val)}
            />
          ))}
          {todoTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks yet
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="font-semibold text-lg">In Progress</h3>
          <p className="text-sm text-muted-foreground">
            {inProgressTasks.length} tasks
          </p>
        </div>
        <div className="space-y-3">
          {inProgressTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task.id)}
              sprints={sprints}
              onSprintChange={(val) => handleSprintChange(task.id, task.sprintId, val)}
            />
          ))}
          {inProgressTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks in progress
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Done</h3>
          <p className="text-sm text-muted-foreground">{doneTasks.length} tasks</p>
        </div>
        <div className="space-y-3">
          {doneTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task.id)}
              sprints={sprints}
              onSprintChange={(val) => handleSprintChange(task.id, task.sprintId, val)}
            />
          ))}
          {doneTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No completed tasks
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
