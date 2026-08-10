import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, ClipboardList, CheckSquare, Undo2, BarChart3,
  Settings as SettingsIcon, LogOut, Menu, ChevronLeft, ChevronRight,
  Warehouse as WarehouseIcon, Loader2, Eye, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fetchMe } from "@/lib/manager-api";
import {
  fetchSecretaryOrders, fetchSecretaryTasks, fetchSecretaryReturns, showSecretaryTask,
  type SecretaryOrder, type SecretaryTask, type SecretaryReturn,
} from "@/lib/secretary-api";
import {
  storekeeperAnalytics, formatMoney, formatNumber, formatPercent,
  type DailyMovements, type CapacityUtilization, type StockAccuracy,
} from "@/lib/analytics-api";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/secretary")({
  component: SecretaryApp,
  head: () => ({
    meta: [
      { title: `${i18n.t("title.secretary")} — Stockyard` },
      { name: "description", content: i18n.t("title.secretary_desc") },
    ],
  }),
});

type SectionId = "overview" | "orders" | "tasks" | "returns" | "analytics" | "settings";

const NAV: { id: SectionId; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", labelKey: "sidebar.dashboard", icon: LayoutDashboard },
  { id: "orders", labelKey: "sidebar.orders", icon: ClipboardList },
  { id: "tasks", labelKey: "sidebar.tasks", icon: CheckSquare },
  { id: "returns", labelKey: "sidebar.returns", icon: Undo2 },
  { id: "analytics", labelKey: "sidebar.analytics", icon: BarChart3 },
  { id: "settings", labelKey: "sidebar.settings", icon: SettingsIcon },
];

const SESSION_KEY = "stockyard.secretary";

type StoredSecretarySession = {
  id?: number;
  full_name?: string;
  user_name?: string;
  role?: string;
  warehouse_id?: number | null;
  must_change_password?: boolean;
  tenant?: { url_slug?: string; company_name?: string };
};

