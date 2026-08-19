import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, Inbox, PackageCheck, Truck, Users, RotateCcw, ClipboardList, ListChecks,
  FileText, Settings as SettingsIcon, LogOut, Menu, BarChart3,
  Loader2, Download, CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight, RefreshCw,
  ShieldCheck, Activity, ArrowLeftRight, Navigation, MapPin, Gauge, AlertTriangle, Trash2,
  Eye, Package,
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
import { fetchMe, logoutManager, fetchKeeperOrders, fetchKeeperTasks, assignKeeperTask, acceptKeeperOrder, rejectKeeperOrder, updateKeeperOrderStatus, updateDashboardProfile, fetchDriverTracking, fetchDriverRoute, fetchKeeperWorkers, fetchKeeperReturns, decideKeeperReturn, processKeeperReturn, fetchKeeperDisposals, decideKeeperDisposal, type DashboardUser, type ManagerOrder, type KeeperTask, type TransferRequest, type DriverLivePosition, type DriverRouteWaypoint, type KeeperWorker, type KeeperReturn, type KeeperReturnStatus, type KeeperDisposal, type DisposalStatus } from "@/lib/manager-api";
import { api, getCsrfCookie } from "@/lib/api";
import { fetchStorekeeperShipments, type Shipment } from "@/lib/dashboard-api";
import { useSupervisorTransfers } from "@/hooks/useSupervisorTransfers";
import { DriverTrackingMap } from "@/components/DriverTrackingMap";

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
type COrderItem = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice?: string;
  subtotal?: string;
  imageUrl?: string | null;
};
type COrder = {
  id: string; customer: string; items: number; total: number; createdAt: string;
  status: COrderStatus;
  workerId?: string; driverId?: string;
  location?: string; region?: string; latitude?: string | number | null; longitude?: string | number | null;
  phone?: string;
  deliveryFee?: string;
  paymentStatus?: string;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  orderItems?: COrderItem[];
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
  | "overview" | "incoming" | "preparation" | "receiving" | "tasks"
  | "drivers" | "returns" | "disposals" | "transfers" | "workers" | "analytics" | "reports" | "settings";

const NAV: { id: SectionId; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",    labelKey: "sidebar.dashboard",          icon: LayoutDashboard },
  { id: "incoming",    labelKey: "supervisor.nav.incoming",    icon: Inbox },
  { id: "preparation", labelKey: "supervisor.nav.preparation", icon: PackageCheck },
  { id: "receiving",   labelKey: "supervisor.nav.receiving",   icon: ClipboardList },
  { id: "tasks",       labelKey: "supervisor.tasks",           icon: ListChecks },
  { id: "drivers",     labelKey: "supervisor.nav.drivers",     icon: Truck },
  { id: "returns",     labelKey: "supervisor.nav.returns",     icon: RotateCcw },
  { id: "disposals",   labelKey: "supervisor.nav.disposals",   icon: AlertTriangle },
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
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(true);
  const [prepTasks, setPrepTasks] = useState<KeeperTask[]>([]);
  const [prepTasksLoading, setPrepTasksLoading] = useState(true);
  const [returns, setReturns] = useState<Return[]>(seedReturns);

  const [activeTasks, setActiveTasks] = useState<KeeperTask[]>([]);

  const [tasks, setTasks] = useState<KeeperTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(false);

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

  const refreshReceivingTasks = useCallback(() => {
    if (!slug) return Promise.resolve();
    return fetchKeeperTasks(slug, { task_type: "shipment_receiving" })
      .then(({ tasks: res }) => setReceivingTasks([...res].sort((a, b) => b.id - a.id)))
      .catch(() => setReceivingTasks([]));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setShipmentsLoading(true);
    fetchStorekeeperShipments(slug)
      .then(({ shipments: res }) => {
        if (cancel) return;
        setShipments(res ?? []);
      })
      .catch(() => { if (!cancel) setShipments([]); })
      .finally(() => { if (!cancel) setShipmentsLoading(false); });
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

  const refreshTasks = useCallback(() => {
    if (!slug) return Promise.resolve();
    setTasksLoading(true);
    setTasksError(false);
    return fetchKeeperTasks(slug)
      .then(({ tasks: res }) => setTasks([...res].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))))
      .catch(() => setTasksError(true))
      .finally(() => setTasksLoading(false));
  }, [slug]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const supervisorTransfers = useSupervisorTransfers(slug, ownerId, warehouseId);

  const warehouseWorkerIds = useMemo(
    () => new Set<number>(supervisorTransfers.workers.map((w) => w.system_user_id)),
    [supervisorTransfers.workers]
  );

  const rosterReady = !supervisorTransfers.loadingWorkers;

  const warehouseTasks = useMemo(() => {
    if (!rosterReady || warehouseWorkerIds.size === 0) return [];
    return tasks.filter((task) => task.worker?.id != null && warehouseWorkerIds.has(task.worker.id));
  }, [tasks, rosterReady, warehouseWorkerIds]);

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
              {section === "receiving"   && <Receiving shipments={shipments} tasks={receivingTasks} loading={receivingLoading || shipmentsLoading} workers={workers} slug={slug} onRefreshTasks={refreshReceivingTasks} onRefreshWorkerAvailability={refreshWorkerAvailability} />}
              {section === "tasks"       && <TasksSection tasks={warehouseTasks} loading={tasksLoading || supervisorTransfers.loadingWorkers} error={tasksError} onRefresh={refreshTasks} />}
              {section === "drivers"     && <DriversSection drivers={drivers} orders={orders} setOrders={setOrders} slug={slug} onRefreshWorkerAvailability={refreshWorkerAvailability} warehouseId={warehouseId} />}
              {section === "returns"     && <ReturnsSection slug={slug ?? ""} warehouseId={warehouseId} />}
              {section === "disposals"   && <DisposalsSection slug={slug ?? ""} />}
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
  location: o.customer_location?.trim() || undefined,
  region: o.delivery_region ?? undefined,
  latitude: o.customer_latitude ?? undefined,
  longitude: o.customer_longitude ?? undefined,
  phone: o.customer?.phone_number ?? undefined,
  deliveryFee: o.delivery_fee ?? undefined,
  paymentStatus: o.payment_status ?? undefined,
  paymentMethod: o.payment_method ?? undefined,
  paymentCurrency: o.payment_currency ?? undefined,
  orderItems: (o.items ?? []).map(item => ({
    id: item.id,
    productId: item.product_id,
    productName: item.product_name ?? item.product?.name ?? "—",
    quantity: item.quantity,
    unitPrice: item.unit_price ?? undefined,
    subtotal: item.subtotal ?? undefined,
    imageUrl: item.product?.main_image_url ?? undefined,
  })),
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

function StatusBadge({ status, label }: { status: string; label?: string }) {
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
    return_to_stock:  "bg-emerald-600/20 text-emerald-800",
    damaged:          "bg-rose-500/20 text-rose-700",
    picked_by_driver: "bg-violet-500/20 text-violet-700",
    return_to_warehouse: "bg-amber-500/20 text-amber-700",
    cancelled:        "bg-zinc-500/20 text-zinc-700",
    available:        "bg-emerald-500/20 text-emerald-700",
    busy:             "bg-amber-500/20 text-amber-700",
    on_delivery:      "bg-violet-500/20 text-violet-700",
    off_duty:         "bg-zinc-500/20 text-zinc-700",
  };
  const resolved = label ?? (status === "available" || status === "busy"
    ? t(`status.${status}`)
    : status.replaceAll("_", " "));
  return <Badge className={cn("rounded-full font-medium capitalize", map[status] ?? "bg-muted text-foreground")}>{resolved}</Badge>;
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
  const [details, setDetails] = useState<COrder | null>(null);
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
              <TableRow key={o.id} className="cursor-pointer" onClick={() => setDetails(o)}>
                <TableCell className="font-medium">{o.id}</TableCell>
                <TableCell>{o.customer}</TableCell>
                <TableCell>{o.items}</TableCell>
                <TableCell>${o.total}</TableCell>
                <TableCell className="text-muted-foreground">{o.createdAt}</TableCell>
                <TableCell className="text-end">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetails(o); }} title={t("supervisor.order_details.view_details")}>
                      <Eye className="size-4" /> {t("supervisor.order_details.view_details")}
                    </Button>
                    <Button size="sm" disabled={busy} onClick={(e) => { e.stopPropagation(); setConfirm({ id: o.id, action: "approve", transfer: "0" }); }}>
                      <CheckCircle2 className="size-4" /> {t("supervisor.approve")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={(e) => { e.stopPropagation(); setConfirm({ id: o.id, action: "reject", transfer: "0" }); }}>
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

      <OrderDetailsDialog order={details} onClose={() => setDetails(null)} />
    </GlassCard>
  );
}

