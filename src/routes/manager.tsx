import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Boxes, ClipboardList, BarChart3, FileText,
  Settings as SettingsIcon, ArrowLeftRight, LogOut, Menu, Search,
  Plus, Trash2, QrCode, AlertTriangle,
  Truck, Download, Loader2, ChevronLeft, ChevronRight,
  Warehouse as WarehouseIcon, Wallet as WalletIcon, Sparkles, CreditCard,
  RefreshCw, Fingerprint,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, BarChart, Bar, Legend, LineChart, Line,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/AppLogo";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { getProfilePic, subscribeProfilePic } from "@/lib/profile-storage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fetchMe, fetchManagerEmployees, fetchManagerOrders, createManagerWorker, deleteManagerEmployee, updateManagerEmployee, fetchSections, fetchManagerProducts, fetchManagerWarehouse, fetchManagerShipments, fetchInventoryMovements, type ManagerEmployee, type ManagerOrder, type Section, type ManagerProduct, type ManagerShipment, type InventoryMovement } from "@/lib/manager-api";
import { api, getCsrfCookie } from "@/lib/api";
import { WarehouseLayout } from "@/components/WarehouseLayout";
import { CredentialsDialog } from "@/components/CredentialsDialog";
import { useTransferRequests } from "@/hooks/useTransferRequests";
import { AvailableRequestsFeed } from "@/components/transfer/AvailableRequestsFeed";
import { MyWarehouseRequests } from "@/components/transfer/MyWarehouseRequests";
import { ManagerBiometricSection } from "@/components/ManagerBiometricSection";
import { ShipmentsSection } from "@/components/ShipmentsSection";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { normalizePhoneNumber } from "@/lib/phone";

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
  | "overview" | "layout" | "workers" | "biometric" | "inventory" | "shipments" | "orders" | "transfers"
  | "statistics" | "reports" | "wallet" | "settings";

const NAV: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "sidebar.dashboard", icon: LayoutDashboard },
  { id: "layout", label: "sidebar.layout", icon: WarehouseIcon },
  { id: "workers", label: "sidebar.workers", icon: Users },
  { id: "biometric", label: "biometric.title", icon: Fingerprint },
  { id: "inventory", label: "sidebar.inventory", icon: Boxes },
  { id: "shipments", label: "sidebar.shipments", icon: Truck },
  { id: "orders", label: "sidebar.orders", icon: ClipboardList },
  { id: "transfers", label: "sidebar.transfers", icon: ArrowLeftRight },
  { id: "statistics", label: "sidebar.statistics", icon: BarChart3 },
  { id: "reports", label: "sidebar.reports", icon: FileText },
  { id: "wallet", label: "sidebar.wallet", icon: WalletIcon },
  { id: "settings", label: "sidebar.settings", icon: SettingsIcon },
];

type Worker = {
  id: string;
  workerId: string;
  name: string;
  email: string;
  phone: string;
  section: string;
  status: string;
  lastActive: string;
  ordersProcessed: number;
  avgHandlingMin: number;
};

type Product = {
  id: number;
  name: string;
  quantity: number;
  reorderLevel: number;
};