function SecretaryApp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionId>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [session, setSession] = useState<StoredSecretarySession | null>(null);
  const [checking, setChecking] = useState(true);

  const [orders, setOrders] = useState<SecretaryOrder[]>([]);
  const [tasks, setTasks] = useState<SecretaryTask[]>([]);
  const [returns, setReturns] = useState<SecretaryReturn[]>([]);
  const [daily, setDaily] = useState<DailyMovements | null>(null);
  const [capacity, setCapacity] = useState<CapacityUtilization | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [taskDetail, setTaskDetail] = useState<SecretaryTask | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    if (!raw) {
      navigate({ to: "/manager-login", replace: true });
      return;
    }
    let parsed: StoredSecretarySession;
    try {
      parsed = JSON.parse(raw) as StoredSecretarySession;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      navigate({ to: "/manager-login", replace: true });
      return;
    }
    if (parsed.must_change_password) {
      navigate({ to: "/force-password-change", replace: true });
      return;
    }
    setSession(parsed);
    setSlug(parsed.tenant?.url_slug ?? null);
    if (parsed.tenant?.url_slug) {
      fetchMe(parsed.tenant.url_slug)
        .then((me) => {
          if (me.role !== "warehouse_secretary") {
            localStorage.removeItem(SESSION_KEY);
            navigate({ to: "/manager-login", replace: true });
            return;
          }
          setChecking(false);
        })
        .catch((err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 403) {
            navigate({ to: "/force-password-change", replace: true });
            return;
          }
          localStorage.removeItem(SESSION_KEY);
          navigate({ to: "/manager-login", replace: true });
        });
    } else {
      setChecking(false);
    }
  }, [navigate]);

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoadingData(true);
    try {
      const [o, tk, r, dm, cap] = await Promise.all([
        fetchSecretaryOrders(slug),
        fetchSecretaryTasks(slug),
        fetchSecretaryReturns(slug),
        storekeeperAnalytics.dailyMovements(slug),
        storekeeperAnalytics.capacityUtilization(slug),
      ]);
      setOrders(o.orders);
      setTasks(tk.tasks);
      setReturns(r.returns);
      setDaily(dm);
      setCapacity(cap);
    } catch {
      toast.error(t("manager.login.server_error"));
    } finally {
      setLoadingData(false);
    }
  }, [slug, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const openTask = async (id: number) => {
    if (!slug) return;
    setDetailLoading(true);
    try {
      const { task } = await showSecretaryTask(slug, id);
      setTaskDetail(task);
    } catch {
      toast.error(t("manager.login.server_error"));
    } finally {
      setDetailLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    toast.success(t("settings.signed_out"));
    navigate({ to: "/manager-login" });
  };

  const sidebar = (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 flex flex-col border-e border-white/10 bg-navy transition-all duration-300",
          collapsed ? "md:w-[72px]" : "md:w-64",
          mobileOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
            <WarehouseIcon className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold text-cream">Stockyard</p>
              <p className="text-xs text-cream/50">{t("secretary.company")}</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setSection(id);
                setMobileOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                section === id ? "bg-accent text-foreground font-semibold" : "text-cream/70 hover:bg-cream/5 hover:text-cream",
                collapsed && "md:justify-center"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", section === id && "text-foreground")} />
              {!collapsed && <span className="truncate">{t(labelKey)}</span>}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cream/70 transition-colors hover:bg-cream/5 hover:text-cream",
              collapsed && "md:justify-center"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t("settings.sign_out")}</span>}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-1 hidden w-full items-center justify-center rounded-lg border border-white/10 px-3 py-1.5 text-cream/60 transition-colors hover:bg-cream/5 md:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  );

  return (
    <div className="flex min-h-screen w-full">
      {sidebar}
      <main className={cn("flex-1 transition-all", collapsed ? "md:ps-[72px]" : "md:ps-64")}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-navy/70 px-4 py-3 backdrop-blur md:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-cream md:hidden hover:bg-cream/10">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-3">
            <div className="hidden md:block">
              <p className="text-xs uppercase tracking-wider text-cream/60">{session?.tenant?.company_name ?? t("secretary.company")}</p>
              <p className="text-sm font-semibold text-cream">{t("secretary.title")}</p>
            </div>
            <div className="ms-auto flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-cream">
              <div className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-foreground">
                {session?.full_name?.[0] ?? "S"}
              </div>
              <div className="hidden text-xs leading-tight sm:block">
                <p className="font-medium">{session?.full_name ?? t("secretary.role")}</p>
                <p className="text-cream/60">{t("secretary.role")}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="px-4 py-6 md:px-8 md:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {section === "overview" && (
                <OverviewSection
                  name={session?.full_name}
                  orders={orders}
                  tasks={tasks}
                  returns={returns}
                  daily={daily}
                  capacity={capacity}
                  loading={loadingData}
                />
              )}
              {section === "orders" && <OrdersSection orders={orders} loading={loadingData} />}
              {section === "tasks" && (
                <TasksSection tasks={tasks} loading={loadingData} onOpen={openTask} detailLoading={detailLoading} />
              )}
              {section === "returns" && <ReturnsSection returns={returns} loading={loadingData} />}
              {section === "analytics" && (
                <AnalyticsSection slug={slug} capacity={capacity} onRefresh={loadData} />
              )}
              {section === "settings" && <SettingsSection session={session} onLogout={logout} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <TaskDetailDialog task={taskDetail} open={!!taskDetail} onOpenChange={(o) => !o && setTaskDetail(null)} />
    </div>
  );
}

function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.04] p-5", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-cream md:text-2xl">{title}</h1>
        {desc && <p className="mt-1 text-sm text-cream/60">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-400/15 text-amber-300",
    processing: "bg-sky-400/15 text-sky-300",
    approved: "bg-sky-400/15 text-sky-300",
    in_preparation: "bg-violet-400/15 text-violet-300",
    shipped: "bg-violet-400/15 text-violet-300",
    delivered: "bg-emerald-400/15 text-emerald-300",
    completed: "bg-emerald-400/15 text-emerald-300",
    cancelled: "bg-rose-400/15 text-rose-300",
    rejected: "bg-rose-400/15 text-rose-300",
    returned: "bg-orange-400/15 text-orange-300",
    picked_by_driver: "bg-amber-400/15 text-amber-300",
    return_to_warehouse: "bg-violet-400/15 text-violet-300",
    return_to_stock: "bg-emerald-400/15 text-emerald-300",
    damaged: "bg-rose-400/15 text-rose-300",
  };
  return (
    <Badge className={cn("capitalize", map[String(status).toLowerCase()] ?? "bg-cream/10 text-cream/70")}>
      {status ?? "—"}
    </Badge>
  );
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({ message, cols }: { message: string; cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-24 text-center text-sm text-cream/50">
        {message}
      </TableCell>
    </TableRow>
  );
}

