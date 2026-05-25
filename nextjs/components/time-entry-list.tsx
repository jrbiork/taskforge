"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatDuration } from "@/lib/time-utils";

interface TimeEntryUser {
  id: string;
  name: string;
}

interface TimeEntry {
  id: string;
  taskId: string;
  userId: string | null;
  startedAt: string;
  stoppedAt: string | null;
  minutes: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  user: TimeEntryUser | null;
}

interface TimeEntryListProps {
  taskId: string;
  currentUserId: string;
  currentUserRole: "ADMIN" | "MEMBER" | "VIEWER";
}

export function TimeEntryList({ taskId, currentUserId, currentUserRole }: TimeEntryListProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMinutes, setFormMinutes] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-entries`);
      if (!res.ok) {
        setError("Failed to load time entries");
        return;
      }
      const data = (await res.json()) as TimeEntry[];
      setEntries(data);
    } catch {
      setError("Failed to load time entries");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  async function handleLogTime(e: React.FormEvent) {
    e.preventDefault();
    const mins = parseInt(formMinutes, 10);
    if (isNaN(mins) || mins < 1 || mins > 1440) {
      setFormError("Enter a duration between 1 and 1440 minutes.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const now = new Date();
      const res = await fetch(`/api/tasks/${taskId}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes: mins,
          description: formDescription.trim() || undefined,
          loggedAt: now.toISOString(),
          startedAt: new Date(now.getTime() - mins * 60000).toISOString(),
          stoppedAt: now.toISOString(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setFormError(body.error ?? "Failed to log time");
        return;
      }
      setFormMinutes("");
      setFormDescription("");
      setShowForm(false);
      await fetchEntries();
    } catch {
      setFormError("Failed to log time");
    } finally {
      setSubmitting(false);
    }
  }

  function canEdit(entry: TimeEntry): boolean {
    if (currentUserRole === "VIEWER") return false;
    if (currentUserRole === "ADMIN") return true;
    return entry.userId === currentUserId;
  }

  async function handleDelete(entryId: string) {
    setDeletingId(entryId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-entries/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Failed to delete entry");
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch {
      setError("Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading time entries...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  const canAdd = currentUserRole !== "VIEWER";

  const logForm = canAdd && (
    <div className="mb-3">
      {showForm ? (
        <form onSubmit={handleLogTime} className="space-y-2 p-3 rounded-md border bg-muted/40">
          <div className="flex gap-2 items-center">
            <input
              ref={minutesRef}
              type="number"
              min={1}
              max={1440}
              placeholder="Minutes (e.g. 90)"
              value={formMinutes}
              onChange={(e) => setFormMinutes(e.target.value)}
              className="w-36 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => { setShowForm(true); setTimeout(() => minutesRef.current?.focus(), 0); }}
          className="text-xs px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          + Log time
        </button>
      )}
    </div>
  );

  if (entries.length === 0) {
    return (
      <div>
        {logForm}
        <div className="text-sm text-muted-foreground" data-testid="empty-state">
          No time entries yet.
        </div>
      </div>
    );
  }

  return (
    <div>
      {logForm}
      <ul className="space-y-2" data-testid="time-entry-list">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-start justify-between gap-2 p-3 rounded-md border bg-card"
          data-testid="time-entry-item"
        >
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium text-foreground">
              {entry.minutes !== null ? formatDuration(entry.minutes) : "Running"}
            </span>
            <span className="text-xs text-muted-foreground">
              {entry.user?.name ?? "Deleted user"} &middot;{" "}
              {new Date(entry.startedAt).toLocaleDateString()}
            </span>
            {entry.description && (
              <span className="text-xs text-muted-foreground">{entry.description}</span>
            )}
          </div>
          {canEdit(entry) && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                data-testid="delete-entry-btn"
              >
                {deletingId === entry.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          )}
        </li>
      ))}
      </ul>
    </div>
  );
}
