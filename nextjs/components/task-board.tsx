"use client";

import { useState } from "react";
import { Task, User } from "@prisma/client";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { useRouter, useSearchParams } from "next/navigation";
import { TaskStatus } from "@/lib/types";

interface TaskBoardProps {
  tasks: (Task & {
    assignee: Pick<User, "id" | "name" | "email"> | null;
  })[];
  projectId: string;
}

export function TaskBoard({ tasks, projectId }: TaskBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isUpdating, setIsUpdating] = useState(false);

  const searchQuery = searchParams.get("q") ?? "";
  const statusFilter = (searchParams.get("status") ?? "") as TaskStatus | "";

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      searchQuery === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const handleClear = () => router.replace("?", { scroll: false });

  return (
    <div>
      <TaskFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onClear={handleClear}
      />
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
