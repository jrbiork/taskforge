"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommentThread } from "@/components/comment-thread";
import { ArrowLeft, Trash2, X, Plus, Lock } from "lucide-react";
import Link from "next/link";
import { TaskWithDetails, Task, TaskStatus, Priority } from "@/lib/types";
import {
  getTask,
  getTasks,
  updateTask,
  deleteTask,
  addDependency,
  removeDependency,
  ApiError,
} from "@/lib/api/tasks";

const statusLabel: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const statusColors: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [projectTasks, setProjectTasks] = useState<Pick<Task, "id" | "title" | "status">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const [selectedDependsOnId, setSelectedDependsOnId] = useState("");
  const [depError, setDepError] = useState("");

  useEffect(() => {
    fetchTask();
  }, [params.taskId]);

  useEffect(() => {
    if (task) fetchProjectTasks();
  }, [task?.projectId]);

  const fetchTask = async () => {
    try {
      const data = await getTask(params.taskId as string);
      setTask(data);
    } catch {
      // task not found or unauthorized — leave task as null
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectTasks = async () => {
    if (!task) return;
    try {
      const data = await getTasks(task.projectId);
      setProjectTasks(
        data
          .filter((t) => t.id !== params.taskId)
          .map((t) => ({ id: t.id, title: t.title, status: t.status }))
      );
    } catch {
      // non-critical — silently ignore
    }
  };

  const startEditingTitle = () => {
    if (!task) return;
    setTitleDraft(task.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const saveTitle = async () => {
    if (!task || !titleDraft.trim() || titleDraft === task.title) {
      setEditingTitle(false);
      return;
    }
    setIsUpdating(true);
    try {
      await updateTask(params.taskId as string, { title: titleDraft.trim() });
      await fetchTask();
    } finally {
      setIsUpdating(false);
      setEditingTitle(false);
    }
  };

  const startEditingDescription = () => {
    if (!task) return;
    setDescriptionDraft(task.description ?? "");
    setEditingDescription(true);
    setTimeout(() => descriptionInputRef.current?.focus(), 0);
  };

  const saveDescription = async () => {
    if (!task || descriptionDraft === (task.description ?? "")) {
      setEditingDescription(false);
      return;
    }
    setIsUpdating(true);
    try {
      await updateTask(params.taskId as string, { description: descriptionDraft });
      await fetchTask();
    } finally {
      setIsUpdating(false);
      setEditingDescription(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateTask(params.taskId as string, { status: newStatus as TaskStatus });
      await fetchTask();
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    setIsUpdating(true);
    try {
      await updateTask(params.taskId as string, { priority: newPriority as Priority });
      await fetchTask();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(params.taskId as string);
      router.push(`/projects/${params.id}`);
    } catch {
      // stay on page if delete fails
    }
  };

  const handleAddDependency = async () => {
    if (!selectedDependsOnId) return;
    setDepError("");
    try {
      await addDependency(params.taskId as string, selectedDependsOnId);
      setSelectedDependsOnId("");
      await fetchTask();
    } catch (err) {
      setDepError(err instanceof ApiError ? err.message : "Failed to add dependency");
    }
  };

  const handleRemoveDependency = async (dependsOnId: string) => {
    try {
      await removeDependency(params.taskId as string, dependsOnId);
      await fetchTask();
    } catch {
      // silently ignore — task state will be stale until next load
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading task...</div>;
  }

  if (!task) {
    return <div className="text-center py-12">Task not found</div>;
  }

  const alreadyDependsOnIds = new Set(task.dependencies.map((d) => d.dependsOnId));
  const availableToAdd = projectTasks.filter((t) => !alreadyDependsOnIds.has(t.id));
  const isBlocked = task.dependencies.some((d) => d.dependsOn.status !== "DONE");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href={`/projects/${params.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Project
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  className="text-3xl font-bold bg-transparent border-b-2 border-primary outline-none w-full"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  disabled={isUpdating}
                />
              ) : (
                <h1
                  className="text-3xl font-bold cursor-pointer hover:text-muted-foreground transition-colors"
                  onClick={startEditingTitle}
                  title="Click to edit title"
                >
                  {task.title}
                </h1>
              )}
              {isBlocked && (
                <span className="flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-red-100 text-red-700">
                  <Lock className="h-3.5 w-3.5" />
                  Blocked
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{task.project.name}</p>
          </div>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {editingDescription ? (
                <div className="space-y-2">
                  <textarea
                    ref={descriptionInputRef}
                    className="w-full min-h-[100px] resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingDescription(false);
                    }}
                    disabled={isUpdating}
                    placeholder="Add a description…"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveDescription} disabled={isUpdating}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingDescription(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={startEditingDescription}
                  title="Click to edit description"
                >
                  {task.description || "No description provided — click to add one"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.dependencies.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Blocked by</p>
                  {task.dependencies.map((dep) => (
                    <div
                      key={dep.dependsOnId}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            statusColors[dep.dependsOn.status] ?? ""
                          }`}
                        >
                          {statusLabel[dep.dependsOn.status] ?? dep.dependsOn.status}
                        </span>
                        <span className="text-sm">{dep.dependsOn.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveDependency(dep.dependsOnId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No dependencies</p>
              )}

              {task.dependents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Blocking</p>
                  {task.dependents.map((dep) => (
                    <div
                      key={dep.taskId}
                      className="flex items-center gap-2 rounded-md border px-3 py-2"
                    >
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          statusColors[dep.task.status] ?? ""
                        }`}
                      >
                        {statusLabel[dep.task.status] ?? dep.task.status}
                      </span>
                      <span className="text-sm">{dep.task.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {availableToAdd.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Add dependency</p>
                  <div className="flex gap-2">
                    <Select
                      value={selectedDependsOnId}
                      onValueChange={setSelectedDependsOnId}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a task this depends on…" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToAdd.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      disabled={!selectedDependsOnId}
                      onClick={handleAddDependency}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {depError && (
                    <p className="text-sm text-destructive">{depError}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <CommentThread
                comments={task.comments}
                taskId={params.taskId as string}
                onCommentAdded={fetchTask}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={task.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select
                  value={task.priority}
                  onValueChange={handlePriorityChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Assignee</label>
                <p className="text-sm text-muted-foreground">
                  {task.assignee?.name || "Unassigned"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Created</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Updated</label>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
