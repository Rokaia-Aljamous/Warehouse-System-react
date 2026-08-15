import { useCallback, useEffect, useState } from "react";
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type DashboardNotification,
} from "@/lib/notifications-api";

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(slug: string | null) {
  const [items, setItems] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!slug) return;
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(slug),
        fetchUnreadNotificationCount(slug),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setUnreadCount(typeof count === "number" && count > 0 ? count : 0);
      setError(false);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401 && status !== 403) {
        console.error("fetch notifications failed", err);
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void refresh();
    const intervalId = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [slug, refresh]);

  const markAllAsRead = useCallback(async () => {
    if (!slug) return;
    await markAllNotificationsAsRead(slug);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  }, [slug]);

  const markOneAsRead = useCallback(
    async (id: number) => {
      if (!slug) return;
      await markNotificationAsRead(slug, id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    },
    [slug],
  );

  const deleteOne = useCallback(
    async (id: number) => {
      if (!slug) return;
      await deleteNotification(slug, id);
      setItems((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.read_at) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    },
    [slug],
  );

  return { items, unreadCount, loading, error, refresh, markAllAsRead, markOneAsRead, deleteOne };
}
