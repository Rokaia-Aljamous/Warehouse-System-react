import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, Inbox, PackageCheck, Truck, Users, RotateCcw, ClipboardList,
  FileText, Settings as SettingsIcon, LogOut, Menu, BarChart3,
  Loader2, Download, CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight, RefreshCw,
  ShieldCheck, Activity, ArrowLeftRight,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { StorekeeperAnalytics } from "@/components/analytics/StorekeeperAnalytics";
import { fetchMe, logoutManager, fetchKeeperOrders, fetchKeeperTasks, assignKeeperTask, acceptKeeperOrder, rejectKeeperOrder, updateKeeperOrderStatus, updateDashboardProfile, type DashboardUser, type ManagerOrder, type KeeperTask, type TransferRequest } from "@/lib/manager-api";
import { api, getCsrfCookie } from "@/lib/api";
import { useSupervisorTransfers } from "@/hooks/useSupervisorTransfers";

export const Route = createFileRoute("/supervisor/dashboard")({
  component: SupervisorApp,
  head: () => ({
    meta: [
      { title: i18n.t("title.supervisor") },
      { name: "description", content: i18n.t("title.supervisor_desc") },
    ],
  }),
});

// ---------------- Types & mock data ----------------
type SWorker = { id: string; name: string; phone: string; status: "available" | "busy" };
export type COrderStatus = "pending" | "approved" | "in_preparation" | "shipped" | "delivered" | "rejected";
type COrder = {
  id: string; customer: string; items: number; total: number; createdAt: string;
  status: COrderStatus;
  workerId?: string; driverId?: string;
};
type Driver = { id: string; name: string; phone: string; status: "available" | "busy" };
type Return = {
  id: string; orderId: string; customer: string; reason: string; createdAt: string;
  status: "pending" | "approved" | "rejected" | "refunded"; workerId?: string;
};

const seedReturns: Return[] = [
  { id: "RET-901", orderId: "ORD-4992", customer: "Acme Co.",   reason: "Damaged on arrival", createdAt: "Yesterday", status: "pending" },
  { id: "RET-902", orderId: "ORD-4988", customer: "Globex",     reason: "Wrong item",          createdAt: "Yesterday", status: "approved",  workerId: "W-104" },
  { id: "RET-903", orderId: "ORD-4975", customer: "Brightline", reason: "Customer changed mind", createdAt: "2d ago",  status: "refunded",  workerId: "W-104" },
];

// ---------------- Sidebar ----------------
type SectionId =
  | "overview" | "incoming" | "preparation" | "receiving"
  | "drivers" | "returns" | "transfers" | "workers" | "analytics" | "reports" | "settings";

const NAV: { id: SectionId; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",    labelKey: "sidebar.dashboard",          icon: LayoutDashboard },
  { id: "incoming",    labelKey: "supervisor.nav.incoming",    icon: Inbox },
  { id: "preparation", labelKey: "supervisor.nav.preparation", icon: PackageCheck },
  { id: "receiving",   labelKey: "supervisor.nav.receiving",   icon: ClipboardList },
  { id: "drivers",     labelKey: "supervisor.nav.drivers",     icon: Truck },
  { id: "returns",     labelKey: "supervisor.nav.returns",     icon: RotateCcw },
  { id: "transfers",   labelKey: "supervisor.nav.transfers",   icon: ArrowLeftRight },
  { id: "workers",     labelKey: "supervisor.workers",         icon: Users },
  { id: "analytics",   labelKey: "feature.analytics",          icon: BarChart3 },
  { id: "reports",     labelKey: "sidebar.reports",            icon: FileText },
  { id: "settings",    labelKey: "sidebar.settings",           icon: SettingsIcon },
];

