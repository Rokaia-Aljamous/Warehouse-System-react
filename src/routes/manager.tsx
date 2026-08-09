import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Boxes, ClipboardList, BarChart3, FileText,
  Settings as SettingsIcon, ArrowLeftRight, LogOut, Menu, Search, Bell,
  Plus, Trash2, QrCode, AlertTriangle, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Clock, Truck, Download, Printer, Loader2, ChevronLeft, ChevronRight,
  Warehouse as WarehouseIcon, Wallet as WalletIcon, Sparkles, CreditCard,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, BarChart, Bar, Legend, LineChart, Line,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  CURRENT_WAREHOUSE, ALL_WAREHOUSES,
  initialProducts, initialMovements, initialTransfers,
  dailyVolume, monthlyVolume, peakHours, attendanceTrend,
  type Worker, type Product,
  type Transfer, type TransferStatus,
} from "@/lib/manager-data";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { getProfilePic, subscribeProfilePic } from "@/lib/profile-storage";
import { subscriptionStore, type SubscriptionRequest } from "@/lib/subscription-data";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fetchMe, fetchManagerEmployees, fetchManagerOrders, createManagerWorker, type ManagerEmployee, type ManagerOrder } from "@/lib/manager-api";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/manager")({
  component: ManagerApp,
  head: () => ({
    meta: [
      { title: i18n.t("title.manager") },
      { name: "description", content: i18n.t("title.manager_desc") },
    ],
  }),
});

type SectionId =
  | "overview" | "workers" | "inventory" | "orders" | "transfers"
  | "statistics" | "reports" | "wallet" | "settings";

const NAV: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "sidebar.dashboard", icon: LayoutDashboard },
  { id: "workers", label: "sidebar.workers", icon: Users },
  { id: "inventory", label: "sidebar.inventory", icon: Boxes },
  { id: "orders", label: "sidebar.orders", icon: ClipboardList },
  { id: "transfers", label: "sidebar.transfers", icon: ArrowLeftRight },
  { id: "statistics", label: "sidebar.statistics", icon: BarChart3 },
  { id: "reports", label: "sidebar.reports", icon: FileText },
  { id: "wallet", label: "sidebar.wallet", icon: WalletIcon },
  { id: "settings", label: "sidebar.settings", icon: SettingsIcon },
];

type StoredManagerSession = {
  id?: number;
  full_name?: string;
  name?: string;
  whmId?: string;
  phone_number?: string;
  warehouse_id?: number | null;
  must_change_password?: boolean;
  tenant?: { url_slug?: string };
};

function ManagerLayout() {
  const routerState = useRouterState();
  const isSlugRoute = routerState.matches.some(m => m.routeId === '/dashboard/$slug' || m.routeId === '/manager/$slug');
  if (isSlugRoute) return <ManagerSlugShell />;
  return <ManagerApp />;
}

function ManagerSlugShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId>("overview");

  useEffect(() => {
    setAvatar(getProfilePic("manager"));
    return subscribeProfilePic("manager", setAvatar);
  }, []);

  const sessionRaw = typeof window !== "undefined" ? localStorage.getItem("stockyard.manager") : null;
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;

  const logout = () => {
    localStorage.removeItem("stockyard.manager");
    navigate({ to: "/manager-login" });
  };

  const sidebar = (
    <aside
      className={cn(
        "flex h-full flex-col border-e border-white/10 bg-navy-light text-cream backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
      )}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="grid size-8 place-items-center rounded-xl bg-accent/30 text-accent-foreground">
          <WarehouseIcon className="h-4 w-4" />
        </div>
        {!collapsed && <span className="text-base font-semibold tracking-tight">{t("app.name")}</span>}
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setSection(item.id); setMobileOpen(false); }}
              className={cn(
                "group/nav flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "text-cream shadow-inner"
                  : "text-cream/75 hover:text-cream hover:translate-x-0.5",
              )}
              style={{
                backgroundColor: active
                  ? "rgba(167,179,195,0.20)"
                  : undefined,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "rgba(167,179,195,0.15)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = ""; }}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-[#A7B3C3]")} />
              {!collapsed && <span>{t(item.label)}</span>}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className={cn("flex items-center gap-3 rounded-xl bg-white/5 p-2", collapsed && "justify-center")}>
          <div className="size-9 overflow-hidden rounded-full bg-accent/30 ring-1 ring-white/20">
            {avatar ? (
              <img src={avatar} alt={t("manager.alt_avatar")} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs font-bold text-cream">
                {session?.full_name?.[0] ?? "M"}
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 text-xs leading-tight">
              <p className="truncate font-semibold text-cream">{session?.full_name ?? t("manager.role")}</p>
              <p className="truncate text-cream/60">{session?.user_name ?? ""}</p>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2 p-3 pt-0">
        <LanguageToggle collapsed={collapsed} />
        <Button
          variant="ghost"
          className="w-full justify-start text-cream/80 hover:bg-white/10 hover:text-cream"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>{t("settings.sign_out")}</span>}
        </Button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex w-full items-center justify-center rounded-lg border border-white/10 py-2 text-cream/70 hover:bg-white/10"
        >
          {collapsed ? <ChevronRight className="h-4 w-4 rtl:rotate-180" /> : <ChevronLeft className="h-4 w-4 rtl:rotate-180" />}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full">
      <div className="fixed inset-y-0 start-0 z-30 hidden md:block">{sidebar}</div>
      <div className={cn("flex-1 transition-all", collapsed ? "md:ps-[72px]" : "md:ps-64")}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-navy/70 px-4 py-3 backdrop-blur md:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-cream md:hidden hover:bg-cream/10">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-3">
            <div className="hidden md:block">
              <p className="text-xs uppercase tracking-wider text-cream/60">{t("warehouse.name")}</p>
              <p className="text-sm font-semibold text-cream">{t("manager.login.title")}</p>
            </div>
            <div className="ms-auto flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-cream">
              <div className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-accent text-foreground text-xs font-semibold">
                {avatar ? <img src={avatar} alt={t("manager.alt_avatar")} className="h-full w-full object-cover" /> : (session?.full_name?.[0] ?? "M")}
              </div>
              <div className="hidden text-xs leading-tight sm:block">
                <p className="font-medium">{session?.full_name ?? t("manager.role")}</p>
                <p className="text-cream/60">{t("manager.role")}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function ManagerApp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionId>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // shared state
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<ManagerOrder[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers);

  type Session = { whmId: string; name: string; warehouseId?: string };
  const [user, setUser] = useState<Session | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [checking, setChecking] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    setAvatar(getProfilePic("manager"));
    return subscribeProfilePic("manager", setAvatar);
  }, []);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("stockyard.manager") : null;
    if (!raw) {
      navigate({ to: "/manager-login", replace: true });
      return;
    }
    let parsed: StoredManagerSession;
    try {
      parsed = JSON.parse(raw) as StoredManagerSession;
    } catch {
      localStorage.removeItem("stockyard.manager");
      navigate({ to: "/manager-login", replace: true });
      return;
    }
    if (parsed.must_change_password) {
      navigate({ to: "/force-password-change", replace: true });
      return;
    }
    setUser({
      whmId: parsed.whmId ?? parsed.id?.toString?.() ?? "WHM-000",
      name: parsed.name ?? parsed.full_name ?? "",
      warehouseId: parsed.warehouse_id?.toString?.(),
    });
    setSlug(parsed.tenant?.url_slug ?? null);
    if (parsed.tenant?.url_slug) {
      fetchMe(parsed.tenant.url_slug)
        .then((me) => {
          if (me.role !== "manager") {
            localStorage.removeItem("stockyard.manager");
            navigate({ to: "/manager-login", replace: true });
            return;
          }
          setPhoneNumber(me.phone_number ?? "");
          setChecking(false);
        })
        .catch((err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 403) {
            navigate({ to: "/force-password-change", replace: true });
            return;
          }
          localStorage.removeItem("stockyard.manager");
          navigate({ to: "/manager-login", replace: true });
        });
    } else {
      setChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!slug || !user?.warehouseId) {
      setWorkers([]);
      return;
    }
    fetchManagerEmployees(slug, Number(user.warehouseId))
      .then(({ employees }) => setWorkers(employees.map(workerFromBackendEmployee)))
      .catch(() => setWorkers([]));
  }, [slug, user?.warehouseId]);

  const loadOrders = useCallback(() => {
    if (!slug) {
      setOrders([]);
      return;
    }
    fetchManagerOrders(slug)
      .then(({ orders: backendOrders }) => setOrders(backendOrders))
      .catch(() => setOrders([]));
  }, [slug]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const logout = () => {
    localStorage.removeItem("stockyard.manager");
    toast.success(t("settings.signed_out"));
    navigate({ to: "/manager-login" });
  };

  const sidebar = (
    <aside
      className={cn(
        "flex h-full flex-col border-e border-white/10 bg-navy-light text-cream backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
      )}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="grid size-8 place-items-center rounded-xl bg-accent/30 text-accent-foreground">
          <WarehouseIcon className="h-4 w-4" />
        </div>
        {!collapsed && <span className="text-base font-semibold tracking-tight">{t("app.name")}</span>}
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setSection(item.id); setMobileOpen(false); }}
              className={cn(
                "group/nav flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "text-cream shadow-inner"
                  : "text-cream/75 hover:text-cream hover:translate-x-0.5",
              )}
              style={{
                backgroundColor: active
                  ? "rgba(167,179,195,0.20)"
                  : undefined,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "rgba(167,179,195,0.15)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = ""; }}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-[#A7B3C3]")} />
              {!collapsed && <span>{t(item.label)}</span>}
            </button>
          );
        })}
      </nav>

      {/* User block */}
      <div className="border-t border-white/10 p-3">
        <div className={cn("flex items-center gap-3 rounded-xl bg-white/5 p-2", collapsed && "justify-center")}>
          <div className="size-9 overflow-hidden rounded-full bg-accent/30 ring-1 ring-white/20">
            {avatar ? (
              <img src={avatar} alt={t("manager.alt_avatar")} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs font-bold text-cream">
                {user?.name?.[0] ?? "M"}
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 text-xs leading-tight">
              <p className="truncate font-semibold text-cream">{user?.name ?? t("manager.role")}</p>
              <p className="truncate text-cream/60">{user?.whmId ?? ""}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 p-3 pt-0">
        <LanguageToggle collapsed={collapsed} />
        <Button
          variant="ghost"
          className="w-full justify-start text-cream/80 hover:bg-white/10 hover:text-cream"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>{t("settings.sign_out")}</span>}
        </Button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex w-full items-center justify-center rounded-lg border border-white/10 py-2 text-cream/70 hover:bg-white/10"
        >
          {collapsed ? <ChevronRight className="h-4 w-4 rtl:rotate-180" /> : <ChevronLeft className="h-4 w-4 rtl:rotate-180" />}
        </button>
      </div>
    </aside>
  );


  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <Loader2 className="h-8 w-8 animate-spin text-cream" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 start-0 z-30 hidden md:block">{sidebar}</div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="h-full w-64"
              onClick={(e) => e.stopPropagation()}
            >
              {sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className={cn("flex-1 transition-all", collapsed ? "md:ps-[72px]" : "md:ps-64")}>
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-navy/70 px-4 py-3 backdrop-blur md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-cream md:hidden hover:bg-cream/10"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-3">
            <div className="hidden md:block">
              <p className="text-xs uppercase tracking-wider text-cream/60">{t("manager.warehouse")}</p>
              <p className="text-sm font-semibold text-cream">{CURRENT_WAREHOUSE.name}</p>
            </div>
            <div className="ms-auto hidden max-w-sm flex-1 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-cream/80 ring-1 ring-white/10 sm:flex">
              <Search className="h-4 w-4" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-cream/50" placeholder={t("placeholder.search")} />
            </div>
            <Button variant="ghost" size="icon" className="text-cream hover:bg-cream/10">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="hidden items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-cream sm:flex">
              <div className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-accent text-foreground text-xs font-semibold">
                {avatar ? <img src={avatar} alt={t("manager.alt_avatar")} className="h-full w-full object-cover" /> : (user?.name?.[0] ?? "M")}
              </div>
              <div className="text-xs leading-tight">
                <p className="font-medium">{user?.name ?? t("manager.role")}</p>
                <p className="text-cream/60">{t("manager.role")}</p>
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
                <Overview workers={workers} products={products} orders={orders} />
              )}
              {section === "workers" && (
                <WorkersSection
                  workers={workers}
                  setWorkers={setWorkers}
                  slug={slug}
                  warehouseId={user?.warehouseId ? Number(user.warehouseId) : null}
                />
              )}
              {section === "inventory" && (
                <InventorySection products={products} setProducts={setProducts} />
              )}
              {section === "orders" && (
                <OrdersSection orders={orders} onRefresh={loadOrders} />
              )}
              {section === "transfers" && (
                <TransfersSection transfers={transfers} setTransfers={setTransfers} products={products} />
              )}
              {section === "statistics" && <StatisticsSection workers={workers} />}
              {section === "reports" && <ReportsSection />}
              {section === "wallet" && user && (
                <WalletSection user={user} />
              )}
              {section === "settings" && user && (
                <SettingsSection user={user} whmId={user.whmId} phone={phoneNumber} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

/* ---------- Shared UI ---------- */

function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/15 shadow-[0_8px_32px_rgba(15,23,42,0.25)] transition hover:shadow-[0_18px_48px_rgba(15,23,42,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-cream md:text-3xl">{title}</h1>
        {desc && <p className="mt-1 text-sm text-cream/70">{desc}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    pending: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    suspended: "bg-rose-500/20 text-rose-200 border-rose-400/30",
    Pending: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    Processing: "bg-sky-500/20 text-sky-200 border-sky-400/30",
    Shipped: "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
    Delivered: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    Cancelled: "bg-rose-500/20 text-rose-200 border-rose-400/30",
    "Pending Approval": "bg-amber-500/20 text-amber-200 border-amber-400/30",
    Approved: "bg-sky-500/20 text-sky-200 border-sky-400/30",
    "In Transit": "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
    Received: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    Rejected: "bg-rose-500/20 text-rose-200 border-rose-400/30",
  };
  return map[s] ?? "bg-white/10 text-cream border-white/20";
}

/* ---------- Overview ---------- */

function Overview({ workers, products, orders }: { workers: Worker[]; products: Product[]; orders: ManagerOrder[] }) {
  const { t } = useTranslation();
  const totalWorkers = workers.length;
  const inventoryValue = products.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedToday = orders.filter((o) => o.status === "delivered" || o.status === "shipped").length;
  const lowStock = products.filter((p) => p.quantity < p.reorderLevel);

  const cards = [
    { label: "manager.total_workers", value: totalWorkers, icon: Users, accent: "from-sky-400/30 to-sky-500/10" },
    { label: "manager.inventory_value", value: `$${inventoryValue.toLocaleString()}`, icon: Boxes, accent: "from-emerald-400/30 to-emerald-500/10" },
    { label: "manager.pending_orders", value: pendingOrders, icon: ClipboardList, accent: "from-amber-400/30 to-amber-500/10" },
    { label: "manager.shipments_today", value: completedToday, icon: Truck, accent: "from-indigo-400/30 to-indigo-500/10" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("manager.welcome_back", { name: CURRENT_WAREHOUSE.name })}
        desc={t("manager.overview_desc")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <GlassCard key={c.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-cream/60">{t(c.label)}</p>
                <p className="mt-2 text-3xl font-semibold text-cream">{c.value}</p>
              </div>
              <div className={cn("rounded-xl bg-gradient-to-br p-3 text-cream", c.accent)}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cream">{t("manager.daily_volume")}</h3>
            <Badge variant="outline" className="border-white/20 text-cream/80">{t("manager.incoming_vs_outgoing")}</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={dailyVolume}>
                <defs>
                  <linearGradient id="ovIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A7B3C3" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#A7B3C3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ovOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F0EBD8" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#F0EBD8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ background: "#1D2D44", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#F0EBD8" }} />
                <Area type="monotone" dataKey="incoming" stroke="#A7B3C3" fill="url(#ovIn)" />
                <Area type="monotone" dataKey="outgoing" stroke="#F0EBD8" fill="url(#ovOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cream">{t("manager.low_stock_alerts")}</h3>
            <AlertTriangle className="h-4 w-4 text-amber-300" />
          </div>
          <div className="space-y-3">
            {lowStock.length === 0 && (
              <p className="text-sm text-cream/60">{t("manager.no_low_stock")}</p>
            )}
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                <div>
                  <p className="text-sm font-medium text-cream">{p.name}</p>
                  <p className="text-xs text-cream/60">{p.sku} · {p.location}</p>
                </div>
                <Badge className="border-amber-400/30 bg-amber-500/20 text-amber-200">
                  {p.quantity}/{p.reorderLevel}
                </Badge>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* ---------- Workers ---------- */

function WorkersSection({
  workers, setWorkers, slug, warehouseId,
}: {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  slug: string | null;
  warehouseId: number | null;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (sectionFilter !== "all" && w.section !== sectionFilter) return false;
      if (q && !`${w.name} ${w.email} ${w.workerId}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [workers, q, statusFilter, sectionFilter]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((w) => w.id)));
  };

  const bulkSet = (status: "active" | "suspended") => {
    if (selected.size === 0) return;
    setWorkers((prev) => prev.map((w) => (selected.has(w.id) ? { ...w, status } : w)));
    toast.success(t(status === "active" ? "manager.workers_activated" : "manager.workers_deactivated", { count: selected.size }));
    setSelected(new Set());
  };

  const toggleStatus = (id: string) => {
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, status: w.status === "active" ? "suspended" : "active" } : w,
      ),
    );
  };

  const remove = (id: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    toast.success(t("worker.deleted"));
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={t("worker.title")} desc={t("worker.desc")}>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> {t("worker.add")}</Button>
      </SectionHeader>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/60" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("placeholder.search_worker")}
              className="border-white/15 bg-white/5 ps-9 text-cream placeholder:text-cream/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] border-white/15 bg-white/5 text-cream"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all_statuses")}</SelectItem>
              <SelectItem value="active">{t("worker.status.active")}</SelectItem>
              <SelectItem value="pending">{t("worker.status.pending")}</SelectItem>
              <SelectItem value="suspended">{t("worker.status.suspended")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[160px] border-white/15 bg-white/5 text-cream"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("worker.section.all")}</SelectItem>
              <SelectItem value="Receiving">{t("worker.section.receiving")}</SelectItem>
              <SelectItem value="Picking">{t("worker.section.picking")}</SelectItem>
              <SelectItem value="Packing">{t("worker.section.packing")}</SelectItem>
              <SelectItem value="Shipping">{t("worker.section.shipping")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={!selected.size} onClick={() => bulkSet("active")}>{t("worker.activate")}</Button>
            <Button  className="text-[#1D2D44]"size="sm" variant="outline" disabled={!selected.size} onClick={() => bulkSet("suspended")}>{t("worker.deactivate")}</Button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="w-10 text-cream/70">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-cream/70">{t("attendance.worker")}</TableHead>
                <TableHead className="text-cream/70">{t("worker.worker_id")}</TableHead>
                <TableHead className="text-cream/70">{t("worker.section")}</TableHead>
                <TableHead className="text-cream/70">{t("employee.status")}</TableHead>
                <TableHead className="text-cream/70">{t("worker.last_active")}</TableHead>
                <TableHead className="text-end text-cream/70">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((w) => (
                <TableRow key={w.id} className="border-white/10 text-cream hover:bg-white/5">
                  <TableCell>
                    <Checkbox
                      checked={selected.has(w.id)}
                      onCheckedChange={(v) => {
                        const next = new Set(selected);
                        if (v) next.add(w.id); else next.delete(w.id);
                        setSelected(next);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-cream/60">{w.email} · {w.phone}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{w.workerId}</TableCell>
                  <TableCell>{w.section}</TableCell>
                  <TableCell>
                    <Badge className={cn("border", statusBadge(w.status))}>{w.status}</Badge>
                  </TableCell>
                  <TableCell className="text-cream/70">{w.lastActive}</TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-cream/60">{t("worker.status.active")}</span>
                        <Switch
                          checked={w.status === "active"}
                          onCheckedChange={() => toggleStatus(w.id)}
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="text-cream hover:bg-white/10" onClick={() => setDeleteId(w.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-cream/60">{t("worker.no_match")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      <AddWorkerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(w) => setWorkers((prev) => [w, ...prev])}
        slug={slug}
        warehouseId={warehouseId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1D2D44]">{t("worker.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.cannot_undone")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
<AlertDialogCancel 
  className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20"
>
  {t("common.cancel")}
</AlertDialogCancel>            <AlertDialogAction onClick={() => deleteId && remove(deleteId)}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const WORKER_ROLES = ["warehouse_secretary", "staff", "driver"] as const;
type WorkerRole = (typeof WORKER_ROLES)[number];

type WorkerFormState = {
  full_name: string;
  birthday: string;
  phone_number: string;
  user_name: string;
  role: WorkerRole;
  status: "available" | "busy";
  salary: number;
};

const WORKER_FORM_INITIAL: WorkerFormState = {
  full_name: "",
  birthday: "",
  phone_number: "",
  user_name: "",
  role: "staff",
  status: "available",
  salary: 0,
};

function workerFromBackendEmployee(emp: ManagerEmployee): Worker {
  return {
    id: String(emp.id),
    workerId: `WRK-${String(emp.system_user_id).padStart(4, "0")}`,
    name: emp.system_user.full_name,
    email: emp.system_user.user_name,
    phone: emp.system_user.phone_number,
    section: "Receiving",
    status: emp.status === "busy" ? "pending" : "active",
    lastActive: "—",
    ordersProcessed: 0,
    avgHandlingMin: 0,
  };
}

function AddWorkerDialog({
  open, onOpenChange, onAdd, slug, warehouseId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (w: Worker) => void;
  slug: string | null;
  warehouseId: number | null;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<WorkerFormState>(WORKER_FORM_INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const set = (patch: Partial<WorkerFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone_number.trim() || !form.user_name.trim()) {
      toast.error(t("common.fields_required"));
      return;
    }
    setSubmitting(true);
    try {
      if (slug && warehouseId) {
        const res = await createManagerWorker(slug, warehouseId, {
          full_name: form.full_name.trim(),
          birthday: form.birthday || null,
          phone_number: form.phone_number.trim(),
          user_name: form.user_name.trim(),
          role: form.role,
          status: form.status,
          salary: form.salary,
        });
        onAdd(workerFromBackendEmployee(res.worker));
        if (res.password) toast.success(t("worker.created_with_password", { password: res.password }));
        else toast.success(t("worker.created"));
      } else {
        toast.error(t("worker.save_failed"));
        return;
      }
      setForm(WORKER_FORM_INITIAL);
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const firstError = e.response?.data?.errors?.[Object.keys(e.response?.data?.errors ?? {})[0]]?.[0];
      toast.error(e.response?.data?.message || firstError || t("worker.save_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1D2D44]">{t("worker.add")}</DialogTitle>
          <DialogDescription>{t("worker.auto_id")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-[#1D2D44]">{t("worker.name")}</Label>
            <Input
              value={form.full_name}
              onChange={(e) => set({ full_name: e.target.value })}
              className="text-[#1D2D44] placeholder:text-[#1D2D44]/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#1D2D44]">{t("worker.username")}</Label>
            <Input
              value={form.user_name}
              onChange={(e) => set({ user_name: e.target.value })}
              className="text-[#1D2D44] placeholder:text-[#1D2D44]/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#1D2D44]">{t("worker.phone")}</Label>
            <Input
              value={form.phone_number}
              onChange={(e) => set({ phone_number: e.target.value })}
              placeholder={t("worker.phone_hint")}
              className="text-[#1D2D44] placeholder:text-[#1D2D44]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[#1D2D44]">{t("worker.birthday")}</Label>
              <Input
                type="date"
                value={form.birthday}
                onChange={(e) => set({ birthday: e.target.value })}
                className="text-[#1D2D44]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1D2D44]">{t("worker.salary")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.salary}
                onChange={(e) => set({ salary: parseFloat(e.target.value) || 0 })}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[#1D2D44]">{t("worker.role")}</Label>
              <Select value={form.role} onValueChange={(v) => set({ role: v as WorkerRole })}>
                <SelectTrigger className="text-[#1D2D44] placeholder:text-[#1D2D44]/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORKER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{t(`worker.role.${r}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#1D2D44]">{t("worker.status")}</Label>
              <Select value={form.status} onValueChange={(v) => set({ status: v as "available" | "busy" })}>
                <SelectTrigger className="text-[#1D2D44] placeholder:text-[#1D2D44]/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{t("worker.status.available")}</SelectItem>
                  <SelectItem value="busy">{t("worker.status.busy")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#f2a618] border border-[#1D2D44]/20"
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("worker.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Inventory ---------- */

function InventorySection({ products, setProducts }: { products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>> }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Product | null>(null);
  const [delta, setDelta] = useState(0);
  const lowStock = products.filter((p) => p.quantity < p.reorderLevel);

  const apply = () => {
    if (!editing) return;
    setProducts((prev) => prev.map((p) => (p.id === editing.id ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p)));
    toast.success(t("inventory.stock_updated_for", { sku: editing.sku }));
    setEditing(null); setDelta(0);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={t("inventory.title")} desc={t("inventory.real_time_desc", { name: CURRENT_WAREHOUSE.name })}>
        <Button variant="outline" className="border-white/20 text-cream hover:bg-white/10">
          <QrCode className="h-4 w-4" /> {t("inventory.scan_barcode")}
        </Button>
      </SectionHeader>

      {lowStock.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-medium">{t("inventory.low_stock_alert", { count: lowStock.length })}</p>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-4">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-cream/70">{t("section.product")}</TableHead>
                <TableHead className="text-cream/70">{t("product.sku")}</TableHead>
                <TableHead className="text-cream/70">{t("inventory.quantity")}</TableHead>
                <TableHead className="text-cream/70">{t("warehouse.location")}</TableHead>
                <TableHead className="text-cream/70">{t("inventory.reorder")}</TableHead>
                <TableHead className="text-cream/70">{t("employee.status")}</TableHead>
                <TableHead className="text-end text-cream/70">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const low = p.quantity < p.reorderLevel;
                return (
                  <TableRow key={p.id} className="border-white/10 text-cream hover:bg-white/5">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>{p.location}</TableCell>
                    <TableCell>{p.reorderLevel}</TableCell>
                    <TableCell>
                      <Badge className={cn("border", low ? "bg-amber-500/20 text-amber-200 border-amber-400/30" : "bg-emerald-500/20 text-emerald-200 border-emerald-400/30")}>
                        {low ? t("inventory.low") : t("inventory.ok")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button 
  size="sm" 
  variant="outline" 
  className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20" 
  onClick={() => { setEditing(p); setDelta(0); }}
>
  {t("inventory.update_stock")}
</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-cream">{t("inventory.movement_history")}</h3>
        <div className="space-y-2">
          {initialMovements.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm text-cream">
              <div className="flex items-center gap-3">
                {m.type === "incoming"
                  ? <ArrowDownRight className="h-4 w-4 text-emerald-300" />
                  : <ArrowUpRight className="h-4 w-4 text-rose-300" />}
                <div>
                  <p className="font-medium">{m.sku} · {t("common.units", { count: m.qty })}</p>
                  <p className="text-xs text-cream/60">{m.date} · {m.reference}</p>
                </div>
              </div>
              <Badge variant="outline" className="border-white/20 text-cream/80 capitalize">{m.type}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("inventory.update_stock_sku", { sku: editing?.sku })}</DialogTitle>
            <DialogDescription className="text-[#1D2D44]">{t("inventory.current_quantity", { count: editing?.quantity })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[#1D2D44]">{t("inventory.adjustment")}</Label>
  <Input 
    type="number" 
    value={delta } 
    onChange={(e) => setDelta(e.target.value === "" ? 0 : parseInt(e.target.value, 10))} 
    className="text-[#1D2D44] focus:text-[#1D2D44] focus-visible:text-[#1D2D44] placeholder:text-[#1D2D44]/50"/>
            <p className="text-xs text-muted-foreground">{t("inventory.new_quantity", { count: (editing?.quantity ?? 0) + delta })}</p>
          </div>
          <DialogFooter>
<Button 
  type="button"
  variant="outline" 
  onClick={() => setEditing(null)}
  className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20"
>
  {t("common.cancel")}
</Button>            <Button onClick={apply}>{t("inventory.apply")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Orders ---------- */

const ORDER_TABS: ManagerOrder["status"][] = [
  "pending", "approved", "in_preparation", "shipped", "delivered", "rejected", "cancelled",
];

const formatOrderMoney = (v: string | number) =>
  `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatOrderDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const orderStatusBadge = (s: ManagerOrder["status"]) => {
  const map: Record<ManagerOrder["status"], string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-300/40",
    approved: "bg-sky-500/15 text-sky-400 border-sky-300/40",
    in_preparation: "bg-violet-500/15 text-violet-400 border-violet-300/40",
    shipped: "bg-blue-500/15 text-blue-400 border-blue-300/40",
    delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-300/40",
    rejected: "bg-rose-500/15 text-rose-400 border-rose-300/40",
    cancelled: "bg-gray-500/15 text-gray-400 border-gray-300/40",
  };
  return map[s] ?? "bg-gray-500/15 text-gray-400 border-gray-300/40";
};

function OrdersSection({ orders, onRefresh }: { orders: ManagerOrder[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [openOrder, setOpenOrder] = useState<ManagerOrder | null>(null);
  const sorted = [...orders].sort((a, b) => b.id - a.id);

  return (
    <div className="space-y-6">
      <SectionHeader title={t("order.title")} desc={t("order.desc", { name: CURRENT_WAREHOUSE.name })}>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="bg-[#eeebdd] text-[#1D2D44] hover:bg-[#eeebff] hover:text-[#1D2D44] border border-[#1D2D44]/20"
        >
          <RefreshCw className="h-4 w-4" />
          {t("common.refresh")}
        </Button>
      </SectionHeader>

      <div className="flex flex-wrap gap-2">
        {ORDER_TABS.map((s) => {
          const count = orders.filter((o) => o.status === s).length;
          return (
            <span key={s} className={cn("rounded-full border px-3 py-1 text-xs", orderStatusBadge(s))}>
              {t(`order.status.${s}`)} ({count})
            </span>
          );
        })}
      </div>

      <GlassCard className="p-4">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-cream/70">{t("order.order")}</TableHead>
                <TableHead className="text-cream/70">{t("order.customer")}</TableHead>
                <TableHead className="text-cream/70">{t("order.warehouse")}</TableHead>
                <TableHead className="text-cream/70">{t("order.items")}</TableHead>
                <TableHead className="text-cream/70">{t("order.total")}</TableHead>
                <TableHead className="text-cream/70">{t("order.status")}</TableHead>
                <TableHead className="text-cream/70">{t("order.date")}</TableHead>
                <TableHead className="text-end text-cream/70">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((o) => (
                <TableRow key={o.id} className="border-white/10 text-cream hover:bg-white/5">
                  <TableCell className="font-mono text-xs">#{o.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{o.customer.full_name}</div>
                    <div className="text-xs text-cream/60">{o.customer.phone_number}</div>
                  </TableCell>
                  <TableCell className="text-cream/80">{o.warehouse.warehouse_name}</TableCell>
                  <TableCell>{o.items_count}</TableCell>
                  <TableCell>{formatOrderMoney(o.total_price)}</TableCell>
                  <TableCell>
                    <Badge className={cn("border", orderStatusBadge(o.status))}>{t(`order.status.${o.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-cream/70">{formatOrderDate(o.order_date)}</TableCell>
                  <TableCell className="text-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-[#eeebdd] text-[#1D2D44] hover:bg-[#eeebff] hover:text-[#1D2D44] border border-[#1D2D44]/20"
                      onClick={() => setOpenOrder(o)}
                    >
                      {t("order.details")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-cream/60">{t("order.no_orders")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      <Dialog open={!!openOrder} onOpenChange={(o) => !o && setOpenOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("order.detail_title", { id: openOrder?.id })}</DialogTitle>
            <DialogDescription>{t("order.created_at", { date: openOrder ? formatOrderDate(openOrder.order_date) : "" })}</DialogDescription>
          </DialogHeader>
          {openOrder && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-[#1D2D44]">{t("order.customer")}</span>
                <span className="font-semibold text-[#1D2D44]">{openOrder.customer.full_name} ({openOrder.customer.phone_number})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-[#1D2D44]">{t("order.warehouse")}</span>
                <span className="text-[#1D2D44]">{openOrder.warehouse.warehouse_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-[#1D2D44]">{t("order.items")}</span>
                <span className="text-[#1D2D44]">{openOrder.items_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-[#1D2D44]">{t("order.total")}</span>
                <span className="font-bold text-[#1D2D44]">{formatOrderMoney(openOrder.total_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-[#1D2D44]">{t("order.location")}</span>
                <span className="text-end text-[#1D2D44]">{openOrder.customer_location}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-[#1D2D44]">{t("order.status")}</span>
                <Badge className="bg-[#1D2D44] text-[#eeebdd] hover:bg-[#1D2D44]/90">{t(`order.status.${openOrder.status}`)}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Transfers ---------- */

function TransfersSection({ transfers, setTransfers, products }: { transfers: Transfer[]; setTransfers: React.Dispatch<React.SetStateAction<Transfer[]>>; products: Product[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const outgoing = transfers.filter((t) => t.direction === "outgoing");
  const incoming = transfers.filter((t) => t.direction === "incoming");

  const setStatus = (id: string, status: TransferStatus) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    toast.success(t("transfer.status_changed", { id, status }));
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={t("transfer.title")} desc={t("transfer.desc")}>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("transfer.new_request")}</Button>
      </SectionHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TransferList title={t("transfer.pending_sent")} items={outgoing} onSet={setStatus} canAct={false} />
        <TransferList title={t("transfer.received_requests")} items={incoming} onSet={setStatus} canAct />
      </div>

      <GlassCard className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-cream">{t("transfer.history")}</h3>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-cream/70">{t("common.id")}</TableHead>
                <TableHead className="text-cream/70">{t("transfer.direction")}</TableHead>
                <TableHead className="text-cream/70">{t("transfer.from_to")}</TableHead>
                <TableHead className="text-cream/70">{t("section.product")}</TableHead>
                <TableHead className="text-cream/70">{t("transfer.qty")}</TableHead>
                <TableHead className="text-cream/70">{t("transfer.priority")}</TableHead>
                <TableHead className="text-cream/70">{t("employee.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((tr) => (
                <TableRow key={tr.id} className="border-white/10 text-cream hover:bg-white/5">
                  <TableCell className="font-mono text-xs">{tr.id}</TableCell>
                  <TableCell className="capitalize">{tr.direction}</TableCell>
                  <TableCell className="text-cream/70">{tr.fromWarehouse} → {tr.toWarehouse}</TableCell>
                  <TableCell>{tr.product}</TableCell>
                  <TableCell>{tr.qty}</TableCell>
                  <TableCell><Badge variant="outline" className="border-white/20 text-cream/90">{tr.priority}</Badge></TableCell>
                  <TableCell><Badge className={cn("border", statusBadge(tr.status))}>{tr.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      <NewTransferDialog
        open={open}
        onOpenChange={setOpen}
        products={products}
        onCreate={(t) => setTransfers((prev) => [t, ...prev])}
      />
    </div>
  );
}

function TransferList({
  title, items, onSet, canAct,
}: { title: string; items: Transfer[]; onSet: (id: string, s: TransferStatus) => void; canAct: boolean }) {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-cream">{title}</h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-cream/60">{t("transfer.no_transfers")}</p>}
        {items.map((tr) => (
          <div key={tr.id} className="rounded-xl bg-white/5 p-3 text-sm text-cream">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{tr.product} · {t("common.units", { count: tr.qty })}</p>
                <p className="text-xs text-cream/60">{tr.fromWarehouse} → {tr.toWarehouse}</p>
              </div>
              <Badge className={cn("border", statusBadge(tr.status))}>{tr.status}</Badge>
            </div>
            {canAct && tr.status === "Pending Approval" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => onSet(tr.id, "Approved")}>{t("transfer.approve")}</Button>
<Button 
  size="sm" 
  variant="outline" 
  className="bg-white/10 text-[#1D2D44] border-white/30 hover:bg-white/20 hover:text-[#1D2D44]" 
  onClick={() => onSet(tr.id, "Rejected")}
>
  {t("transfer.reject")}
</Button>              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function NewTransferDialog({
  open, onOpenChange, products, onCreate,
}: { open: boolean; onOpenChange: (o: boolean) => void; products: Product[]; onCreate: (t: Transfer) => void }) {
  const { t } = useTranslation();
  const otherWarehouses = ALL_WAREHOUSES.filter((w) => w.id !== CURRENT_WAREHOUSE.id);
  const [form, setForm] = useState({ source: otherWarehouses[0].name, product: products[0]?.name ?? "", qty: 100, priority: "Medium" as Transfer["priority"], notes: "" });
  const [loading, setLoading] = useState(false);

  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      onCreate({
        id: `TR-${Math.floor(200 + Math.random() * 800)}`,
        direction: "outgoing",
        fromWarehouse: CURRENT_WAREHOUSE.name,
        toWarehouse: form.source,
        product: form.product,
        qty: form.qty,
        priority: form.priority,
        status: "Pending Approval",
        createdAt: new Date().toISOString().slice(0, 10),
        notes: form.notes,
      });
      toast.success(t("transfer.request_submitted"));
      setLoading(false);
      onOpenChange(false);
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[#1D2D44]">{t("transfer.new_request")}</DialogTitle>
          <DialogDescription>{t("transfer.new_request_desc")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-[#1D2D44]">{t("transfer.source_warehouse")}</Label>
    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
      <SelectTrigger className="text-[#1D2D44] border-[#1D2D44]/20 bg-transparent focus:ring-[#1D2D44]">
        <SelectValue className="text-[#1D2D44] placeholder:text-[#1D2D44]/50" />
      </SelectTrigger>
      <SelectContent className="bg-[#eeebdd] text-[#1D2D44] border-[#1D2D44]/20">
        {otherWarehouses.map((w) => (
          <SelectItem 
            key={w.id} 
            value={w.name} 
            className="text-[#1D2D44] focus:bg-[#f2a618] focus:text-[#1D2D44] cursor-pointer"
          >
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Product */}
  <div className="space-y-2">
    <Label className="text-[#1D2D44]">{t("section.product")}</Label>
    <Select value={form.product} onValueChange={(v) => setForm({ ...form, product: v })}>
      <SelectTrigger className="text-[#1D2D44] border-[#1D2D44]/20 bg-transparent focus:ring-[#1D2D44]">
        <SelectValue className="text-[#1D2D44] placeholder:text-[#1D2D44]/50" />
      </SelectTrigger>
      <SelectContent className="bg-[#eeebdd] text-[#1D2D44] border-[#1D2D44]/20">
        {products.map((p) => (
          <SelectItem 
            key={p.id} 
            value={p.name} 
            className="text-[#1D2D44] focus:bg-[#f2a618] focus:text-[#1D2D44] cursor-pointer"
          >
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Quantity */}
  <div className="space-y-2">
    <Label className="text-[#1D2D44]">{t("inventory.quantity")}</Label>
    <Input 
      type="number" 
      value={form.qty} 
      onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value || "0", 10) })} 
      className="text-[#1D2D44] focus:text-[#1D2D44] focus-visible:text-[#1D2D44] border-[#1D2D44]/20"
    />
  </div>

  {/* Priority */}
  <div className="space-y-2 sm:col-span-2">
    <Label className="text-[#1D2D44]">{t("transfer.priority")}</Label>
    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Transfer["priority"] })}>
      <SelectTrigger className="text-[#1D2D44] border-[#1D2D44]/20 bg-transparent focus:ring-[#1D2D44]">
        <SelectValue className="text-[#1D2D44] placeholder:text-[#1D2D44]/50" />
      </SelectTrigger>
      <SelectContent className="bg-[#eeebdd] text-[#1D2D44] border-[#1D2D44]/20">
        <SelectItem value="High" className="text-[#1D2D44] focus:bg-[#f2a618] focus:text-[#1D2D44] cursor-pointer">{t("transfer.priority.high")}</SelectItem>
        <SelectItem value="Medium" className="text-[#1D2D44] focus:bg-[#f2a618] focus:text-[#1D2D44] cursor-pointer">{t("transfer.priority.medium")}</SelectItem>
        <SelectItem value="Low" className="text-[#1D2D44] focus:bg-[#f2a618] focus:text-[#1D2D44] cursor-pointer">{t("transfer.priority.low")}</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Internal notes */}
  <div className="space-y-2 sm:col-span-2">
    <Label className="text-[#1D2D44]">{t("transfer.internal_notes")}</Label>
    <Textarea 
      value={form.notes} 
      onChange={(e) => setForm({ ...form, notes: e.target.value })} 
      rows={3} 
      className="text-[#1D2D44] focus:text-[#1D2D44] focus-visible:text-[#1D2D44] border-[#1D2D44]/20 placeholder:text-[#1D2D44]/50"
    />
  </div>
</div>
<DialogFooter>
  <Button 
  variant="outline" 
  className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20" 
  onClick={() => onOpenChange(false)}
>
  {t("common.cancel")}
</Button>          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("transfer.submit_request")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Statistics ---------- */

function StatisticsSection({ workers }: { workers: Worker[] }) {
  const { t } = useTranslation();
  const productivity = workers
    .filter((w) => w.status === "active")
    .map((w) => ({ name: w.name.split(" ")[0], orders: w.ordersProcessed, avg: w.avgHandlingMin }));

  const heatMax = Math.max(...peakHours.map((p) => p.activity));

  return (
    <div className="space-y-6">
      <SectionHeader title={t("manager.statistics")} desc={t("manager.statistics_desc")}>
        <Button variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={() => toast.success(t("manager.exported_pdf")) }>
          <Download className="h-4 w-4" /> {t("manager.export_pdf")}
        </Button>
        <Button variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={() => toast.success(t("manager.exported_csv")) }>
          <Download className="h-4 w-4" /> {t("manager.export_csv")}
        </Button>
      </SectionHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-cream">{t("manager.worker_productivity")}</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={productivity}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ background: "#1D2D44", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#F0EBD8" }} />
                <Legend />
                <Bar dataKey="orders" name={t("order.title")} fill="#A7B3C3" radius={[6,6,0,0]} />
                <Bar dataKey="avg" name={t("manager.avg_min")} fill="#F0EBD8" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-cream">{t("manager.monthly_volume")}</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={monthlyVolume}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ background: "#1D2D44", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#F0EBD8" }} />
                <Legend />
                <Bar dataKey="incoming" fill="#A7B3C3" radius={[6,6,0,0]} />
                <Bar dataKey="outgoing" fill="#F0EBD8" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-cream">{t("manager.attendance_week")}</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={attendanceTrend}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ background: "#1D2D44", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#F0EBD8" }} />
                <Legend />
                <Line type="monotone" dataKey="active" stroke="#F0EBD8" strokeWidth={2} dot />
                <Line type="monotone" dataKey="scheduled" stroke="#A7B3C3" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-cream">{t("manager.peak_hours")}</h3>
          <div className="grid grid-cols-12 gap-1.5">
            {peakHours.map((h) => {
              const intensity = h.activity / heatMax;
              return (
                <Tooltip key={h.hour}>
                  <TooltipTrigger asChild>
                    <div
                      className="aspect-square rounded-md ring-1 ring-white/10"
                      style={{ background: `rgba(240, 235, 216, ${0.08 + intensity * 0.85})` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{h.hour} · {t("manager.actions", { count: h.activity })}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-cream/60">{t("manager.heatmap_hint")}</p>
        </GlassCard>
      </div>
    </div>
  );
}

/* ---------- Reports ---------- */

function ReportsSection() {
  const { t } = useTranslation();
  const [type, setType] = useState("Inventory Report");
  const [from, setFrom] = useState("2026-05-01");
  const [to, setTo] = useState("2026-05-13");
  const [format, setFormat] = useState("PDF");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState([
    { id: "RPT-018", type: "Order Summary", date: "2026-05-10", format: "PDF" },
    { id: "RPT-017", type: "Worker Performance", date: "2026-05-03", format: "Excel" },
  ]);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setPreview(true);
      setHistory((h) => [{ id: `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, date: to, format }, ...h]);
      toast.success(t("report.ready", { type, format }));
    }, 900);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={t("report.title")} desc={t("report.desc")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-cream">{t("report.generate")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-cream/80">{t("report.type")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="border-white/15 bg-white/5 text-cream"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inventory Report">Inventory Report</SelectItem>
                  <SelectItem value="Worker Performance">Worker Performance</SelectItem>
                  <SelectItem value="Order Summary">Order Summary</SelectItem>
                  <SelectItem value="Transfer History">Transfer History</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-cream/80">{t("report.format")}</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="border-white/15 bg-white/5 text-cream"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="Excel">Excel (CSV)</SelectItem>
                  <SelectItem value="Print">Print</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-cream/80">{t("inventory.from")}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border-white/15 bg-white/5 text-cream" />
            </div>
            <div className="space-y-2">
              <Label className="text-cream/80">{t("inventory.to")}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border-white/15 bg-white/5 text-cream" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {t("report.generate")}
            </Button>
           <Button 
  variant="outline" 
  className="border-[#eeebdd]/30 bg-[#1D2D44]/20 text-[#eeebdd] hover:bg-[#1D2D44]/40 hover:text-[#eeebdd]" 
  onClick={() => toast.success(t("report.schedule_saved"))}
>
  {t("report.schedule_weekly")}
</Button>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-cream">{t("report.saved")}</h3>
          <div className="space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm text-cream">
                <div>
                  <p className="font-medium">{r.type}</p>
                  <p className="text-xs text-cream/60">{r.id} · {r.date} · {r.format}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="text-cream hover:bg-white/10"><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-cream hover:bg-white/10"><Printer className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("report.preview_title", { type })}</DialogTitle>
            <DialogDescription>{from} → {to} · {format}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted p-6 text-sm">
            <h4  className="mb-2 font-semibold text-[#1D2D44]">{CURRENT_WAREHOUSE.name}</h4>
            <p className="text-muted-foreground">{t("report.demo_preview", { type: type.toLowerCase() })}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-[#eeebdd] p-3 border border-[#1D2D44]/15">
  <p className="text-xs font-medium text-[#1D2D44]/70">{t("report.records")}</p>
  <p className="text-lg font-semibold text-[#1D2D44]">312</p>
</div>

<div className="rounded-lg bg-[#eeebdd] p-3 border border-[#1D2D44]/15">
  <p className="text-xs font-medium text-[#1D2D44]/70">{t("report.total_volume")}</p>
  <p className="text-lg font-semibold text-[#1D2D44]">8,420</p>
</div>

<div className="rounded-lg bg-[#eeebdd] p-3 border border-[#1D2D44]/15">
  <p className="text-xs font-medium text-[#1D2D44]/70">{t("report.net_change")}</p>
  <p className="text-lg font-semibold text-[#1D2D44]">+12.4%</p>
</div>            </div>
          </div>
          <DialogFooter>
<Button 
  variant="outline" 
  className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#d99415] hover:text-[#1D2D44] border border-[#1D2D44]/20" 
  onClick={() => setPreview(false)}
>
  {t("common.close")}
</Button>            <Button onClick={() => { toast.success(t("report.download_started")); setPreview(false); }}><Download className="h-4 w-4" /> {t("report.download")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Settings ---------- */

function SettingsSection({ user, whmId, phone }: { user: { name: string; whmId: string }; whmId: string; phone: string }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: user.name, phone });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [twoFA, setTwoFA] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const saveProfile = () => {
    toast.success(t("settings.profile_saved"));
  };

  const changePw = () => {
    if (!pw.current) { toast.error(t("settings.enter_current_password")); return; }
    if (pw.next.length < 8) { toast.error(t("settings.password_min_length")); return; }
    if (pw.next !== pw.confirm) { toast.error(t("settings.password_mismatch")); return; }
    const overridesRaw = localStorage.getItem("stockyard.manager.overrides");
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    overrides[whmId] = { password: pw.next, isTempPassword: false, lastPasswordChange: new Date().toISOString().slice(0, 10) };
    localStorage.setItem("stockyard.manager.overrides", JSON.stringify(overrides));
    setPw({ current: "", next: "", confirm: "" });
    toast.success(t("settings.password_changed"));
  };

  return (
    <div className="space-y-6">
      <SectionHeader title={t("settings.profile_settings")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
  <h3 className="mb-4 text-sm font-semibold text-[#eeebdd]">{t("settings.profile_picture")}</h3>
  <div className="text-[#eeebdd] [&_p]:text-[#eeebdd] [&_span]:text-[#eeebdd] [&_button]:bg-[#f2a618] [&_button]:text-[#1D2D44] [&_button]:hover:bg-[#f2a618]/90">
    <ProfilePictureUpload role="manager" fallback={user.name?.[0] ?? "M"} />
  </div>
</GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-cream">{t("settings.profile")}</h3>
          <div className="space-y-3">
            <div className="space-y-2"><Label className="text-cream/80">{t("settings.manager_id")}</Label><Input className="border-white/15 bg-white/5 text-cream font-mono" value={whmId} readOnly /></div>
            <div className="space-y-2"><Label className="text-cream/80">{t("settings.name_username")}</Label><Input className="border-white/15 bg-white/5 text-cream" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-cream/80">{t("worker.phone")}</Label><Input className="border-white/15 bg-white/5 text-cream" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <Button onClick={saveProfile}>{t("settings.save_profile")}</Button>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-cream">{t("settings.change_password")}</h3>
          <div className="space-y-3">
            <div className="space-y-2"><Label className="text-cream/80">{t("settings.current_password")}</Label><Input type="password" className="border-white/15 bg-white/5 text-cream" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-cream/80">{t("settings.new_password")}</Label><Input type="password" className="border-white/15 bg-white/5 text-cream" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-cream/80">{t("settings.confirm_new_password")}</Label><Input type="password" className="border-white/15 bg-white/5 text-cream" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
            <Button onClick={changePw}>{t("settings.change_password")}</Button>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div>
                <p className="text-sm font-medium text-cream">{t("settings.two_fa")}</p>
                <p className="text-xs text-cream/60">{t("settings.two_fa_desc")}</p>
              </div>
              <Switch checked={twoFA} onCheckedChange={(v) => { setTwoFA(v); toast.success(v ? t("settings.two_fa_enabled") : t("settings.two_fa_disabled")); }} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-cream">{t("settings.notifications")}</h3>
          <div className="space-y-3">
            <SettingRow label={t("settings.notif_email")} checked={emailNotif} onCheckedChange={setEmailNotif} />
            <SettingRow label={t("settings.notif_sms")} checked={smsNotif} onCheckedChange={setSmsNotif} />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-cream">{t("settings.appearance")}</h3>
          <SettingRow label={t("settings.dark_theme")} checked={dark} onCheckedChange={setDark} />
          <p className="mt-2 text-xs text-cream/60">{t("settings.dark_theme_desc")}</p>
        </GlassCard>
      </div>
    </div>
  );
}

function SettingRow({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
      <p className="text-sm text-cream">{label}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/* ---------- Wallet & Subscriptions ---------- */
function WalletSection({ user }: { user: { name: string; whmId: string } }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"overview" | "subs">("overview");
  const [subs, setSubs] = useState<SubscriptionRequest[]>(() => subscriptionStore.list());
  const [open, setOpen] = useState(false);

  useEffect(() => subscriptionStore.subscribe(() => setSubs(subscriptionStore.list())), []);

  const statusColor = (s: SubscriptionRequest["status"]) =>
    s === "active" ? "bg-emerald-500/20 text-emerald-300"
    : s === "approved" ? "bg-sky-500/20 text-sky-300"
    : s === "rejected" ? "bg-rose-500/20 text-rose-300"
    : "bg-amber-500/20 text-amber-300";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader title={t("manager.wallet")} />
        <Button onClick={() => setOpen(true)} className="bg-accent text-foreground hover:bg-accent/80">
          <Sparkles className="size-4" /> {t("wallet.upgrade_plan")}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-white/5">
          <TabsTrigger value="overview">{t("wallet.overview")}</TabsTrigger>
          <TabsTrigger value="subs">{t("wallet.my_subscriptions")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2 p-5">
            <p className="text-xs uppercase tracking-wider text-cream/60">{t("wallet.plan_balance")}</p>
            <p className="mt-2 text-4xl font-bold text-cream">$1,240.00</p>
            <p className="mt-1 text-xs text-cream/60">{t("wallet.demo")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
             <Button 
  variant="outline" 
  className="bg-[#f2a618] text-[#1D2D44] border-[#1D2D44]/20 hover:bg-[#1D2D44] hover:text-[#eeebdd] flex items-center gap-2"
>
  <CreditCard className="size-4 text-current" /> 
  {t("wallet.manage_cards")}
</Button>

<Button 
  variant="outline" 
  className="bg-[#eeebdd] text-[#1D2D44] border-[#1D2D44]/20 hover:bg-[#1D2D44] hover:text-[#eeebdd] flex items-center gap-2" 
  onClick={() => setTab("subs")}
>
  <WalletIcon className="size-4 text-current" /> 
  {t("wallet.subscriptions")}
</Button>
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs uppercase tracking-wider text-cream/60">{t("wallet.pending_requests")}</p>
            <p className="mt-2 text-3xl font-bold text-cream">{subs.filter((s) => s.status === "pending").length}</p>
            <p className="mt-1 text-xs text-cream/60">{t("wallet.awaiting_approval")}</p>
          </GlassCard>
        </div>
      )}

      {tab === "subs" && (
        <GlassCard className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-cream/70">{t("wallet.company")}</TableHead>
                <TableHead className="text-cream/70">{t("subscribe.warehouses")}</TableHead>
                <TableHead className="text-cream/70">{t("wallet.slok_url")}</TableHead>
                <TableHead className="text-cream/70">{t("wallet.request_date")}</TableHead>
                <TableHead className="text-cream/70">{t("employee.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-cream/60">{t("wallet.no_requests")}</TableCell></TableRow>
              )}
              {subs.map((s) => (
                <TableRow key={s.id} className="border-white/10">
                  <TableCell className="text-cream">{s.companyName}</TableCell>
                  <TableCell className="text-cream">{s.warehouses}</TableCell>
                  <TableCell className="text-cream/80 font-mono text-xs">app.company.com/{s.slok}</TableCell>
                  <TableCell className="text-cream/70">{s.requestDate}</TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize", statusColor(s.status))}>{s.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassCard>
      )}

      <SubscriptionForm open={open} onOpenChange={setOpen} defaultName={user.name} />
    </div>
  );
}
