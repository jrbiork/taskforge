"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDependencySelector } from "@/components/task-dependency-selector";
import { TaskForBoard, Priority } from "@/lib/types";
import { createTask, addDependency, ApiError } from "@/lib/api/tasks";

interface TaskFormProps {
  projectId: string;
  projectTasks: TaskForBoard[];
  onSuccess: () => void;
}

export function TaskForm({ projectId, projectTasks, onSuccess }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [depIds, setDepIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidateTasks = projectTasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dependsOnIds: t.dependencies.map((d) => d.dependsOnId),
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const task = await createTask({ title, description, priority: priority as Priority, projectId });

      await Promise.all(depIds.map((dependsOnId) => addDependency(task.id, dependsOnId)));

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDepIds([]);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Network error — check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Task Title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task description..."
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-priority">Priority</Label>
        <Select
          value={priority}
          onValueChange={setPriority}
          disabled={isSubmitting}
        >
          <SelectTrigger id="task-priority" aria-label="Select priority">
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

      {candidateTasks.length > 0 && (
        <div className="space-y-2">
          <Label>Dependencies</Label>
          <TaskDependencySelector
            tasks={candidateTasks}
            selectedIds={depIds}
            onChange={setDepIds}
            disabled={isSubmitting}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating..." : "Create Task"}
      </Button>
    </form>
  );
}