function SupervisorApp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionId>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("stockyard.manager") : null;
    if (!raw) {
      navigate({ to: "/supervisor-login", replace: true });
      return;
    }
    let parsed: {
      must_change_password?: boolean;
      full_name?: string;
      owner_id?: number;
      warehouse_id?: number;
      tenant?: { url_slug?: string };
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.removeItem("stockyard.manager");
      navigate({ to: "/supervisor-login", replace: true });
      return;
    }
    if (parsed.must_change_password) {
      navigate({ to: "/force-password-change", replace: true });
      return;
    }
    setFullName(parsed.full_name ?? "");
    setOwnerId(parsed.owner_id ?? null);
    setWarehouseId(parsed.warehouse_id ?? null);
    const tenantSlug = parsed.tenant?.url_slug;
    if (!tenantSlug) {
      navigate({ to: "/supervisor-login", replace: true });
      return;
    }
    setSlug(tenantSlug);
    fetchMe(tenantSlug)
      .then((me) => {
        if (me.role !== "warehouse_secretary") {
          localStorage.removeItem("stockyard.manager");
          navigate({ to: "/supervisor-login", replace: true });
          return;
        }
        setFullName(me.full_name ?? "");
        setOwnerId(me.owner_id);
        setWarehouseId(me.warehouse_id);
        setChecking(false);
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          navigate({ to: "/force-password-change", replace: true });
          return;
        }
        localStorage.removeItem("stockyard.manager");
        navigate({ to: "/supervisor-login", replace: true });
      });
  }, [navigate]);

  const [orders, setOrders] = useState<COrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [receivingTasks, setReceivingTasks] = useState<KeeperTask[]>([]);
  const [receivingLoading, setReceivingLoading] = useState(true);
  const [prepTasks, setPrepTasks] = useState<KeeperTask[]>([]);
  const [prepTasksLoading, setPrepTasksLoading] = useState(true);
  const [returns, setReturns] = useState<Return[]>(seedReturns);

  const [activeTasks, setActiveTasks] = useState<KeeperTask[]>([]);

  const refreshWorkerAvailability = useCallback(async () => {
    if (!slug) return;
    try {
      const { tasks } = await fetchKeeperTasks(slug, { status: "in_preparation" });
      setActiveTasks(tasks ?? []);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401 && status !== 403) {
        console.error("fetch keeper active tasks failed", err);
      }
    }
  }, [slug]);

  useEffect(() => {
    refreshWorkerAvailability();
  }, [refreshWorkerAvailability]);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setOrdersLoading(true);
    fetchKeeperOrders(slug)
      .then(({ orders: res }) => {
        if (cancel) return;
        setOrders(res.map(orderFromBackend));
      })
      .catch(() => { if (!cancel) setOrders([]); })
      .finally(() => { if (!cancel) setOrdersLoading(false); });
    return () => { cancel = true; };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setReceivingLoading(true);
    fetchKeeperTasks(slug, { task_type: "shipment_receiving" })
      .then(({ tasks: res }) => {
        if (cancel) return;
        setReceivingTasks([...res].sort((a, b) => b.id - a.id));
      })
      .catch(() => { if (!cancel) setReceivingTasks([]); })
      .finally(() => { if (!cancel) setReceivingLoading(false); });
    return () => { cancel = true; };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setPrepTasksLoading(true);
    fetchKeeperTasks(slug, { task_type: "order_preparation" })
      .then(({ tasks: res }) => {
        if (cancel) return;
        setPrepTasks([...res].sort((a, b) => b.id - a.id));
      })
      .catch(() => { if (!cancel) setPrepTasks([]); })
      .finally(() => { if (!cancel) setPrepTasksLoading(false); });
    return () => { cancel = true; };
  }, [slug]);

  const refreshPrepTasks = () => {
    if (!slug) return Promise.resolve();
    return fetchKeeperTasks(slug, { task_type: "order_preparation" })
      .then(({ tasks: res }) => setPrepTasks([...res].sort((a, b) => b.id - a.id)))
      .catch(() => setPrepTasks([]));
  };

  const supervisorTransfers = useSupervisorTransfers(slug, ownerId, warehouseId);

  const busyWorkerSystemUserIds = useMemo(() => {
    const busy = new Set<number>();
    for (const task of activeTasks) {
      if (task.status === "in_preparation" && task.worker?.id != null) {
        busy.add(task.worker.id);
      }
    }
    return busy;
  }, [activeTasks]);

  const workers: SWorker[] = useMemo(
    () => supervisorTransfers.staffWorkers.map(w => ({
      id: String(w.system_user_id),
      name: w.system_user?.full_name ?? `#${w.system_user_id}`,
      phone: w.system_user?.phone_number ?? "—",
      status: w.status === "busy" || busyWorkerSystemUserIds.has(w.system_user_id) ? "busy" : "available",
    })),
    [supervisorTransfers.staffWorkers, busyWorkerSystemUserIds],
  );

  const drivers: Driver[] = useMemo(
    () => supervisorTransfers.driverWorkers.map(w => ({
      id: String(w.system_user_id),
      name: w.system_user?.full_name ?? `#${w.system_user_id}`,
      phone: w.system_user?.phone_number ?? "—",
      status: w.status === "busy" || busyWorkerSystemUserIds.has(w.system_user_id) ? "busy" : "available",
    })),
    [supervisorTransfers.driverWorkers, busyWorkerSystemUserIds],
  );

  const stats = useMemo(() => ({
    incoming: orders.filter(o => o.status === "pending").length,
    preparing: orders.filter(o => o.status === "in_preparation").length,
    ready: orders.filter(o => o.status === "shipped").length,
    out: orders.filter(o => o.status === "delivered").length,
    rejected: orders.filter(o => o.status === "rejected").length,
    approved: orders.filter(o => o.status === "approved").length,
    returns: returns.filter(r => r.status === "pending").length,
    shipments: receivingTasks.filter(t => t.status !== "completed").length,
    activeWorkers: workers.filter(w => w.status === "busy").length,
    availableDrivers: drivers.filter(d => d.status === "available").length,
  }), [orders, returns, receivingTasks, workers, drivers]);

  const logout = async () => {
    if (slug) {
      try { await logoutManager(slug); } catch { /* ignore */ }
    }
    localStorage.removeItem("stockyard.manager");
    toast.success(t("supervisor.toast_signed_out"));
    navigate({ to: "/supervisor-login" });
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <Loader2 className="h-8 w-8 animate-spin text-cream" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-cream">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 flex flex-col transition-all duration-300 bg-navy-light border-e border-cream/10",
          collapsed ? "w-[76px]" : "w-[248px]",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full max-lg:rtl:translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <AppLogo className="size-9" />
            {!collapsed && <span className="text-sm font-bold tracking-tight">{t("nav.supervisor")}</span>}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden lg:inline-flex rounded-md p-1 text-cream/70 hover:bg-white/10"
          >
            {collapsed ? <ChevronRight className="size-4 rtl:rotate-180" /> : <ChevronLeft className="size-4 rtl:rotate-180" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV.map(n => {
            const Icon = n.icon;
            const active = section === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { setSection(n.id); setMobileOpen(false); }}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-[oklch(0.74_0.02_252_/_0.25)] text-cream shadow-inner"
                    : "text-cream/70 hover:bg-white/5 hover:text-cream",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active && "text-[oklch(0.78_0.16_75)]")} />
                {!collapsed && <span>{t(n.labelKey)}</span>}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-cream/10 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream/80 hover:bg-white/5"
          >
            <LogOut className="size-4" />
            {!collapsed && <span>{t("settings.sign_out")}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className={cn("flex min-h-screen flex-1 flex-col transition-all", collapsed ? "lg:ps-[76px]" : "lg:ps-[248px]")}>
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-cream/10 bg-[oklch(0.28_0.04_252_/_0.6)] px-4 py-3 backdrop-blur-xl lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-cream/80 hover:bg-white/10 lg:hidden">
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-xs text-cream/60">{t("app.name")} / {t("nav.supervisor")}</p>
              <h1 className="text-base font-semibold">{t(NAV.find(n => n.id === section)?.labelKey ?? "")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell slug={slug} onTransferOpen={() => { setSection("transfers"); setMobileOpen(false); }} />
            <Link to="/" className="rounded-full border border-cream/20 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/15">{t("common.home")}</Link>
            {fullName && <span className="hidden sm:inline text-xs font-medium text-cream/80">{fullName}</span>}
            <LanguageToggle variant="header" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {section === "overview"    && <Overview stats={stats} orders={orders} />}
              {section === "incoming"    && <IncomingOrders orders={orders} setOrders={setOrders} slug={slug} loading={ordersLoading} onRefresh={() => { if (slug) fetchKeeperOrders(slug).then(({ orders: res }) => setOrders(res.map(orderFromBackend))).catch(() => setOrders([])); }} />}
              {section === "preparation" && <Preparation orders={orders} setOrders={setOrders} workers={workers} slug={slug} prepTasks={prepTasks} prepTasksLoading={prepTasksLoading} onRefreshPrepTasks={refreshPrepTasks} onRefreshWorkerAvailability={refreshWorkerAvailability} />}
              {section === "receiving"   && <Receiving tasks={receivingTasks} loading={receivingLoading} />}
              {section === "drivers"     && <DriversSection drivers={drivers} orders={orders} setOrders={setOrders} slug={slug} onRefreshWorkerAvailability={refreshWorkerAvailability} />}
              {section === "returns"     && <ReturnsSection returns={returns} setReturns={setReturns} workers={workers} />}
              {section === "transfers"   && <TransfersSection {...supervisorTransfers} busyWorkerSystemUserIds={busyWorkerSystemUserIds} onRefreshWorkerAvailability={refreshWorkerAvailability} />}
              {section === "workers"     && <WorkersSection workers={workers} />}
              {section === "analytics"   && slug && <StorekeeperAnalytics slug={slug} />}
              {section === "reports"     && <Reports slug={slug} orders={orders} returns={returns} workers={workers} />}
              {section === "settings"    && <SettingsPanel slug={slug} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ---------------- Shared UI ----------------
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-light rounded-2xl p-5 text-foreground", className)}>{children}</div>;
}

const orderFromBackend = (o: ManagerOrder): COrder => ({
  id: String(o.id),
  customer: o.customer?.full_name ?? "—",
  items: o.items_count ?? 0,
  total: Number(o.total_price ?? 0),
  createdAt: new Date(o.order_date).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }),
  status: (o.status === "cancelled" ? "rejected" : o.status) as COrderStatus,
});

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; accent?: string }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="glass-light rounded-2xl p-5 text-foreground"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={cn("flex size-9 items-center justify-center rounded-xl", accent ?? "bg-[oklch(0.74_0.02_252_/_0.3)]")}>
          <Icon className="size-4 text-foreground" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    pending:          "bg-amber-500/20 text-amber-700",
    in_transit:       "bg-sky-500/20 text-sky-700",
    approved:         "bg-sky-500/20 text-sky-700",
    in_preparation:   "bg-violet-500/20 text-violet-700",
    shipped:          "bg-blue-500/20 text-blue-700",
    delivered:        "bg-emerald-600/20 text-emerald-800",
    rejected:         "bg-rose-500/20 text-rose-700",
    expected:         "bg-blue-500/20 text-blue-700",
    receiving:        "bg-amber-500/20 text-amber-700",
    received:         "bg-emerald-500/20 text-emerald-700",
    refunded:         "bg-violet-500/20 text-violet-700",
    available:        "bg-emerald-500/20 text-emerald-700",
    busy:             "bg-amber-500/20 text-amber-700",
    on_delivery:      "bg-violet-500/20 text-violet-700",
    off_duty:         "bg-zinc-500/20 text-zinc-700",
  };
  const label = status === "available" || status === "busy"
    ? t(`status.${status}`)
    : status.replaceAll("_", " ");
  return <Badge className={cn("rounded-full font-medium capitalize", map[status] ?? "bg-muted text-foreground")}>{label}</Badge>;
}

