"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskStatus } from "@/lib/types";

interface TaskFiltersProps {
  searchQuery: string;
  statusFilter: TaskStatus | "";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | "") => void;
  onClear: () => void;
}

export function TaskFilters({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onClear,
}: TaskFiltersProps) {
  const hasActiveFilters = searchQuery !== "" || statusFilter !== "";

  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center">
      <Input
        type="text"
        aria-label="Search tasks"
        placeholder="Search tasks..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />
      <Select
        value={statusFilter}
        onValueChange={(v) => onStatusChange(v as TaskStatus | "")}
      >
        <SelectTrigger className="w-44" aria-label="Filter by status">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Statuses</SelectItem>
          <SelectItem value="TODO">To Do</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
