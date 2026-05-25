import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TimeTracker } from "@/components/time-tracker";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const taskId = "task-1";

describe("TimeTracker", () => {
  describe("when no active timer exists", () => {
    it("renders Start Timer button when initialActiveTimer is null", () => {
      render(<TimeTracker taskId={taskId} initialActiveTimer={null} />);
      expect(screen.getByTestId("start-timer-btn")).toBeInTheDocument();
      expect(screen.queryByTestId("stop-timer-btn")).not.toBeInTheDocument();
    });

    it("does not show elapsed time when no active timer", () => {
      render(<TimeTracker taskId={taskId} initialActiveTimer={null} />);
      expect(screen.queryByTestId("elapsed-time")).not.toBeInTheDocument();
    });
  });

  describe("when an active timer is running", () => {
    const startedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago

    it("renders Stop Timer button when initialActiveTimer is provided", () => {
      render(
        <TimeTracker
          taskId={taskId}
          initialActiveTimer={{ id: "entry-1", startedAt }}
        />
      );
      expect(screen.getByTestId("stop-timer-btn")).toBeInTheDocument();
      expect(screen.queryByTestId("start-timer-btn")).not.toBeInTheDocument();
    });

    it("shows elapsed time when timer is running", () => {
      render(
        <TimeTracker
          taskId={taskId}
          initialActiveTimer={{ id: "entry-1", startedAt }}
        />
      );
      expect(screen.getByTestId("elapsed-time")).toBeInTheDocument();
    });

    it("displays approximately correct elapsed time", () => {
      render(
        <TimeTracker
          taskId={taskId}
          initialActiveTimer={{ id: "entry-1", startedAt }}
        />
      );
      // Should show ~30m elapsed
      const elapsed = screen.getByTestId("elapsed-time");
      expect(elapsed.textContent).toContain("30m");
    });
  });

  describe("Start Timer interaction", () => {
    it("calls POST /api/tasks/:id/timer with action start when Start Timer clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "entry-new", startedAt: new Date().toISOString() }),
      });

      render(<TimeTracker taskId={taskId} initialActiveTimer={null} />);
      fireEvent.click(screen.getByTestId("start-timer-btn"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/tasks/${taskId}/timer`,
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ action: "start" }),
          })
        );
      });
    });

    it("switches to Stop Timer UI after successful start", async () => {
      const startedAt = new Date().toISOString();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "entry-new", startedAt }),
      });

      render(<TimeTracker taskId={taskId} initialActiveTimer={null} />);
      fireEvent.click(screen.getByTestId("start-timer-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("stop-timer-btn")).toBeInTheDocument();
      });
    });

    it("shows error message when start fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server error" }),
      });

      render(<TimeTracker taskId={taskId} initialActiveTimer={null} />);
      fireEvent.click(screen.getByTestId("start-timer-btn"));

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });
  });

  describe("Stop Timer interaction", () => {
    const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    it("calls POST /api/tasks/:id/timer with action stop when Stop Timer clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "entry-1", stoppedAt: new Date().toISOString(), minutes: 10 }),
      });

      render(
        <TimeTracker
          taskId={taskId}
          initialActiveTimer={{ id: "entry-1", startedAt }}
        />
      );
      fireEvent.click(screen.getByTestId("stop-timer-btn"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/tasks/${taskId}/timer`,
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ action: "stop" }),
          })
        );
      });
    });

    it("switches back to Start Timer UI after successful stop", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "entry-1", stoppedAt: new Date().toISOString(), minutes: 10 }),
      });

      render(
        <TimeTracker
          taskId={taskId}
          initialActiveTimer={{ id: "entry-1", startedAt }}
        />
      );
      fireEvent.click(screen.getByTestId("stop-timer-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("start-timer-btn")).toBeInTheDocument();
      });
    });
  });

  describe("fetches active timer on mount when no initial prop", () => {
    it("shows Start Timer when fetch returns null", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      render(<TimeTracker taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByTestId("start-timer-btn")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/tasks/${taskId}/timer`);
    });

    it("shows Stop Timer when fetch returns an active entry", async () => {
      const startedAt = new Date().toISOString();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "entry-1", startedAt }),
      });

      render(<TimeTracker taskId={taskId} />);

      await waitFor(() => {
        expect(screen.getByTestId("stop-timer-btn")).toBeInTheDocument();
      });
    });
  });
});
