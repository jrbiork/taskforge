import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ActivityEventItem } from "@/lib/types";
import type { ActivityFeedState } from "@/lib/hooks/use-activity-feed";

jest.mock("@/lib/activity", () => ({
  formatActivityDescription: (event: ActivityEventItem) =>
    `${event.actor.name} performed ${event.action}`,
}));

let mockState: ActivityFeedState = {
  events: [],
  loading: false,
  error: null,
  refetch: jest.fn(),
};

jest.mock("@/lib/hooks/use-activity-feed", () => ({
  useActivityFeed: () => mockState,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ActivityFeed } = require("@/components/activity-feed");

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
  mockState = { events: [], loading: false, error: null, refetch: jest.fn() };
});

describe("ActivityFeed — loading state", () => {
  it("shows loading text when loading is true", () => {
    mockState = { ...mockState, loading: true };
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.getByText("Loading activity...")).toBeInTheDocument();
  });

  it("renders no list items while loading", () => {
    mockState = { ...mockState, loading: true };
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});

describe("ActivityFeed — empty state", () => {
  it("shows empty state text when events is empty", () => {
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });
});

describe("ActivityFeed — error state", () => {
  it("renders error message in error div", () => {
    mockState = { ...mockState, error: "Network error" };
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("does not show empty state when there is an error", () => {
    mockState = { ...mockState, error: "Network error" };
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.queryByText("No activity yet")).toBeNull();
  });
});

describe("ActivityFeed — events rendered", () => {
  it("renders one list item per event", () => {
    mockState = { ...mockState, events: [makeEvent("1"), makeEvent("2"), makeEvent("3")] };
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("shows actor initial in avatar", () => {
    mockState = { ...mockState, events: [makeEvent()] };
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("calls formatActivityDescription and renders result", () => {
    mockState = { ...mockState, events: [makeEvent()] };
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.getByText("Alice performed TASK_CREATED")).toBeInTheDocument();
  });

  it("renders a time element for each event", () => {
    mockState = { ...mockState, events: [makeEvent()] };
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.getByRole("time")).toBeInTheDocument();
  });

  it("does not show loading or empty text when events are present", () => {
    mockState = { ...mockState, events: [makeEvent()] };
    render(<ActivityFeed projectId="proj-1" />);
    expect(screen.queryByText("Loading activity...")).toBeNull();
    expect(screen.queryByText("No activity yet")).toBeNull();
  });
});
