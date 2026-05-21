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
import { TaskStatus, SortBy } from "@/lib/types";

interface TaskFiltersProps {
  searchQuery: string;
  statusFilter: TaskStatus | "";
  sortBy: SortBy;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | "") => void;
  onSortChange: (value: SortBy) => void;
  onClear: () => void;
}

export function TaskFilters({
  searchQuery,
  statusFilter,
  sortBy,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onClear,
}: TaskFiltersProps) {
  const hasActiveFilters = searchQuery !== "" || statusFilter !== "" || sortBy !== "default";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        type="text"
        aria-label="Search tasks"
        placeholder="Search tasks..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />
      <Select
        value={statusFilter || "ALL"}
        onValueChange={(v) => onStatusChange(v === "ALL" ? "" : (v as TaskStatus))}
      >
        <SelectTrigger className="w-44" aria-label="Filter by status">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          <SelectItem value="TODO">To Do</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={sortBy}
        onValueChange={(v) => onSortChange(v as SortBy)}
      >
        <SelectTrigger className="w-44" aria-label="Sort tasks">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default order</SelectItem>
          <SelectItem value="priority">Sort by priority</SelectItem>
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