// ---------------- Overview ----------------
type SupervisorStats = Record<string, number>;

function Overview({ stats, orders }: { stats: SupervisorStats; orders: COrder[] }) {
  const { t } = useTranslation();
  const cards = [
    { label: t("supervisor.stat_pending_orders"),     value: stats.incoming,         icon: Inbox },
    { label: t("supervisor.stat_in_preparation"),     value: stats.preparing,        icon: PackageCheck },
    { label: t("supervisor.stat_ready_for_delivery"), value: stats.ready,            icon: CheckCircle2 },
    { label: t("supervisor.stat_out_for_delivery"),   value: stats.out,              icon: Truck },
    { label: t("supervisor.stat_approved"),           value: stats.approved,         icon: CheckCircle2 },
    { label: t("supervisor.stat_rejected"),           value: stats.rejected,         icon: XCircle },
    { label: t("supervisor.stat_active_shipments"),   value: stats.shipments,        icon: ClipboardList },
    { label: t("supervisor.stat_active_workers"),     value: stats.activeWorkers,    icon: Activity },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>
      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("supervisor.recent_orders")}</h2>
          <Badge variant="outline" className="rounded-full">{t("supervisor.live")}</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t("supervisor.col_order")}</TableHead><TableHead className="text-start">{t("order.customer")}</TableHead>
              <TableHead className="text-start">{t("order.items")}</TableHead><TableHead className="text-start">{t("order.status")}</TableHead><TableHead className="text-start">{t("task.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.slice(0, 6).map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.id}</TableCell>
                <TableCell>{o.customer}</TableCell>
                <TableCell>{o.items}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="text-muted-foreground">{o.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}

// ---------------- Incoming Orders ----------------
function IncomingOrders({ orders, setOrders, slug, loading, onRefresh }: { orders: COrder[]; setOrders: React.Dispatch<React.SetStateAction<COrder[]>>; slug: string | null; loading?: boolean; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState<{ id: string; action: "approve" | "reject"; transfer: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const list = orders.filter(o => o.status === "pending");

  const apply = async () => {
    if (!confirm || !slug) return;
    setBusy(true);
    try {
      const order = await (confirm.action === "approve"
        ? acceptKeeperOrder(slug, Number(confirm.id), Math.max(0, Number(confirm.transfer) || 0))
        : rejectKeeperOrder(slug, Number(confirm.id)));
      setOrders(prev => prev.map(o => String(o.id) === String(order.order.id) ? { ...o, status: orderFromBackend(order.order).status } : o));
      toast.success(
        confirm.action === "approve"
          ? t("supervisor.toast_order_approved", { id: confirm.id })
          : t("supervisor.toast_order_rejected", { id: confirm.id }),
      );
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t("supervisor.toast_action_failed"));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{t("supervisor.incoming.title")}</h2>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={busy}>
          <RefreshCw className="size-4" /> {t("common.refresh")}
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("supervisor.incoming.loading")}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">{t("supervisor.incoming.no_orders")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t("supervisor.col_order")}</TableHead><TableHead className="text-start">{t("order.customer")}</TableHead>
              <TableHead className="text-start">{t("order.items")}</TableHead><TableHead className="text-start">{t("order.total")}</TableHead>
              <TableHead className="text-start">{t("task.created")}</TableHead><TableHead className="text-end">{t("supervisor.col_action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.id}</TableCell>
                <TableCell>{o.customer}</TableCell>
                <TableCell>{o.items}</TableCell>
                <TableCell>${o.total}</TableCell>
                <TableCell className="text-muted-foreground">{o.createdAt}</TableCell>
                <TableCell className="text-end">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" disabled={busy} onClick={() => setConfirm({ id: o.id, action: "approve", transfer: "0" })}>
                      <CheckCircle2 className="size-4" /> {t("supervisor.approve")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm({ id: o.id, action: "reject", transfer: "0" })}>
                      <XCircle className="size-4" /> {t("supervisor.reject")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1D2D44]">{confirm?.action === "approve" ? t("supervisor.approve_order") : t("supervisor.reject_order")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "approve"
                ? t("supervisor.approve_order_desc")
                : t("supervisor.reject_order_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm?.action === "approve" && (
            <div className="space-y-2">
              <Label className="text-[#1D2D44]">{t("supervisor.transfer_assignment")}</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={confirm.transfer}
                onChange={(e) => setConfirm({ ...confirm, transfer: e.target.value })}
                className="bg-[#eeebdd] text-[#1D2D44] placeholder:text-[#1D2D44]/60 border-[#1D2D44]/30 focus:border-[#f2a618]"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="bg-[#f2a618] text-[#1D2D44] border border-[#1D2D44]/20 hover:bg-[#f2a618]/90 hover:text-[#1D2D44]">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={apply}>{busy ? <Loader2 className="size-4 animate-spin" /> : t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GlassCard>
  );
}

// ---------------- Order Preparation ----------------
function Preparation({
  orders, setOrders, workers, slug, prepTasks, prepTasksLoading, onRefreshPrepTasks, onRefreshWorkerAvailability,
}: {
  orders: COrder[]; setOrders: React.Dispatch<React.SetStateAction<COrder[]>>;
  workers: SWorker[];
  slug: string | null;
  prepTasks: KeeperTask[];
  prepTasksLoading: boolean;
  onRefreshPrepTasks: () => void;
  onRefreshWorkerAvailability: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = orders.filter(o => o.status === "approved" || o.status === "in_preparation");
  const prepWorkers = workers;

  const prepTaskFor = (orderId: string) =>
    prepTasks.find(task => String(task.related_id) === String(orderId));

  const assignWorker = (orderId: string, workerOrDriverId: string) => {
    if (!slug) return;
    setBusyId(`assign-${orderId}`);
    assignKeeperTask(slug, {
      worker_or_driver_id: Number(workerOrDriverId),
      task_type: "order_preparation",
      related_type: "App\\Models\\Order",
      related_id: Number(orderId),
    })
      .then(() => {
        toast.success(t("task.assigned"));
        onRefreshPrepTasks();
        onRefreshWorkerAvailability();
      })
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t("task.assign_failed");
        toast.error(message);
      })
      .finally(() => setBusyId(null));
  };

  const refreshOrderStatus = (id: string) => {
    if (!slug) return;
    setBusyId(id);
    updateKeeperOrderStatus(slug, Number(id), "in_preparation")
      .then(({ order }) => {
        setOrders(prev => prev.map(o => String(o.id) === String(order.id) ? { ...o, status: "in_preparation" } : o));
        toast.success(t("supervisor.toast_order_preparing", { id }));
      })
      .catch((err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t("supervisor.toast_action_failed")))
      .finally(() => setBusyId(null));
  };
  const markReady = (id: string) => {
    if (!slug) return;
    setBusyId(id);
    updateKeeperOrderStatus(slug, Number(id), "shipped")
      .then(({ order }) => {
        setOrders(prev => prev.map(o => String(o.id) === String(order.id) ? { ...o, status: "shipped" } : o));
        toast.success(t("supervisor.toast_ready_for_delivery", { id }));
      })
      .catch((err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t("supervisor.toast_action_failed")))
      .finally(() => setBusyId(null));
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {list.length === 0 && (
        <GlassCard className="md:col-span-2">
          <p className="text-center text-sm text-muted-foreground">{t("supervisor.preparation.no_orders")}</p>
        </GlassCard>
      )}
      {list.map(o => {
        const prep = prepTaskFor(o.id);
        const assignedName = prep?.worker?.full_name ?? null;
        return (
          <motion.div key={o.id} whileHover={{ y: -2 }}>
            <GlassCard>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{o.id} <span className="text-muted-foreground font-normal">· {o.customer}</span></p>
                  <p className="text-xs text-muted-foreground">{t("supervisor.preparation.items_total", { count: o.items, total: o.total })}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>

              <div className="mt-4 space-y-2">
                {assignedName ? (
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">{t("supervisor.preparation.assigned_worker")}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{assignedName}</span>
                      {prep && <StatusBadge status={prep.status} />}
                    </div>
                  </div>
                ) : (
                  <>
                    <Label className="text-xs">{t("supervisor.preparation.assigned_worker")}</Label>
                    {prepTasksLoading ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
                      </div>
                    ) : (
                      <>
                      <Select
                        value=""
                        onValueChange={(v) => assignWorker(o.id, v)}
                        disabled={busyId === `assign-${o.id}` || prepWorkers.length === 0}
                      >
                        <SelectTrigger><SelectValue placeholder={t("supervisor.preparation.assign_worker_placeholder")} /></SelectTrigger>
                        <SelectContent>
                          {prepWorkers.map(w => (
                            <SelectItem key={w.id} value={w.id} disabled={w.status === "busy"}>
                              {w.name} ({w.id})
                              {w.status === "busy" ? ` · ${t("status.busy")}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {prepWorkers.filter(w => w.status === "available").length === 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">{t("supervisor.preparation.no_available_workers")}</p>
                      )}
                    </>
                  )}
                  </>
                )}
              </div>

              {o.status === "approved" && (
                <div className="mt-4">
                  <Button size="sm" disabled={busyId === o.id} onClick={() => refreshOrderStatus(o.id)}>
                    {busyId === o.id ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />} {t("supervisor.preparation.start")}
                  </Button>
                </div>
              )}

              {o.status === "in_preparation" && (
                <div className="mt-4">
                  <Button size="sm" disabled={busyId === o.id || !prep} onClick={() => markReady(o.id)}>
                    {busyId === o.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} {t("supervisor.preparation.mark_ready")}
                  </Button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}

// ---------------- Shipment Receiving ----------------
function Receiving({
  tasks, loading,
}: {
  tasks: KeeperTask[];
  loading?: boolean;
}) {
  const { t } = useTranslation();

  const formatDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <GlassCard>
      <div className="mb-4">
        <h2 className="text-base font-semibold">{t("supervisor.receiving.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("supervisor.receiving.backend_note")}</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("task.no_tasks")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t("supervisor.col_shipment")}</TableHead>
              <TableHead className="text-start">{t("task.worker")}</TableHead>
              <TableHead className="text-start">{t("order.status")}</TableHead>
              <TableHead className="text-start">{t("task.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const related = task.related;
              return (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    {related?.label ?? `Shipment #${task.related_id ?? "—"}`}
                    {related?.status ? (
                      <span className="ms-2"><StatusBadge status={related.status} /></span>
                    ) : null}
                  </TableCell>
                  <TableCell>{task.worker?.full_name ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={task.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(task.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </GlassCard>
  );
}

// ---------------- Driver Management ----------------
function DriversSection({
  drivers, orders, setOrders, slug, onRefreshWorkerAvailability,
}: {
  drivers: Driver[]; orders: COrder[]; setOrders: React.Dispatch<React.SetStateAction<COrder[]>>;
  slug: string | null;
  onRefreshWorkerAvailability: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const readyOrders = orders.filter(o => o.status === "shipped");

  const assignDriver = async (orderId: string, driverId: string) => {
    if (!slug) return;
    setBusyOrder(orderId);
    try {
      await assignKeeperTask(slug, {
        worker_or_driver_id: Number(driverId),
        task_type: "order_delivery",
        related_type: "App\\Models\\Order",
        related_id: Number(orderId),
      });
      await updateKeeperOrderStatus(slug, Number(orderId), "delivered");
      setOrders(prev => prev.map(o => String(o.id) === String(orderId) ? { ...o, driverId, status: "delivered" } : o));
      toast.success(t("supervisor.drivers.toast_dispatched", { id: driverId }));
      onRefreshWorkerAvailability();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t("supervisor.toast_action_failed"));
    } finally {
      setBusyOrder(null);
      setAssignFor(null);
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("supervisor.drivers.title")}</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t("supervisor.col_id")}</TableHead><TableHead className="text-start">{t("settings.name")}</TableHead>
              <TableHead className="text-start">{t("supervisor.col_phone")}</TableHead><TableHead className="text-start">{t("order.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.id}</TableCell>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.phone}</TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCard>

      <GlassCard>
        <h2 className="mb-4 text-base font-semibold">{t("supervisor.drivers.ready_orders_title")}</h2>
        {readyOrders.length === 0 ? (
          <p className="rounded-xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">{t("supervisor.drivers.no_ready_orders")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t("supervisor.col_order")}</TableHead><TableHead className="text-start">{t("order.customer")}</TableHead>
                <TableHead className="text-start">{t("order.items")}</TableHead><TableHead className="text-end">{t("supervisor.col_action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyOrders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.id}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell>{o.items}</TableCell>
                  <TableCell className="text-end">
                    <Button size="sm" disabled={busyOrder === o.id} onClick={() => setAssignFor(o.id)}>
                      {busyOrder === o.id ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />} {t("supervisor.drivers.assign")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("supervisor.drivers.assign_to", { order: assignFor })}</DialogTitle>
            <DialogDescription>{t("supervisor.drivers.available_only")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
  {drivers.map(d => (
    <button
      key={d.id}
      type="button"
      disabled={!!busyOrder || d.status === "busy"}
      onClick={() => d.status !== "busy" && assignFor && assignDriver(assignFor, d.id)}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border border-[#1D2D44]/20 bg-[#eeebdd] p-3 transition",
        d.status === "busy"
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-[#e4e0cd]",
      )}
    >
      <div className="text-start">
        <p className="font-semibold text-[#1D2D44]">
          {d.name} <span className="text-xs text-[#1D2D44]/75 font-normal">({d.id})</span>
          {d.status === "busy" && (
            <span className="ms-2 text-xs font-medium text-amber-700">· {t("status.busy")}</span>
          )}
        </p>
        <p className="text-xs text-[#1D2D44]/80 font-medium">
          {d.phone}
        </p>
      </div>
      <Truck className="size-4 text-[#1D2D44]" />
    </button>
            ))}
            {drivers.filter(d => d.status === "available").length === 0 && (
              <p className="text-center text-sm text-muted-foreground">{t("supervisor.drivers.no_available")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Inter-Warehouse Transfers ----------------
function TransfersSection(props: ReturnType<typeof useSupervisorTransfers> & {
  busyWorkerSystemUserIds: Set<number>;
  onRefreshWorkerAvailability: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const {
    requests, loadingTasks, staffWorkers, driverWorkers,
    isSubmitting, refreshTasks, assignTask, prepTasksFor, deliveryTasksFor,
    isPreparationReady,
    busyWorkerSystemUserIds,
    onRefreshWorkerAvailability,
  } = props;

  const [picker, setPicker] = useState<{ request: TransferRequest; kind: "preparation" | "delivery" } | null>(null);

  const prepAssignedName = (request: TransferRequest) => {
    const prep = prepTasksFor(request.id)[0];
    return prep ? (prep.employee?.full_name ?? prep.worker.full_name) : null;
  };
  const driverAssignedName = (request: TransferRequest) => {
    const del = deliveryTasksFor(request.id)[0];
    return del ? del.worker.full_name : null;
  };

  const openPick = (request: TransferRequest, kind: "preparation" | "delivery") => {
    setPicker({ request, kind });
  };

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{t("supervisor.transfers.title")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("supervisor.transfers.desc")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { refreshTasks(); onRefreshWorkerAvailability(); }}>
            <RefreshCw className="size-4" /> {t("common.refresh")}
          </Button>
        </div>

        {loadingTasks ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("supervisor.transfers.loading")}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-8 text-center">
            <p className="text-sm font-medium text-foreground">{t("supervisor.transfers.no_transfers")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("supervisor.transfers.no_transfers_desc")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">ID</TableHead>
                <TableHead className="text-start">{t("supervisor.transfers.to")}</TableHead>
                <TableHead className="text-start">{t("supervisor.transfers.items")}</TableHead>
                <TableHead className="text-start">{t("supervisor.transfers.preparation")}</TableHead>
                <TableHead className="text-start">{t("supervisor.transfers.delivery")}</TableHead>
                <TableHead className="text-end">{t("supervisor.col_action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(r => {
                const prepName = prepAssignedName(r);
                const driverName = driverAssignedName(r);
                const prepReady = isPreparationReady(r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">TR-{r.id}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{r.accepted_by_warehouse?.warehouse_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{t("supervisor.transfers.requested_by", { name: r.requested_by_name ?? "—" })}</p>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      {r.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-4 text-xs">
                          <span className="truncate">{item.product_name}</span>
                          <span className="shrink-0 font-medium text-muted-foreground">×{item.quantity}</span>
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>
                      {prepName ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          <span className="text-sm">{prepName}</span>
                          {prepReady && <Badge className="rounded-full bg-emerald-500/20 text-emerald-700">{t("supervisor.transfers.prep_complete")}</Badge>}
                        </div>
                      ) : (
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {driverName ? (
                        <div className="flex items-center gap-2">
                          <Truck className="size-4 text-[#1D2D44]/70" />
                          <span className="text-sm">{driverName}</span>
                        </div>
                      ) : prepReady ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {!prepName && (
                        <Button size="sm" disabled={staffWorkers.filter(w => !busyWorkerSystemUserIds.has(w.system_user_id)).length === 0} onClick={() => openPick(r, "preparation")}>
                          <PackageCheck className="size-4" /> {t("supervisor.transfers.assign_prep")}
                        </Button>
                      )}
                      {prepName && prepReady && !driverName && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={driverWorkers.filter(w => !busyWorkerSystemUserIds.has(w.system_user_id)).length === 0}
                          onClick={() => openPick(r, "delivery")}
                        >
                          <Truck className="size-4" /> {t("supervisor.transfers.assign_driver")}
                        </Button>
                      )}
                      {driverName && <Badge className="rounded-full bg-sky-500/20 text-sky-700">{t("supervisor.transfers.driver_assigned")}</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <GlassCard>
        <h2 className="mb-3 text-base font-semibold">{t("supervisor.transfers.worker")}</h2>
        {staffWorkers.length === 0 ? (
          <p className="rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">{t("supervisor.transfers.no_workers")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {staffWorkers.map(w => (
              <Badge key={w.id} variant="outline" className={cn("px-3 py-1 text-xs", busyWorkerSystemUserIds.has(w.system_user_id) && "opacity-50")}>
                {w.system_user?.full_name ?? `#${w.system_user_id}`}
                {busyWorkerSystemUserIds.has(w.system_user_id) && <span className="ms-1 text-amber-700">{t("status.busy")}</span>}
              </Badge>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h2 className="mb-3 text-base font-semibold">{t("supervisor.transfers.driver")}</h2>
        {driverWorkers.length === 0 ? (
          <p className="rounded-xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">{t("supervisor.transfers.no_drivers")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {driverWorkers.map(w => (
              <Badge key={w.id} variant="outline" className={cn("px-3 py-1 text-xs", busyWorkerSystemUserIds.has(w.system_user_id) && "opacity-50")}>
                {w.system_user?.full_name ?? `#${w.system_user_id}`}
                {busyWorkerSystemUserIds.has(w.system_user_id) && <span className="ms-1 text-amber-700">{t("status.busy")}</span>}
              </Badge>
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">
              {picker?.kind === "preparation"
                ? t("supervisor.transfers.assign_prep")
                : t("supervisor.transfers.assign_driver")}
            </DialogTitle>
            <DialogDescription>
              TR-{picker?.request.id} · {picker?.request.accepted_by_warehouse?.warehouse_name ?? ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(picker?.kind === "preparation" ? staffWorkers : driverWorkers).map(w => {
              const isBusy = busyWorkerSystemUserIds.has(w.system_user_id);
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={isSubmitting(picker!.request.id, picker!.kind) || isBusy}
                  onClick={() => picker && assignTask(picker.request, picker.kind, w.system_user_id).then((res) => { if (res.ok) { setPicker(null); onRefreshWorkerAvailability(); } })}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border border-[#1D2D44]/20 bg-[#eeebdd] p-3 text-start transition",
                    isBusy ? "cursor-not-allowed opacity-50" : "hover:bg-[#e4e0cd]",
                  )}
                >
                  <div>
                    <p className="font-semibold text-[#1D2D44]">
                      {w.system_user?.full_name ?? `#${w.system_user_id}`}
                      {isBusy && (
                        <span className="ms-2 text-xs font-medium text-amber-700">· {t("status.busy")}</span>
                      )}
                    </p>
                    <p className="text-xs text-[#1D2D44]/75 font-medium">
                      {w.role === "staff" ? t("worker.role.staff") : t("worker.role.driver")} · #{w.id}
                    </p>
                  </div>
                  {isSubmitting(picker!.request.id, picker!.kind) ? (
                    <Loader2 className="size-4 animate-spin text-[#1D2D44]" />
                  ) : (
                    <CheckCircle2 className="size-4 text-[#1D2D44]" />
                  )}
                </button>
              );
            })}
          </div>
          {picker && (picker.kind === "preparation" ? staffWorkers : driverWorkers).length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {picker.kind === "preparation" ? t("supervisor.transfers.no_workers") : t("supervisor.transfers.no_drivers")}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={!picker}
              onClick={() => setPicker(null)}
              className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20"
            >
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Returns ----------------
function ReturnsSection({
  returns, setReturns, workers,
}: {
  returns: Return[]; setReturns: React.Dispatch<React.SetStateAction<Return[]>>;
  workers: SWorker[];
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("pending");
  const retWorkers = workers;
  const list = returns.filter(r => tab === "all" ? true : r.status === tab);

  const setStatus = (id: string, status: Return["status"]) => {
    setReturns(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success(t("supervisor.returns.toast_status", { id, status }));
  };
  const assign = (id: string, workerId: string) => {
    setReturns(prev => prev.map(r => r.id === id ? { ...r, workerId } : r));
    toast.success(t("supervisor.returns.toast_assigned", { id: workerId }));
  };

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t("supervisor.returns.title")}</h2>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">{t("supervisor.returns.tab_pending")}</TabsTrigger>
            <TabsTrigger value="approved">{t("supervisor.returns.tab_approved")}</TabsTrigger>
            <TabsTrigger value="rejected">{t("supervisor.returns.tab_rejected")}</TabsTrigger>
            <TabsTrigger value="refunded">{t("supervisor.returns.tab_refunded")}</TabsTrigger>
            <TabsTrigger value="all">{t("supervisor.returns.tab_all")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">{t("supervisor.col_return")}</TableHead><TableHead className="text-start">{t("supervisor.col_order")}</TableHead>
            <TableHead className="text-start">{t("order.customer")}</TableHead><TableHead className="text-start">{t("return.reason")}</TableHead>
            <TableHead className="text-start">{t("task.worker")}</TableHead><TableHead className="text-start">{t("order.status")}</TableHead>
            <TableHead className="text-end">{t("supervisor.col_actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.id}</TableCell>
              <TableCell>{r.orderId}</TableCell>
              <TableCell>{r.customer}</TableCell>
              <TableCell className="max-w-[220px] truncate">{r.reason}</TableCell>
              <TableCell>
                <Select value={r.workerId ?? ""} onValueChange={(v) => assign(r.id, v)}>
                  <SelectTrigger className="h-8 w-[150px]"><SelectValue placeholder={t("supervisor.assign_placeholder")} /></SelectTrigger>
                  <SelectContent>
                    {retWorkers.map(w => <SelectItem key={w.id} value={w.id} disabled={w.status === "busy"}>{w.name}{w.status === "busy" ? ` · ${t("status.busy")}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="text-end">
                <div className="flex items-center justify-end gap-1">
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => setStatus(r.id, "approved")}>{t("supervisor.approve")}</Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>{t("supervisor.reject")}</Button>
                    </>
                  )}
                  {r.status === "approved" && (
                    <Button size="sm" onClick={() => setStatus(r.id, "refunded")}>{t("supervisor.returns.process_refund")}</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {list.length === 0 && (
            <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{t("supervisor.no_items")}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </GlassCard>
  );
}

// ---------------- Workers ----------------
function WorkersSection({ workers }: { workers: SWorker[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const list = workers.filter(w => w.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t("supervisor.workers")}</h2>
        <div className="relative">
          <Search className="absolute start-2 top-2.5 size-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("supervisor.search_placeholder")} className="ps-8 w-[200px]" />
        </div>
      </div>
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px] text-start">{t("supervisor.col_id")}</TableHead>
            <TableHead className="min-w-[160px] text-start">{t("settings.name")}</TableHead>
            <TableHead className="min-w-[130px] text-start">{t("supervisor.col_phone")}</TableHead>
            <TableHead className="min-w-[120px] text-start">{t("order.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map(w => (
            <TableRow key={w.id}>
              <TableCell className="w-[110px] font-medium whitespace-nowrap">{w.id}</TableCell>
              <TableCell className="min-w-[160px] whitespace-nowrap">{w.name}</TableCell>
              <TableCell className="min-w-[130px] whitespace-nowrap">{w.phone}</TableCell>
              <TableCell className="min-w-[120px] whitespace-nowrap"><StatusBadge status={w.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </GlassCard>
  );
}

// ---------------- Reports ----------------
function Reports({
  slug, orders, returns, workers,
}: { slug: string | null; orders: COrder[]; returns: Return[]; workers: SWorker[] }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);

  const reportUrl = (report: string, ext: "pdf" | "excel") =>
    `/${slug}/keeper/reports/${report}/${ext}`;

  const openPdf = (report: string) => {
    if (!slug) return;
    setBusy(`pdf-${report}`);
    try {
      window.open(reportUrl(report, "pdf"), "_blank");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || t("manager.download_failed");
      toast.error(typeof msg === "string" ? msg : t("manager.download_failed"));
    } finally {
      setBusy(null);
    }
  };

  const downloadExcel = async (report: string) => {
    if (!slug) return;
    setBusy(`excel-${report}`);
    try {
      await getCsrfCookie();
      const res = await api.get(reportUrl(report, "excel"), { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${report}-report.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success(t("manager.excel_downloaded", { report: t(`manager.report_${report}`) }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || t("manager.download_failed");
      toast.error(typeof msg === "string" ? msg : t("manager.download_failed"));
    } finally {
      setBusy(null);
    }
  };

  const reasons = returns.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1; return acc;
  }, {});

  const perf = workers.map(w => ({
    ...w,
    handled: orders.filter(o => o.workerId === w.id).length + returns.filter(r => r.workerId === w.id).length,
  }));

  const reportCards = [
    { title: t("supervisor.reports.daily_operations"), report: "orders", desc: t("supervisor.reports.orders_today", { orders: orders.length, returns: returns.length }) },
    { title: t("supervisor.reports.worker_performance"), report: "tasks", desc: t("supervisor.reports.workers_tasks", { count: workers.length, workers: workers.length, tasks: perf.reduce((s, p) => s + p.handled, 0) }) },
    { title: t("supervisor.reports.return_reasons"), report: "returns", desc: Object.entries(reasons).map(([k, v]) => `${k} (${v})`).join(" · ") || "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {reportCards.map(r => (
          <GlassCard key={r.title}>
            <h3 className="font-semibold">{r.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openPdf(r.report)} disabled={busy === `pdf-${r.report}`}>
                {busy === `pdf-${r.report}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {t("report.pdf")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadExcel(r.report)} disabled={busy === `excel-${r.report}`}>
                {busy === `excel-${r.report}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {t("report.excel")}
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <h3 className="mb-3 font-semibold">{t("supervisor.reports.worker_performance")}</h3>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-start">{t("supervisor.col_id")}</TableHead><TableHead className="text-start">{t("settings.name")}</TableHead><TableHead className="text-start">{t("supervisor.col_phone")}</TableHead><TableHead className="text-start">{t("supervisor.reports.tasks_handled")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {perf.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell>{p.handled}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}

// ---------------- Settings ----------------
function SettingsPanel({ slug }: { slug: string | null }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchMe(slug)
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setName(me.full_name ?? "");
        setPhone(me.phone_number ?? "");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 401 && status !== 403) {
          toast.error(t("manager.login.server_error"));
        }
      });
    return () => { cancelled = true; };
  }, [slug, t]);

  const save = async () => {
    if (!slug || !user || submitting) return;
    setSubmitting(true);
    try {
      await updateDashboardProfile(slug, { full_name: name, phone_number: phone });
      setUser((prev) => (prev ? { ...prev, full_name: name, phone_number: phone } : prev));
      toast.success(t("supervisor.settings.toast_saved"));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t("manager.login.server_error");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <GlassCard>
        <p className="text-sm text-muted-foreground">{t("common.error_loading")}</p>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <GlassCard>
        <h3 className="mb-3 font-semibold">{t("settings.profile")}</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t("supervisor.settings.display_name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("worker.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.email")}</Label>
            <Input value={user.email ?? ""} readOnly />
          </div>
          <Button onClick={save} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin me-1" /> : null}
            {submitting ? t("common.submitting") : t("common.save")}
          </Button>
        </div>
      </GlassCard>
      <GlassCard>
        <h3 className="mb-3 font-semibold">{t("settings.account")}</h3>
        <div className="space-y-2 text-sm">
          <p><strong>{t("settings.name")}:</strong> {user.full_name || "—"}</p>
          <p><strong>{t("settings.username")}:</strong> {user.user_name || "—"}</p>
          <p><strong>{t("settings.role")}:</strong> {user.role?.replace("_", " ") ?? "—"}</p>
          <p><strong>{t("settings.company")}:</strong> {user.tenant?.company_name || "—"}</p>
          <p><strong>{t("settings.warehouse_id")}:</strong> {user.warehouse_id ?? "—"}</p>
          <p><strong>{t("settings.slug")}:</strong> {user.tenant?.url_slug || slug || "—"}</p>
        </div>
      </GlassCard>
      <GlassCard>
        <h3 className="mb-3 font-semibold">{t("supervisor.settings.preferences")}</h3>
        <p className="text-sm text-muted-foreground">{t("supervisor.settings.preferences_desc")}</p>
      </GlassCard>
    </div>
  );
}