function StatCard({ label, value, icon: Icon, loading }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; loading?: boolean }) {
  return (
    <GlassCard className="flex items-center gap-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs uppercase tracking-wider text-cream/60">{label}</p>
        {loading ? <Skeleton className="mt-1 h-6 w-20" /> : <p className="text-xl font-bold text-cream">{value}</p>}
      </div>
    </GlassCard>
  );
}

function dateTime(v?: string) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString(i18n.language === "ar" ? "ar" : "en-GB", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
function OverviewSection({
  name, orders, tasks, returns, daily, capacity, loading,
}: {
  name?: string; orders: SecretaryOrder[]; tasks: SecretaryTask[]; returns: SecretaryReturn[];
  daily: DailyMovements | null; capacity: CapacityUtilization | null; loading: boolean;
}) {
  const { t } = useTranslation();
  const pendingOrders = useMemo(() => orders.filter((o) => String(o.status).toLowerCase() === "pending").length, [orders]);
  const activeTasks = useMemo(() => tasks.filter((k) => String(k.status).toLowerCase() !== "completed").length, [tasks]);

  const dailyData = useMemo(() => {
    if (!daily?.daily) return [];
    return daily.daily.map((d) => ({
      name: new Date(d.date).toLocaleDateString(i18n.language === "ar" ? "ar" : "en-GB", { day: "numeric", month: "short" }),
      inbound: d.inbound_units,
      outbound: d.outbound_units,
    }));
  }, [daily]);

  const capacityRows = useMemo(() => {
    if (!capacity) return [];
    const s = capacity.summary;
    const freePct = s.total_capacity_m3 > 0 ? (s.free_m3 / s.total_capacity_m3) * 100 : 0;
    return [
      { label: t("secretary.volume_utilization"), pct: s.volume_utilization_percent },
      { label: t("secretary.parcel_capacity"), pct: s.parcel_capacity_utilization_percent },
      { label: t("secretary.free_capacity"), pct: freePct },
    ];
  }, [capacity, t]);

  return (
    <div className="space-y-6">
      <SectionHeader title={`${t("secretary.welcome_back")}${name ? `, ${name}` : ""} 👋`} desc={t("secretary.overview_desc")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("secretary.pending_orders")} value={formatNumber(pendingOrders)} icon={ClipboardList} loading={loading} />
        <StatCard label={t("secretary.active_tasks")} value={formatNumber(activeTasks)} icon={CheckSquare} loading={loading} />
        <StatCard label={t("secretary.returns_count")} value={formatNumber(returns.length)} icon={Undo2} loading={loading} />
        <StatCard label={t("secretary.sections_used")} value={capacity ? formatPercent(capacity.summary.volume_utilization_percent) : "—"} icon={LayoutDashboard} loading={loading} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-cream">{t("secretary.daily_movements")}</h2>
              <p className="text-xs text-cream/60">{t("secretary.inbound_vs_outbound")}</p>
            </div>
            <RefreshCw className="h-4 w-4 text-cream/40" />
          </div>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : dailyData.length === 0 ? (
            <div className="grid h-56 place-items-center text-sm text-cream/50">{t("manager.no_movement_data")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#c9c3ae", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#c9c3ae", fontSize: 11 }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{ background: "#101522", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#f5f1e3" }}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />
                <Bar dataKey="inbound" name={t("secretary.inbound")} fill="#a3e635" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outbound" name={t("secretary.outbound")} fill="#2dd4bf" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-cream">{t("secretary.capacity_summary")}</h2>
              <p className="text-xs text-cream/60">{t("secretary.volume_utilization")}</p>
            </div>
            <WarehouseIcon className="h-4 w-4 text-cream/40" />
          </div>
          {loading || !capacity ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : (
            <div className="space-y-5">
              {capacityRows.map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-cream/80">{row.label}</span>
                    <span className="font-semibold text-cream">{formatPercent(row.pct)}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-teal-300 transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-sm text-cream/60">
                {t("secretary.parcels_stored")}: <span className="font-semibold text-cream">{formatNumber(capacity.summary.total_parcels_stored)}</span>
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
const ORDER_TABS = ["all", "pending", "approved", "in_preparation", "shipped", "delivered", "cancelled"] as const;

function OrdersSection({ orders, loading }: { orders: SecretaryOrder[]; loading: boolean }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<(typeof ORDER_TABS)[number]>("all");
  const filtered = useMemo(
    () => (tab === "all" ? orders : orders.filter((o) => String(o.status).toLowerCase() === tab)),
    [orders, tab]
  );
  return (
    <div className="space-y-6">
      <SectionHeader title={t("secretary.orders_title")} desc={t("secretary.orders_desc")} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof ORDER_TABS)[number])}>
        <TabsList className="flex-wrap">
          {ORDER_TABS.map((k) => (
            <TabsTrigger key={k} value={k} className="capitalize">
              {k === "all" ? t("common.all") : t(`order.status.${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.id")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("secretary.customer")}</TableHead>
                <TableHead>{t("secretary.location")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead className="text-end">{t("secretary.total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <LoadingRows cols={6} />
              ) : filtered.length === 0 ? (
                <EmptyRow cols={6} message={t("common.no_data")} />
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium text-cream">#{o.id}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell>{o.customer?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-cream/70">{o.customer_location ?? "—"}</TableCell>
                    <TableCell className="text-cream/70">{dateTime(o.order_date)}</TableCell>
                    <TableCell className="text-end font-semibold text-cream">{formatMoney(Number(o.total_price))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}

function TasksSection({
  tasks, loading, onOpen, detailLoading,
}: {
  tasks: SecretaryTask[]; loading: boolean; onOpen: (id: number) => void; detailLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <SectionHeader title={t("secretary.tasks_title")} desc={t("secretary.tasks_desc")} />
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.id")}</TableHead>
                <TableHead>{t("secretary.task_type")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("secretary.worker")}</TableHead>
                <TableHead>{t("secretary.related_to")}</TableHead>
                <TableHead className="text-end">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <LoadingRows cols={6} />
              ) : tasks.length === 0 ? (
                <EmptyRow cols={6} message={t("common.no_data")} />
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium text-cream">#{task.id}</TableCell>
                    <TableCell className="capitalize text-cream/80">{task.task_type ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={task.status} /></TableCell>
                    <TableCell>{task.worker?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-cream/70">{task.related?.label ?? "—"}</TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="sm" onClick={() => onOpen(task.id)}>
                        <Eye className="me-1.5 h-4 w-4" /> {t("secretary.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
      {detailLoading && <p className="text-center text-sm text-cream/50">{t("secretary.task_detail")}…</p>}
    </div>
  );
}

function ReturnsSection({ returns, loading }: { returns: SecretaryReturn[]; loading: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <SectionHeader title={t("secretary.returns_title")} desc={t("secretary.returns_desc")} />
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.id")}</TableHead>
                <TableHead>{t("secretary.return_type")}</TableHead>
                <TableHead>{t("secretary.customer")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <LoadingRows cols={5} />
              ) : returns.length === 0 ? (
                <EmptyRow cols={5} message={t("common.no_data")} />
              ) : (
                returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-cream">#{r.id}</TableCell>
                    <TableCell className="capitalize text-cream/80">{r.return_type ?? "—"}</TableCell>
                    <TableCell>{r.order?.customer?.full_name ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-cream/70">{dateTime(r.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}
function AnalyticsSection({
  slug, capacity, onRefresh,
}: {
  slug: string | null; capacity: CapacityUtilization | null; onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [stock, setStock] = useState<StockAccuracy | null>(null);
  const [stockLoading, setStockLoading] = useState(true);
  useEffect(() => {
    if (!slug) return;
    setStockLoading(true);
    storekeeperAnalytics.stockAccuracy(slug)
      .then(setStock)
      .catch(() => setStock(null))
      .finally(() => setStockLoading(false));
  }, [slug]);
  const capacityRows = useMemo(() => {
    if (!capacity) return [];
    const s = capacity.summary;
    return [
      { label: t("secretary.parcels_stored"), value: formatNumber(s.total_parcels_stored) },
      { label: t("secretary.total_capacity"), value: formatNumber(s.total_capacity_m3) },
      { label: t("secretary.used_capacity"), value: formatNumber(s.occupied_m3) },
      { label: t("secretary.free_capacity"), value: formatNumber(s.free_m3) },
    ];
  }, [capacity, t]);
  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("secretary.analytics_title")}
        desc={t("secretary.analytics_desc")}
        action={
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="me-1.5 h-4 w-4" /> {t("secretary.refresh")}
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GlassCard>
          <h2 className="mb-4 font-semibold text-cream">{t("secretary.stock_accuracy")}</h2>
          {stockLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !stock ? (
            <p className="py-10 text-center text-sm text-cream/50">{t("common.no_data")}</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-cream/80">{t("secretary.accuracy_rate")}</span>
                  <span className="font-semibold text-cream">{formatPercent(stock.summary.accuracy_rate_percent)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-300 to-emerald-300" style={{ width: `${Math.min(100, Math.max(0, stock.summary.accuracy_rate_percent))}%` }} />
                </div>
              </div>
              <p className="text-sm text-cream/60">
                {t("secretary.items_checked")}: <span className="font-semibold text-cream">{formatNumber(stock.summary.items_checked)}</span>
                {" · "}{t("secretary.accurate_items")}: <span className="font-semibold text-cream">{formatNumber(stock.summary.accurate_items)}</span>
              </p>
            </div>
          )}
        </GlassCard>
        <GlassCard>
          <h2 className="mb-4 font-semibold text-cream">{t("secretary.capacity_breakdown")}</h2>
          {capacity ? (
            <div className="space-y-4">
              {capacityRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-white/5 pb-2 text-sm last:border-0">
                  <span className="text-cream/70">{row.label}</span>
                  <span className="font-semibold text-cream">{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function SettingsSection({ session, onLogout }: { session: StoredSecretarySession | null; onLogout: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <SectionHeader title={t("secretary.settings_title")} desc={t("secretary.settings_desc")} />
      <GlassCard className="max-w-xl space-y-4">
        {[
          { label: t("secretary.role"), value: session?.role ?? t("secretary.role") },
          { label: t("secretary.worker_name"), value: session?.full_name ?? "—" },
          { label: t("secretary.username"), value: session?.user_name ?? "—" },
          { label: t("secretary.warehouse_id"), value: String(session?.warehouse_id ?? "—") },
          { label: t("secretary.company"), value: session?.tenant?.company_name ?? "—" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-cream/60">{row.label}</span>
            <span className="font-semibold text-cream">{row.value}</span>
          </div>
        ))}
        <Button variant="destructive" className="mt-2 w-full sm:w-auto" onClick={onLogout}>
          <LogOut className="me-1.5 h-4 w-4" /> {t("settings.sign_out")}
        </Button>
      </GlassCard>
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
    </div>
  );
}

function TaskDetailDialog({ task, open, onOpenChange }: { task: SecretaryTask | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-navy text-cream">
        <DialogHeader>
          <DialogTitle>{t("secretary.task_detail")}</DialogTitle>
        </DialogHeader>
        {task ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-cream/60">{t("common.id")}</span>
              <span className="font-semibold">#{task.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cream/60">{t("secretary.task_type")}</span>
              <span className="font-semibold capitalize">{task.task_type ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cream/60">{t("common.status")}</span>
              <StatusBadge status={task.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cream/60">{t("secretary.worker")}</span>
              <span className="font-semibold">{task.worker?.full_name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cream/60">{t("secretary.related_to")}</span>
              <span className="font-semibold">{task.related?.label ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cream/60">{t("secretary.assigned_by")}</span>
              <span className="font-semibold">{task.superadmin?.full_name ?? "—"}</span>
            </div>
            {task.created_at && (
              <div className="flex items-center justify-between">
                <span className="text-cream/60">{t("common.date")}</span>
                <span className="font-semibold">{dateTime(task.created_at)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-cream/60">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
