import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, Inbox, PackageCheck, Truck, Users, RotateCcw, ClipboardList,
  FileText, Settings as SettingsIcon, LogOut, Menu, Bell, Plus, Trash2, Pencil,
  Loader2, Download, CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight,
  Warehouse as WarehouseIcon, ShieldCheck, Activity, Navigation, MapPin, Gauge,
  RefreshCw, AlertTriangle,
} from "lucide-react";
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
import { fetchMe, logoutManager, fetchDriverTracking, fetchDriverRoute, fetchKeeperWorkers } from "@/lib/manager-api";
import type { DriverLivePosition, DriverRouteWaypoint } from "@/lib/manager-api";
import { DriverTrackingMap } from "@/components/DriverTrackingMap";
import { isValidInternationalPhone } from "@/lib/validation";

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
type WorkerSection = "Preparation" | "Receiving" | "Returns";
type SWorker = { id: string; name: string; section: WorkerSection; status: "available" | "busy" };
type COrder = {
  id: string; customer: string; items: number; total: number; createdAt: string;
  status: "incoming" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "rejected";
  workerId?: string; driverId?: string; progress?: number;
};
type Shipment = {
  id: string; supplier: string; items: number; arrivedAt: string;
  status: "expected" | "receiving" | "received" | "rejected";
  workerId?: string; qualityNote?: string;
};
type Driver = { id: string; name: string; phone: string; vehicle: string; status: "available" | "on_delivery" | "off_duty" };
type Return = {
  id: string; orderId: string; customer: string; reason: string; createdAt: string;
  status: "pending" | "approved" | "rejected" | "refunded"; workerId?: string;
};

const seedWorkers: SWorker[] = [
  { id: "W-101", name: "Layla Said", section: "Preparation", status: "available" },
  { id: "W-102", name: "Omar Nasr", section: "Preparation", status: "busy" },
  { id: "W-103", name: "Yusuf Tarek", section: "Receiving", status: "available" },
  { id: "W-104", name: "Mariam Adel", section: "Returns", status: "available" },
  { id: "W-105", name: "Karim Fouad", section: "Receiving", status: "busy" },
];
const seedOrders: COrder[] = [
  { id: "ORD-5012", customer: "Acme Co.",   items: 12, total: 842,  createdAt: "10:24", status: "incoming" },
  { id: "ORD-5013", customer: "Brightline", items: 4,  total: 220,  createdAt: "10:31", status: "incoming" },
  { id: "ORD-5014", customer: "Globex",     items: 22, total: 1530, createdAt: "09:55", status: "preparing", workerId: "W-102", progress: 60 },
  { id: "ORD-5015", customer: "Initech",    items: 7,  total: 410,  createdAt: "09:12", status: "ready",     workerId: "W-101", progress: 100 },
  { id: "ORD-5016", customer: "Soylent",    items: 3,  total: 95,   createdAt: "08:48", status: "out_for_delivery", driverId: "D-21" },
];
const seedShipments: Shipment[] = [
  { id: "SH-3421", supplier: "Nordic Goods", items: 120, arrivedAt: "08:10", status: "expected" },
  { id: "SH-3422", supplier: "Sahara Trade", items: 56,  arrivedAt: "09:40", status: "receiving", workerId: "W-103" },
  { id: "SH-3423", supplier: "Pacific Imp.", items: 200, arrivedAt: "07:30", status: "received",  workerId: "W-105", qualityNote: "All pallets intact." },
];
const seedDrivers: Driver[] = [
  { id: "D-21", name: "Hassan Ali",  phone: "+20 100 2233", vehicle: "Van — A12",  status: "on_delivery" },
  { id: "D-22", name: "Nora Saleh",  phone: "+20 100 7788", vehicle: "Truck — B07", status: "available" },
  { id: "D-23", name: "Ziad Maher",  phone: "+20 100 9911", vehicle: "Van — A09",   status: "available" },
  { id: "D-24", name: "Salma Reda",  phone: "+20 100 3322", vehicle: "Truck — B11", status: "off_duty" },
];
const seedReturns: Return[] = [
  { id: "RET-901", orderId: "ORD-4992", customer: "Acme Co.",   reason: "Damaged on arrival", createdAt: "Yesterday", status: "pending" },
  { id: "RET-902", orderId: "ORD-4988", customer: "Globex",     reason: "Wrong item",          createdAt: "Yesterday", status: "approved",  workerId: "W-104" },
  { id: "RET-903", orderId: "ORD-4975", customer: "Brightline", reason: "Customer changed mind", createdAt: "2d ago",  status: "refunded",  workerId: "W-104" },
];

