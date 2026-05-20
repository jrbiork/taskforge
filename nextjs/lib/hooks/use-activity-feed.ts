"use client";

import { useState, useEffect, useCallback } from "react";
import { ActivityEventItem } from "@/lib/types";
import { getProjectActivity } from "@/lib/api/activity";

const POLL_INTERVAL_MS = 30_000;

export interface ActivityFeedState {
  events: ActivityEventItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useActivityFeed(projectId: string): ActivityFeedState {
  const [events, setEvents] = useState<ActivityEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      setError(null);
      const data = await getProjectActivity(projectId);
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchActivity();

    const interval = setInterval(() => {
      if (!document.hidden) fetchActivity();
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) fetchActivity();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchActivity]);

  return { events, loading, error, refetch: fetchActivity };
}
