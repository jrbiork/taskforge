"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, User } from "@prisma/client";
import { Calendar, User as UserIcon, Lock, Clock } from "lucide-react";
import { DependencyWithPrerequisite } from "@/lib/types";
import { formatDuration } from "@/lib/time-utils";
import type { Sprint } from "@/components/sprint/types";

interface TaskCardProps {
  task: Task & {
    assignee: Pick<User, "id" | "name" | "email"> | null;
    dependencies?: DependencyWithPrerequisite[];
    totalMinutes?: number;
  };
  onClick?: () => void;
  sprints?: Sprint[];
  onSprintChange?: (val: string) => void;
}

const priorityColors = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export function TaskCard({ task, onClick, sprints, onSprintChange }: TaskCardProps) {
  const isBlocked =
    task.dependencies?.some((d) => d.dependsOn.status !== "DONE") ?? false;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${isBlocked ? "opacity-75" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium">{task.title}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isBlocked && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                <Lock className="h-3 w-3" />
                Blocked
              </span>
            )}
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                priorityColors[task.priority as keyof typeof priorityColors] ?? ""
              }`}
            >
              {task.priority}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            <span>{task.assignee?.name || "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-2">
            {task.totalMinutes !== undefined && task.totalMinutes > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                <Clock className="h-3 w-3" />
                {formatDuration(task.totalMinutes)}
              </span>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        {sprints !== undefined && (
          <div
            className="mt-2 pt-2 border-t"
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              value={task.sprintId ?? "none"}
              onValueChange={onSprintChange}
            >
              <SelectTrigger className="h-6 w-auto max-w-full border-none shadow-none p-0 gap-1 text-xs text-muted-foreground hover:text-foreground focus:ring-0">
                <SelectValue placeholder="No sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No sprint</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
