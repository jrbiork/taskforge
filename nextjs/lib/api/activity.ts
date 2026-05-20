import type { ActivityFeedResponse } from "@/lib/types";
import { ApiError } from "@/lib/api/tasks";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    throw new ApiError(
      response.status,
      typeof body.error === "string" ? body.error : response.statusText
    );
  }

  return response.json() as Promise<T>;
}

export async function getProjectActivity(projectId: string): Promise<ActivityFeedResponse> {
  return request<ActivityFeedResponse>(`/api/projects/${encodeURIComponent(projectId)}/activity`);
}