// ---------------- Order Details ----------------
function OrderDetailsDialog({ order, onClose }: { order: COrder | null; onClose: () => void }) {
  const { t } = useTranslation();
  const currency = order?.paymentCurrency || "$";
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1D2D44]">{t("supervisor.order_details.title")} #{order?.id}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {order && <StatusBadge status={order.status} />}
            {order?.createdAt}
          </DialogDescription>
        </DialogHeader>
        {order && (
          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("supervisor.order_details.customer")}</h3>
              <div className="rounded-xl border border-[#1D2D44]/20 bg-[#f6f4ea] p-3 text-sm text-[#1D2D44]">
                <p className="font-medium">{order.customer}</p>
                {order.phone ? <p className="mt-0.5 text-muted-foreground">{t("supervisor.order_details.phone")}: {order.phone}</p> : null}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("supervisor.order_details.delivery")}</h3>
              <div className="rounded-xl border border-[#1D2D44]/20 bg-[#f6f4ea] p-3">
                <LocationCell order={order} />
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("supervisor.order_details.products")}</h3>
              {order.orderItems && order.orderItems.length > 0 ? (
                <div className="space-y-2">
                  {order.orderItems.map(item => (
                    <div key={item.id} className="flex items-start gap-3 rounded-xl border border-[#1D2D44]/20 bg-[#f6f4ea] p-3">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="size-14 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-[#6366f1]/20">
                          <Package className="size-5 text-[#6366f1]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-sm text-[#1D2D44]">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-muted-foreground">{t("supervisor.order_details.quantity")}: {item.quantity}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                          {item.unitPrice != null && <span>{t("supervisor.order_details.unit_price")}: {currency}{item.unitPrice}</span>}
                          {item.subtotal != null && <span>{t("supervisor.order_details.subtotal")}: {currency}{item.subtotal}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">{t("supervisor.order_details.no_products")}</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("supervisor.order_details.summary")}</h3>
              <dl className="grid grid-cols-1 gap-1 rounded-xl border border-[#1D2D44]/20 bg-[#f6f4ea] p-3 text-sm text-[#1D2D44] sm:grid-cols-2">
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("supervisor.order_details.items_count")}</dt><dd className="font-medium">{order.items}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("supervisor.order_details.total")}</dt><dd className="font-medium">{currency}{order.total}</dd></div>
                {order.deliveryFee != null && (
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("supervisor.order_details.delivery_fee")}</dt><dd className="font-medium">{currency}{order.deliveryFee}</dd></div>
                )}
                {order.paymentStatus != null && (
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("supervisor.order_details.payment_status")}</dt><dd className="font-medium capitalize">{order.paymentStatus.replaceAll("_", " ")}</dd></div>
                )}
                {order.paymentMethod != null && (
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("supervisor.order_details.payment_method")}</dt><dd className="font-medium">{order.paymentMethod}</dd></div>
                )}
              </dl>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  shipments, tasks, workers, slug, loading, onRefreshTasks, onRefreshWorkerAvailability,
}: {
  shipments: Shipment[];
  tasks: KeeperTask[];
  workers: SWorker[];
  slug: string | null;
  loading?: boolean;
  onRefreshTasks: () => void;
  onRefreshWorkerAvailability: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const formatDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" }) : "—";

  const taskByShipmentId = useMemo(() => {
    const map = new Map<number, KeeperTask>();
    for (const task of tasks) {
      if (task.related_id == null) continue;
      const current = map.get(task.related_id);
      if (!current || (current.status === "completed" && task.status === "in_preparation")) {
        map.set(task.related_id, task);
      }
    }
    return map;
  }, [tasks]);

  const availableWorkers = useMemo(() => workers.filter(w => w.status === "available"), [workers]);

  const assignWorker = (shipmentId: number, workerOrDriverId: string) => {
    if (!slug) return;
    setBusyId(`assign-${shipmentId}`);
    assignKeeperTask(slug, {
      worker_or_driver_id: Number(workerOrDriverId),
      task_type: "shipment_receiving",
      related_type: "App\\Models\\Shipment",
      related_id: Number(shipmentId),
    })
      .then(() => {
        toast.success(t("task.assigned"));
        onRefreshTasks();
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

  return (
    <GlassCard>
      <div className="mb-4">
        <h2 className="text-base font-semibold">{t("supervisor.receiving.title")}</h2>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : shipments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("shipment.no_shipments")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t("supervisor.col_shipment")}</TableHead>
              <TableHead className="text-start">{t("shipment.factory")}</TableHead>
              <TableHead className="text-start">{t("order.status")}</TableHead>
              <TableHead className="text-start">{t("shipment.arrival_date")}</TableHead>
              <TableHead className="text-start">{t("task.worker")}</TableHead>
              <TableHead className="text-end">{t("supervisor.col_action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((shipment) => {
              const task = taskByShipmentId.get(shipment.id);
              const assigned = task && task.status === "in_preparation";
              const received = shipment.status === "received";
              return (
                <TableRow key={shipment.id}>
                  <TableCell className="font-medium">#{shipment.id}</TableCell>
                  <TableCell>{shipment.factory_name || "—"}</TableCell>
                  <TableCell><StatusBadge status={shipment.status} label={t(`shipment.status.${shipment.status}`)} /></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(shipment.arrival_date)}</TableCell>
                  <TableCell>
                    {task ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{task.worker?.full_name ?? "—"}</span>
                        <StatusBadge status={task.status} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    {received || assigned ? (
                      <Badge variant="outline" className="rounded-full">
                        {received ? t("shipment.status.received") : t("supervisor.preparation.assigned_worker")}
                      </Badge>
                    ) : (
                      <Select
                        value=""
                        onValueChange={(v) => assignWorker(shipment.id, v)}
                        disabled={busyId === `assign-${shipment.id}` || availableWorkers.length === 0}
                      >
                        <SelectTrigger><SelectValue placeholder={t("supervisor.preparation.assign_worker_placeholder")} /></SelectTrigger>
                        <SelectContent>
                          {workers.map(w => (
                            <SelectItem key={w.id} value={w.id} disabled={w.status === "busy"}>
                              {w.name} ({w.id})
                              {w.status === "busy" ? ` · ${t("status.busy")}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </GlassCard>
  );
}

// ---------------- Tasks ----------------
const TASK_STATUS_ORDER = ["in_preparation", "completed"] as const;

function TasksSection({
  tasks, loading, error, onRefresh,
}: {
  tasks: KeeperTask[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();

  const statusColors: Record<string, string> = {
    in_preparation: "bg-violet-500/20 text-violet-700",
    completed: "bg-emerald-600/20 text-emerald-800",
  };

  const groups = useMemo(() => {
    const byStatus: Record<string, KeeperTask[]> = {};
    for (const task of tasks) {
      (byStatus[task.status] ??= []).push(task);
    }
    const known: { status: string; label: string; tasks: KeeperTask[] }[] = TASK_STATUS_ORDER
      .map((status) => ({ status, label: t(`task.status.${status}`, { defaultValue: status }), tasks: byStatus[status] ?? [] }))
      .filter((g) => g.tasks.length > 0);
    const knownSet = new Set<string>(TASK_STATUS_ORDER);
    const unknownStatuses = Object.keys(byStatus).filter((s) => !knownSet.has(s));
    if (unknownStatuses.length > 0) {
      known.push({
        status: "__other__",
        label: t("task.group.other"),
        tasks: unknownStatuses.flatMap((s) => byStatus[s] ?? []),
      });
    }
    return known;
  }, [tasks, t]);

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("supervisor.tasks")}</h2>
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("size-4 me-1", loading && "animate-spin")} /> {t("common.refresh")}
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.error_loading")}</p>
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("task.no_tasks_yet")}</p>
        ) : (
          <></>
        )}
      </GlassCard>

      {!loading && !error && tasks.length > 0 && groups.map((group) => (
        <GlassCard key={group.status}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{group.label}</h3>
              <Badge className="rounded-full bg-[#1D2D44]/10 text-[#1D2D44]">{group.tasks.length}</Badge>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t("task.type")}</TableHead>
                <TableHead className="text-start">{t("task.worker")}</TableHead>
                <TableHead className="text-start">{t("task.status")}</TableHead>
                <TableHead className="text-start">{t("task.created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.tasks.map((task) => {
                const relatedLabel = task.related?.label?.replace(/#/g, "").trim();
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="text-sm capitalize">{t(`task.type.${task.task_type}`)}</div>
                      {relatedLabel ? <div className="text-xs text-muted-foreground">{relatedLabel}</div> : null}
                    </TableCell>
                    <TableCell className="text-sm">{task.worker?.full_name ?? "—"}</TableCell>
                    <TableCell><Badge className={cn("rounded-full font-medium capitalize", statusColors[task.status] ?? "bg-muted text-foreground")}>{t(`task.status.${task.status}`, { defaultValue: task.status })}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{task.created_at?.slice(0, 10) ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </GlassCard>
      ))}
    </div>
  );
}

// ---------------- Driver Management ----------------
const TRACKING_REFRESH_MS = 15000;

function LocationCell({ order }: { order: COrder }) {
  const { t } = useTranslation();
  const mapsUrl = (() => {
    if (order.latitude == null || order.longitude == null) return null;
    const lat = Number(order.latitude);
    const lng = Number(order.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  })();
  const address = order.location || "—";
  return (
    <div className="flex min-w-0 items-start gap-2 text-sm">
      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 max-w-[16rem]">
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-words text-[#1D2D44] underline-offset-2 hover:underline"
          >
            {address}
          </a>
        ) : (
          <p className="break-words text-[#1D2D44]">{address}</p>
        )}
        {order.region ? (
          <p className="text-xs text-muted-foreground">{t("order.delivery_region")}: {order.region}</p>
        ) : null}
      </div>
    </div>
  );
}

function DriversSection({
  drivers, orders, setOrders, slug, onRefreshWorkerAvailability, warehouseId,
}: {
  drivers: Driver[]; orders: COrder[]; setOrders: React.Dispatch<React.SetStateAction<COrder[]>>;
  slug: string | null;
  onRefreshWorkerAvailability: () => Promise<void> | void;
  warehouseId: number | null;
}) {
  const { t } = useTranslation();
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const readyOrders = orders.filter(o => o.status === "shipped");
  const assignOrder = readyOrders.find(o => o.id === assignFor) ?? null;

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
                <TableHead className="text-start">{t("order.items")}</TableHead><TableHead className="text-start">{t("order.location")}</TableHead><TableHead className="text-end">{t("supervisor.col_action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyOrders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.id}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell>{o.items}</TableCell>
                  <TableCell>
                    <LocationCell order={o} />
                  </TableCell>
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
          {assignOrder && (
            <div className="rounded-xl border border-[#1D2D44]/20 bg-[#f6f4ea] p-3 text-sm text-[#1D2D44]">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium">{assignOrder.customer}</p>
                  <p className="text-muted-foreground">{assignOrder.location ?? "—"}</p>
                  {assignOrder.region ? (
                    <p className="text-xs text-muted-foreground">{t("order.delivery_region")}: {assignOrder.region}</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
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

      <DriverTrackingPanel slug={slug ?? ""} warehouseId={warehouseId} drivers={drivers} />
    </div>
  );
}

// ---------------- Driver Live Tracking ----------------
type TrackingDriver = { id: number; name: string; label: string };

function DriverTrackingPanel({ slug, warehouseId, drivers }: { slug: string; warehouseId: number | null; drivers: Driver[] }) {
  const { t } = useTranslation();
  const [trackingDrivers, setTrackingDrivers] = useState<TrackingDriver[]>([]);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [position, setPosition] = useState<DriverLivePosition | null>(null);
  const [route, setRoute] = useState<DriverRouteWaypoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const numericId = (id: string) => Number(id.replace(/\D/g, ""));

  useEffect(() => {
    let cancelled = false;
    const fallback = () =>
      drivers.map((d) => ({ id: numericId(d.id), name: d.name, label: d.name }));
    if (!warehouseId) {
      setTrackingDrivers(fallback());
      setDriverId((prev) => prev ?? fallback()[0]?.id ?? null);
      return;
    }
    fetchKeeperWorkers(slug, warehouseId)
      .then((res) => {
        if (cancelled) return;
        const real = (res.employees ?? [])
          .filter((e) => e.role === "driver")
          .map((e) => ({
            id: e.id,
            name: e.system_user?.full_name ?? `Driver ${e.id}`,
            label: e.system_user?.full_name ?? `Driver ${e.id}`,
          }));
        setTrackingDrivers(real.length > 0 ? real : fallback());
        setDriverId((prev) => prev ?? (real[0]?.id ?? fallback()[0]?.id ?? null));
      })
      .catch(() => {
        if (cancelled) return;
        setTrackingDrivers(fallback());
        setDriverId((prev) => prev ?? fallback()[0]?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, warehouseId]);

  const selectedDriver = trackingDrivers.find((d) => d.id === driverId) ?? null;

  const refresh = useCallback(async () => {
    if (!driverId) return;
    setRefreshing(true);
    setError(null);
    try {
      const [tracking, routeRes] = await Promise.all([
        fetchDriverTracking(slug, driverId),
        fetchDriverRoute(slug, driverId, 100),
      ]);
      setPosition(tracking.location);
      setRoute(routeRes.waypoints ?? []);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setError(t("tracking.no_live_data"));
      } else {
        setError(t("tracking.fetch_failed"));
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [slug, driverId, t]);

  useEffect(() => {
    if (!driverId) return;
    setLoading(true);
    setPosition(null);
    setRoute([]);
    refresh();
    const timer = setInterval(refresh, TRACKING_REFRESH_MS);
    return () => clearInterval(timer);
  }, [driverId, refresh]);

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-[#f2a618]" />
          <h2 className="text-base font-semibold">{t("tracking.title")}</h2>
        </div>
        <Select value={driverId !== null ? String(driverId) : ""} onValueChange={(v) => setDriverId(Number(v))}>
          <SelectTrigger className="w-56 bg-white/70 text-[#1D2D44]">
            <SelectValue placeholder={t("tracking.select_driver")} />
          </SelectTrigger>
          <SelectContent>
            {trackingDrivers.length === 0 && (
              <SelectItem value="__none__" disabled>{t("tracking.no_drivers")}</SelectItem>
            )}
            {trackingDrivers.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.label} (ID {d.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {driverId === null ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{t("tracking.select_prompt")}</p>
      ) : (
        <div className="p-5">
          {error && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-800">
              <p className="flex items-center gap-2"><AlertTriangle className="size-4" /> {error}</p>
            </div>
          )}

          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70 flex items-center gap-1"><Navigation className="size-3.5 text-blue-600" /> {t("tracking.driver")}</p>
              <p className="mt-2 truncate text-lg font-bold text-[#1a2942]">{selectedDriver?.name ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-white/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70 flex items-center gap-1"><MapPin className="size-3.5 text-blue-600" /> {t("tracking.coordinates")}</p>
              <p className="mt-2 font-mono text-xs text-[#1a2942]">
                {position ? `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-white/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70 flex items-center gap-1"><Gauge className="size-3.5 text-emerald-600" /> {t("tracking.speed")}</p>
              <p className="mt-2 text-lg font-bold text-[#1a2942]">
                {position ? `${position.speed.toFixed(1)} km/h` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-white/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70 flex items-center gap-1"><RefreshCw className="size-3.5 text-amber-600" /> {t("tracking.updated")}</p>
              <p className="mt-2 text-sm font-semibold text-[#1a2942]">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
              </p>
              <p className="mt-1 text-[11px] text-[#1a2942]/60">{t("tracking.refresh_note")}</p>
            </div>
          </div>

          <div className="relative h-[380px] overflow-hidden rounded-xl">
            {loading && !position ? (
              <div className="absolute inset-0 z-10 grid place-items-center bg-white/60 backdrop-blur-sm">
                <Loader2 className="size-6 animate-spin text-[#1a2942]" />
              </div>
            ) : (
              <DriverTrackingMap
                position={position ? { latitude: position.latitude, longitude: position.longitude } : null}
                route={route}
                destination={null}
                driverName={selectedDriver?.name}
              />
            )}
          </div>

          {route.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#1a2942]/70">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-600" /> {t("tracking.legend_driver")}</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-blue-600/80" /> {t("tracking.legend_route")}</span>
              <span className="ms-auto">{t("tracking.route_points", { count: route.length })}</span>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ---------------- Inter-Warehouse Transfers ----------------
function TransfersSection(props: ReturnType<typeof useSupervisorTransfers> & {
  busyWorkerSystemUserIds: Set<number>;
  onRefreshWorkerAvailability: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const {
    requests, loadingRequests, loadingTasks, staffWorkers, driverWorkers,
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

        {(loadingTasks || loadingRequests) ? (
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

// ---------------- Returns (keeper approve/dispose) ----------------
type DisposeDecision = "return_to_stock" | "damaged";

function ReturnsSection({ slug, warehouseId }: { slug: string; warehouseId: number | null }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<KeeperReturnStatus | "all">("pending");
  const [returns, setReturns] = useState<KeeperReturn[]>([]);
  const [staff, setStaff] = useState<KeeperWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [approveTarget, setApproveTarget] = useState<KeeperReturn | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KeeperReturn | null>(null);
  const [disposeTarget, setDisposeTarget] = useState<{ return: KeeperReturn; decision: DisposeDecision } | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    fetchKeeperWorkers(slug, warehouseId)
      .then((res) => {
        if (cancelled) return;
        setStaff((res.employees ?? []).filter((e) => e.role === "staff"));
      })
      .catch(() => {
        if (!cancelled) setStaff([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, warehouseId]);

  const load = useCallback(async (status?: KeeperReturnStatus | "all") => {
    setLoading(true);
    try {
      const res = await fetchKeeperReturns(slug, status && status !== "all" ? status : undefined);
      setReturns(res.returns ?? []);
    } catch {
      toast.error(t("supervisor.returns.toast_load_failed"));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const refresh = () => {
    setApproveTarget(null);
    setRejectTarget(null);
    setDisposeTarget(null);
    setSelectedWorker("");
    setReason("");
    load(tab);
  };

  const decide = async (target: KeeperReturn, decision: "approved" | "rejected") => {
    setBusyId(target.id);
    try {
      await decideKeeperReturn(slug, target.id, {
        status: decision,
        reason: decision === "rejected" ? reason.trim() : undefined,
      });
      toast.success(decision === "approved" ? t("supervisor.returns.toast_approved") : t("supervisor.returns.toast_rejected"));
      refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? t("supervisor.returns.toast_decision_failed"));
    } finally {
      setBusyId(null);
    }
  };

  const process = async (target: KeeperReturn, decision: DisposeDecision) => {
    const workerId = Number(selectedWorker);
    if (!workerId) {
      toast.error(t("supervisor.returns.worker_required"));
      return;
    }
    setBusyId(target.id);
    try {
      await processKeeperReturn(slug, target.id, {
        status: decision,
        worker_or_driver_id: workerId,
      });
      toast.success(decision === "return_to_stock" ? t("supervisor.returns.toast_restocked") : t("supervisor.returns.toast_damaged"));
      refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? t("supervisor.returns.toast_decision_failed"));
    } finally {
      setBusyId(null);
    }
  };

  const openDispose = (target: KeeperReturn, decision: DisposeDecision) => {
    setSelectedWorker("");
    setDisposeTarget({ return: target, decision });
  };

  const list = tab === "all" ? returns : returns.filter(r => r.status === tab);

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{t("supervisor.returns.title")}</h2>
          <Tabs value={tab} onValueChange={(v) => setTab(v as KeeperReturnStatus | "all")}>
            <TabsList>
              <TabsTrigger value="pending">{t("supervisor.returns.tab_pending")}</TabsTrigger>
              <TabsTrigger value="approved">{t("supervisor.returns.tab_approved")}</TabsTrigger>
              <TabsTrigger value="return_to_stock">{t("supervisor.returns.tab_return_to_stock")}</TabsTrigger>
              <TabsTrigger value="damaged">{t("supervisor.returns.tab_damaged")}</TabsTrigger>
              <TabsTrigger value="rejected">{t("supervisor.returns.tab_rejected")}</TabsTrigger>
              <TabsTrigger value="all">{t("supervisor.returns.tab_all")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="grid place-items-center py-12"><Loader2 className="size-6 animate-spin text-[#1a2942]" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("supervisor.col_return")}</TableHead>
                <TableHead>{t("supervisor.col_order")}</TableHead>
                <TableHead>{t("order.customer")}</TableHead>
                <TableHead>{t("return.reason")}</TableHead>
                <TableHead>{t("supervisor.returns.col_items")}</TableHead>
                <TableHead>{t("supervisor.returns.col_requested")}</TableHead>
                <TableHead>{t("order.status")}</TableHead>
                <TableHead className="text-end">{t("supervisor.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">#{r.id}</TableCell>
                  <TableCell>#{r.order.id}</TableCell>
                  <TableCell>{r.order.customer.full_name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.return_reason || "—"}</TableCell>
                  <TableCell className="max-w-[220px]">
                    {r.items.map(it => `${it.product.name} ×${it.quantity}`).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="flex items-center justify-end gap-1">
                    {r.status === "pending" ? (
                      <>
                        <Button size="sm" onClick={() => setApproveTarget(r)} disabled={busyId !== null}>
                          {busyId === r.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                          {t("supervisor.approve")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectTarget(r)} disabled={busyId !== null}>
                          <XCircle className="size-4" /> {t("supervisor.reject")}
                        </Button>
                      </>
                    ) : r.status === "approved" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openDispose(r, "return_to_stock")} disabled={busyId !== null}>
                          {busyId === r.id ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                          {t("supervisor.returns.return_to_stock")}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openDispose(r, "damaged")} disabled={busyId !== null}>
                          {busyId === r.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          {t("supervisor.returns.destroy_damaged")}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("supervisor.returns.reviewed")}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{t("supervisor.returns.no_items")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <AlertDialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1D2D44]">{t("supervisor.returns.approve_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {approveTarget
                ? t("supervisor.returns.approve_confirm_desc", {
                    id: approveTarget.id,
                    customer: approveTarget.order.customer.full_name,
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => approveTarget && decide(approveTarget, "approved")}>{t("supervisor.approve")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("supervisor.returns.reject_title")}</DialogTitle>
            <DialogDescription>{t("supervisor.returns.reject_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-[#1D2D44]">{t("supervisor.returns.reason_label")}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("supervisor.returns.reason_placeholder")}
              className="bg-[#eeebdd] text-[#1D2D44] placeholder:text-[#1D2D44]/60 border-[#1D2D44]/30 focus:border-[#f2a618]"
              rows={4}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}
              className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!reason.trim()) {
                  toast.error(t("supervisor.returns.reason_required"));
                  return;
                }
                if (rejectTarget) decide(rejectTarget, "rejected");
              }}
              disabled={busyId !== null}
              variant="destructive"
            >
              {busyId === rejectTarget?.id ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              {t("supervisor.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!disposeTarget} onOpenChange={(o) => !o && setDisposeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">
              {disposeTarget?.decision === "damaged" ? t("supervisor.returns.damage_confirm_title") : t("supervisor.returns.restock_confirm_title")}
            </DialogTitle>
            <DialogDescription>
              {disposeTarget
                ? (disposeTarget.decision === "damaged"
                    ? t("supervisor.returns.damage_confirm_desc", { id: disposeTarget.return.id })
                    : t("supervisor.returns.restock_confirm_desc", { id: disposeTarget.return.id }))
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl bg-[#1D2D44]/5 p-3 text-sm text-[#1D2D44]">
              {disposeTarget?.return.items.map(it => `${it.product.name} ×${it.quantity}`).join(", ") || "—"}
            </div>
            <div className="space-y-2">
              <Label className="text-[#1D2D44]">{t("supervisor.returns.worker_label")}</Label>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger className="bg-[#eeebdd] text-[#1D2D44]">
                  <SelectValue placeholder={t("supervisor.returns.worker_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {staff.length === 0 && (
                    <SelectItem value="__none__" disabled>{t("supervisor.returns.no_staff")}</SelectItem>
                  )}
                  {staff.map(w => (
                    <SelectItem key={w.system_user?.id ?? w.system_user_id} value={String(w.system_user?.id ?? w.system_user_id)}>
                      {w.system_user?.full_name ?? `#${w.system_user_id}`}
                      <span className="ms-2 text-xs text-muted-foreground">({w.status})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setDisposeTarget(null)}
              className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => disposeTarget && process(disposeTarget.return, disposeTarget.decision)}
              disabled={busyId !== null || !selectedWorker}
              className={disposeTarget?.decision === "damaged" ? "bg-rose-600 text-white hover:bg-rose-700" : undefined}
            >
              {busyId === disposeTarget?.return.id ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("supervisor.returns.assign_task")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Disposals (keeper approves/rejects) ----------------
function DisposalsSection({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DisposalStatus | "all">("pending");
  const [disposals, setDisposals] = useState<KeeperDisposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [approveTarget, setApproveTarget] = useState<KeeperDisposal | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KeeperDisposal | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async (status?: DisposalStatus | "all") => {
    setLoading(true);
    try {
      const res = await fetchKeeperDisposals(slug, status && status !== "all" ? status : undefined);
      setDisposals(res.disposals ?? []);
    } catch {
      toast.error(t("supervisor.disposals.toast_load_failed"));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const decide = async (target: KeeperDisposal, decision: "approved" | "rejected") => {
    setDecidingId(target.id);
    try {
      await decideKeeperDisposal(slug, target.id, {
        status: decision,
        reason: decision === "rejected" ? reason.trim() : undefined,
      });
      toast.success(decision === "approved" ? t("supervisor.disposals.toast_approved") : t("supervisor.disposals.toast_rejected"));
      setApproveTarget(null);
      setRejectTarget(null);
      setReason("");
      load(tab);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? t("supervisor.disposals.toast_decision_failed"));
    } finally {
      setDecidingId(null);
    }
  };

  const list = tab === "all" ? disposals : disposals.filter(d => d.status === tab);

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{t("supervisor.disposals.title")}</h2>
          <Tabs value={tab} onValueChange={(v) => setTab(v as DisposalStatus | "all")}>
            <TabsList>
              <TabsTrigger value="pending">{t("supervisor.disposals.tab_pending")}</TabsTrigger>
              <TabsTrigger value="approved">{t("supervisor.disposals.tab_approved")}</TabsTrigger>
              <TabsTrigger value="rejected">{t("supervisor.disposals.tab_rejected")}</TabsTrigger>
              <TabsTrigger value="all">{t("supervisor.disposals.tab_all")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="grid place-items-center py-12"><Loader2 className="size-6 animate-spin text-[#1a2942]" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("supervisor.disposals.col_barcode")}</TableHead>
                <TableHead>{t("supervisor.disposals.col_product")}</TableHead>
                <TableHead>{t("supervisor.disposals.col_quantity")}</TableHead>
                <TableHead>{t("supervisor.disposals.col_damage_reason")}</TableHead>
                <TableHead>{t("supervisor.col_worker")}</TableHead>
                <TableHead>{t("supervisor.disposals.col_requested_at")}</TableHead>
                <TableHead>{t("order.status")}</TableHead>
                <TableHead className="text-end">{t("supervisor.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.barcode ?? `#${d.id}`}</TableCell>
                  <TableCell className="font-medium">{d.product?.name ?? "—"}</TableCell>
                  <TableCell>{d.quantity}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{d.damage_reason || "—"}</TableCell>
                  <TableCell>{d.worker?.full_name ?? d.employee?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.created_at ? new Date(d.created_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell className="flex items-center justify-end gap-1">
                    {d.status === "pending" ? (
                      <>
                        <Button size="sm" onClick={() => setApproveTarget(d)} disabled={decidingId !== null}>
                          {decidingId === d.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                          {t("supervisor.approve")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectTarget(d)} disabled={decidingId !== null}>
                          <XCircle className="size-4" /> {t("supervisor.reject")}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("supervisor.disposals.reviewed")}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{t("supervisor.disposals.no_items")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <AlertDialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1D2D44]">{t("supervisor.disposals.approve_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {approveTarget
                ? t("supervisor.disposals.approve_confirm_desc", {
                    barcode: approveTarget.barcode ?? `#${approveTarget.id}`,
                    quantity: approveTarget.quantity,
                    product: approveTarget.product?.name ?? "",
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => approveTarget && decide(approveTarget, "approved")}>{t("supervisor.approve")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("supervisor.disposals.reject_title")}</DialogTitle>
            <DialogDescription>{t("supervisor.disposals.reject_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-[#1D2D44]">{t("supervisor.disposals.reason_label")}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("supervisor.disposals.reason_placeholder")}
              className="bg-[#eeebdd] text-[#1D2D44] placeholder:text-[#1D2D44]/60 border-[#1D2D44]/30 focus:border-[#f2a618]"
              rows={4}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}
              className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!reason.trim()) {
                  toast.error(t("supervisor.disposals.reason_required"));
                  return;
                }
                if (rejectTarget) decide(rejectTarget, "rejected");
              }}
              disabled={decidingId !== null}
              variant="destructive"
            >
              {decidingId !== null ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              {t("supervisor.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
    `/${slug}/reports/${report}/${ext}`;

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
