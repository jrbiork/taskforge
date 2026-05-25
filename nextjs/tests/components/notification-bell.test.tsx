import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

// Radix portals don't render in jsdom — render all inline
jest.mock("@radix-ui/react-dropdown-menu", () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild
      ? (React.Children.only(children) as React.ReactElement)
      : <button>{children}</button>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Item: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <div role="menuitem" onClick={onSelect}>{children}</div>
  ),
}));

const mockMarkAllRead = jest.fn();
let mockState = {
  notifications: [] as { id: string; read: boolean; message: string; createdAt: string; projectId: string | null }[],
  unreadCount: 0,
  loading: false,
  markRead: jest.fn(),
  markAllRead: mockMarkAllRead,
};

jest.mock("@/lib/hooks/use-notifications", () => ({
  useNotifications: () => mockState,
}));

const NotificationBell = require("@/components/notification-bell").default;

beforeEach(() => {
  mockMarkAllRead.mockClear();
});

describe("NotificationBell badge", () => {
  it("hides badge when unreadCount is 0", () => {
    mockState = { ...mockState, unreadCount: 0 };
    render(<NotificationBell />);
    expect(screen.queryByText(/\d+/)).toBeNull();
  });

  it("shows count when unreadCount is 5", () => {
    mockState = { ...mockState, unreadCount: 5 };
    render(<NotificationBell />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows 99+ when unreadCount exceeds 99", () => {
    mockState = { ...mockState, unreadCount: 100 };
    render(<NotificationBell />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});

describe("NotificationBell dropdown", () => {
  it("calls markAllRead when button is clicked", () => {
    mockState = {
      ...mockState,
      unreadCount: 2,
      notifications: [
        { id: "1", read: false, message: "Test", createdAt: new Date().toISOString(), projectId: null },
      ],
    };
    render(<NotificationBell />);
    const trigger = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(trigger);
    const markAll = screen.getByText("Mark all as read");
    fireEvent.click(markAll);
    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });
});
