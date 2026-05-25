import { computeMinutes, formatDuration, computeTotalMinutes } from "@/lib/time-utils";

describe("computeMinutes", () => {
  it("returns 0 for same start and stop time", () => {
    const t = new Date("2026-05-22T10:00:00Z");
    expect(computeMinutes(t, t)).toBe(0);
  });

  it("returns correct minutes for 1 hour difference", () => {
    const start = new Date("2026-05-22T09:00:00Z");
    const stop = new Date("2026-05-22T10:00:00Z");
    expect(computeMinutes(start, stop)).toBe(60);
  });

  it("returns correct minutes for 30 minutes", () => {
    const start = new Date("2026-05-22T09:00:00Z");
    const stop = new Date("2026-05-22T09:30:00Z");
    expect(computeMinutes(start, stop)).toBe(30);
  });

  it("rounds 89.5 seconds to 1 minute", () => {
    const start = new Date("2026-05-22T10:00:00.000Z");
    const stop = new Date("2026-05-22T10:01:29.500Z");
    // diff = 89500ms / 60000 = 1.4916... rounds to 1
    expect(computeMinutes(start, stop)).toBe(1);
  });

  it("rounds 90 seconds (1.5 min) to 2 minutes", () => {
    const start = new Date("2026-05-22T10:00:00.000Z");
    const stop = new Date("2026-05-22T10:01:30.000Z");
    // diff = 90000ms / 60000 = 1.5 rounds to 2
    expect(computeMinutes(start, stop)).toBe(2);
  });

  it("returns 0 when stoppedAt is before startedAt (guards against negative)", () => {
    const start = new Date("2026-05-22T10:00:00Z");
    const stop = new Date("2026-05-22T09:00:00Z");
    expect(computeMinutes(start, stop)).toBe(0);
  });

  it("handles 1440 minutes (24 hours)", () => {
    const start = new Date("2026-05-22T00:00:00Z");
    const stop = new Date("2026-05-23T00:00:00Z");
    expect(computeMinutes(start, stop)).toBe(1440);
  });
});

describe("formatDuration", () => {
  it("returns '0m' for zero minutes", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("returns '0m' for negative input", () => {
    expect(formatDuration(-5)).toBe("0m");
  });

  it("returns minutes only when less than 60", () => {
    expect(formatDuration(45)).toBe("45m");
  });

  it("returns '1m' for 1 minute", () => {
    expect(formatDuration(1)).toBe("1m");
  });

  it("returns hours only when divisible by 60", () => {
    expect(formatDuration(120)).toBe("2h");
  });

  it("returns hours and minutes when both present", () => {
    expect(formatDuration(90)).toBe("1h 30m");
  });

  it("returns '1h 30m' for 90 minutes", () => {
    expect(formatDuration(90)).toBe("1h 30m");
  });

  it("returns '2h 15m' for 135 minutes", () => {
    expect(formatDuration(135)).toBe("2h 15m");
  });

  it("returns '1h' for exactly 60 minutes", () => {
    expect(formatDuration(60)).toBe("1h");
  });

  it("returns '24h' for 1440 minutes", () => {
    expect(formatDuration(1440)).toBe("24h");
  });
});

describe("computeTotalMinutes", () => {
  const now = new Date("2026-05-22T12:00:00Z");

  it("returns 0 for empty entries", () => {
    expect(computeTotalMinutes([], now)).toBe(0);
  });

  it("sums completed entry minutes", () => {
    const entries = [
      { minutes: 30, stoppedAt: "2026-05-22T10:30:00Z", startedAt: "2026-05-22T10:00:00Z" },
      { minutes: 45, stoppedAt: "2026-05-22T11:45:00Z", startedAt: "2026-05-22T11:00:00Z" },
    ];
    expect(computeTotalMinutes(entries, now)).toBe(75);
  });

  it("adds elapsed time from running timer using now", () => {
    const start = new Date("2026-05-22T11:00:00Z"); // 60 minutes before now
    const entries = [
      { minutes: null, stoppedAt: null, startedAt: start.toISOString() },
    ];
    expect(computeTotalMinutes(entries, now)).toBe(60);
  });

  it("combines completed and running entries", () => {
    const start = new Date("2026-05-22T11:30:00Z"); // 30 minutes before now
    const entries = [
      { minutes: 45, stoppedAt: "2026-05-22T10:45:00Z", startedAt: "2026-05-22T10:00:00Z" },
      { minutes: null, stoppedAt: null, startedAt: start.toISOString() },
    ];
    expect(computeTotalMinutes(entries, now)).toBe(75);
  });

  it("treats null minutes for completed entry as 0", () => {
    const entries = [
      { minutes: null, stoppedAt: "2026-05-22T10:30:00Z", startedAt: "2026-05-22T10:00:00Z" },
    ];
    expect(computeTotalMinutes(entries, now)).toBe(0);
  });

  it("accepts Date objects for startedAt", () => {
    const start = new Date("2026-05-22T11:00:00Z");
    const entries = [
      { minutes: null, stoppedAt: null, startedAt: start },
    ];
    expect(computeTotalMinutes(entries, now)).toBe(60);
  });
});
