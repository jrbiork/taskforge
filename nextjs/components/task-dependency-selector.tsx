"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { detectCircularDependency } from "@/lib/detect-cycle";

export interface CandidateTask {
  id: string;
  title: string;
  status: string;
  dependsOnIds: string[];
}

interface TaskDependencySelectorProps {
  tasks: CandidateTask[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  currentTaskId?: string;
  disabled?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const STATUS_COLOR: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
};

export function TaskDependencySelector({
  tasks,
  selectedIds,
  onChange,
  currentTaskId,
  disabled,
}: TaskDependencySelectorProps) {
  const [selectKey, setSelectKey] = useState(0);

  const graph: Record<string, string[]> = Object.fromEntries(
    tasks.map((t) => [t.id, t.dependsOnIds])
  );

  const selected = tasks.filter((t) => selectedIds.includes(t.id));
  const available = tasks.filter((t) => !selectedIds.includes(t.id));

  const wouldCycle = (id: string) =>
    currentTaskId ? detectCircularDependency(graph, currentTaskId, id) : false;

  const hasBlockedDep = selected.some((t) => t.status !== "DONE");

  const handleAdd = (id: string) => {
    onChange([...selectedIds, id]);
    setSelectKey((k) => k + 1);
  };

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((s) => s !== id));
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((task) => (
            <span
              key={task.id}
              className="flex items-center gap-1.5 rounded-full border bg-background pl-2.5 pr-1.5 py-0.5 text-sm"
            >
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[task.status] ?? ""}`}
              >
                {STATUS_LABEL[task.status] ?? task.status}
              </span>
              {task.title}
              <button
                type="button"
                onClick={() => handleRemove(task.id)}
                disabled={disabled}
                aria-label={`Remove dependency on ${task.title}`}
                className="rounded-full p-0.5 hover:bg-muted disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {hasBlockedDep && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>
            This task will be blocked until all dependencies are marked Done.
          </span>
        </div>
      )}

      {available.length > 0 && (
        <Select
          key={selectKey}
          value=""
          onValueChange={handleAdd}
          disabled={disabled}
        >
          <SelectTrigger aria-label="Add dependency">
            <SelectValue placeholder="Add dependency…" />
          </SelectTrigger>
          <SelectContent>
            {available.map((task) => {
              const cyclic = wouldCycle(task.id);
              return (
                <SelectItem key={task.id} value={task.id} disabled={cyclic}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[task.status] ?? ""}`}
                    >
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                    {task.title}
                    {cyclic && (
                      <span className="text-muted-foreground text-xs">
                        (would create a cycle)
                      </span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
