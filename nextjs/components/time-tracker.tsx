"use client";

import { useState, useEffect, useRef } from "react";
import { formatDuration, computeMinutes } from "@/lib/time-utils";

interface ActiveTimer {
  id: string;
  startedAt: string;
}

interface TimeTrackerProps {
  taskId: string;
  /** Pre-fetched active timer if one exists (optional — component will fetch on mount otherwise) */
  initialActiveTimer?: ActiveTimer | null;
}

export function TimeTracker({ taskId, initialActiveTimer = undefined }: TimeTrackerProps) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(
    initialActiveTimer ?? null
  );
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [loading, setLoading] = useState(initialActiveTimer === undefined);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active timer on mount (if not pre-provided)
  useEffect(() => {
    if (initialActiveTimer !== undefined) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tasks/${taskId}/timer`)
      .then((r) => r.json())
      .then((data: ActiveTimer | null) => {
        if (!cancelled) {
          setActiveTimer(data ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, initialActiveTimer]);

  // Update elapsed every 30 seconds while timer is running
  useEffect(() => {
    if (activeTimer) {
      const tick = () => {
        const start = new Date(activeTimer.startedAt);
        setElapsedMinutes(computeMinutes(start, new Date()));
      };
      tick();
      intervalRef.current = setInterval(tick, 30000);
    } else {
      setElapsedMinutes(0);
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeTimer]);

  async function handleStart() {
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Failed to start timer");
        return;
      }
      const timer = (await res.json()) as ActiveTimer;
      setActiveTimer({ id: timer.id, startedAt: timer.startedAt });
    } catch {
      setError("Failed to start timer");
    }
  }

  async function handleStop() {
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Failed to stop timer");
        return;
      }
      setActiveTimer(null);
    } catch {
      setError("Failed to stop timer");
    }
  }

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading timer...</div>;
  }

  return (
    <div className="flex items-center gap-3">
      {activeTimer ? (
        <>
          <span className="text-sm font-mono text-green-700" data-testid="elapsed-time">
            {formatDuration(elapsedMinutes)} elapsed
          </span>
          <button
            onClick={handleStop}
            className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            data-testid="stop-timer-btn"
          >
            Stop Timer
          </button>
        </>
      ) : (
        <button
          onClick={handleStart}
          className="text-xs px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
          data-testid="start-timer-btn"
        >
          Start Timer
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
