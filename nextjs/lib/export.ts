import type { TaskForBoard } from "./types";

export function tasksToCSVString(tasks: TaskForBoard[]): string {
  const headers = ["Title", "Description", "Status", "Priority", "Assignee", "Created At"];
  const rows = tasks.map((t) => [
    t.title,
    t.description ?? "",
    t.status,
    t.priority,
    t.assignee?.name ?? "Unassigned",
    new Date(t.createdAt).toISOString(),
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function exportTasksToCSV(
  tasks: TaskForBoard[],
  filename = "tasks.csv",
  onEmpty?: () => void
): void {
  if (tasks.length === 0) {
    if (onEmpty) {
      onEmpty();
    } else {
      alert("No tasks to export.");
    }
    return;
  }

  const csv = tasksToCSVString(tasks);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
