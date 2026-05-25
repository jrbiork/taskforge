"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { Sprint, SprintStatus } from "@/components/sprint/types";
import type { Task, User, Project } from "@prisma/client";

type TaskWithMeta = Task & {
  assignee: Pick<User, "id" | "name" | "email"> | null;
  project: Pick<Project, "id" | "name">;
};

type ProjectOption = Pick<Project, "id" | "name">;

const statusStyles: Record<SprintStatus, string> = {
  PLANNING: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

const taskStatusStyles: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SprintDetailPage() {
  const params = useParams();
  const sprintId = (params?.id ?? "") as string;

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectTasks, setProjectTasks] = useState<TaskWithMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingProjectTasks, setIsLoadingProjectTasks] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchSprint();
  }, [sprintId]);

  const fetchSprint = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/sprints/${sprintId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to load sprint.");
        return;
      }
      const data = await res.json();
      setSprint(data.sprint);
      setTasks(data.tasks ?? []);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = async () => {
    setAddOpen(true);
    if (projects.length === 0) {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects ?? data ?? []);
      }
    }
  };

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectTasks([]);
      return;
    }
    setIsLoadingProjectTasks(true);
    fetch(`/api/projects/${selectedProjectId}`)
      .then((r) => r.json())
      .then((data) => {
        const allTasks: TaskWithMeta[] = (data.tasks ?? []).map((t: Task) => ({
          ...t,
          project: { id: data.id, name: data.name },
          assignee: (t as TaskWithMeta).assignee ?? null,
        }));
        setProjectTasks(allTasks);
      })
      .finally(() => setIsLoadingProjectTasks(false));
  }, [selectedProjectId]);

  const currentTaskIds = new Set(tasks.map((t) => t.id));

  const filteredProjectTasks = projectTasks.filter((t) => {
    if (currentTaskIds.has(t.id)) return false;
    if (!searchQuery) return true;
    return t.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddTask = async (taskId: string) => {
    setIsAdding(taskId);
    try {
      const res = await fetch(`/api/sprints/${sprintId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        await fetchSprint();
      }
    } finally {
      setIsAdding(null);
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    setIsRemoving(taskId);
    try {
      const res = await fetch(`/api/sprints/${sprintId}/tasks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        await fetchSprint();
      }
    } finally {
      setIsRemoving(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading sprint…</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
        {error}
      </div>
    );
  }

  if (!sprint) {
    return <div className="text-center py-12">Sprint not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sprints"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sprints
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{sprint.name}</h1>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[sprint.status]}`}
              >
                {sprint.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
            </p>
            {sprint.goal && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">{sprint.goal}</p>
            )}
          </div>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tasks
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Tasks{" "}
          <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span>
        </h2>

        {tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-lg">
            No tasks in this sprint yet. Click &ldquo;Add Tasks&rdquo; to assign some.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-4 border rounded-lg px-4 py-3 bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                      taskStatusStyles[task.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                  <span className="font-medium text-sm truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {task.project.name}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {task.assignee?.name ?? "Unassigned"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    disabled={isRemoving === task.id}
                    onClick={() => handleRemoveTask(task.id)}
                    title="Remove from sprint"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Tasks to Sprint</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project…" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProjectId && (
              <Input
                placeholder="Search tasks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            )}

            <div className="max-h-72 overflow-y-auto space-y-2">
              {isLoadingProjectTasks && (
                <p className="text-sm text-muted-foreground text-center py-4">Loading tasks…</p>
              )}
              {!isLoadingProjectTasks && selectedProjectId && filteredProjectTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available tasks to add.
                </p>
              )}
              {filteredProjectTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 border rounded-md px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.assignee?.name ?? "Unassigned"} ·{" "}
                      <span
                        className={`text-xs ${
                          taskStatusStyles[task.status] ?? ""
                        } px-1 rounded`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isAdding === task.id}
                    onClick={() => handleAddTask(task.id)}
                  >
                    {isAdding === task.id ? "Adding…" : "Add"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
