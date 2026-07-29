import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Boxes, ClipboardList, BarChart3, FileText,
  Settings as SettingsIcon, ArrowLeftRight, LogOut, Menu, Search, Bell,
  Plus, Trash2, QrCode, AlertTriangle, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Clock, Truck, Download, Printer, Loader2, ChevronLeft, ChevronRight,
  Warehouse as WarehouseIcon, Wallet as WalletIcon, Sparkles, CreditCard,
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
  initialWorkers, initialProducts, initialMovements, initialOrders, initialTransfers,
  dailyVolume, monthlyVolume, peakHours, attendanceTrend, generateWorkerId,
  type Worker, type WorkerSection, type Product, type Order, type OrderStatus,
  type Transfer, type TransferStatus,
} from "@/lib/manager-data";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { getProfilePic, subscribeProfilePic } from "@/lib/profile-storage";
import { subscriptionStore, type SubscriptionRequest } from "@/lib/subscription-data";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/manager")({
  component: ManagerApp,
  head: () => ({ meta: [{ title: "Manager Dashboard — Stockyard" }] }),
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

function ManagerLayout() {
  const routerState = useRouterState();
  const isSlugRoute = routerState.matches.some(m => m.routeId === '/$slug' || m.routeId === '/manager/$slug');
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
        "flex h-full flex-col border-r border-white/10 bg-navy-light text-cream backdrop-blur-xl transition-all duration-300",
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
              <img src={avatar} alt="me" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs font-bold text-cream">
                {session?.full_name?.[0] ?? "M"}
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 text-xs leading-tight">
              <p className="truncate font-semibold text-cream">{session?.full_name ?? "Manager"}</p>
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
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full">
      <div className="fixed inset-y-0 left-0 z-30 hidden md:block">{sidebar}</div>
      <div className={cn("flex-1 transition-all", collapsed ? "md:pl-[72px]" : "md:pl-64")}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-navy/70 px-4 py-3 backdrop-blur md:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-cream md:hidden hover:bg-cream/10">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-3">
            <div className="hidden md:block">
              <p className="text-xs uppercase tracking-wider text-cream/60">{t("warehouse.name")}</p>
              <p className="text-sm font-semibold text-cream">{t("manager.login.title")}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-cream">
              <div className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-accent text-foreground text-xs font-semibold">
                {avatar ? <img src={avatar} alt="me" className="h-full w-full object-cover" /> : (session?.full_name?.[0] ?? "M")}
              </div>
              <div className="hidden text-xs leading-tight sm:block">
                <p className="font-medium">{session?.full_name ?? "Manager"}</p>
                <p className="text-cream/60">Manager</p>
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
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionId>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // shared state
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers);

  type Session = { whmId: string; name: string; warehouseId?: string; isFirstLogin?: boolean };
  const [user, setUser] = useState<Session | null>(null);
  const [firstLoginOpen, setFirstLoginOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    setAvatar(getProfilePic("manager"));
    return subscribeProfilePic("manager", setAvatar);
  }, []);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("stockyard.manager") : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      setUser({ whmId: parsed.whmId ?? parsed.id?.toString?.() ?? "WHM-000", name: parsed.name ?? parsed.full_name });
      if (parsed.isFirstLogin) setFirstLoginOpen(true);
    } else {
      setUser({ whmId: "WHM-000", name: "Avery Lin" });
    }
  }, []);

  const completeFirstLogin = (newPw: string) => {
    if (!user) return;
    const overridesRaw = localStorage.getItem("stockyard.manager.overrides");
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    overrides[user.whmId] = { password: newPw, isTempPassword: false, lastPasswordChange: new Date().toISOString().slice(0, 10) };
    localStorage.setItem("stockyard.manager.overrides", JSON.stringify(overrides));
    const updated = { ...user, isFirstLogin: false };
    localStorage.setItem("stockyard.manager", JSON.stringify(updated));
    setUser(updated);
    setFirstLoginOpen(false);
    toast.success("Password changed successfully");
  };

  const logout = () => {
    localStorage.removeItem("stockyard.manager");
    toast.success("Signed out");
    navigate({ to: "/manager-login" });
  };

  const sidebar = (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-white/10 bg-navy-light text-cream backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
      )}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="grid size-8 place-items-center rounded-xl bg-accent/30 text-accent-foreground">
          <WarehouseIcon className="h-4 w-4" />
        </div>
        {!collapsed && <span className="text-base font-semibold tracking-tight">Stockyard</span>}
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
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User block */}
      <div className="border-t border-white/10 p-3">
        <div className={cn("flex items-center gap-3 rounded-xl bg-white/5 p-2", collapsed && "justify-center")}>
          <div className="size-9 overflow-hidden rounded-full bg-accent/30 ring-1 ring-white/20">
            {avatar ? (
              <img src={avatar} alt="me" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs font-bold text-cream">
                {user?.name?.[0] ?? "M"}
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 text-xs leading-tight">
              <p className="truncate font-semibold text-cream">{user?.name ?? "Manager"}</p>
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
          {!collapsed && <span>Sign out</span>}
        </Button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex w-full items-center justify-center rounded-lg border border-white/10 py-2 text-cream/70 hover:bg-white/10"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );


  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden md:block">{sidebar}</div>

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
      <main className={cn("flex-1 transition-all", collapsed ? "md:pl-[72px]" : "md:pl-64")}>
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
              <p className="text-xs uppercase tracking-wider text-cream/60">Warehouse</p>
              <p className="text-sm font-semibold text-cream">{CURRENT_WAREHOUSE.name}</p>
            </div>
            <div className="ml-auto hidden max-w-sm flex-1 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-cream/80 ring-1 ring-white/10 sm:flex">
              <Search className="h-4 w-4" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-cream/50" placeholder="Search…" />
            </div>
            <Button variant="ghost" size="icon" className="text-cream hover:bg-cream/10">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="hidden items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-cream sm:flex">
              <div className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-accent text-foreground text-xs font-semibold">
                {avatar ? <img src={avatar} alt="me" className="h-full w-full object-cover" /> : (user?.name?.[0] ?? "M")}
              </div>
              <div className="text-xs leading-tight">
                <p className="font-medium">{user?.name ?? "Manager"}</p>
                <p className="text-cream/60">Manager</p>
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
                <WorkersSection workers={workers} setWorkers={setWorkers} />
              )}
              {section === "inventory" && (
                <InventorySection products={products} setProducts={setProducts} />
              )}
              {section === "orders" && (
                <OrdersSection orders={orders} setOrders={setOrders} workers={workers} />
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
                <SettingsSection user={user} whmId={user.whmId} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <FirstLoginDialog open={firstLoginOpen} onComplete={completeFirstLogin} />
    </div>
  );
}