type StoredManagerSession = {
  id?: number;
  full_name?: string;
  name?: string;
  whmId?: string;
  phone_number?: string;
  warehouse_id?: number | null;
  owner_id?: number;
  must_change_password?: boolean;
  tenant?: {
    url_slug?: string;
    company_name?: string;
    warehouses_count?: number;
    status?: string;
    subscription_start_date?: string | null;
    subscription_end_date?: string | null;
    subscription_plan?: {
      name?: string;
      duration_days?: number;
      price_per_warehouse?: string;
      is_active?: boolean;
    } | null;
  };
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
        <AppLogo className="size-8" />
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
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<ManagerOrder[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [layoutProducts, setLayoutProducts] = useState<ManagerProduct[]>([]);
  const [warehouse, setWarehouse] = useState<{ id: number; name: string; type: string; location: string } | null>(null);
  const [shipments, setShipments] = useState<ManagerShipment[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  type Session = { whmId: string; name: string; warehouseId?: string; ownerId?: number };
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
      ownerId: parsed.owner_id,
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
      setSections([]);
      setLayoutProducts([]);
      setProducts([]);
      setMovements([]);
      setWarehouse(null);
      return;
    }
    let cancel = false;
    Promise.all([
      fetchSections(slug).catch(() => ({ sections: [] as Section[] })),
      fetchManagerProducts(slug).catch(() => ({ products: [] as ManagerProduct[] })),
      fetchManagerShipments(slug).catch(() => ({ shipments: [] as ManagerShipment[] })),
      fetchInventoryMovements(slug, { warehouse_id: Number(user.warehouseId), per_page: 20 }).catch(() => ({ inventory_movements: [] as InventoryMovement[], meta: undefined })),
      fetchManagerWarehouse(slug).catch(() => ({ warehouse: null })),
    ]).then(([secRes, prodRes, shipRes, movRes, whRes]) => {
      if (cancel) return;
      setSections(secRes.sections);
      setLayoutProducts(prodRes.products);
      setShipments(shipRes.shipments);
      const src = whRes.warehouse || shipRes.shipments[0]?.warehouse || movRes.inventory_movements[0]?.warehouse || null;
      if (src) {
        setWarehouse({
          id: src.id,
          name: src.warehouse_name,
          type: "type" in src ? (src as { type?: string }).type ?? "" : "",
          location: "location" in src ? (src as { location?: string }).location ?? "" : "",
        });
      } else {
        setWarehouse(null);
      }
    });
    return () => { cancel = true; };
  }, [slug, user?.warehouseId]);

  useEffect(() => {
    if (!slug || !user?.warehouseId) {
      setWorkers([]);
      return;
    }
    fetchManagerEmployees(slug, Number(user.warehouseId))
      .then(({ employees }) => setWorkers(employees.filter((e) => e.role !== "manager").map(workerFromBackendEmployee)))
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

  const orderWarehouseName = orders.find((o) => o.warehouse?.warehouse_name)?.warehouse?.warehouse_name;
  const warehouseName = warehouse?.name || orderWarehouseName || "";

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
        <AppLogo className="size-8" />
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
<p className="text-sm font-semibold text-cream">{warehouseName}{warehouse?.type ? ` · ${warehouse.type}` : ""}</p>
            </div>
            <div className="ms-auto hidden max-w-sm flex-1 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-cream/80 ring-1 ring-white/10 sm:flex">
              <Search className="h-4 w-4" />
              <input className="w-full bg-transparent text-sm outline-none placeholder:text-cream/50" placeholder={t("placeholder.search")} />
            </div>
            <NotificationsBell slug={slug} onTransferOpen={() => { setSection("transfers"); setMobileOpen(false); }} />
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
              {section === "layout" && slug && (
                <WarehouseLayout
                  slug={slug}
                  sections={sections}
                  setSections={setSections}
                  products={layoutProducts}
                  warehouse={warehouse}
                />
              )}
              {section === "overview" && (
                <Overview workers={workers} products={products} orders={orders} warehouseName={warehouseName} />
              )}
              {section === "workers" && (
                <WorkersSection
                  workers={workers}
                  setWorkers={setWorkers}
                  slug={slug}
                  warehouseId={user?.warehouseId ? Number(user.warehouseId) : null}
                />
              )}
              {section === "biometric" && slug && user?.warehouseId && (
                <ManagerBiometricSection slug={slug} warehouseId={Number(user.warehouseId)} />
              )}
              {section === "inventory" && (
                <InventorySection products={products} setProducts={setProducts} warehouseName={warehouseName} />
              )}
              {section === "shipments" && slug && (
                <ShipmentsSection slug={slug} shipments={shipments} setShipments={setShipments} />
              )}
              {section === "orders" && (
                <OrdersSection orders={orders} onRefresh={loadOrders} warehouseName={warehouseName} />
              )}
              {section === "transfers" && slug && user?.warehouseId && (
                <TransfersSection
                  slug={slug}
                  ownerId={user.ownerId}
                  warehouseId={Number(user.warehouseId)}
                  products={layoutProducts}
                />
              )}
              {section === "statistics" && <StatisticsSection workers={workers} />}
{section === "reports" && <ReportsSection slug={slug} />}
              {section === "wallet" && user && (
                <WalletSection user={user} />
              )}
              {section === "settings" && user && (
                <SettingsSection user={user} slug={slug} phone={phoneNumber} />
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

function Overview({ workers, products, orders, warehouseName }: { workers: Worker[]; products: Product[]; orders: ManagerOrder[]; warehouseName: string }) {
  const { t } = useTranslation();
  const totalWorkers = workers.length;
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const shippedToday = orders.filter((o) => o.status === "shipped" || o.status === "delivered").length;
  const lowStock = products.filter((p) => p.quantity < p.reorderLevel);

  const orderByStatus = ["pending", "approved", "in_preparation", "shipped", "delivered", "rejected", "cancelled"].map((s) => ({
    name: t(`order.status.${s}`),
    count: orders.filter((o) => o.status === s).length,
  }));

  const cards = [
    { label: "manager.total_workers", value: totalWorkers, icon: Users, accent: "from-sky-400/30 to-sky-500/10" },
    { label: "manager.inventory_value", value: totalUnits.toLocaleString(), icon: Boxes, accent: "from-emerald-400/30 to-emerald-500/10" },
    { label: "manager.pending_orders", value: pendingOrders, icon: ClipboardList, accent: "from-amber-400/30 to-amber-500/10" },
    { label: "manager.shipments_today", value: shippedToday, icon: Truck, accent: "from-indigo-400/30 to-indigo-500/10" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("manager.welcome_back", { name: warehouseName })}
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
            <h3 className="text-sm font-semibold text-cream">{t("order.title")}</h3>
            <Badge variant="outline" className="border-white/20 text-cream/80">{orders.length}</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={orderByStatus}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#F0EBD8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#F0EBD8" tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip contentStyle={{ background: "#1D2D44", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#F0EBD8" }} />
                <Bar dataKey="count" name={t("order.title")} fill="#A7B3C3" radius={[6, 6, 0, 0]} />
              </BarChart>
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
                  <p className="text-xs text-cream/60">{t("inventory.quantity")}: {p.quantity}</p>
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
  const [deleting, setDeleting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ user_name: string; password: string } | null>(null);

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

  const bulkSet = async (status: "active" | "suspended") => {
    if (selected.size === 0) return;
    if (!slug || !warehouseId) {
      toast.error(t("worker.save_failed"));
      return;
    }
    const busy = status === "suspended";
    const targets = workers.filter((w) => selected.has(w.id));
    const results = await Promise.allSettled(
      targets.map((w) => updateManagerEmployee(slug, warehouseId, Number(w.id), { status: busy ? "busy" : "available" })),
    );
    const updated = new Map<number, Worker>();
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        updated.set(Number(targets[i].id), workerFromBackendEmployee(r.value.employee));
      }
    });
    setWorkers((prev) => prev.map((w) => updated.get(Number(w.id)) ?? w));
    setSelected(new Set());
    toast.success(t(status === "active" ? "manager.workers_activated" : "manager.workers_deactivated", { count: updated.size }));
  };

  const toggleStatus = async (id: string) => {
    if (!slug || !warehouseId) return;
    const w = workers.find((x) => x.id === id);
    if (!w) return;
    const nextStatus = w.status === "active" ? "busy" : "available";
    try {
      const res = await updateManagerEmployee(slug, warehouseId, Number(id), { status: nextStatus });
      setWorkers((prev) => prev.map((x) => (x.id === String(res.employee.id) ? workerFromBackendEmployee(res.employee) : x)));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("worker.save_failed"));
    }
  };

  const remove = async (id: string) => {
    if (!slug || !warehouseId) {
      toast.error(t("worker.save_failed"));
      setDeleteId(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteManagerEmployee(slug, warehouseId, Number(id));
      setWorkers((prev) => prev.filter((w) => w.id !== id));
      toast.success(t("worker.deleted"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("worker.delete_failed"));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
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
                    <Badge className={cn("border", statusBadge(w.status))}>{t(`worker.status.${w.status}`)}</Badge>
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
        onCreated={(worker, password) => setCreatedCreds({ user_name: worker.system_user.user_name, password: password ?? "" })}
        slug={slug}
        warehouseId={warehouseId}
      />

      <CredentialsDialog
        open={!!createdCreds}
        onOpenChange={(o) => !o && setCreatedCreds(null)}
        userName={createdCreds?.user_name ?? ""}
        password={createdCreds?.password ?? ""}
        title={t("worker.credentials.title")}
        description={t("worker.credentials.desc")}
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
  disabled={deleting}
>
  {t("common.cancel")}
</AlertDialogCancel>            <AlertDialogAction onClick={() => deleteId && remove(deleteId)} disabled={deleting}>{deleting ? t("common.deleting") : t("common.delete")}</AlertDialogAction>
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
  open, onOpenChange, onAdd, onCreated, slug, warehouseId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (w: Worker) => void;
  onCreated?: (worker: ManagerEmployee, password?: string | null) => void;
  slug: string | null;
  warehouseId: number | null;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<WorkerFormState>(WORKER_FORM_INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const set = (patch: Partial<WorkerFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const maxBirthday = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  };

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone_number.trim() || !form.user_name.trim()) {
      toast.error(t("common.fields_required"));
      return;
    }
    const phone = normalizePhoneNumber(form.phone_number);
    if (!phone.valid) {
      toast.error(t("manager.toast_phone_invalid"));
      return;
    }
    setSubmitting(true);
    try {
      if (slug && warehouseId) {
        const res = await createManagerWorker(slug, warehouseId, {
          full_name: form.full_name.trim(),
          birthday: form.birthday || null,
          phone_number: phone.normalized,
          user_name: form.user_name.trim(),
          role: form.role,
          status: form.status,
          salary: form.salary,
        });
        onAdd(workerFromBackendEmployee(res.employee));
        onCreated?.(res.employee, res.password);
        toast.success(t("worker.created"));
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
                max={maxBirthday()}
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

function InventorySection({ products, setProducts, warehouseName }: { products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>; warehouseName: string }) {
  const { t } = useTranslation();
  const lowStock = products.filter((p) => p.quantity < p.reorderLevel);

  return (
    <div className="space-y-6">
      <SectionHeader title={t("inventory.title")} desc={t("inventory.real_time_desc", { name: warehouseName })}>
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
                <TableHead className="text-cream/70">{t("inventory.quantity")}</TableHead>
                <TableHead className="text-cream/70">{t("inventory.reorder")}</TableHead>
                <TableHead className="text-cream/70">{t("employee.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const low = p.quantity < p.reorderLevel;
                return (
                  <TableRow key={p.id} className="border-white/10 text-cream hover:bg-white/5">
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>{p.reorderLevel}</TableCell>
                    <TableCell>
                      <Badge className={cn("border", low ? "bg-amber-500/20 text-amber-200 border-amber-400/30" : "bg-emerald-500/20 text-emerald-200 border-emerald-400/30")}>
                        {low ? t("inventory.low") : t("inventory.ok")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {products.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-cream/60">{t("inventory.no_products")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-cream">{t("inventory.movement_history")}</h3>
        <p className="text-sm text-cream/60">{t("common.no_data")}</p>
      </GlassCard>
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

const paymentStatusBadge = (s: ManagerOrder["payment_status"]) => {
  const map: Record<ManagerOrder["payment_status"], string> = {
    not_started: "bg-gray-500/15 text-gray-400 border-gray-300/40",
    pending: "bg-amber-500/15 text-amber-400 border-amber-300/40",
    processing: "bg-blue-500/15 text-blue-400 border-blue-300/40",
    paid: "bg-emerald-500/15 text-emerald-400 border-emerald-300/40",
    failed: "bg-rose-500/15 text-rose-400 border-rose-300/40",
    cancelled: "bg-gray-500/15 text-gray-400 border-gray-300/40",
    refunded: "bg-purple-500/15 text-purple-400 border-purple-300/40",
  };
  return map[s] ?? "bg-gray-500/15 text-gray-400 border-gray-300/40";
};

function OrdersSection({ orders, onRefresh, warehouseName }: { orders: ManagerOrder[]; onRefresh: () => void; warehouseName: string }) {
  const { t } = useTranslation();
  const [openOrder, setOpenOrder] = useState<ManagerOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<ManagerOrder["status"] | "all">("all");
  const filtered = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);
  const sorted = [...filtered].sort((a, b) => b.id - a.id);

  return (
    <div className="space-y-6">
      <SectionHeader title={t("order.title")} desc={t("order.desc", { name: warehouseName })}>
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
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition",
            statusFilter === "all"
              ? "border-white/30 bg-white/10 text-cream ring-1 ring-white/20"
              : "border-white/10 text-cream/60 hover:text-cream",
          )}
        >
          {t("order.all")} ({orders.length})
        </button>
        {ORDER_TABS.map((s) => {
          const count = orders.filter((o) => o.status === s).length;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                orderStatusBadge(s),
                active && "ring-1 ring-white/40",
              )}
            >
              {t(`order.status.${s}`)} ({count})
            </button>
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
                <TableHead className="text-cream/70">{t("order.payment")}</TableHead>
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
                  <TableCell>
                    <Badge className={cn("border", paymentStatusBadge(o.payment_status))}>{t(`order.payment_status.${o.payment_status}`)}</Badge>
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
                <TableRow><TableCell colSpan={9} className="py-12 text-center text-cream/60">{t("order.no_orders")}</TableCell></TableRow>
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
                <span className="font-medium text-[#1D2D44]">{t("order.delivery_fee")}</span>
                <span className="text-[#1D2D44]">{formatOrderMoney(openOrder.delivery_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-[#1D2D44]">{t("order.delivery_region")}</span>
                <span className="text-end text-[#1D2D44]">{openOrder.delivery_region ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-[#1D2D44]">{t("order.location")}</span>
                <span className="text-end text-[#1D2D44]">{openOrder.customer_location}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-[#1D2D44]">{t("order.status")}</span>
                <Badge className="bg-[#1D2D44] text-[#eeebdd] hover:bg-[#1D2D44]/90">{t(`order.status.${openOrder.status}`)}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-[#1D2D44]">{t("order.payment")}</span>
                <Badge className={cn("border", paymentStatusBadge(openOrder.payment_status))}>{t(`order.payment_status.${openOrder.payment_status}`)}</Badge>
              </div>
              {openOrder.status === "approved" && openOrder.payment_status !== "paid" && (
                <div className="rounded-lg bg-amber-500/15 border border-amber-300/40 px-3 py-2 text-xs text-amber-500">
                  {t("order.waiting_payment")}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Transfers ---------- */

function TransfersSection({ slug, ownerId, warehouseId, products }: { slug: string; ownerId?: number; warehouseId: number; products: ManagerProduct[] }) {
  const { t } = useTranslation();
  const { available, mine, loading, creating, isAccepting, refresh, acceptRequest, createRequest } =
    useTransferRequests(slug, ownerId, warehouseId);

  return (
    <div className="space-y-6">
      <SectionHeader title={t("transfer_request.title")} desc={t("transfer_request.desc")}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refresh} className="text-cream/80 hover:bg-white/10 hover:text-cream">
            <RefreshCw className="size-3.5 me-1" /> {t("common.refresh")}
          </Button>
        </div>
      </SectionHeader>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-cream">{t("transfer_request.available_title")}</h3>
        <AvailableRequestsFeed requests={available} loading={loading} isAccepting={isAccepting} onAccept={acceptRequest} />
      </div>

      <MyWarehouseRequests requests={mine} loading={loading} products={products} submitting={creating} onCreate={createRequest} />
    </div>
  );
}

/* ---------- Statistics ---------- */

function StatisticsSection({ workers }: { workers: Worker[] }) {
  const { t } = useTranslation();
  const productivity = workers
    .filter((w) => w.status === "active")
    .map((w) => ({ name: w.name.split(" ")[0], orders: w.ordersProcessed, avg: w.avgHandlingMin }));

  const peakHours: { hour: string; activity: number }[] = [];

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
              <BarChart data={[]}>
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
              <LineChart data={[]}>
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

const MANAGER_REPORTS: { key: "orders" | "returns" | "tasks"; label: string; desc: string }[] = [
  { key: "orders", label: "manager.report_orders", desc: "report.orders.desc" },
  { key: "returns", label: "manager.report_returns", desc: "report.returns.desc" },
  { key: "tasks", label: "manager.report_tasks", desc: "report.tasks.desc" },
];

function ReportsSection({ slug }: { slug: string | null }) {
  const { t } = useTranslation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const reportUrl = (report: string, ext: "pdf" | "excel") => {
    const params = new URLSearchParams();
    if (from) params.set("date_from", from);
    if (to) params.set("date_to", to);
    const qs = params.toString();
    return `/${slug}/reports/${report}/${ext}${qs ? `?${qs}` : ""}`;
  };

  const openPdf = (report: string) => {
    window.open(reportUrl(report, "pdf"), "_blank");
  };

  const downloadExcel = async (report: string) => {
    const id = `${report}-excel`;
    setBusy(id);
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

  if (!slug) return null;

  return (
    <div className="space-y-6">
      <SectionHeader title={t("report.title")} desc={t("report.desc")} />

      <GlassCard className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <div className="space-y-2">
            <Label className="text-cream/80">{t("inventory.from")}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border-white/15 bg-white/5 text-cream" />
          </div>
          <div className="space-y-2">
            <Label className="text-cream/80">{t("inventory.to")}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border-white/15 bg-white/5 text-cream" />
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {MANAGER_REPORTS.map((r) => (
          <GlassCard key={r.key} className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-cream">{t(r.label)}</h3>
              <FileText className="h-4 w-4 text-cream/50" />
            </div>
            <p className="mt-1 text-xs text-cream/60">{t(r.desc)}</p>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-white/15 bg-white/5 text-cream hover:bg-white/10"
                onClick={() => downloadExcel(r.key)}
                disabled={busy === `${r.key}-excel`}
              >
                {busy === `${r.key}-excel` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t("report.excel")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-white/15 bg-white/5 text-cream hover:bg-white/10"
                onClick={() => openPdf(r.key)}
              >
                <Download className="h-4 w-4" />
                {t("report.pdf")}
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */

function SettingsSection({ user, slug, phone }: { user: { name: string; whmId: string }; slug: string | null; phone: string }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: user.name, phone });
  const [twoFA, setTwoFA] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);

  const saveProfile = () => {
    toast.success(t("settings.profile_saved"));
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
            <div className="space-y-2"><Label className="text-cream/80">{t("settings.manager_id")}</Label><Input className="border-white/15 bg-white/5 text-cream font-mono" value={user.whmId} readOnly /></div>
            <div className="space-y-2"><Label className="text-cream/80">{t("settings.name_username")}</Label><Input className="border-white/15 bg-white/5 text-cream" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-cream/80">{t("worker.phone")}</Label><Input className="border-white/15 bg-white/5 text-cream" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <Button onClick={saveProfile}>{t("settings.save_profile")}</Button>
          </div>
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

/* ---------- Wallet & Subscription ---------- */
function WalletSection({ user }: { user: { name: string; whmId: string; tenant?: StoredManagerSession["tenant"] } }) {
  const { t } = useTranslation();
  const plan = user.tenant?.subscription_plan;
  const status = user.tenant?.status ?? "unknown";
  const statusKey = `subscription.status_${status}` as const;

  const statusColor =
    status === "active" ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/30"
    : status === "trial" ? "bg-sky-500/20 text-sky-200 border-sky-400/30"
    : status === "expired" ? "bg-rose-500/20 text-rose-200 border-rose-400/30"
    : "bg-amber-500/20 text-amber-200 border-amber-400/30";

  return (
    <div className="space-y-6">
      <SectionHeader title={t("wallet.my_subscriptions")} />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2 p-5">
          <p className="text-xs uppercase tracking-wider text-cream/60">{t("wallet.current_plan")}</p>
          <p className="mt-2 text-2xl font-bold text-cream">{plan?.name ?? t("wallet.plan_not_active")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className={cn("border capitalize", statusColor)}>{t(statusKey)}</Badge>
            {plan?.is_active === false && (
              <Badge variant="outline" className="border-white/20 text-cream/80">{t("wallet.plan_inactive")}</Badge>
            )}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 text-sm text-cream sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-cream/60">{t("subscribe.warehouses")}</p>
              <p className="mt-1 font-semibold">{user.tenant?.warehouses_count ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-cream/60">{t("wallet.started_at")}</p>
              <p className="mt-1 font-semibold">{user.tenant?.subscription_start_date ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-cream/60">{t("wallet.ends_at")}</p>
              <p className="mt-1 font-semibold">{user.tenant?.subscription_end_date ?? "-"}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-xs uppercase tracking-wider text-cream/60">{t("wallet.company")}</p>
          <p className="mt-2 text-lg font-semibold text-cream">{user.tenant?.company_name ?? t("wallet.company")}</p>
          {user.tenant?.url_slug && (
            <p className="mt-1 font-mono text-xs text-cream/60">{user.tenant.url_slug}</p>
          )}
          <p className="mt-4 text-xs text-cream/60">{t("wallet.upgrade_hint")}</p>
        </GlassCard>
      </div>
    </div>
  );
}