// ---------------- Sidebar ----------------
type SectionId =
  | "overview" | "incoming" | "preparation" | "receiving"
  | "drivers" | "returns" | "workers" | "reports" | "settings";

const NAV: { id: SectionId; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",    labelKey: "sidebar.dashboard",          icon: LayoutDashboard },
  { id: "incoming",    labelKey: "supervisor.nav.incoming",    icon: Inbox },
  { id: "preparation", labelKey: "supervisor.nav.preparation", icon: PackageCheck },
  { id: "receiving",   labelKey: "supervisor.nav.receiving",   icon: ClipboardList },
  { id: "drivers",     labelKey: "supervisor.nav.drivers",     icon: Truck },
  { id: "returns",     labelKey: "supervisor.nav.returns",     icon: RotateCcw },
  { id: "workers",     labelKey: "supervisor.workers",         icon: Users },
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
  const [warehouseId, setWarehouseId] = useState<number | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("stockyard.manager") : null;
    if (!raw) {
      navigate({ to: "/supervisor-login", replace: true });
      return;
    }
    let parsed: { must_change_password?: boolean; full_name?: string; tenant?: { url_slug?: string } };
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

  const [workers, setWorkers] = useState<SWorker[]>(seedWorkers);
  const [orders, setOrders] = useState<COrder[]>(seedOrders);
  const [shipments, setShipments] = useState<Shipment[]>(seedShipments);
  const [drivers, setDrivers] = useState<Driver[]>(seedDrivers);
  const [returns, setReturns] = useState<Return[]>(seedReturns);

  const stats = useMemo(() => ({
    incoming: orders.filter(o => o.status === "incoming").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    ready: orders.filter(o => o.status === "ready").length,
    out: orders.filter(o => o.status === "out_for_delivery").length,
    returns: returns.filter(r => r.status === "pending").length,
    shipments: shipments.filter(s => s.status !== "received" && s.status !== "rejected").length,
    activeWorkers: workers.filter(w => w.status === "busy").length,
    availableDrivers: drivers.filter(d => d.status === "available").length,
  }), [orders, returns, shipments, workers, drivers]);

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
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[oklch(0.78_0.16_75)] shadow-lg">
              <WarehouseIcon className="size-5 text-white" />
            </div>
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
            <button className="relative rounded-full bg-white/10 p-2 hover:bg-white/20">
              <Bell className="size-4" />
              <span className="absolute end-1 top-1 size-2 rounded-full bg-[oklch(0.78_0.16_75)]" />
            </button>
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
              {section === "incoming"    && <IncomingOrders orders={orders} setOrders={setOrders} />}
              {section === "preparation" && <Preparation orders={orders} setOrders={setOrders} workers={workers} setWorkers={setWorkers} />}
              {section === "receiving"   && <Receiving shipments={shipments} setShipments={setShipments} workers={workers} />}
              {section === "drivers"     && <DriversSection slug={slug ?? ""} warehouseId={warehouseId} drivers={drivers} setDrivers={setDrivers} orders={orders} setOrders={setOrders} />}
              {section === "returns"     && <ReturnsSection returns={returns} setReturns={setReturns} workers={workers} />}
              {section === "workers"     && <WorkersSection workers={workers} setWorkers={setWorkers} />}
              {section === "reports"     && <Reports orders={orders} returns={returns} workers={workers} />}
              {section === "settings"    && <SettingsPanel />}
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
  const map: Record<string, string> = {
    incoming:         "bg-blue-500/20 text-blue-700",
    preparing:        "bg-amber-500/20 text-amber-700",
    ready:            "bg-emerald-500/20 text-emerald-700",
    out_for_delivery: "bg-violet-500/20 text-violet-700",
    delivered:        "bg-emerald-600/20 text-emerald-800",
    rejected:         "bg-rose-500/20 text-rose-700",
    expected:         "bg-blue-500/20 text-blue-700",
    receiving:        "bg-amber-500/20 text-amber-700",
    received:         "bg-emerald-500/20 text-emerald-700",
    pending:          "bg-amber-500/20 text-amber-700",
    approved:         "bg-emerald-500/20 text-emerald-700",
    refunded:         "bg-violet-500/20 text-violet-700",
    available:        "bg-emerald-500/20 text-emerald-700",
    busy:             "bg-amber-500/20 text-amber-700",
    on_delivery:      "bg-violet-500/20 text-violet-700",
    off_duty:         "bg-zinc-500/20 text-zinc-700",
  };
  const label = status.replaceAll("_", " ");
  return <Badge className={cn("rounded-full font-medium capitalize", map[status] ?? "bg-muted text-foreground")}>{label}</Badge>;
}

