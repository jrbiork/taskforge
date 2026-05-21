import type { TaskForBoard, TaskWithDetails, Task, TaskStatus, Priority } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  projectId: string;
  assigneeId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    throw new ApiError(
      response.status,
      typeof body.error === "string" ? body.error : response.statusText,
    );
  }

  return response.json() as Promise<T>;
}

export async function getTasks(projectId?: string): Promise<TaskForBoard[]> {
  const path = projectId
    ? `/api/tasks?projectId=${encodeURIComponent(projectId)}`
    : "/api/tasks";
  return request<TaskForBoard[]>(path);
}

export async function getTask(id: string): Promise<TaskWithDetails> {
  return request<TaskWithDetails>(`/api/tasks/${encodeURIComponent(id)}`);
}

export async function createTask(data: CreateTaskInput): Promise<Task> {
  return request<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: string, data: UpdateTaskInput): Promise<Task> {
  return request<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function addDependency(taskId: string, dependsOnId: string): Promise<void> {
  await request<unknown>(`/api/tasks/${encodeURIComponent(taskId)}/dependencies`, {
    method: "POST",
    body: JSON.stringify({ dependsOnId }),
  });
}

export async function removeDependency(taskId: string, dependsOnId: string): Promise<void> {
  await request<unknown>(`/api/tasks/${encodeURIComponent(taskId)}/dependencies`, {
    method: "DELETE",
    body: JSON.stringify({ dependsOnId }),
  });
}
