/**
 * Compute elapsed minutes between two dates.
 * Returns Math.round of the difference in minutes (minimum 0).
 */
export function computeMinutes(startedAt: Date, stoppedAt: Date): number {
  const diffMs = stoppedAt.getTime() - startedAt.getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

/**
 * Format a number of minutes into a human-readable string.
 * Examples: 0 → "0m", 45 → "45m", 90 → "1h 30m", 120 → "2h"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Compute the total logged minutes for a task, including elapsed time
 * from any running (stoppedAt = null) timer entries.
 * Call this client-side with the current Date for live updates.
 */
export function computeTotalMinutes(
  entries: Array<{ minutes: number | null; stoppedAt: Date | string | null; startedAt: Date | string }>,
  now: Date = new Date()
): number {
  return entries.reduce((sum, entry) => {
    if (entry.stoppedAt !== null) {
      return sum + (entry.minutes ?? 0);
    }
    // Running timer: compute elapsed from startedAt to now
    const start = entry.startedAt instanceof Date ? entry.startedAt : new Date(entry.startedAt);
    return sum + Math.max(0, Math.round((now.getTime() - start.getTime()) / 60000));
  }, 0);
}
