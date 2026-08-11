import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import {
  LayoutDashboard,
  Users,
  Warehouse,
  BarChart3,
  Wallet,
  Settings as SettingsIcon,
  Search,
  Bell,
  Menu,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Snowflake,
  Package,
  Flame,
  Truck,
  AlertTriangle,
  TrendingUp,
  Activity,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Boxes,
  PackagePlus,
  Send,
  Save,
  CalendarIcon,
  Loader2,
  LogIn,
  LogOut,
  User,
  Globe,
  Fingerprint,
  Radio,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion, AnimatePresence } from "framer-motion";
import Barcode from "react-barcode";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  initialManagers,
  initialWarehouseTypes,
  inventoryTrend,
  shipmentsData,
  recentActivity,
  walletTransactions,
  type Manager,
  type WarehouseType,
} from "@/lib/demo-data";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { getProfilePic, subscribeProfilePic } from "@/lib/profile-storage";
import { subscriptionStore, type SubscriptionRequest } from "@/lib/subscription-data";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  getCsrfCookie,
  loginDashboard,
  logoutDashboard,
} from "@/lib/api";
import { fetchMe } from "@/lib/manager-api";
import { assignBiometricDevice } from "@/lib/biometric-api";
import {
  fetchWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  fetchDeleteWarehouseInfo,
  type DeleteWarehouseInfo,
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchShipments,
  receiveShipment,
  createShipment,
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  logoutEmployee,
  getTypeStyle,
  type Warehouse as BackendWarehouse,
  type WarehouseInput,
  type Product,
  type ProductInput,
  type Shipment,
  type ShipmentStatus,
  type ShipmentInput,
  type ShipmentItemInput,
  type Employee,
  type EmployeeInput,
} from "@/lib/dashboard-api";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: i18n.t("title.dashboard") },
      { name: "description", content: i18n.t("title.dashboard_desc") },
    ],
  }),
});

type SectionId =
  | "dashboard"
  | "managers"
  | "warehouses"
  | "products"
  | "shipments"
  | "analytics"
  | "wallet"
  | "settings";

const NAV: {
  id: SectionId;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", labelKey: "sidebar.dashboard", icon: LayoutDashboard },
  { id: "managers", labelKey: "sidebar.employees", icon: Users },
  { id: "warehouses", labelKey: "sidebar.warehouses", icon: Warehouse },
  { id: "products", labelKey: "sidebar.products", icon: Package },
  { id: "shipments", labelKey: "sidebar.shipments", icon: Truck },
  { id: "analytics", labelKey: "feature.analytics", icon: BarChart3 },
  { id: "wallet", labelKey: "sidebar.wallet", icon: Wallet },
  { id: "settings", labelKey: "sidebar.settings", icon: SettingsIcon },
];

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Snowflake,
  Package,
  Flame,
  Truck,
  Boxes,
  Warehouse,
};

export function DashboardPage() {
  const { t } = useTranslation();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [types, setTypes] = useState<WarehouseType[]>(initialWarehouseTypes);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(getStoredUser()?.tenant?.url_slug ?? null);
  const [checking, setChecking] = useState(false);
  const storedUser = getStoredUser();
  const userInitials = storedUser?.full_name
    ? storedUser.full_name
        .split(" ")
        .map((s: string) => s[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
  const [loginSlug, setLoginSlug] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    if (!slug) return;
    setLogoutLoading(true);
    try {
      await logoutDashboard(slug);
    } catch {
      /* ignore server error, still clear local */
    }
    clearStoredUser();
    setSlug(null);
    setLogoutLoading(false);
  };

  useEffect(() => {
    setAvatar(getProfilePic("admin"));
    return subscribeProfilePic("admin", setAvatar);
  }, []);

  useEffect(() => {
    const initialSlug = getStoredUser()?.tenant?.url_slug;
    if (!initialSlug) return;
    let cancelled = false;
    setChecking(true);
    fetchMe(initialSlug)
      .then((me) => {
        if (cancelled) return;
        if (me.role !== "owner") {
          clearStoredUser();
          setSlug(null);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        clearStoredUser();
        setSlug(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1b2d]">
        <Loader2 className="size-6 animate-spin text-[#f3a523]" />
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1b2d] px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#f3a523] shadow-lg">
              <Warehouse className="size-6 text-[#1a2942]" />
            </div>
            <h1 className="text-2xl font-bold text-[#f0ecdb]">{t("app.name")}</h1>
            <p className="mt-1 text-sm text-[#f0ecdb]/60">{t("manager.login.subtitle")}</p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!loginSlug.trim() || !loginPw.trim()) {
                toast.error(t("manager.login.slug_required"));
                return;
              }
              setLoginLoading(true);
              try {
                await getCsrfCookie();
                const res = await loginDashboard(loginSlug.trim(), loginUsername.trim(), loginPw);
                setStoredUser({
                  id: res.dashboard_user.id,
                  full_name: res.dashboard_user.full_name,
                  email:
                    res.dashboard_user.full_name.toLowerCase().replace(/\s+/g, ".") + "@demo.io",
                  birthday: null,
                  tenant: {
                    id: res.dashboard_user.tenant.id,
                    user_id: res.dashboard_user.tenant.user_id,
                    subscription_plan_id: res.dashboard_user.tenant.subscription_plan_id,
                    company_name: res.dashboard_user.tenant.company_name,
                    warehouses_count: res.dashboard_user.tenant.warehouses_count,
                    url_slug: res.dashboard_user.tenant.url_slug,
                    status: res.dashboard_user.tenant.status,
                    subscription_start_date:
                      res.dashboard_user.tenant.subscription_start_date ?? "",
                    subscription_end_date: res.dashboard_user.tenant.subscription_end_date ?? "",
                    subscription_plan: {
                      id: res.dashboard_user.tenant.subscription_plan?.id ?? 0,
                      name: res.dashboard_user.tenant.subscription_plan?.name ?? "",
                      duration_days:
                        res.dashboard_user.tenant.subscription_plan?.duration_days ?? 0,
                      price_per_warehouse:
                        res.dashboard_user.tenant.subscription_plan?.price_per_warehouse ?? "0",
                      is_active: res.dashboard_user.tenant.subscription_plan?.is_active ?? true,
                    },
                  },
                });
                setSlug(res.dashboard_user.tenant.url_slug);
                toast.success(t("manager.login.welcome", { name: res.dashboard_user.full_name }));
              } catch (err: any) {
                const msg =
                  err.response?.data?.message ||
                  err.response?.data?.errors?.[
                    Object.keys(err.response?.data?.errors ?? {})[0]
                  ]?.[0] ||
                  t("manager.login.failed");
                toast.error(msg);
              } finally {
                setLoginLoading(false);
              }
            }}
            className="space-y-4 rounded-2xl bg-[#f0ecdb] p-6 shadow-xl"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1a2942]">
                {t("manager.login.tenant_slug")}
              </label>
              <input
                value={loginSlug}
                onChange={(e) => setLoginSlug(e.target.value)}
                placeholder={t("manager.login.slug_placeholder")}
                required
                className="w-full rounded-xl border border-[#1a2942]/20 bg-white px-4 py-2.5 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523]"
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1a2942]">
                  {t("manager.login.username")}
                </label>
                <input
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder={t("manager.login.username_placeholder")}
                  required
                  className="w-full rounded-xl border border-[#1a2942]/20 bg-white px-4 py-2.5 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1a2942]">
                {t("manager.login.password")}
              </label>
              <input
                type="password"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
                placeholder={t("manager.login.password_placeholder")}
                required
                className="w-full rounded-xl border border-[#1a2942]/20 bg-white px-4 py-2.5 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523]"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a2942] py-2.5 text-sm font-semibold text-[#f0ecdb] transition hover:bg-[#26384c] disabled:opacity-60"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> {t("manager.login.connecting")}
                </>
              ) : (
                <>
                  <LogIn className="size-4" /> {t("manager.login.enter_dashboard")}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-white/10 bg-navy text-cream transition-all duration-300 md:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[oklch(0.78_0.16_75)] shadow-lg">
              <Warehouse className="size-5 text-white" />
            </div>
            {!collapsed && <span className="text-base font-bold">{t("app.name")}</span>}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-1.5 text-cream/70 transition hover:bg-white/10 hover:text-cream"
            aria-label={t("dashboard.toggle_sidebar")}
          >
            {collapsed ? (
              <ChevronRight className="size-4 rtl:rotate-180" />
            ) : (
              <ChevronLeft className="size-4 rtl:rotate-180" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-[oklch(0.78_0.16_75)]/20 text-cream shadow-inner"
                        : "text-cream/70 hover:bg-white/10 hover:text-cream",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition",
                        active && "text-[oklch(0.85_0.16_75)]",
                      )}
                    />
                    {!collapsed && <span>{t(item.labelKey)}</span>}
                    {!collapsed && item.id === "warehouses" && (
                      <span className="ms-auto inline-flex size-2 animate-pulse rounded-full bg-[oklch(0.78_0.16_75)]" />
                    )}
                  </button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>}
              </Tooltip>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          {!collapsed && storedUser && (
            <div className="mb-2 px-1">
              <p className="truncate text-xs font-semibold text-cream">{storedUser.full_name}</p>
              <p className="truncate text-[10px] text-cream/50">
                {storedUser.tenant?.company_name ?? ""}
              </p>
            </div>
          )}
          <LanguageToggle collapsed={collapsed} />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-cream/70 transition hover:bg-white/10 hover:text-red-300 disabled:opacity-50"
              >
                <LogOut className="size-4 shrink-0" />
                {!collapsed && (
                  <span>{logoutLoading ? t("dashboard.logging_out") : t("nav.log_out")}</span>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{t("nav.log_out")}</TooltipContent>}
          </Tooltip>
        </div>
      </aside>

      {/* Main */}
      <div
        className={cn(
          "flex min-h-screen flex-1 flex-col transition-all duration-300",
          collapsed ? "md:ps-[72px]" : "md:ps-64",
        )}
      >
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-navy/80 px-4 text-cream backdrop-blur-xl md:px-6">
          <button
            className="rounded-lg p-2 text-cream/70 hover:bg-white/10 md:hidden"
            aria-label={t("dashboard.menu")}
          >
            <Menu className="size-5" />
          </button>
          <h1 className="text-base font-semibold capitalize md:text-lg">
            {t(NAV.find((n) => n.id === section)?.labelKey ?? "")}
          </h1>
          <div className="ms-auto flex items-center gap-2 md:gap-3">
            <LanguageToggle variant="header" />
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-cream/50" />
              <input
                placeholder={t("dashboard.search_placeholder")}
                className="h-9 w-64 rounded-full border border-white/15 bg-white/5 ps-9 pe-3 text-sm text-cream placeholder:text-cream/40 outline-none transition focus:w-72 focus:border-[oklch(0.78_0.16_75)]/60"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="relative rounded-full p-2 text-cream/80 transition hover:bg-white/10">
                  <Bell className="size-4" />
                  <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-[oklch(0.78_0.16_75)]" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("dashboard.notifications", { count: 3 })}</TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 ps-1 pe-3">
              <div className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-[oklch(0.78_0.16_75)] text-xs font-bold text-navy">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={t("dashboard.avatar_alt")}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </div>
              <span className="hidden text-xs font-semibold sm:inline">
                {storedUser?.full_name ?? t("dashboard.owner")}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {section === "dashboard" && <Overview slug={slug} />}
              {section === "managers" && (
                <ManagersSection
                  slug={slug}
                  managers={managers}
                  setManagers={setManagers}
                  types={types}
                />
              )}
              {section === "warehouses" && (
                <WarehousesSection
                  types={types}
                  setTypes={setTypes}
                  managers={managers}
                  slug={slug}
                />
              )}
              {section === "products" && <ProductsSection slug={slug} />}
              {section === "shipments" && <ShipmentsSection slug={slug} />}
              {section === "analytics" && <AnalyticsSection slug={slug} />}
              {section === "wallet" && <WalletSection />}
              {section === "settings" && <SettingsSection />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* -------------------- Glass card -------------------- */
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("glass-light rounded-2xl p-5 shadow-xl text-[#1a2942]", className)}>
      {children}
    </div>
  );
}

