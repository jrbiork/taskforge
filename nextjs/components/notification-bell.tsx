"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { NotificationItem } from "@/lib/types";

function formatRelativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function BadgeCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();

  function handleClick() {
    onMarkRead(notification.id);
    if (notification.projectId) {
      router.push(`/projects/${notification.projectId}`);
    }
  }

  return (
    <DropdownMenu.Item
      onSelect={handleClick}
      className={`flex cursor-pointer flex-col gap-0.5 rounded px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent ${
        notification.read ? "opacity-60" : "font-medium"
      }`}
    >
      <span>{notification.message}</span>
      <span className="text-xs text-muted-foreground">
        {formatRelativeTime(notification.createdAt)}
      </span>
    </DropdownMenu.Item>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } =
    useNotifications();

  const recent = notifications.slice(0, 20);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="relative rounded-md p-1.5 hover:bg-accent focus:outline-none"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <BadgeCount count={unreadCount} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-md border bg-popover shadow-md"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto p-1">
            {loading ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : recent.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No notifications
              </p>
            ) : (
              recent.map((n) => (
                <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />
              ))
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