// ---------------- Overview ----------------
function Overview({ stats, orders }: { stats: any; orders: COrder[] }) {
  const { t } = useTranslation();
  const cards = [
    { label: t("supervisor.stat_pending_orders"),     value: stats.incoming,         icon: Inbox },
    { label: t("supervisor.stat_in_preparation"),     value: stats.preparing,        icon: PackageCheck },
    { label: t("supervisor.stat_ready_for_delivery"), value: stats.ready,            icon: CheckCircle2 },
    { label: t("supervisor.stat_out_for_delivery"),   value: stats.out,              icon: Truck },
    { label: t("supervisor.stat_pending_returns"),    value: stats.returns,          icon: RotateCcw },
    { label: t("supervisor.stat_active_shipments"),   value: stats.shipments,        icon: ClipboardList },
    { label: t("supervisor.stat_active_workers"),     value: stats.activeWorkers,    icon: Activity },
    { label: t("supervisor.stat_available_drivers"),  value: stats.availableDrivers, icon: ShieldCheck },
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
              <TableHead>{t("supervisor.col_order")}</TableHead><TableHead>{t("order.customer")}</TableHead>
              <TableHead>{t("order.items")}</TableHead><TableHead>{t("order.status")}</TableHead><TableHead>{t("task.created")}</TableHead>
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
function IncomingOrders({ orders, setOrders }: { orders: COrder[]; setOrders: React.Dispatch<React.SetStateAction<COrder[]>>; }) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const list = orders.filter(o => o.status === "incoming");

  const apply = () => {
    if (!confirm) return;
    setOrders(prev => prev.map(o => o.id === confirm.id
      ? { ...o, status: confirm.action === "approve" ? "preparing" : "rejected", progress: confirm.action === "approve" ? 0 : undefined }
      : o));
    toast.success(confirm.action === "approve" ? t("supervisor.toast_order_preparing", { id: confirm.id }) : t("supervisor.toast_order_rejected", { id: confirm.id }));
    setConfirm(null);
  };

  return (
    <GlassCard>
      <h2 className="mb-4 text-base font-semibold">{t("supervisor.incoming.title")}</h2>
      {list.length === 0 ? (
        <p className="rounded-xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">{t("supervisor.incoming.no_orders")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("supervisor.col_order")}</TableHead><TableHead>{t("order.customer")}</TableHead>
              <TableHead>{t("order.items")}</TableHead><TableHead>{t("order.total")}</TableHead>
              <TableHead>{t("task.created")}</TableHead><TableHead className="text-end">{t("supervisor.col_action")}</TableHead>
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
                <TableCell className="flex items-center justify-end gap-2">
                  <Button size="sm" onClick={() => setConfirm({ id: o.id, action: "approve" })}>
                    <CheckCircle2 className="size-4" /> {t("supervisor.approve")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ id: o.id, action: "reject" })}>
                    <XCircle className="size-4" /> {t("supervisor.reject")}
                  </Button>
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
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#f2a618] text-[#1D2D44] border border-[#1D2D44]/20 hover:bg-[#f2a618]/90 hover:text-[#1D2D44]">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={apply}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GlassCard>
  );
}

// ---------------- Order Preparation ----------------
function Preparation({
  orders, setOrders, workers, setWorkers,
}: {
  orders: COrder[]; setOrders: React.Dispatch<React.SetStateAction<COrder[]>>;
  workers: SWorker[]; setWorkers: React.Dispatch<React.SetStateAction<SWorker[]>>;
}) {
  const { t } = useTranslation();
  const list = orders.filter(o => o.status === "preparing" || o.status === "ready");
  const prepWorkers = workers.filter(w => w.section === "Preparation");

  const assign = (id: string, workerId: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, workerId, progress: o.progress ?? 10 } : o));
    setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, status: "busy" } : w));
    toast.success(t("supervisor.toast_worker_assigned", { id: workerId }));
  };
  const setProgress = (id: string, value: number) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, progress: value } : o));
  };
  const markReady = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "ready", progress: 100 } : o));
    const o = orders.find(x => x.id === id);
    if (o?.workerId) setWorkers(prev => prev.map(w => w.id === o.workerId ? { ...w, status: "available" } : w));
    toast.success(t("supervisor.toast_ready_for_delivery", { id }));
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {list.length === 0 && (
        <GlassCard className="md:col-span-2">
          <p className="text-center text-sm text-muted-foreground">{t("supervisor.preparation.no_orders")}</p>
        </GlassCard>
      )}
      {list.map(o => (
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
              <Label className="text-xs">{t("supervisor.preparation.assigned_worker")}</Label>
              <Select value={o.workerId ?? ""} onValueChange={(v) => assign(o.id, v)}>
                <SelectTrigger><SelectValue placeholder={t("supervisor.preparation.assign_worker_placeholder")} /></SelectTrigger>
                <SelectContent>
                  {prepWorkers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name} ({w.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("supervisor.preparation.progress")}</span><span>{o.progress ?? 0}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${o.progress ?? 0}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-[oklch(0.78_0.16_75)]"
                />
              </div>
              {o.status === "preparing" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setProgress(o.id, Math.min(100, (o.progress ?? 0) + 25))}>{t("supervisor.preparation.progress_25")}</Button>
                  <Button size="sm" onClick={() => markReady(o.id)} disabled={!o.workerId}>
                    <CheckCircle2 className="size-4" /> {t("supervisor.preparation.mark_ready")}
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

// ---------------- Shipment Receiving ----------------
function Receiving({
  shipments, setShipments, workers,
}: {
  shipments: Shipment[]; setShipments: React.Dispatch<React.SetStateAction<Shipment[]>>;
  workers: SWorker[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier: "", items: 1 });
  const [qc, setQc] = useState<{ id: string; note: string } | null>(null);
  const recWorkers = workers.filter(w => w.section === "Receiving");

  const addShipment = () => {
    if (!form.supplier) return toast.error(t("supervisor.receiving.toast_supplier_required"));
    const id = `SH-${3400 + shipments.length + 1}`;
    setShipments(prev => [{
      id, supplier: form.supplier, items: form.items,
      arrivedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "expected",
    }, ...prev]);
    setOpen(false); setForm({ supplier: "", items: 1 });
    toast.success(t("supervisor.receiving.toast_shipment_logged"));
  };
  const assign = (id: string, workerId: string) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, workerId, status: "receiving" } : s));
    toast.success(t("supervisor.receiving.toast_worker_receiving", { id: workerId, shipment: id }));
  };
  const confirmReceive = () => {
    if (!qc) return;
    setShipments(prev => prev.map(s => s.id === qc.id ? { ...s, status: "received", qualityNote: qc.note || "OK" } : s));
    toast.success(t("supervisor.receiving.toast_received", { id: qc.id }));
    setQc(null);
  };

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{t("supervisor.receiving.title")}</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> {t("supervisor.receiving.log_shipment")}</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("supervisor.col_shipment")}</TableHead><TableHead>{t("supervisor.col_supplier")}</TableHead>
            <TableHead>{t("order.items")}</TableHead><TableHead>{t("supervisor.col_arrived")}</TableHead>
            <TableHead>{t("task.worker")}</TableHead><TableHead>{t("order.status")}</TableHead>
            <TableHead className="text-end">{t("supervisor.col_action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map(s => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.id}</TableCell>
              <TableCell>{s.supplier}</TableCell>
              <TableCell>{s.items}</TableCell>
              <TableCell className="text-muted-foreground">{s.arrivedAt}</TableCell>
              <TableCell>
                {s.status === "received" || s.status === "rejected" ? (
                  <span className="text-xs text-muted-foreground">{s.workerId ?? "—"}</span>
                ) : (
                  <Select value={s.workerId ?? ""} onValueChange={(v) => assign(s.id, v)}>
                    <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder={t("supervisor.assign_placeholder")} /></SelectTrigger>
                    <SelectContent>
                      {recWorkers.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell><StatusBadge status={s.status} /></TableCell>
              <TableCell className="text-end">
                {s.status === "receiving" && (
                  <Button size="sm" onClick={() => setQc({ id: s.id, note: "" })}>
                    <CheckCircle2 className="size-4" /> {t("supervisor.receiving.quality_check")}
                  </Button>
                )}
                {s.status === "received" && s.qualityNote && (
                  <span className="text-xs text-muted-foreground">{s.qualityNote}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("supervisor.receiving.log_shipment")}</DialogTitle>
            <DialogDescription>{t("supervisor.receiving.dialog_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
             <Label className="text-[#eeebdd]">{t("supervisor.col_supplier")}</Label>
  <Input 
    value={form.supplier} 
    onChange={(e) => setForm({ ...form, supplier: e.target.value })} 
    placeholder={t("placeholder.supplier_example")} 
    className="bg-[#eeebdd] text-[#1D2D44] placeholder:text-[#1D2D44]/60 border-[#1D2D44]/30 focus:border-[#f2a618]"
  />
</div>

<div className="space-y-2">
  <Label className="text-[#eeebdd]">{t("supervisor.receiving.item_count")}</Label>
  <Input 
    type="number" 
    min={1} 
    value={form.items} 
    onChange={(e) => setForm({ ...form, items: Number(e.target.value) })} 
    className="bg-[#eeebdd] text-[#1D2D44] border-[#1D2D44]/30 focus:border-[#f2a618]"
  />
</div>
          </div>
          <DialogFooter>
         <Button 
  type="button" 
  variant="outline" 
  onClick={() => {
    setQc(null);
    setOpen(false); 
  }}
  className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20"
>
  {t("common.cancel")}
</Button>
            <Button onClick={addShipment}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qc} onOpenChange={(o) => !o && setQc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("supervisor.receiving.confirm_receipt_title", { id: qc?.id })}</DialogTitle>
            <DialogDescription>{t("supervisor.receiving.qc_desc")}</DialogDescription>
          </DialogHeader>
          <Textarea value={qc?.note ?? ""} onChange={(e) => setQc(qc ? { ...qc, note: e.target.value } : null)} placeholder={t("placeholder.quality_note")} />
          <DialogFooter>
            <Button 
  variant="outline" 
  onClick={() => setQc(null)}
  className="bg-[#f2a618] text-[#1D2D44] border-[#1D2D44] hover:bg-[#1D2D44] hover:text-[#f2a618]">{t("common.cancel")}</Button>
            <Button onClick={confirmReceive}><CheckCircle2 className="size-4" /> {t("supervisor.receiving.confirm_receipt")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

// ---------------- Driver Management ----------------
const TRACKING_REFRESH_MS = 15000;

function DriversSection({
  slug, warehouseId, drivers, setDrivers, orders, setOrders,
}: {
  slug: string; warehouseId: number | null; drivers: Driver[]; setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  orders: COrder[]; setOrders: React.Dispatch<React.SetStateAction<COrder[]>>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<Omit<Driver, "id">>({ name: "", phone: "", vehicle: "", status: "available" });
  const [delTarget, setDelTarget] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const readyOrders = orders.filter(o => o.status === "ready");

  const openNew = () => { setEditing(null); setForm({ name: "", phone: "", vehicle: "", status: "available" }); setOpen(true); };
  const openEdit = (d: Driver) => { setEditing(d); setForm(d); setOpen(true); };

  const save = () => {
    if (!form.name) return toast.error(t("supervisor.toast_name_required"));
    if (!isValidInternationalPhone(form.phone)) {
      toast.error(t("validation.phone_international"));
      return;
    }
    if (editing) {
      setDrivers(prev => prev.map(d => d.id === editing.id ? { ...editing, ...form } : d));
      toast.success(t("supervisor.drivers.toast_updated"));
    } else {
      const id = `D-${20 + drivers.length + 1}`;
      setDrivers(prev => [...prev, { id, ...form }]);
      toast.success(t("supervisor.drivers.toast_added"));
    }
    setOpen(false);
  };
  const del = () => {
    if (!delTarget) return;
    setDrivers(prev => prev.filter(d => d.id !== delTarget));
    toast.success(t("supervisor.drivers.toast_removed"));
    setDelTarget(null);
  };
  const assignDriver = (orderId: string, driverId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driverId, status: "out_for_delivery" } : o));
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: "on_delivery" } : d));
    toast.success(t("supervisor.drivers.toast_dispatched", { id: driverId }));
    setAssignFor(null);
  };

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("supervisor.drivers.title")}</h2>
          <Button size="sm" onClick={openNew}><Plus className="size-4" /> {t("supervisor.drivers.add")}</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("supervisor.col_id")}</TableHead><TableHead>{t("settings.name")}</TableHead>
              <TableHead>{t("supervisor.col_phone")}</TableHead><TableHead>{t("supervisor.col_vehicle")}</TableHead>
              <TableHead>{t("order.status")}</TableHead><TableHead className="text-end">{t("supervisor.col_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.id}</TableCell>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.phone}</TableCell>
                <TableCell>{d.vehicle}</TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
                <TableCell className="flex items-center justify-end gap-1">
                  <Button size="icon" variant="outline" onClick={() => openEdit(d)}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="outline" onClick={() => setDelTarget(d.id)}><Trash2 className="size-4" /></Button>
                </TableCell>
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
                <TableHead>{t("supervisor.col_order")}</TableHead><TableHead>{t("order.customer")}</TableHead>
                <TableHead>{t("order.items")}</TableHead><TableHead className="text-end">{t("supervisor.col_action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyOrders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.id}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell>{o.items}</TableCell>
                  <TableCell className="text-end">
                    <Button size="sm" onClick={() => setAssignFor(o.id)}>
                      <Truck className="size-4" /> {t("supervisor.drivers.assign")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{editing ? t("supervisor.drivers.edit") : t("supervisor.drivers.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
    <Label className="text-[#1D2D44]">{t("settings.name")}</Label>
    <Input 
      value={form.name} 
      onChange={(e) => setForm({ ...form, name: e.target.value })} 
      className="bg-[#eeebdd] text-[#1D2D44] placeholder:text-[#1D2D44]/60 border-[#1D2D44]/30 focus:border-[#f2a618]"
    />
  </div>

  {/* Phone Field */}
  <div className="space-y-2">
    <Label className="text-[#1D2D44]">{t("supervisor.col_phone")}</Label>
    <Input 
      value={form.phone} 
      onChange={(e) => setForm({ ...form, phone: e.target.value })} 
      className="bg-[#eeebdd] text-[#1D2D44] placeholder:text-[#1D2D44]/60 border-[#1D2D44]/30 focus:border-[#f2a618]"
    />
  </div>

  {/* Vehicle Field */}
  <div className="space-y-2">
    <Label className="text-[#1D2D44]">{t("supervisor.col_vehicle")}</Label>
    <Input 
      value={form.vehicle} 
      onChange={(e) => setForm({ ...form, vehicle: e.target.value })} 
      className="bg-[#eeebdd] text-[#1D2D44] placeholder:text-[#1D2D44]/60 border-[#1D2D44]/30 focus:border-[#f2a618]"
    />
  </div>

  {/* Status Select Field */}
  <div className="space-y-2">
    <Label className="text-[#1D2D44]">{t("order.status")}</Label>
    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Driver["status"] })}>
      <SelectTrigger className="bg-[#eeebdd] text-[#1D2D44] border-[#1D2D44]/30 focus:ring-[#f2a618]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#eeebdd] border-[#1D2D44]/20 text-[#1D2D44]">
        <SelectItem value="available" className="focus:bg-[#f2a618]/20 focus:text-[#1D2D44] cursor-pointer">{t("supervisor.driver_status_available")}</SelectItem>
        <SelectItem value="on_delivery" className="focus:bg-[#f2a618]/20 focus:text-[#1D2D44] cursor-pointer">{t("supervisor.driver_status_on_delivery")}</SelectItem>
        <SelectItem value="off_duty" className="focus:bg-[#f2a618]/20 focus:text-[#1D2D44] cursor-pointer">{t("supervisor.driver_status_off_duty")}</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>

<DialogFooter className="mt-4">
  <Button 
    type="button" 
    variant="outline" 
    onClick={() => setOpen(false)}
    className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20"
  >
    {t("common.cancel")}
  </Button>
            <Button onClick={save}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1D2D44]">{t("supervisor.drivers.remove_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("supervisor.drivers.undo_warning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
<AlertDialogCancel 
  className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20">{t("common.cancel")}</AlertDialogCancel>            <AlertDialogAction onClick={del}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("supervisor.drivers.assign_to", { order: assignFor })}</DialogTitle>
            <DialogDescription>{t("supervisor.drivers.available_only")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
  {drivers.filter(d => d.status === "available").map(d => (
    <button 
      key={d.id}
      type="button"
      onClick={() => assignFor && assignDriver(assignFor, d.id)}
      className="flex w-full items-center justify-between rounded-xl border border-[#1D2D44]/20 bg-[#eeebdd] p-3 hover:bg-[#e4e0cd] transition"
    >
      <div className="text-start">
        <p className="font-semibold text-[#1D2D44]">
          {d.name} <span className="text-xs text-[#1D2D44]/75 font-normal">({d.id})</span>
        </p>
        <p className="text-xs text-[#1D2D44]/80 font-medium">
          {d.vehicle} · {d.phone}
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

      <DriverTrackingPanel slug={slug} warehouseId={warehouseId} drivers={drivers} />
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

// ---------------- Returns ----------------
function ReturnsSection({
  returns, setReturns, workers,
}: {
  returns: Return[]; setReturns: React.Dispatch<React.SetStateAction<Return[]>>;
  workers: SWorker[];
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("pending");
  const retWorkers = workers.filter(w => w.section === "Returns");
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
            <TableHead>{t("supervisor.col_return")}</TableHead><TableHead>{t("supervisor.col_order")}</TableHead>
            <TableHead>{t("order.customer")}</TableHead><TableHead>{t("return.reason")}</TableHead>
            <TableHead>{t("task.worker")}</TableHead><TableHead>{t("order.status")}</TableHead>
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
                    {retWorkers.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="flex items-center justify-end gap-1">
                {r.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => setStatus(r.id, "approved")}>{t("supervisor.approve")}</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>{t("supervisor.reject")}</Button>
                  </>
                )}
                {r.status === "approved" && (
                  <Button size="sm" onClick={() => setStatus(r.id, "refunded")}>{t("supervisor.returns.process_refund")}</Button>
                )}
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
function WorkersSection({
  workers, setWorkers,
}: { workers: SWorker[]; setWorkers: React.Dispatch<React.SetStateAction<SWorker[]>>; }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; section: WorkerSection }>({ name: "", section: "Preparation" });
  const [query, setQuery] = useState("");
  const list = workers.filter(w => w.name.toLowerCase().includes(query.toLowerCase()));

  const add = () => {
    if (!form.name) return toast.error(t("supervisor.toast_name_required"));
    const id = `W-${100 + workers.length + 1}`;
    setWorkers(prev => [...prev, { id, name: form.name, section: form.section, status: "available" }]);
    toast.success(t("supervisor.workers.toast_added"));
    setOpen(false); setForm({ name: "", section: "Preparation" });
  };
  const reassign = (id: string, section: WorkerSection) => {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, section } : w));
    toast.success(t("supervisor.workers.toast_section_updated"));
  };
  const remove = (id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
    toast.success(t("supervisor.workers.toast_removed"));
  };

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t("supervisor.workers")}</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-2 top-2.5 size-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("supervisor.search_placeholder")} className="ps-8 w-[200px]" />
          </div>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> {t("supervisor.workers.add")}</Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("supervisor.col_id")}</TableHead><TableHead>{t("settings.name")}</TableHead>
            <TableHead>{t("supervisor.col_section")}</TableHead><TableHead>{t("order.status")}</TableHead>
            <TableHead className="text-end">{t("supervisor.col_actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map(w => (
            <TableRow key={w.id}>
              <TableCell className="font-medium">{w.id}</TableCell>
              <TableCell>{w.name}</TableCell>
              <TableCell>
                <Select value={w.section} onValueChange={(v) => reassign(w.id, v as WorkerSection)}>
                  <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preparation">{t("supervisor.section_preparation")}</SelectItem>
                    <SelectItem value="Receiving">{t("supervisor.section_receiving")}</SelectItem>
                    <SelectItem value="Returns">{t("supervisor.section_returns")}</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><StatusBadge status={w.status} /></TableCell>
              <TableCell className="text-end">
                <Button size="icon" variant="outline" onClick={() => remove(w.id)}><Trash2 className="size-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-[#1D2D44]">{t("supervisor.workers.add")}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
           <div className="space-y-2">
    <Label className="text-[#1D2D44]">{t("settings.name")}</Label>
    <Input 
      value={form.name} 
      onChange={(e) => setForm({ ...form, name: e.target.value })} 
      className="bg-[#eeebdd] text-[#1D2D44] placeholder:text-[#1D2D44]/60 border-[#1D2D44]/30 focus:border-[#f2a618]"
    />
  </div>

  {/* Section Select Field */}
  <div className="space-y-2">
    <Label className="text-[#1D2D44]">{t("supervisor.col_section")}</Label>
    <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v as WorkerSection })}>
      <SelectTrigger className="bg-[#eeebdd] text-[#1D2D44] border-[#1D2D44]/30 focus:ring-[#f2a618]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#eeebdd] border-[#1D2D44]/20 text-[#1D2D44]">
        <SelectItem value="Preparation" className="focus:bg-[#f2a618]/20 focus:text-[#1D2D44] cursor-pointer">{t("supervisor.section_preparation")}</SelectItem>
        <SelectItem value="Receiving" className="focus:bg-[#f2a618]/20 focus:text-[#1D2D44] cursor-pointer">{t("supervisor.section_receiving")}</SelectItem>
        <SelectItem value="Returns" className="focus:bg-[#f2a618]/20 focus:text-[#1D2D44] cursor-pointer">{t("supervisor.section_returns")}</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>

<DialogFooter className="mt-4">
  <Button 
    type="button" 
    variant="outline" 
    onClick={() => setOpen(false)}
    className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20"
  >
    {t("common.cancel")}
  </Button>
            <Button onClick={add}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

// ---------------- Reports ----------------
function Reports({
  orders, returns, workers,
}: { orders: COrder[]; returns: Return[]; workers: SWorker[] }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);

  const exportFile = (kind: "PDF" | "CSV", scope: string) => {
    setBusy(`${kind}-${scope}`);
    setTimeout(() => {
      setBusy(null);
      toast.success(t("supervisor.reports.toast_exported", { scope, kind }));
    }, 900);
  };

  const reasons = returns.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1; return acc;
  }, {});

  const perf = workers.map(w => ({
    ...w,
    handled: orders.filter(o => o.workerId === w.id).length + returns.filter(r => r.workerId === w.id).length,
  }));

  const reportCards = [
    { title: t("supervisor.reports.daily_operations"), desc: t("supervisor.reports.orders_today", { orders: orders.length, returns: returns.length }) },
    { title: t("supervisor.reports.worker_performance"), desc: t("supervisor.reports.workers_tasks", { count: workers.length, workers: workers.length, tasks: perf.reduce((s, p) => s + p.handled, 0) }) },
    { title: t("supervisor.reports.return_reasons"), desc: Object.entries(reasons).map(([k, v]) => `${k} (${v})`).join(" · ") || "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {reportCards.map(r => (
          <GlassCard key={r.title}>
            <h3 className="font-semibold">{r.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportFile("PDF", r.title)} disabled={busy === `PDF-${r.title}`}>
                {busy === `PDF-${r.title}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {t("report.pdf")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportFile("CSV", r.title)} disabled={busy === `CSV-${r.title}`}>
                {busy === `CSV-${r.title}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {t("supervisor.reports.csv")}
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <h3 className="mb-3 font-semibold">{t("supervisor.reports.worker_performance")}</h3>
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("supervisor.col_id")}</TableHead><TableHead>{t("settings.name")}</TableHead><TableHead>{t("supervisor.col_section")}</TableHead><TableHead>{t("supervisor.reports.tasks_handled")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {perf.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.section}</TableCell>
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
function SettingsPanel() {
  const { t } = useTranslation();
  const [name, setName] = useState("Supervisor Account");
  const [email, setEmail] = useState("supervisor@stockyard.app");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <GlassCard>
        <h3 className="mb-3 font-semibold">{t("settings.profile")}</h3>
        <div className="space-y-3">
          <div className="space-y-2"><Label>{t("supervisor.settings.display_name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t("signup.email")}</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button onClick={() => toast.success(t("supervisor.settings.toast_saved"))}>{t("common.save")}</Button>
        </div>
      </GlassCard>
      <GlassCard>
        <h3 className="mb-3 font-semibold">{t("supervisor.settings.preferences")}</h3>
        <p className="text-sm text-muted-foreground">{t("supervisor.settings.preferences_desc")}</p>
      </GlassCard>
    </div>
  );
}
