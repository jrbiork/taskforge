import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TimeEntryList } from "@/components/time-entry-list";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

const taskId = "task-1";
const userId = "user-1";

function makeEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "entry-1",
    taskId,
    userId,
    startedAt: "2026-05-22T09:00:00.000Z",
    stoppedAt: "2026-05-22T09:30:00.000Z",
    minutes: 30,
    description: null,
    createdAt: "2026-05-22T09:00:00.000Z",
    updatedAt: "2026-05-22T09:30:00.000Z",
    user: { id: userId, name: "Alice" },
    ...overrides,
  };
}

describe("TimeEntryList", () => {
  describe("empty state", () => {
    it("shows empty state message when no entries exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      });

      expect(screen.getByText("No time entries yet.")).toBeInTheDocument();
    });
  });

  describe("rendering entries", () => {
    it("renders a list of time entries with formatted duration", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeEntry()],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("time-entry-list")).toBeInTheDocument();
      });

      // 30 minutes formatted as "30m"
      expect(screen.getByText("30m")).toBeInTheDocument();
    });

    it("renders the user name for each entry", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeEntry()],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Alice/)).toBeInTheDocument();
      });
    });

    it("shows 'Deleted user' for entries with null user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeEntry({ userId: null, user: null })],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Deleted user/)).toBeInTheDocument();
      });
    });

    it("shows 'Running' for entries without minutes (open timer)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeEntry({ stoppedAt: null, minutes: null })],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Running")).toBeInTheDocument();
      });
    });

    it("renders the description when present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeEntry({ description: "Fixed the login bug" })],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Fixed the login bug")).toBeInTheDocument();
      });
    });

    it("renders multiple entries", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          makeEntry({ id: "entry-1", minutes: 30 }),
          makeEntry({ id: "entry-2", minutes: 60, user: { id: "user-2", name: "Bob" } }),
        ],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        const items = screen.getAllByTestId("time-entry-item");
        expect(items).toHaveLength(2);
      });
    });
  });

  describe("edit/delete authorization", () => {
    it("shows delete button for own entries (MEMBER role)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeEntry({ userId })],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("delete-entry-btn")).toBeInTheDocument();
      });
    });

    it("does not show delete button for other users entries (MEMBER role)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeEntry({ userId: "other-user", user: { id: "other-user", name: "Bob" } })],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId("delete-entry-btn")).not.toBeInTheDocument();
      });
    });

    it("shows delete button for any entry when role is ADMIN", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          makeEntry({ id: "entry-1", userId: "other-user", user: { id: "other-user", name: "Bob" } }),
        ],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="ADMIN"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("delete-entry-btn")).toBeInTheDocument();
      });
    });

    it("does not show delete button for VIEWER role on own entry", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeEntry({ userId })],
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="VIEWER"
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId("delete-entry-btn")).not.toBeInTheDocument();
      });
    });
  });

  describe("delete interaction", () => {
    it("calls DELETE endpoint and removes entry from list", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [makeEntry({ id: "entry-1" })],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("delete-entry-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("delete-entry-btn"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/tasks/${taskId}/time-entries/entry-1`,
          expect.objectContaining({ method: "DELETE" })
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId("time-entry-item")).not.toBeInTheDocument();
      });
    });
  });

  describe("error state", () => {
    it("shows error when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      });

      render(
        <TimeEntryList
          taskId={taskId}
          currentUserId={userId}
          currentUserRole="MEMBER"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Failed to load time entries")).toBeInTheDocument();
      });
    });
  });
});
