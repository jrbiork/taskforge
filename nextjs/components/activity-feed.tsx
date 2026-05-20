"use client";

import { useActivityFeed } from "@/lib/hooks/use-activity-feed";
import { formatActivityDescription } from "@/lib/activity";
import type { ActivityEventItem } from "@/lib/types";

function formatRelativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface ActivityFeedProps {
  projectId: string;
}

export function ActivityFeed({ projectId }: ActivityFeedProps) {
  const { events, loading, error } = useActivityFeed(projectId);

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-4 text-base font-semibold">Activity</h2>

      {loading && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading activity...
        </p>
      )}

      {!loading && error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No activity yet
        </p>
      )}

      {!loading && !error && events.length > 0 && (
        <ol className="space-y-3">
          {events.map((event: ActivityEventItem) => (
            <li key={event.id} className="flex gap-3 text-sm">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase"
                aria-hidden="true"
              >
                {event.actor.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="leading-snug">{formatActivityDescription(event)}</p>
                <time
                  dateTime={new Date(event.createdAt).toISOString()}
                  className="text-xs text-muted-foreground"
                >
                  {formatRelativeTime(event.createdAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
