import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, BellOff, CheckCheck, Loader2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import type { DashboardNotification } from "@/lib/notifications-api";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function formatRelativeTime(iso: string, t: Translate, now: number): string {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return t("notifications.time.now");
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return t("notifications.time.now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("notifications.time.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("notifications.time.hours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("notifications.time.days", { count: days });
  const months = Math.floor(days / 30);
  if (months < 12) return t("notifications.time.months", { count: months });
  return t("notifications.time.years", { count: Math.floor(months / 12) });
}

function NotificationRow({
  notification,
  now,
  onOpen,
  onDelete,
  deleting,
}: {
  notification: DashboardNotification;
  now: number;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  deleting: boolean;
}) {
  const { t } = useTranslation();
  const isRead = Boolean(notification.read_at);

  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-2.5 px-3 py-2.5 transition-colors",
        !isRead ? "bg-accent/30 hover:bg-accent/50" : "hover:bg-accent/40",
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (!isRead) onOpen(notification.id);
        }}
        className="flex min-w-0 flex-1 items-start gap-2.5 text-start"
      >
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            isRead ? "bg-muted-foreground/30" : "bg-[oklch(0.78_0.16_75)]",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm", isRead ? "font-medium" : "font-semibold")}>
            {notification.title}
          </span>
          {notification.message && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {notification.message}
            </span>
          )}
          <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
            {formatRelativeTime(notification.created_at, t, now)}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={t("notifications.delete")}
        onClick={() => onDelete(notification.id)}
        disabled={deleting}
        className="shrink-0 rounded-md p-1 text-muted-foreground/60 opacity-100 transition hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-40"
      >
        {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>
    </div>
  );
}
export function NotificationsBell({ slug }: { slug: string | null }) {
  const { t } = useTranslation();
  const { items, unreadCount, loading, error, refresh, markAllAsRead, markOneAsRead, deleteOne } =
    useNotifications(slug);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(intervalId);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) void refresh();
    },
    [refresh],
  );

  const handleMarkAll = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (err: unknown) {
      console.error("mark all notifications as read failed", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (deletingIds.has(id)) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteOne(id);
    } catch (err: unknown) {
      console.error("delete notification failed", err);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("notifications.title")}
          className="relative rounded-full p-2 text-cream/80 transition hover:bg-white/10"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -end-0.5 -top-0.5 grid size-4 min-w-4 place-items-center rounded-full bg-[oklch(0.78_0.16_75)] px-0.5 text-[10px] font-bold leading-none text-navy">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[320px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <DropdownMenuLabel className="px-0 py-0 text-sm font-semibold">
            {t("notifications.title")}
          </DropdownMenuLabel>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={unreadCount === 0 || markingAll}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
            {t("notifications.mark_all_read")}
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <p className="text-xs">{t("notifications.loading")}</p>
            </div>
          ) : error && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
              <p className="text-xs">{t("notifications.load_failed")}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
              >
                {t("notifications.retry")}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <BellOff className="size-5" />
              <p className="text-xs">{t("notifications.empty")}</p>
            </div>
          ) : (
            <ul className="divide-y">
              {(items ?? []).map((notification) => (
                <li key={notification.id}>
                  <NotificationRow
                    notification={notification}
                    now={now}
                    onOpen={markOneAsRead}
                    onDelete={handleDelete}
                    deleting={deletingIds.has(notification.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-center text-[11px] text-muted-foreground">
          {t("notifications.footer", { count: unreadCount })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