/* -------------------- Overview -------------------- */
function Overview({ slug }: { slug: string | null }) {
  const { t } = useTranslation();
  const [data, setData] = useState<{
    warehouses: number;
    products: number;
    shipments: number;
    employees: number;
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetchWarehouses(slug).catch(() => ({
        warehouses: [],
        allowed_warehouses_count: 0,
        current_warehouses_count: 0,
      })),
      fetchProducts(slug).catch(() => ({ products: [] })),
      fetchShipments(slug).catch(() => ({ shipments: [] })),
    ]).then(([wRes, pRes, sRes]) => {
      const employees = new Set<number>();
      for (const w of wRes.warehouses) {
        fetchEmployees(slug, w.id)
          .then((eRes) => {
            eRes.employees.forEach((e) => employees.add(e.id));
          })
          .catch(() => {});
      }
      setData({
        warehouses: wRes.warehouses.length,
        products: pRes.products.length,
        shipments: sRes.shipments.length,
        employees: 0,
      });
    });
  }, [slug]);

  const stats = [
    {
      labelKey: "sidebar.warehouses",
      value: data ? data.warehouses.toString() : "—",
      icon: Warehouse,
      trendKey: "dashboard.trend_active",
    },
    {
      labelKey: "sidebar.products",
      value: data ? data.products.toString() : "—",
      icon: Package,
      trendKey: "dashboard.trend_in_stock",
    },
    {
      labelKey: "sidebar.shipments",
      value: data ? data.shipments.toString() : "—",
      icon: Truck,
      trendKey: "dashboard.trend_this_month",
    },
    {
      labelKey: "sidebar.employees",
      value: data ? (data.employees || "—").toString() : "—",
      icon: Users,
      trendKey: "dashboard.trend_on_staff",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.labelKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="transition hover:-translate-y-0.5 hover:shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">
                  {t(s.labelKey)}
                </p>
                <s.icon className="size-4 text-[oklch(0.74_0.02_252)]" />
              </div>
              <p className="mt-3 text-3xl font-bold text-[#1a2942]">{s.value}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="size-3" /> {t(s.trendKey)}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{t("dashboard.inventory_trend")}</h3>
              <p className="text-xs text-[#1a2942]/70">{t("dashboard.last_30_days_demo")}</p>
            </div>
          </div>
          <ChartArea />
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 text-sm font-semibold">{t("dashboard.quick_summary")}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3 transition hover:bg-white/60">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#6366f1]/20">
                <Warehouse className="size-4 text-[#6366f1]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("dashboard.total_warehouses")}</p>
                <p className="text-xs text-[#1a2942]/70">{data ? data.warehouses : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3 transition hover:bg-white/60">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#10B981]/20">
                <Package className="size-4 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("dashboard.total_products")}</p>
                <p className="text-xs text-[#1a2942]/70">{data ? data.products : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3 transition hover:bg-white/60">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#F59E0B]/20">
                <Truck className="size-4 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("dashboard.total_shipments")}</p>
                <p className="text-xs text-[#1a2942]/70">{data ? data.shipments : "—"}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="mb-4 text-sm font-semibold">{t("dashboard.recent_activity")}</h3>
        <ul className="divide-y divide-white/40">
          {recentActivity.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-3 text-sm">
              <span>{a.text}</span>
              <span className="text-xs text-[#1a2942]/70">{a.time}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}

/* -------------------- Managers (CRUD) -------------------- */
function ManagersSection({
  slug,
  managers,
  setManagers,
  types,
}: {
  slug?: string | null;
  managers: Manager[];
  setManagers: React.Dispatch<React.SetStateAction<Manager[]>>;
  types: WarehouseType[];
}) {
  const { t } = useTranslation();
  const [realTypes, setRealTypes] = useState<WarehouseType[]>([]);
  useEffect(() => {
    if (!slug) return;
    load();
  }, [slug]);
  const load = async () => {
    if (!slug) return;
    try {
      const wRes = await fetchWarehouses(slug);
      setRealTypes(
        wRes.warehouses.map((w) => ({
          id: String(w.id),
          name: w.warehouse_name,
          description: w.location ?? "",
          color: getTypeStyle(w.type).color,
          icon: getTypeStyle(w.type).icon,
          status: "active",
        })),
      );
      const all: Manager[] = [];
      for (const w of wRes.warehouses) {
        const eRes = await fetchEmployees(slug, w.id);
        for (const emp of eRes.employees) {
          if (emp.role !== "manager" && emp.role !== "warehouse_secretary") continue;
          all.push({
            id: `emp_${emp.id}`,
            whmId: emp.system_user.user_name,
            name: emp.system_user.full_name,
            age: 0,
            password: "password",
            warehouseId: w.id.toString(),
            status: emp.status === "available" ? "active" : "inactive",
            isTempPassword: emp.system_user.must_change_password,
            lastPasswordChange: "—",
            role: "Manager" as const,
            email: emp.system_user.user_name + "@warehouse.io",
            phone: emp.system_user.phone_number,
            salary: emp.salary,
          });
        }
      }
      setManagers(all);
    } catch {
      /* ignore */
    }
  };
  const effectiveTypes = slug ? realTypes : types;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [editing, setEditing] = useState<Manager | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return managers;
    return managers.filter((m) => {
      const wh = effectiveTypes.find((t) => t.id === m.warehouseId)?.name ?? "";
      return (
        m.name.toLowerCase().includes(q) ||
        wh.toLowerCase().includes(q) ||
        m.whmId.toLowerCase().includes(q)
      );
    });
  }, [managers, query, effectiveTypes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const [created, setCreated] = useState<{ user_name: string; password: string } | null>(null);

  const handleSave = async (data: {
    id?: string;
    name: string;
    user_name: string;
    phone_number: string;
    salary: number;
    warehouseId: string;
    status: Manager["status"];
  }) => {
    if (!slug) {
      setLoading(true);
      toast.error(t("common.operation_failed"));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const warehouseId = parseInt(data.warehouseId, 10);
      const status = data.status === "active" ? "available" : "busy";
      if (data.id) {
        const employeeId = parseInt(data.id.replace("emp_", ""), 10);
        await updateEmployee(slug, warehouseId, employeeId, {
          full_name: data.name,
          user_name: data.user_name,
          phone_number: data.phone_number,
          salary: data.salary,
          status,
        });
        toast.success(t("manager.toast_updated"));
      } else {
        const res = await createEmployee(slug, warehouseId, {
          full_name: data.name,
          user_name: data.user_name,
          phone_number: data.phone_number,
          salary: data.salary,
          role: "manager",
          status,
        });
        setCreated({ user_name: res.employee.system_user.user_name, password: res.password ?? "" });
        toast.success(t("manager.toast_added", { id: res.employee.system_user.user_name }));
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.operation_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (!slug) {
      setDeleteId(null);
      toast.error(t("common.operation_failed"));
      return;
    }
    setLoading(true);
    try {
      const manager = managers.find((m) => m.id === deleteId);
      const employeeId = parseInt(deleteId.replace("emp_", ""), 10);
      const warehouseId = manager ? parseInt(manager.warehouseId, 10) : 0;
      await deleteEmployee(slug, warehouseId, employeeId);
      setManagers((prev) => prev.filter((m) => m.id !== deleteId));
      load();
      toast.success(t("manager.toast_removed"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.operation_failed"));
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  const handleForceReset = () => {
    if (!resetId || resetPw.length < 6) {
      toast.error(t("manager.toast_password_short"));
      return;
    }
    setManagers((prev) =>
      prev.map((m) =>
        m.id === resetId
          ? {
              ...m,
              password: resetPw,
              isTempPassword: true,
              lastPasswordChange: new Date().toISOString().slice(0, 10),
            }
          : m,
      ),
    );
    toast.success(t("manager.toast_password_reset"));
    setResetId(null);
    setResetPw("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#1a2942]/70" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t("manager.search_placeholder")}
            className="ps-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          disabled={!!slug && effectiveTypes.length === 0}
          className="bg-navy text-cream hover:bg-navy/90"
        >
          <Plus className="size-4" /> {t("manager.add")}
        </Button>
      </div>

      {!!slug && effectiveTypes.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700">
          {t("manager.no_warehouses_hint")}
        </div>
      )}

      <GlassCard className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("manager.no_managers_found")}
            subtitle={t("manager.no_managers_found.subtitle")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/40 hover:bg-transparent">
                <TableHead>{t("common.id")}</TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("common.age")}</TableHead>
                <TableHead>{t("common.warehouse")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("manager.last_password_change")}
                </TableHead>
                <TableHead className="text-end">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((m) => {
                const wh = effectiveTypes.find((t) => t.id === m.warehouseId);
                return (
                  <TableRow key={m.id} className="border-white/40">
                    <TableCell className="font-mono text-xs">{m.whmId}</TableCell>
                    <TableCell className="font-medium">
                      {m.name}
                      {m.isTempPassword && (
                        <Badge
                          variant="outline"
                          className="ms-2 border-amber-400/50 bg-amber-100/40 text-amber-800"
                        >
                          {t("manager.temp_pw")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{m.age}</TableCell>
                    <TableCell>
                      {wh && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: `${wh.color}25`, color: "#1D2D44" }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: wh.color }}
                          />
                          {wh.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.status === "active" ? "default" : "secondary"}
                        className={cn(
                          m.status === "active"
                            ? "bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20"
                            : "",
                        )}
                      >
                        {t(`manager.status.${m.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-[#1a2942]/70 md:table-cell">
                      {m.lastPasswordChange}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                const empId = parseInt(m.id.replace("emp_", ""), 10);
                                const whId = parseInt(m.warehouseId, 10);
                                if (!slug || !empId || !whId) return;
                                try {
                                  await logoutEmployee(slug, whId, empId);
                                  toast.success(t("manager.toast_logged_out", { name: m.name }));
                                } catch (err: any) {
                                  toast.error(
                                    err.response?.data?.message || t("manager.toast_logout_failed"),
                                  );
                                }
                              }}
                            >
                              <LogOut className="size-3.5 text-sky-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("manager.logout_tooltip")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setResetId(m.id);
                                setResetPw("");
                              }}
                            >
                              <AlertTriangle className="size-3.5 text-amber-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("manager.force_password_reset")}</TooltipContent>
                        </Tooltip>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(m);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(m.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/40 px-4 py-3 text-xs text-[#1a2942]/70">
            <span>
              {t("manager.page_info", { page, total: totalPages, count: filtered.length })}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-3.5 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      <ManagerDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        types={effectiveTypes}
        onSave={handleSave}
        loading={loading}
      />

      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" /> {t("manager.created")}
            </DialogTitle>
            <DialogDescription>{t("manager.created.desc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-[#1D2D44]">{t("manager.login.username")}</Label>
              <div className="rounded-lg border bg-muted px-3 py-2 font-mono text-sm text-[#1D2D44]">
                {created?.user_name}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[#1D2D44]">{t("manager.temporary_password")}</Label>
              <div className="rounded-lg border bg-muted px-3 py-2 font-mono text-sm text-[#1D2D44]">
                {created?.password}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setCreated(null)}
              className="bg-navy text-cream hover:bg-navy/90"
            >
              {t("common.ok")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> {t("manager.confirm_delete")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("manager.confirm_delete.desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#f2a618] text-[#1D2D44] border border-[#1D2D44]/20 hover:bg-[#f2a618]/90 hover:text-[#1D2D44] opacity-100">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!resetId}
        onOpenChange={(o) => {
          if (!o) {
            setResetId(null);
            setResetPw("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("manager.force_password_reset")}</DialogTitle>
            <DialogDescription>{t("manager.force_reset.desc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>{t("manager.temporary_password")}</Label>
            <Input
              type="text"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              placeholder={t("manager.min_6_characters")}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetId(null);
                setResetPw("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleForceReset} className="bg-navy text-cream hover:bg-navy/90">
              {t("auth.reset_password")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManagerDialog({
  open,
  onOpenChange,
  editing,
  types,
  onSave,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Manager | null;
  types: WarehouseType[];
  onSave: (m: {
    id?: string;
    name: string;
    user_name: string;
    phone_number: string;
    salary: number;
    warehouseId: string;
    status: Manager["status"];
  }) => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "",
    user_name: "",
    phone_number: "",
    salary: 0,
    warehouseId: types[0]?.id ?? "",
    status: "active" as Manager["status"],
  });

  useMemo(() => {
    if (editing) {
      setForm({
        name: editing.name,
        user_name: editing.whmId,
        phone_number: editing.phone ?? "",
        salary: editing.salary ?? 0,
        warehouseId: editing.warehouseId,
        status: editing.status,
      });
    } else {
      setForm({
        name: "",
        user_name: "",
        phone_number: "",
        salary: 0,
        warehouseId: types[0]?.id ?? "",
        status: "active",
      });
    }
  }, [editing, types]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.user_name || !form.phone_number || !form.warehouseId) {
      toast.error(t("manager.toast_required_fields"));
      return;
    }
    if (!editing && form.user_name.length < 3) {
      toast.error(t("manager.toast_username_short"));
      return;
    }
    if (!/^09[0-9]{8}$/.test(form.phone_number)) {
      toast.error(t("manager.toast_phone_invalid"));
      return;
    }
    if (form.salary < 0) {
      toast.error(t("manager.toast_salary_negative"));
      return;
    }
    onSave({
      ...(editing ? { id: editing.id } : {}),
      name: form.name,
      user_name: form.user_name,
      phone_number: form.phone_number,
      salary: form.salary,
      warehouseId: form.warehouseId,
      status: form.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1D2D44]">
            {editing ? t("manager.edit") : t("manager.add_warehouse_manager")}
          </DialogTitle>
          <DialogDescription>
            {editing ? t("manager.edit.desc") : t("manager.add.desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("common.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("placeholder.ahmed")}
                required
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("manager.login.username")}</Label>
              <Input
                value={form.user_name}
                onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                placeholder={t("manager.username_placeholder")}
                required
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("common.phone")}</Label>
              <Input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder={t("manager.phone_placeholder")}
                required
                inputMode="numeric"
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("manager.salary")}</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
                placeholder="0"
                required
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-[#1D2D44]">{t("manager.assign_warehouse")}</Label>
            <Select
              value={form.warehouseId}
              onValueChange={(v) => setForm({ ...form, warehouseId: v })}
            >
              <SelectTrigger className="text-[#1D2D44] placeholder:text-[#1D2D44]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((wtype) => (
                  <SelectItem key={wtype.id} value={wtype.id}>
                    {wtype.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!editing && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("manager.first_login_desc")}
            </div>
          )}
          <div className="grid gap-2">
            <Label className="text-[#1D2D44]">{t("common.status")}</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as Manager["status"] })}
            >
              <SelectTrigger className="text-[#1D2D44] placeholder:text-[#1D2D44]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("manager.status.active")}</SelectItem>
                <SelectItem value="inactive">{t("manager.status.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#E2DDD3] border border-[#1D2D44]/20"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-navy text-cream hover:bg-navy/90"
            >
              {loading ? t("common.saving") : editing ? t("common.save_changes") : t("manager.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Warehouses -------------------- */
function WarehousesSection({
  types,
  setTypes,
  managers,
  slug,
}: {
  types: WarehouseType[];
  setTypes: React.Dispatch<React.SetStateAction<WarehouseType[]>>;
  managers: Manager[];
  slug?: string | null;
}) {
  const hasBackend = !!slug;

  if (!hasBackend) {
    return <WarehouseTypesSection types={types} setTypes={setTypes} managers={managers} />;
  }
  return <WarehouseManager slug={slug} />;
}

/* -------------------- My Warehouses (Backend) -------------------- */
function WarehouseManager({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<BackendWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BackendWarehouse | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [deleteDeleting, setDeleteDeleting] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [allowedCount, setAllowedCount] = useState(0);
  const [deviceAssignFor, setDeviceAssignFor] = useState<BackendWarehouse | null>(null);
  const [deviceCode, setDeviceCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [assignDeviceSaving, setAssignDeviceSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWarehouses(slug);
      setWarehouses(res.warehouses);
      setAllowedCount(res.allowed_warehouses_count);
    } catch (err: any) {
      setError(err.response?.data?.message || t("warehouse.toast_load_failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  const atLimit = warehouses.length >= allowedCount;

  const handleSave = async (data: WarehouseInput & { id?: number }) => {
    if (!data.id && atLimit) {
      toast.error(t("warehouse.toast_limit_reached", { count: allowedCount }));
      return;
    }
    setSaving(true);
    try {
      if (data.id) {
        await updateWarehouse(slug, data.id, data);
        toast.success(t("warehouse.updated"));
      } else {
        await createWarehouse(slug, data);
        toast.success(t("warehouse.created"));
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.operation_failed"));
    } finally {
      setSaving(false);
    }
  };

  const existingTypes = [...new Set(warehouses.map((w) => w.type))];

  const openDeviceAssign = (w: BackendWarehouse) => {
    setDeviceAssignFor(w);
    setDeviceCode("");
    setDeviceName("");
  };

  const handleAssignDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceAssignFor || !deviceCode.trim() || !deviceName.trim()) {
      toast.error(t("biometric.assign_toast_required"));
      return;
    }
    setAssignDeviceSaving(true);
    try {
      const res = await assignBiometricDevice(slug, deviceAssignFor.id, {
        device_code: deviceCode.trim(),
        name: deviceName.trim(),
        status: "active",
      });
      toast.success(res.message || t("biometric.assign_success"));
      setDeviceAssignFor(null);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("biometric.assign_failed"));
    } finally {
      setAssignDeviceSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-cream">{t("warehouse.your_warehouses")}</h3>
          <p className="text-xs text-[#1a2942]/70">
            {loading
              ? t("common.loading")
              : t("warehouse.usage", { count: warehouses.length, max: allowedCount })}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          disabled={atLimit}
          className="bg-navy text-cream hover:bg-navy/90"
          title={
            atLimit
              ? t("warehouse.add_limit_tooltip", { count: allowedCount })
              : t("warehouse.add_tooltip")
          }
        >
          <Plus className="size-4" /> {t("warehouse.add")}
        </Button>
      </div>

      {atLimit && !loading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          {t("warehouse.limit_banner")}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i}>
              <div className="space-y-3">
                <Skeleton className="h-5 w-32 bg-white/20" />
                <Skeleton className="h-4 w-48 bg-white/20" />
                <Skeleton className="h-4 w-24 bg-white/20" />
              </div>
            </GlassCard>
          ))}
        </div>
      ) : error ? (
        <GlassCard>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertTriangle className="size-8 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" onClick={load} className="mt-2">
              {t("common.try_again")}
            </Button>
          </div>
        </GlassCard>
      ) : warehouses.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Warehouse}
            title={t("warehouse.no_warehouses_title")}
            subtitle={t("warehouse.no_warehouses_subtitle")}
          />
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w, i) => {
            const style = getTypeStyle(w.type);
            const Icon = ICON_MAP[style.icon] ?? Package;
            const manager = w.employees?.find((e) => e.status === "active");
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="group h-full transition hover:-translate-y-0.5 hover:shadow-2xl">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex size-11 items-center justify-center rounded-xl"
                      style={{ background: `${style.color}25` }}
                    >
                      <Icon className="size-5" style={{ color: style.color }} />
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {w.type}
                    </Badge>
                  </div>
                  <h4 className="mt-3 text-base font-semibold">{w.warehouse_name}</h4>
                  <p className="mt-1 text-sm text-[#1a2942]/70">
                    {w.location}, {w.governorate}
                  </p>

                  {manager && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[#1a2942]/80">
                      <User className="size-3.5" />
                      <span>{manager.system_user?.full_name ?? t("common.unknown")}</span>
                    </div>
                  )}

                  {w.products && w.products.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {w.products.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs text-[#1a2942]/80"
                        >
                          <span className="truncate">{p.product_name}</span>
                          <span className="ms-2 shrink-0 font-medium">
                            {t("warehouse.units", { count: p.pivot.quantity })}
                          </span>
                        </div>
                      ))}
                      {w.products.length > 4 && (
                        <p className="text-[10px] text-[#1a2942]/50">
                          {t("warehouse.more", { count: w.products.length - 4 })}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-white/40 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#1a2942]/70">
                      <Activity className="size-3.5" /> {w.area} m&sup2; &middot; $
                      {w.financial_budgets.toLocaleString()}
                    </span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                        title={t("biometric.assign_tooltip")}
                        onClick={() => openDeviceAssign(w)}
                      >
                        <Fingerprint className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-navy hover:text-navy/80 hover:bg-white/60"
                        onClick={() => {
                          setEditing(w);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          setDeleteChecking(true);
                          setDeleteBlocked(null);
                          try {
                            const info = await fetchDeleteWarehouseInfo(slug, w.id);
                            if (info.employees_count > 0 || info.products_count > 0) {
                              setDeleteBlocked(
                                t("warehouse.delete_blocked", {
                                  employees: info.employees_count,
                                  products: info.products_count,
                                }),
                              );
                            } else {
                              setDeleteId(w.id);
                            }
                          } catch {
                            setDeleteBlocked(t("warehouse.delete_check_failed"));
                          } finally {
                            setDeleteChecking(false);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <WarehouseDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSave={handleSave}
        saving={saving}
        existingTypes={existingTypes}
      />

      <Dialog
        open={deviceAssignFor !== null}
        onOpenChange={(o) => {
          if (!o && !assignDeviceSaving) setDeviceAssignFor(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("biometric.assign_title")}</DialogTitle>
            <DialogDescription>
              {deviceAssignFor
                ? t("biometric.assign_desc_warehouse", {
                    warehouse: deviceAssignFor.warehouse_name,
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignDevice} className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("biometric.device_code")} *</Label>
              <Input
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                placeholder="DY50-ESP32-001"
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/70"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("biometric.device_name")} *</Label>
              <Input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={t("biometric.device_name_placeholder")}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/70"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeviceAssignFor(null)}
                disabled={assignDeviceSaving}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={assignDeviceSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {assignDeviceSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Radio className="size-4" />
                )}
                {assignDeviceSaving ? t("common.saving") : t("biometric.assign_button")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => {
          if (!o && !deleteDeleting) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("warehouse.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("warehouse.delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteDeleting}
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (deleteId === null) return;
                setDeleteDeleting(true);
                try {
                  await deleteWarehouse(slug, deleteId);
                  toast.success(t("warehouse.deleted"));
                  setDeleteId(null);
                  load();
                } catch (err: any) {
                  toast.error(err.response?.data?.message || t("common.delete_failed"));
                } finally {
                  setDeleteDeleting(false);
                }
              }}
            >
              {deleteDeleting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteBlocked !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteBlocked(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("warehouse.cannot_delete")}</AlertDialogTitle>
            <AlertDialogDescription>{deleteBlocked}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteBlocked(null)}>
              {t("common.ok")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const WAREHOUSE_TYPE_OPTIONS = ["Cold Storage", "Dry Storage", "Hazardous", "Fulfillment Center"];
const GOVERNORATE_OPTIONS = [
  "Damascus",
  "Aleppo",
  "Homs",
  "Latakia",
  "Hama",
  "Tartus",
  "Idlib",
  "Daraa",
  "Deir ez-Zor",
  "Al-Hasakah",
  "Al-Raqqa",
  "As-Suwayda",
  "Quneitra",
];

function WarehouseDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  saving,
  existingTypes,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: BackendWarehouse | null;
  onSave: (d: WarehouseInput & { id?: number }) => void;
  saving: boolean;
  existingTypes: string[];
}) {
  const { t } = useTranslation();
  const allTypes = [...new Set([...WAREHOUSE_TYPE_OPTIONS, ...existingTypes])];
  const [form, setForm] = useState<WarehouseInput & { id?: number }>({
    warehouse_name: "",
    type: allTypes[0] ?? "Cold Storage",
    location: "",
    governorate: GOVERNORATE_OPTIONS[0] ?? "",
    area: 0,
    financial_budgets: 0,
    description: "",
  });

  useMemo(() => {
    if (editing) {
      setForm({
        id: editing.id,
        warehouse_name: editing.warehouse_name,
        type: editing.type,
        location: editing.location,
        governorate: editing.governorate,
        area: editing.area,
        financial_budgets: editing.financial_budgets,
        description: editing.description ?? "",
      });
    } else {
      setForm({
        warehouse_name: "",
        type: allTypes[0] ?? "Cold Storage",
        location: "",
        governorate: GOVERNORATE_OPTIONS[0] ?? "",
        area: 0,
        financial_budgets: 0,
        description: "",
      });
    }
  }, [editing, existingTypes.join(",")]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.warehouse_name ||
      !form.type ||
      !form.location ||
      !form.governorate ||
      form.area <= 0
    ) {
      toast.error(t("warehouse.toast_required_fields"));
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1D2D44]">
            {editing ? t("warehouse.edit_warehouse") : t("warehouse.add")}
          </DialogTitle>
          <DialogDescription>
            {editing ? t("warehouse.edit.desc") : t("warehouse.add.desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label className="text-[#1D2D44]">{t("warehouse.name")} *</Label>
            <Input
              value={form.warehouse_name}
              onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })}
              placeholder={t("warehouse.name_placeholder")}
              className="text-[#1D2D44] placeholder:text-[#1D2D44]/70"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="warehouse-type" className="text-[#1D2D44]">
              {t("warehouse.type")} *
            </Label>
            <Input
              id="warehouse-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder={t("warehouse.select_type")}
              className="text-[#1D2D44]"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("warehouse.location")} *</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder={t("warehouse.location_placeholder")}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/70"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("warehouse.governorate")} *</Label>
              <Select
                value={form.governorate}
                onValueChange={(v) => setForm({ ...form, governorate: v })}
              >
                <SelectTrigger className="text-[#1D2D44]">
                  <SelectValue placeholder={t("warehouse.select_governorate")} />
                </SelectTrigger>
                <SelectContent>
                  {GOVERNORATE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("warehouse.area")} (m&sup2;) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.area}
                onChange={(e) => setForm({ ...form, area: Number(e.target.value) })}
                placeholder={t("warehouse.area_placeholder")}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/70"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("warehouse.financial_budget")} *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.financial_budgets}
                onChange={(e) => setForm({ ...form, financial_budgets: Number(e.target.value) })}
                placeholder={t("warehouse.budget_placeholder")}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/70"
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-[#1D2D44]">{t("warehouse.description")}</Label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("warehouse.description_placeholder")}
              className="flex min-h-[80px] w-full rounded-xl border border-[#1a2942]/20 bg-white px-3 py-2 text-sm text-[#1D2D44] placeholder:text-[#1D2D44]/70 focus:outline-none focus:ring-2 focus:ring-[#f3a523]"
            />
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[#f2a618] text-[#1D2D44] border border-[#1D2D44]/20 hover:bg-[#f2a618]/90 hover:text-[#1D2D44] opacity-100"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving} className="bg-navy text-cream hover:bg-navy/90">
              {saving
                ? t("common.saving")
                : editing
                  ? t("common.save_changes")
                  : t("warehouse.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Warehouse Types -------------------- */
function WarehouseTypesSection({
  types,
  setTypes,
  managers,
}: {
  types: WarehouseType[];
  setTypes: React.Dispatch<React.SetStateAction<WarehouseType[]>>;
  managers: Manager[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = (wtype: WarehouseType) => {
    if (types.some((x) => x.id === wtype.id)) {
      setTypes((prev) => prev.map((x) => (x.id === wtype.id ? wtype : x)));
      toast.success(t("warehouse.toast_type_updated"));
    } else {
      setTypes((prev) => [...prev, wtype]);
      toast.success(t("warehouse.toast_type_added"));
    }
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream/80">{t("warehouse.types_subtitle")}</p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="bg-navy text-cream hover:bg-navy/90"
        >
          <Plus className="size-4" /> {t("warehouse.add_type")}
        </Button>
      </div>

      {types.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Warehouse}
            title={t("warehouse.no_types_title")}
            subtitle={t("warehouse.no_types_subtitle")}
          />
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((wtype, i) => {
            const Icon = ICON_MAP[wtype.icon] ?? Package;
            const count = managers.filter((m) => m.warehouseId === wtype.id).length;
            return (
              <motion.div
                key={wtype.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="group h-full transition hover:-translate-y-0.5 hover:shadow-2xl">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex size-11 items-center justify-center rounded-xl"
                      style={{ background: `${wtype.color}25` }}
                    >
                      <Icon className="size-5" style={{ color: wtype.color }} />
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {wtype.status}
                    </Badge>
                  </div>
                  <h4 className="mt-3 text-base font-semibold">{wtype.name}</h4>
                  <p className="mt-1 text-sm text-[#1a2942]/70">{wtype.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-white/40 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#1a2942]/70">
                      <Users className="size-3.5" /> {t("warehouse.manager_count", { count })}
                    </span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(wtype);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteId(wtype.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <WarehouseTypeDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("warehouse.delete_type_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("warehouse.delete_type_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setTypes((prev) => prev.filter((t) => t.id !== deleteId));
                toast.success(t("warehouse.toast_type_deleted"));
                setDeleteId(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const ICON_OPTIONS = ["Snowflake", "Package", "Flame", "Truck", "Boxes", "Warehouse"];

function WarehouseTypeDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: WarehouseType | null;
  onSave: (t: WarehouseType) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<WarehouseType>({
    id: "",
    name: "",
    description: "",
    color: "#A7B3C3",
    icon: "Package",
    status: "active",
  });

  useMemo(() => {
    if (editing) setForm(editing);
    else
      setForm({
        id: `w${Date.now()}`,
        name: "",
        description: "",
        color: "#A7B3C3",
        icon: "Package",
        status: "active",
      });
  }, [editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("warehouse.edit_type") : t("warehouse.add_type")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name) {
              toast.error(t("warehouse.toast_name_required"));
              return;
            }
            onSave(form);
          }}
          className="grid gap-4 py-2"
        >
          <div className="grid gap-2">
            <Label>{t("warehouse.type_name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Cold Storage"
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("warehouse.description")}</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("warehouse.color_code")}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-white/40 bg-transparent"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("warehouse.icon")}</Label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map((name) => {
                  const I = ICON_MAP[name];
                  const active = form.icon === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setForm({ ...form, icon: name })}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-lg border transition",
                        active
                          ? "border-navy bg-navy text-cream"
                          : "border-white/40 bg-white/40 hover:bg-white/70",
                      )}
                    >
                      <I className="size-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="bg-navy text-cream hover:bg-navy/90">
              {editing ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Analytics -------------------- */
function AnalyticsSection({ slug }: { slug?: string | null }) {
  const { t } = useTranslation();
  const [types] = useState<WarehouseType[]>(initialWarehouseTypes);
  const [managers] = useState<Manager[]>(initialManagers);
  const [selected, setSelected] = useState(types[0]?.id ?? "");
  const wh = types.find((t) => t.id === selected);
  const assigned = managers.filter((m) => m.warehouseId === selected).length;

  const capacity = [
    { name: "Used", value: 72, color: "#1D2D44" },
    { name: "Free", value: 28, color: "#A7B3C3" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-cream">{t("dashboard.analytics_title")}</h3>
          <p className="text-sm text-cream/70">{t("dashboard.analytics_subtitle")}</p>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full bg-white/10 text-cream sm:w-64">
            <SelectValue placeholder={t("dashboard.select_warehouse")} />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { labelKey: "dashboard.stat_total_inventory", value: "12,840", icon: Boxes },
          { labelKey: "dashboard.stat_active_managers", value: assigned.toString(), icon: Users },
          { labelKey: "dashboard.stat_monthly_shipments", value: "684", icon: Truck },
          { labelKey: "dashboard.stat_capacity_used", value: "72%", icon: Activity },
        ].map((s) => (
          <GlassCard key={s.labelKey}>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-[#1a2942]/70">{t(s.labelKey)}</p>
              <s.icon className="size-4 text-[oklch(0.74_0.02_252)]" />
            </div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-[#1a2942]/70">{wh?.name}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-semibold">{t("dashboard.inventory_trend")}</h4>
          <ChartArea />
        </GlassCard>
        <GlassCard>
          <h4 className="mb-4 text-sm font-semibold">{t("dashboard.capacity_utilization")}</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={capacity}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {capacity.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs">
            {capacity.map((c) => (
              <span key={c.name} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: c.color }} />
                {t(`dashboard.capacity_${c.name.toLowerCase()}`)} {c.value}%
              </span>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-semibold">{t("dashboard.incoming_outgoing")}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shipmentsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A7B3C355" />
                <XAxis dataKey="month" stroke="#1D2D44" fontSize={12} />
                <YAxis stroke="#1D2D44" fontSize={12} />
                <RTooltip />
                <Legend />
                <Bar dataKey="incoming" fill="#1D2D44" radius={[6, 6, 0, 0]} />
                <Bar dataKey="outgoing" fill="#A7B3C3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard>
          <h4 className="mb-4 text-sm font-semibold">{t("dashboard.performance")}</h4>
          <div className="space-y-4">
            <Metric label={t("dashboard.metric_fulfillment")} value={96} />
            <Metric label={t("dashboard.metric_ontime")} value={89} />
            <Metric label={t("dashboard.metric_processing")} raw="3.2h" value={68} />
            <Metric label={t("dashboard.metric_damage")} raw="0.4%" value={4} inverted />
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h4 className="mb-4 text-sm font-semibold">
          {t("dashboard.recent_activity")} — {wh?.name}
        </h4>
        <ul className="divide-y divide-white/40">
          {recentActivity.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-3 text-sm">
              <span>{a.text}</span>
              <span className="text-xs text-[#1a2942]/70">{a.time}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}

function Metric({
  label,
  value,
  raw,
  inverted,
}: {
  label: string;
  value: number;
  raw?: string;
  inverted?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[#1a2942]/70">{label}</span>
        <span className="font-semibold">{raw ?? `${value}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/40">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${value}%`,
            background: inverted ? "#ef4444" : "linear-gradient(90deg, #1D2D44, #A7B3C3)",
          }}
        />
      </div>
    </div>
  );
}

function ChartArea() {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={inventoryTrend}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D2D44" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#1D2D44" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#A7B3C355" />
          <XAxis dataKey="day" stroke="#1D2D44" fontSize={11} />
          <YAxis stroke="#1D2D44" fontSize={11} />
          <RTooltip />
          <Area
            type="monotone"
            dataKey="inventory"
            stroke="#1D2D44"
            strokeWidth={2}
            fill="url(#g1)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------- Wallet -------------------- */
function WalletSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -end-20 -top-20 size-64 rounded-full bg-[oklch(0.78_0.16_75)]/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-wider text-[#1a2942]/70">
              {t("wallet.available_balance")}
            </p>
            <p className="mt-2 text-4xl font-bold">$24,820.45</p>
            <p className="mt-1 text-xs text-[#1a2942]/70">{t("wallet.updated_just_now")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button className="bg-navy text-cream hover:bg-navy/90">
                <Plus className="size-4" /> {t("wallet.top_up")}
              </Button>
              <Button variant="outline">
                <CreditCard className="size-4" /> {t("wallet.manage_cards")}
              </Button>
              <Button variant="outline">
                <ArrowUpRight className="size-4" /> {t("wallet.send")}
              </Button>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-[#1a2942]/70">
            {t("wallet.this_month")}
          </p>
          <div className="mt-2 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#1a2942]/70">{t("wallet.income")}</span>
              <span className="font-semibold text-emerald-600">+ $7,090</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1a2942]/70">{t("wallet.spending")}</span>
              <span className="font-semibold text-rose-600">− $2,369</span>
            </div>
            <div className="flex justify-between border-t border-white/40 pt-2">
              <span>{t("wallet.net")}</span>
              <span className="font-bold">+ $4,721</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/40 px-5 py-3">
          <h4 className="text-sm font-semibold">{t("wallet.recent_transactions")}</h4>
          <Button size="sm" variant="ghost">
            {t("wallet.view_all")}
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/40 hover:bg-transparent">
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("common.description")}</TableHead>
              <TableHead className="text-end">{t("common.amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {walletTransactions.map((t) => (
              <TableRow key={t.id} className="border-white/40">
                <TableCell className="text-[#1a2942]/70">{t.date}</TableCell>
                <TableCell className="font-medium">{t.description}</TableCell>
                <TableCell className="text-end">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold",
                      t.amount > 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {t.amount > 0 ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {t.amount > 0 ? "+" : "−"}${Math.abs(t.amount).toLocaleString()}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}

/* -------------------- Settings -------------------- */
function SettingsSection() {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <h4 className="text-sm font-semibold">{t("settings.profile_picture")}</h4>
        <p className="mb-4 text-xs text-[#1a2942]/70">{t("settings.profile_picture.desc")}</p>
        <div className="rounded-xl bg-navy/90 p-4">
          <ProfilePictureUpload role="admin" fallback="A" />
        </div>
      </GlassCard>
      <GlassCard>
        <h4 className="text-sm font-semibold">{t("settings.account")}</h4>
        <p className="mb-4 text-xs text-[#1a2942]/70">{t("settings.account.desc")}</p>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>{t("settings.full_name")}</Label>
            <Input defaultValue="Amelia Carter" />
          </div>
          <div className="grid gap-2">
            <Label>{t("settings.email")}</Label>
            <Input defaultValue="amelia@stockyard.io" />
          </div>
          <Button
            onClick={() => toast.success(t("settings.toast_profile_saved"))}
            className="bg-navy text-cream hover:bg-navy/90"
          >
            {t("common.save_changes")}
          </Button>
        </div>
      </GlassCard>
      <GlassCard className="lg:col-span-2">
        <h4 className="text-sm font-semibold">{t("settings.notifications")}</h4>
        <p className="mb-4 text-xs text-[#1a2942]/70">{t("settings.notifications.desc")}</p>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {[
            "settings.notif_new_shipments",
            "settings.notif_manager_updates",
            "settings.notif_low_inventory",
            "settings.notif_wallet_activity",
          ].map((k) => (
            <label
              key={k}
              className="flex items-center justify-between rounded-xl border border-white/40 bg-white/40 px-4 py-3"
            >
              <span>{t(k)}</span>
              <input
                type="checkbox"
                defaultChecked
                className="size-4 accent-[oklch(0.28_0.04_252)]"
              />
            </label>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* -------------------- Subscription Requests -------------------- */
function SubscriptionRequestsSection() {
  const { t } = useTranslation();
  const [subs, setSubs] = useState<SubscriptionRequest[]>(() => subscriptionStore.list());
  useEffect(() => subscriptionStore.subscribe(() => setSubs(subscriptionStore.list())), []);

  const act = (id: string, status: "approved" | "rejected" | "active") => {
    subscriptionStore.update(id, status);
    toast.success(t("dashboard.toast_request_status", { status }));
  };

  const badge = (s: SubscriptionRequest["status"]) =>
    s === "active"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
      : s === "approved"
        ? "bg-sky-500/15 text-sky-700 border-sky-300"
        : s === "rejected"
          ? "bg-rose-500/15 text-rose-700 border-rose-300"
          : "bg-amber-500/15 text-amber-700 border-amber-300";

  return (
    <div className="space-y-4">
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/40 px-5 py-3">
          <h4 className="text-sm font-semibold">{t("dashboard.subscription_requests")}</h4>
          <Badge variant="outline">
            {t("dashboard.pending_count", {
              count: subs.filter((s) => s.status === "pending").length,
            })}
          </Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/40 hover:bg-transparent">
              <TableHead>{t("common.company")}</TableHead>
              <TableHead>{t("sidebar.warehouses")}</TableHead>
              <TableHead>{t("dashboard.slok")}</TableHead>
              <TableHead>{t("dashboard.request_date")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-end">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[#1a2942]/70">
                  {t("dashboard.no_requests")}
                </TableCell>
              </TableRow>
            )}
            {subs.map((s) => (
              <TableRow key={s.id} className="border-white/40">
                <TableCell className="font-medium">{s.companyName}</TableCell>
                <TableCell>{s.warehouses}</TableCell>
                <TableCell className="font-mono text-xs">{s.slok}</TableCell>
                <TableCell className="text-[#1a2942]/70">{s.requestDate}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("capitalize", badge(s.status))}>
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  {s.status === "pending" && (
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => act(s.id, "approved")}
                        className="bg-navy text-cream hover:bg-navy/90"
                      >
                        {t("dashboard.approve")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => act(s.id, "rejected")}>
                        {t("order.reject")}
                      </Button>
                    </div>
                  )}
                  {s.status === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => act(s.id, "active")}
                      className="bg-navy text-cream hover:bg-navy/90"
                    >
                      {t("dashboard.activate")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-white/40">
        <Icon className="size-6 text-[#1a2942]/70" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-[#1a2942]/70">{subtitle}</p>
      </div>
    </div>
  );
}

/* -------------------- Products -------------------- */
function ProductsSection({ slug }: { slug?: string | null }) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetchProducts(slug);
      setProducts(res.products);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  const filtered = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.brand.toLowerCase().includes(query.toLowerCase()) ||
          p.type.toLowerCase().includes(query.toLowerCase()),
      )
    : products;

  const handleSave = async (data: ProductInput & { id?: number }) => {
    if (!slug) return;
    setSaving(true);
    try {
      if (data.id) {
        await updateProduct(slug, data.id, data);
        toast.success(t("product.updated"));
      } else {
        await createProduct(slug, data);
        toast.success(t("product.created"));
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.operation_failed"));
    } finally {
      setSaving(false);
    }
  };

  if (!slug) {
    return (
      <GlassCard>
        <EmptyState
          icon={Package}
          title={t("product.connect_tenant")}
          subtitle={t("product.connect_tenant.desc")}
        />
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-cream/80">
            {t("product.catalogue_count", { count: products.length })}
          </p>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="bg-navy text-cream hover:bg-navy/90"
          >
            <Plus className="size-4" /> {t("product.add")}
          </Button>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-cream/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("product.search_placeholder")}
            className="h-9 w-full rounded-full border border-white/15 bg-white/5 ps-9 pe-3 text-sm text-cream placeholder:text-cream/40 outline-none transition focus:border-[oklch(0.78_0.16_75)]/60"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i}>
              <Skeleton className="h-5 w-32 bg-white/20" />
              <Skeleton className="mt-2 h-4 w-48 bg-white/20" />
              <Skeleton className="mt-2 h-4 w-24 bg-white/20" />
            </GlassCard>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Package}
            title={t("product.no_products_found")}
            subtitle={query ? t("product.try_different_search") : t("product.no_products_tenant")}
          />
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="group transition hover:-translate-y-0.5 hover:shadow-2xl">
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-[#6366f1]/20">
                    <Package className="size-5 text-[#6366f1]" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {p.type}
                  </Badge>
                </div>
                <h4 className="mt-3 text-base font-semibold">{p.name}</h4>
                <p className="mt-1 text-sm text-[#1a2942]/70">{p.brand}</p>
                {p.piece_barcode && (
                  <div className="mt-2 flex justify-center">
                    <Barcode
                      value={p.piece_barcode}
                      width={1.2}
                      height={30}
                      fontSize={10}
                      margin={0}
                      background="transparent"
                    />
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-white/40 pt-3 text-xs">
                  <span>{t("product.price_per_unit", { price: `$${p.selling_price}` })}</span>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => {
                        setEditing(p);
                        setOpen(true);
                      }}
                      className="text-navy hover:text-navy/80"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!slug) return;
                        try {
                          await deleteProduct(slug, p.id);
                          toast.success(t("product.deleted"));
                          load();
                        } catch (err: any) {
                          toast.error(err.response?.data?.message || t("common.delete_failed"));
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-[#1a2942]/70">
                    {t("product.per_pack", { count: p.units_per_packing })}
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

/* -------------------- Shipments -------------------- */
function ShipmentsSection({ slug }: { slug?: string | null }) {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<BackendWarehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ warehouse_id: "", factory_name: "", arrival_date: "" });
  const [items, setItems] = useState<ShipmentItemInput[]>([
    { product_id: 0, quantity: 1, purchase_price: 0 },
  ]);

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetchShipments(slug);
      setShipments(res.shipments);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetchWarehouses(slug)
      .then((res) => setWarehouses(res.warehouses))
      .catch(() => {});
    fetchProducts(slug)
      .then((res) => setProducts(res.products))
      .catch(() => {});
  }, [slug]);

  const handleReceive = async (id: number) => {
    if (!slug) return;
    try {
      await receiveShipment(slug, id);
      toast.success(t("shipment.received_success"));
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("shipment.toast_receive_failed"));
    }
  };

  const updateItem = (index: number, patch: Partial<ShipmentItemInput>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const handleProductChange = (index: number, productId: number) => {
    const product = products.find((p) => p.id === productId);
    updateItem(index, {
      product_id: productId,
      purchase_price: product?.current_purchase_price ?? 0,
    });
  };

  const addItem = () =>
    setItems((prev) => [...prev, { product_id: 0, quantity: 1, purchase_price: 0 }]);

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleCreate = async () => {
    if (!slug) return;
    if (!form.warehouse_id) {
      toast.error(t("shipment.err_warehouse"));
      return;
    }
    if (!form.factory_name.trim()) {
      toast.error(t("shipment.err_factory"));
      return;
    }
    if (!form.arrival_date) {
      toast.error(t("shipment.err_arrival"));
      return;
    }
    const payloadItems = items.filter((it) => it.product_id > 0 && it.quantity >= 1);
    if (payloadItems.length === 0) {
      toast.error(t("shipment.err_items"));
      return;
    }
    setSaving(true);
    try {
      await createShipment(slug, {
        warehouse_id: Number(form.warehouse_id),
        factory_name: form.factory_name.trim(),
        arrival_date: form.arrival_date,
        items: payloadItems.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          purchase_price: it.purchase_price,
        })),
      });
      toast.success(t("shipment.created"));
      setOpen(false);
      setForm({ warehouse_id: "", factory_name: "", arrival_date: "" });
      setItems([{ product_id: 0, quantity: 1, purchase_price: 0 }]);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.operation_failed"));
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s: ShipmentStatus) => {
    const map: Record<ShipmentStatus, string> = {
      pending: "bg-amber-500/15 text-amber-700 border-amber-300",
      in_transit: "bg-sky-500/15 text-sky-700 border-sky-300",
      received: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
    };
    return map[s] ?? "bg-gray-500/15 text-gray-700";
  };

  if (!slug) {
    return (
      <GlassCard>
        <EmptyState
          icon={Truck}
          title={t("shipment.connect_tenant")}
          subtitle={t("shipment.connect_tenant.desc")}
        />
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-cream/80">{t("shipment.count", { count: shipments.length })}</p>
        <Button onClick={() => setOpen(true)} className="bg-navy text-cream hover:bg-navy/90">
          <Plus className="size-4" /> {t("shipment.add")}
        </Button>
      </div>

      {loading ? (
        <GlassCard>
          <Skeleton className="h-40 w-full bg-white/20" />
        </GlassCard>
      ) : shipments.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={Truck}
            title={t("shipment.no_shipments")}
            subtitle={t("shipment.no_shipments_subtitle")}
          />
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/40 hover:bg-transparent">
                <TableHead>{t("common.id")}</TableHead>
                <TableHead>{t("shipment.factory")}</TableHead>
                <TableHead>{t("common.warehouse")}</TableHead>
                <TableHead>{t("shipment.total")}</TableHead>
                <TableHead>{t("shipment.arrival")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-end">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((s) => (
                <TableRow key={s.id} className="border-white/40">
                  <TableCell className="font-mono text-xs">#{s.id}</TableCell>
                  <TableCell className="font-medium">{s.factory_name}</TableCell>
                  <TableCell className="text-[#1a2942]/70">
                    {s.warehouse?.warehouse_name ?? "—"}
                  </TableCell>
                  <TableCell>${Number(s.total_price).toLocaleString()}</TableCell>
                  <TableCell>
                    {s.arrival_date ? format(new Date(s.arrival_date), "MMM dd") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", statusBadge(s.status))}>
                      {s.status_label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    {s.can_receive ? (
                      <Button
                        size="sm"
                        onClick={() => handleReceive(s.id)}
                        className="bg-navy text-cream hover:bg-navy/90"
                      >
                        <CheckCircle2 className="size-3.5" /> {t("shipment.receive")}
                      </Button>
                    ) : (
                      <span className="text-xs text-[#1a2942]/70">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1D2D44]">{t("shipment.add")}</DialogTitle>
            <DialogDescription>{t("shipment.add.desc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("shipment.warehouse")} *</Label>
              <Select
                value={form.warehouse_id}
                onValueChange={(v) => setForm({ ...form, warehouse_id: v })}
              >
                <SelectTrigger className="text-[#1D2D44]">
                  <SelectValue placeholder={t("shipment.select_warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.warehouse_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-[#1D2D44]">{t("shipment.factory_name")} *</Label>
                <Input
                  value={form.factory_name}
                  onChange={(e) => setForm({ ...form, factory_name: e.target.value })}
                  placeholder={t("shipment.factory_name")}
                  className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[#1D2D44]">{t("shipment.arrival_date")} *</Label>
                <Input
                  type="date"
                  value={form.arrival_date}
                  onChange={(e) => setForm({ ...form, arrival_date: e.target.value })}
                  className="text-[#1D2D44]"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-[#1D2D44]">{t("shipment.items")} *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="h-8 text-xs bg-[#f2a618] text-[#1D2D44] border border-[#1D2D44]/20 hover:bg-[#f2a618]/90 hover:text-[#1D2D44] opacity-100"
                >
                  <Plus className="size-3.5 me-1" /> {t("shipment.add_item")}
                </Button>
              </div>
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_5.5rem_7rem_auto]"
                >
                  <div className="grid gap-1">
                    <Label className="text-xs text-[#1D2D44]">{t("shipment.product")}</Label>
                    <Select
                      value={item.product_id ? String(item.product_id) : ""}
                      onValueChange={(v) => handleProductChange(index, Number(v))}
                    >
                      <SelectTrigger className="h-9 text-[#1D2D44]">
                        <SelectValue placeholder={t("shipment.select_product")} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} — {p.brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-[#1D2D44]">{t("shipment.quantity")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                      className="h-9 text-[#1D2D44]"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-[#1D2D44]">{t("shipment.purchase_price")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.purchase_price}
                      onChange={(e) =>
                        updateItem(index, { purchase_price: Number(e.target.value) })
                      }
                      className="h-9 text-[#1D2D44]"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="h-9 px-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="bg-[#f2a618] text-[#1D2D44] border border-[#1D2D44]/20 hover:bg-[#f2a618]/90 hover:text-[#1D2D44] opacity-100"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-navy text-cream hover:bg-navy/90"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin me-1" />
              ) : (
                <Send className="size-4 me-1" />
              )}{" "}
              {t("shipment.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Product Dialog -------------------- */
function ProductDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Product | null;
  onSave: (d: ProductInput & { id?: number }) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ProductInput & { id?: number }>({
    name: "",
    brand: "",
    type: "",
    piece_barcode: "",
    parcel_barcode: "",
    units_per_packing: 1,
    current_purchase_price: 0,
    selling_price: 0,
    parcel_length: 0,
    parcel_width: 0,
    parcel_height: 0,
  });

  const toBarcode = (name: string, parcel = false) => {
    const cleaned = name
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .replace(/\s+/g, "-");
    if (!cleaned) return "";
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return cleaned + (parcel ? "-PARCEL-" : "-") + suffix;
  };

  useMemo(() => {
    if (editing) {
      setForm({
        id: editing.id,
        name: editing.name,
        brand: editing.brand,
        type: editing.type,
        piece_barcode: editing.piece_barcode ?? "",
        parcel_barcode: editing.parcel_barcode ?? "",
        units_per_packing: editing.units_per_packing,
        current_purchase_price: editing.current_purchase_price,
        selling_price: editing.selling_price,
        parcel_length: editing.parcel_length,
        parcel_width: editing.parcel_width,
        parcel_height: editing.parcel_height,
      });
    } else {
      setForm({
        name: "",
        brand: "",
        type: "",
        piece_barcode: "",
        parcel_barcode: "",
        units_per_packing: 1,
        current_purchase_price: 0,
        selling_price: 0,
        parcel_length: 0,
        parcel_width: 0,
        parcel_height: 0,
      });
    }
  }, [editing]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.brand || !form.type) {
      toast.error(t("product.toast_required_fields"));
      return;
    }
    if (!form.piece_barcode) {
      toast.error(t("product.toast_barcode_required"));
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1D2D44]">
            {editing ? t("product.edit") : t("product.add")}
          </DialogTitle>
          <DialogDescription>
            {editing ? t("product.edit.desc") : t("product.add.desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.name")} *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm({
                    ...form,
                    name,
                    piece_barcode: editing ? form.piece_barcode : toBarcode(name),
                    parcel_barcode: editing ? form.parcel_barcode : toBarcode(name, true),
                  });
                }}
                placeholder={t("product.name_placeholder")}
                required
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>{" "}
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.brand")} *</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder={t("product.brand_placeholder")}
                required
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.type")} *</Label>
              <Input
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder={t("product.type_placeholder")}
                required
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.units_per_packing")} *</Label>
              <Input
                type="number"
                min={1}
                value={form.units_per_packing}
                onChange={(e) => setForm({ ...form, units_per_packing: Number(e.target.value) })}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.barcode")}</Label>
              <Input
                value={form.piece_barcode}
                readOnly
                placeholder={t("product.barcode_auto")}
                className="bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.parcel_barcode")}</Label>
              <Input
                value={form.parcel_barcode}
                readOnly
                placeholder={t("product.barcode_auto")}
                className="bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.purchase_price")} ($) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.current_purchase_price}
                onChange={(e) =>
                  setForm({ ...form, current_purchase_price: Number(e.target.value) })
                }
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.selling_price")} ($) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
          </div>

          {/* Dimension Fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.parcel_length")} (cm)</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.parcel_length}
                onChange={(e) => setForm({ ...form, parcel_length: Number(e.target.value) })}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.parcel_width")} (cm)</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.parcel_width}
                onChange={(e) => setForm({ ...form, parcel_width: Number(e.target.value) })}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#1D2D44]">{t("product.parcel_height")} (cm)</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.parcel_height}
                onChange={(e) => setForm({ ...form, parcel_height: Number(e.target.value) })}
                className="text-[#1D2D44] placeholder:text-[#1D2D44]/50 focus:text-[#1D2D44]"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-[#f2a618] text-[#1D2D44] hover:bg-[#E2DDD3] border border-[#1D2D44]/20"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving} className="bg-navy text-cream hover:bg-navy/90">
              {saving ? t("common.saving") : editing ? t("common.save_changes") : t("product.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
