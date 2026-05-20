jest.mock("@/lib/api/activity", () => ({
  getProjectActivity: jest.fn(),
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { useActivityFeed } from "@/lib/hooks/use-activity-feed";
import { getProjectActivity } from "@/lib/api/activity";
import type { ActivityEventItem } from "@/lib/types";

const mockGetActivity = getProjectActivity as jest.Mock;

function makeEvent(id = "evt-1"): ActivityEventItem {
  return {
    id,
    projectId: "proj-1",
    actorId: "user-1",
    action: "TASK_CREATED",
    entityId: "task-1",
    entityType: "TASK",
    metadata: JSON.stringify({ taskTitle: "Fix login" }),
    createdAt: new Date("2026-05-20T10:00:00Z"),
    actor: { id: "user-1", name: "Alice", email: "alice@example.com" },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useActivityFeed", () => {
  it("starts with loading true", () => {
    mockGetActivity.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useActivityFeed("proj-1"));
    expect(result.current.loading).toBe(true);
  });

  it("sets loading to false after fetch resolves", async () => {
    mockGetActivity.mockResolvedValue({ events: [] });
    const { result } = renderHook(() => useActivityFeed("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("populates events on successful fetch", async () => {
    const events = [makeEvent()];
    mockGetActivity.mockResolvedValue({ events });
    const { result } = renderHook(() => useActivityFeed("proj-1"));
    await waitFor(() => expect(result.current.events).toEqual(events));
  });

  it("sets error string when fetch rejects", async () => {
    mockGetActivity.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useActivityFeed("proj-1"));
    await waitFor(() => expect(result.current.error).toBe("Network error"));
    expect(result.current.events).toEqual([]);
  });

  it("sets generic error when rejection is not an Error", async () => {
    mockGetActivity.mockRejectedValue("oops");
    const { result } = renderHook(() => useActivityFeed("proj-1"));
    await waitFor(() => expect(result.current.error).toBe("Failed to load activity"));
  });

  it("polls again after 30s when tab is visible", async () => {
    mockGetActivity.mockResolvedValue({ events: [] });
    renderHook(() => useActivityFeed("proj-1"));
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(1));

    act(() => { jest.advanceTimersByTime(30_000); });
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(2));
  });

  it("skips polling when document is hidden", async () => {
    mockGetActivity.mockResolvedValue({ events: [] });
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    renderHook(() => useActivityFeed("proj-1"));
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(1));

    act(() => { jest.advanceTimersByTime(30_000); });
    expect(mockGetActivity).toHaveBeenCalledTimes(1);
  });

  it("refetches on visibilitychange when tab becomes visible", async () => {
    mockGetActivity.mockResolvedValue({ events: [] });
    renderHook(() => useActivityFeed("proj-1"));
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(1));

    act(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(2));
  });

  it("cleans up interval and event listener on unmount", async () => {
    const removeSpy = jest.spyOn(document, "removeEventListener");
    mockGetActivity.mockResolvedValue({ events: [] });
    const { unmount } = renderHook(() => useActivityFeed("proj-1"));
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(1));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("re-fetches when projectId changes", async () => {
    mockGetActivity.mockResolvedValue({ events: [] });
    const { rerender } = renderHook(
      ({ id }) => useActivityFeed(id),
      { initialProps: { id: "proj-1" } }
    );
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledWith("proj-1"));

    rerender({ id: "proj-2" });
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledWith("proj-2"));
  });

  it("re-fetches immediately when refreshTrigger increments", async () => {
    mockGetActivity.mockResolvedValue({ events: [] });
    const { rerender } = renderHook(
      ({ trigger }) => useActivityFeed("proj-1", trigger),
      { initialProps: { trigger: 0 } }
    );
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(1));

    rerender({ trigger: 1 });
    await waitFor(() => expect(mockGetActivity).toHaveBeenCalledTimes(2));
  });
});