function FirstLoginDialog({ open, onComplete }: { open: boolean; onComplete: (newPw: string) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (next !== confirm) { toast.error("Passwords do not match"); return; }
    if (!current) { toast.error("Enter your current temporary password"); return; }
    onComplete(next);
    setCurrent(""); setNext(""); setConfirm("");
  };
  return (
    <Dialog open={open} onOpenChange={() => { /* blocking */ }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set a new password</DialogTitle>
          <DialogDescription>
            You are using a temporary password set by the General Manager. Please choose a new password to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2"><Label>Current (temporary) password</Label><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></div>
          <div className="space-y-2"><Label>New password</Label><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Confirm new password</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
          <DialogFooter>
            <Button type="submit" className="w-full">Change password & continue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

function Overview({ workers, products, orders }: { workers: Worker[]; products: Product[]; orders: Order[] }) {
  const totalWorkers = workers.length;
  const inventoryValue = products.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const completedToday = orders.filter((o) => o.status === "Delivered" || o.status === "Shipped").length;
  const lowStock = products.filter((p) => p.quantity < p.reorderLevel);

  const cards = [
    { label: "Total Workers", value: totalWorkers, icon: Users, accent: "from-sky-400/30 to-sky-500/10" },
    { label: "Inventory Value", value: `$${inventoryValue.toLocaleString()}`, icon: Boxes, accent: "from-emerald-400/30 to-emerald-500/10" },
    { label: "Pending Orders", value: pendingOrders, icon: ClipboardList, accent: "from-amber-400/30 to-amber-500/10" },
    { label: "Shipments Today", value: completedToday, icon: Truck, accent: "from-indigo-400/30 to-indigo-500/10" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Welcome back · ${CURRENT_WAREHOUSE.name}`}
        desc="Here is what's happening across your warehouse today."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <GlassCard key={c.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-cream/60">{c.label}</p>
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
            <h3 className="text-sm font-semibold text-cream">Daily volume (last 14 days)</h3>
            <Badge variant="outline" className="border-white/20 text-cream/80">Incoming vs Outgoing</Badge>
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
            <h3 className="text-sm font-semibold text-cream">Low stock alerts</h3>
            <AlertTriangle className="h-4 w-4 text-amber-300" />
          </div>
          <div className="space-y-3">
            {lowStock.length === 0 && (
              <p className="text-sm text-cream/60">All items above reorder level.</p>
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

function WorkersSection({ workers, setWorkers }: { workers: Worker[]; setWorkers: React.Dispatch<React.SetStateAction<Worker[]>> }) {
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
    toast.success(`${selected.size} worker(s) ${status === "active" ? "activated" : "deactivated"}`);
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
    toast.success("Worker deleted");
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Workers" desc="Manage workers assigned to your warehouse.">
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add worker</Button>
      </SectionHeader>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/60" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email or ID"
              className="border-white/15 bg-white/5 pl-9 text-cream placeholder:text-cream/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] border-white/15 bg-white/5 text-cream"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[160px] border-white/15 bg-white/5 text-cream"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              <SelectItem value="Receiving">Receiving</SelectItem>
              <SelectItem value="Picking">Picking</SelectItem>
              <SelectItem value="Packing">Packing</SelectItem>
              <SelectItem value="Shipping">Shipping</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={!selected.size} onClick={() => bulkSet("active")}>Activate</Button>
            <Button size="sm" variant="outline" disabled={!selected.size} onClick={() => bulkSet("suspended")}>Deactivate</Button>
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
                <TableHead className="text-cream/70">Worker</TableHead>
                <TableHead className="text-cream/70">Worker ID</TableHead>
                <TableHead className="text-cream/70">Section</TableHead>
                <TableHead className="text-cream/70">Status</TableHead>
                <TableHead className="text-cream/70">Last active</TableHead>
                <TableHead className="text-right text-cream/70">Actions</TableHead>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-cream/60">Active</span>
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
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-cream/60">No workers match your filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      <AddWorkerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(w) => setWorkers((prev) => [w, ...prev])}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete worker?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddWorkerDialog({
  open, onOpenChange, onAdd,
}: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (w: Worker) => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", section: "Receiving" as WorkerSection });
  const submit = () => {
    if (!form.name || !form.email || !form.phone) {
      toast.error("Please complete all fields");
      return;
    }
    const wid = generateWorkerId();
    onAdd({
      id: crypto.randomUUID(),
      workerId: wid,
      name: form.name,
      email: form.email,
      phone: form.phone,
      section: form.section,
      status: "pending",
      lastActive: "—",
      ordersProcessed: 0,
      avgHandlingMin: 0,
    });
    toast.success(`Worker added · ID ${wid}`);
    setForm({ name: "", email: "", phone: "", section: "Receiving" });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add worker</DialogTitle>
          <DialogDescription>Worker ID will be generated automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v as WorkerSection })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Receiving">Receiving</SelectItem>
                <SelectItem value="Picking">Picking</SelectItem>
                <SelectItem value="Packing">Packing</SelectItem>
                <SelectItem value="Shipping">Shipping</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add worker</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Inventory ---------- */

function InventorySection({ products, setProducts }: { products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>> }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [delta, setDelta] = useState(0);
  const lowStock = products.filter((p) => p.quantity < p.reorderLevel);

  const apply = () => {
    if (!editing) return;
    setProducts((prev) => prev.map((p) => (p.id === editing.id ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p)));
    toast.success(`Stock updated for ${editing.sku}`);
    setEditing(null); setDelta(0);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Inventory" desc={`Real-time stock for ${CURRENT_WAREHOUSE.name}.`}>
        <Button variant="outline" className="border-white/20 text-cream hover:bg-white/10">
          <QrCode className="h-4 w-4" /> Scan barcode
        </Button>
      </SectionHeader>

      {lowStock.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-medium">Low stock alert · {lowStock.length} item(s) below reorder level</p>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-4">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-cream/70">Product</TableHead>
                <TableHead className="text-cream/70">SKU</TableHead>
                <TableHead className="text-cream/70">Quantity</TableHead>
                <TableHead className="text-cream/70">Location</TableHead>
                <TableHead className="text-cream/70">Reorder</TableHead>
                <TableHead className="text-cream/70">Status</TableHead>
                <TableHead className="text-right text-cream/70">Action</TableHead>
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
                        {low ? "Low" : "OK"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={() => { setEditing(p); setDelta(0); }}>
                        Update stock
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
        <h3 className="mb-3 text-sm font-semibold text-cream">Stock movement history</h3>
        <div className="space-y-2">
          {initialMovements.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm text-cream">
              <div className="flex items-center gap-3">
                {m.type === "incoming"
                  ? <ArrowDownRight className="h-4 w-4 text-emerald-300" />
                  : <ArrowUpRight className="h-4 w-4 text-rose-300" />}
                <div>
                  <p className="font-medium">{m.sku} · {m.qty} units</p>
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
            <DialogTitle>Update stock — {editing?.sku}</DialogTitle>
            <DialogDescription>Current quantity: {editing?.quantity}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Adjustment (+/-)</Label>
            <Input type="number" value={delta} onChange={(e) => setDelta(parseInt(e.target.value || "0", 10))} />
            <p className="text-xs text-muted-foreground">New quantity: {(editing?.quantity ?? 0) + delta}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={apply}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Orders ---------- */

const ORDER_TABS: OrderStatus[] = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

function OrdersSection({ orders, setOrders, workers }: { orders: Order[]; setOrders: React.Dispatch<React.SetStateAction<Order[]>>; workers: Worker[] }) {
  const [tab, setTab] = useState<OrderStatus>("Pending");
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const list = orders.filter((o) => o.status === tab);

  const updateStatus = (id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success(`Order ${id} → ${status}`);
  };
  const assign = (id: string, workerId: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, assignedTo: workerId } : o)));
    toast.success(`Assigned to ${workerId}`);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Orders" desc={`Orders for ${CURRENT_WAREHOUSE.name}.`} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as OrderStatus)}>
        <TabsList className="bg-white/10 text-cream">
          {ORDER_TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="data-[state=active]:bg-cream data-[state=active]:text-foreground">
              {s} ({orders.filter((o) => o.status === s).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <GlassCard className="p-4">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-cream/70">Order</TableHead>
                <TableHead className="text-cream/70">Customer</TableHead>
                <TableHead className="text-cream/70">Items</TableHead>
                <TableHead className="text-cream/70">Total</TableHead>
                <TableHead className="text-cream/70">Assigned</TableHead>
                <TableHead className="text-right text-cream/70">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((o) => (
                <TableRow key={o.id} className="border-white/10 text-cream hover:bg-white/5">
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell>{o.items} ({o.qty} units)</TableCell>
                  <TableCell>${o.total.toLocaleString()}</TableCell>
                  <TableCell className="text-cream/70">{o.assignedTo ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v as OrderStatus)}>
                        <SelectTrigger className="h-8 w-[130px] border-white/15 bg-white/5 text-xs text-cream"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ORDER_TABS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={() => setOpenOrder(o)}>Details</Button>
                      <Button size="sm" variant="ghost" className="text-rose-300 hover:bg-rose-500/10" onClick={() => setCancelId(o.id)}>Cancel</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-cream/60">No orders in {tab}.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      <Dialog open={!!openOrder} onOpenChange={(o) => !o && setOpenOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order {openOrder?.id}</DialogTitle>
            <DialogDescription>Created {openOrder?.createdAt}</DialogDescription>
          </DialogHeader>
          {openOrder && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{openOrder.customer}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{openOrder.items} ({openOrder.qty} units)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">${openOrder.total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{openOrder.status}</Badge></div>
              <div className="space-y-2 pt-2">
                <Label>Assign to worker</Label>
                <Select value={openOrder.assignedTo} onValueChange={(v) => { assign(openOrder.id, v); setOpenOrder({ ...openOrder, assignedTo: v }); }}>
                  <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
                  <SelectContent>
                    {workers.filter((w) => w.status === "active").map((w) => (
                      <SelectItem key={w.id} value={w.workerId}>{w.name} ({w.workerId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the order as Cancelled.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (cancelId) updateStatus(cancelId, "Cancelled"); setCancelId(null); }}>
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Transfers ---------- */

function TransfersSection({ transfers, setTransfers, products }: { transfers: Transfer[]; setTransfers: React.Dispatch<React.SetStateAction<Transfer[]>>; products: Product[] }) {
  const [open, setOpen] = useState(false);
  const outgoing = transfers.filter((t) => t.direction === "outgoing");
  const incoming = transfers.filter((t) => t.direction === "incoming");

  const setStatus = (id: string, status: TransferStatus) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    toast.success(`Transfer ${id} → ${status}`);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Transfers" desc="Request large transfers from other warehouses.">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New transfer request</Button>
      </SectionHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TransferList title="Pending requests sent" items={outgoing} onSet={setStatus} canAct={false} />
        <TransferList title="Received requests" items={incoming} onSet={setStatus} canAct />
      </div>

      <GlassCard className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-cream">Transfer history</h3>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-cream/70">ID</TableHead>
                <TableHead className="text-cream/70">Direction</TableHead>
                <TableHead className="text-cream/70">From / To</TableHead>
                <TableHead className="text-cream/70">Product</TableHead>
                <TableHead className="text-cream/70">Qty</TableHead>
                <TableHead className="text-cream/70">Priority</TableHead>
                <TableHead className="text-cream/70">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => (
                <TableRow key={t.id} className="border-white/10 text-cream hover:bg-white/5">
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell className="capitalize">{t.direction}</TableCell>
                  <TableCell className="text-cream/70">{t.fromWarehouse} → {t.toWarehouse}</TableCell>
                  <TableCell>{t.product}</TableCell>
                  <TableCell>{t.qty}</TableCell>
                  <TableCell><Badge variant="outline" className="border-white/20 text-cream/90">{t.priority}</Badge></TableCell>
                  <TableCell><Badge className={cn("border", statusBadge(t.status))}>{t.status}</Badge></TableCell>
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
  return (
    <GlassCard className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-cream">{title}</h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-cream/60">No transfers.</p>}
        {items.map((t) => (
          <div key={t.id} className="rounded-xl bg-white/5 p-3 text-sm text-cream">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{t.product} · {t.qty} units</p>
                <p className="text-xs text-cream/60">{t.fromWarehouse} → {t.toWarehouse}</p>
              </div>
              <Badge className={cn("border", statusBadge(t.status))}>{t.status}</Badge>
            </div>
            {canAct && t.status === "Pending Approval" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => onSet(t.id, "Approved")}>Approve</Button>
                <Button size="sm" variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={() => onSet(t.id, "Rejected")}>Reject</Button>
              </div>
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
      toast.success("Transfer request submitted");
      setLoading(false);
      onOpenChange(false);
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New transfer request</DialogTitle>
          <DialogDescription>Place a large order to another warehouse.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Source warehouse</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {otherWarehouses.map((w) => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={form.product} onValueChange={(v) => setForm({ ...form, product: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value || "0", 10) })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Transfer["priority"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Internal notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Statistics ---------- */

function StatisticsSection({ workers }: { workers: Worker[] }) {
  const productivity = workers
    .filter((w) => w.status === "active")
    .map((w) => ({ name: w.name.split(" ")[0], orders: w.ordersProcessed, avg: w.avgHandlingMin }));

  const heatMax = Math.max(...peakHours.map((p) => p.activity));

  return (
    <div className="space-y-6">
      <SectionHeader title="Statistics" desc="Productivity and operational analytics.">
        <Button variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={() => toast.success("Exported PDF (demo)") }>
          <Download className="h-4 w-4" /> Export PDF
        </Button>
        <Button variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={() => toast.success("Exported CSV (demo)") }>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </SectionHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-cream">Worker productivity</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={productivity}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ background: "#1D2D44", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#F0EBD8" }} />
                <Legend />
                <Bar dataKey="orders" name="Orders" fill="#A7B3C3" radius={[6,6,0,0]} />
                <Bar dataKey="avg" name="Avg min" fill="#F0EBD8" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-cream">Monthly volume</h3>
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
          <h3 className="mb-3 text-sm font-semibold text-cream">Worker attendance (this week)</h3>
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
          <h3 className="mb-3 text-sm font-semibold text-cream">Peak hours activity</h3>
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
                  <TooltipContent>{h.hour} · {h.activity} actions</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-cream/60">Brighter cells indicate higher activity volume.</p>
        </GlassCard>
      </div>
    </div>
  );
}

/* ---------- Reports ---------- */

function ReportsSection() {
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
      toast.success(`${type} ready (${format})`);
    }, 900);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Reports" desc="Generate, preview, and schedule reports." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-cream">Generate report</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-cream/80">Report type</Label>
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
              <Label className="text-cream/80">Format</Label>
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
              <Label className="text-cream/80">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border-white/15 bg-white/5 text-cream" />
            </div>
            <div className="space-y-2">
              <Label className="text-cream/80">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border-white/15 bg-white/5 text-cream" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate report
            </Button>
            <Button variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={() => toast.success("Schedule saved (demo)")}>
              Schedule weekly
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-cream">Saved reports</h3>
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
            <DialogTitle>{type} preview</DialogTitle>
            <DialogDescription>{from} → {to} · {format}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted p-6 text-sm">
            <h4 className="mb-2 font-semibold">{CURRENT_WAREHOUSE.name}</h4>
            <p className="text-muted-foreground">This is a demo preview of the {type.toLowerCase()} for the selected period. In production this would render the full report.</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-background p-3"><p className="text-muted-foreground">Records</p><p className="text-lg font-semibold">312</p></div>
              <div className="rounded-lg bg-background p-3"><p className="text-muted-foreground">Total volume</p><p className="text-lg font-semibold">8,420</p></div>
              <div className="rounded-lg bg-background p-3"><p className="text-muted-foreground">Net change</p><p className="text-lg font-semibold">+12.4%</p></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(false)}>Close</Button>
            <Button onClick={() => { toast.success("Download started"); setPreview(false); }}><Download className="h-4 w-4" /> Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Settings ---------- */

function SettingsSection({ user, whmId }: { user: { name: string; whmId: string }; whmId: string }) {
  const [form, setForm] = useState({ name: user.name, phone: "+1 415 555 0101" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [twoFA, setTwoFA] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const saveProfile = () => {
    toast.success("Profile saved");
  };

  const changePw = () => {
    if (!pw.current) { toast.error("Enter your current password"); return; }
    if (pw.next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (pw.next !== pw.confirm) { toast.error("New passwords do not match"); return; }
    const overridesRaw = localStorage.getItem("stockyard.manager.overrides");
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    overrides[whmId] = { password: pw.next, isTempPassword: false, lastPasswordChange: new Date().toISOString().slice(0, 10) };
    localStorage.setItem("stockyard.manager.overrides", JSON.stringify(overrides));
    setPw({ current: "", next: "", confirm: "" });
    toast.success("Password changed successfully");
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Profile & Settings" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-cream">Profile picture</h3>
          <ProfilePictureUpload role="manager" fallback={user.name?.[0] ?? "M"} />
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-cream">Profile</h3>
          <div className="space-y-3">
            <div className="space-y-2"><Label className="text-cream/80">Manager ID</Label><Input className="border-white/15 bg-white/5 text-cream font-mono" value={whmId} readOnly /></div>
            <div className="space-y-2"><Label className="text-cream/80">Name (username)</Label><Input className="border-white/15 bg-white/5 text-cream" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-cream/80">Phone</Label><Input className="border-white/15 bg-white/5 text-cream" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <Button onClick={saveProfile}>Save profile</Button>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-cream">Change password</h3>
          <div className="space-y-3">
            <div className="space-y-2"><Label className="text-cream/80">Current password</Label><Input type="password" className="border-white/15 bg-white/5 text-cream" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-cream/80">New password</Label><Input type="password" className="border-white/15 bg-white/5 text-cream" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-cream/80">Confirm new password</Label><Input type="password" className="border-white/15 bg-white/5 text-cream" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
            <Button onClick={changePw}>Change password</Button>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div>
                <p className="text-sm font-medium text-cream">Two-factor authentication</p>
                <p className="text-xs text-cream/60">Adds an extra step at sign-in</p>
              </div>
              <Switch checked={twoFA} onCheckedChange={(v) => { setTwoFA(v); toast.success(v ? "2FA enabled (demo)" : "2FA disabled"); }} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-cream">Notifications</h3>
          <div className="space-y-3">
            <SettingRow label="Email · low stock & new orders" checked={emailNotif} onCheckedChange={setEmailNotif} />
            <SettingRow label="SMS · critical alerts only" checked={smsNotif} onCheckedChange={setSmsNotif} />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-cream">Appearance</h3>
          <SettingRow label="Dark theme" checked={dark} onCheckedChange={setDark} />
          <p className="mt-2 text-xs text-cream/60">Toggles between cream and navy themes built from the brand palette.</p>
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
        <SectionHeader title="Wallet" />
        <Button onClick={() => setOpen(true)} className="bg-accent text-foreground hover:bg-accent/80">
          <Sparkles className="size-4" /> Upgrade plan
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-white/5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subs">My Subscriptions</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2 p-5">
            <p className="text-xs uppercase tracking-wider text-cream/60">Plan balance</p>
            <p className="mt-2 text-4xl font-bold text-cream">$1,240.00</p>
            <p className="mt-1 text-xs text-cream/60">Demo wallet</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline"><CreditCard className="size-4" /> Manage cards</Button>
              <Button variant="outline" onClick={() => setTab("subs")}><WalletIcon className="size-4" /> Subscriptions</Button>
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs uppercase tracking-wider text-cream/60">Pending requests</p>
            <p className="mt-2 text-3xl font-bold text-cream">{subs.filter((s) => s.status === "pending").length}</p>
            <p className="mt-1 text-xs text-cream/60">Awaiting admin approval</p>
          </GlassCard>
        </div>
      )}

      {tab === "subs" && (
        <GlassCard className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-cream/70">Company</TableHead>
                <TableHead className="text-cream/70">Warehouses</TableHead>
                <TableHead className="text-cream/70">Slok URL</TableHead>
                <TableHead className="text-cream/70">Request date</TableHead>
                <TableHead className="text-cream/70">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-cream/60">No subscription requests yet.</TableCell></TableRow>
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
