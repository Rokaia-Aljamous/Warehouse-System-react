import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Users, Warehouse, BarChart3, Wallet, Settings as SettingsIcon,
  Search, Bell, Menu, Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  Snowflake, Package, Flame, Truck, AlertTriangle, TrendingUp, Activity,
  CreditCard, ArrowUpRight, ArrowDownRight, CheckCircle2, Boxes,
  PackagePlus, Send, Save, CalendarIcon, Loader2, LogIn, LogOut, User, Globe,
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
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  initialManagers, initialWarehouseTypes, inventoryTrend, shipmentsData,
  recentActivity, walletTransactions, generateWhmId,
  type Manager, type WarehouseType,
} from "@/lib/demo-data";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { getProfilePic, subscribeProfilePic } from "@/lib/profile-storage";
import { subscriptionStore, type SubscriptionRequest } from "@/lib/subscription-data";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  getStoredUser, setStoredUser, clearStoredUser,
  getCsrfCookie, loginDashboard, logoutDashboard,
} from "@/lib/api";
import {
  fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  fetchDeleteWarehouseInfo, type DeleteWarehouseInfo,
  fetchProducts, createProduct, updateProduct, deleteProduct,
  fetchShipments, receiveShipment,
  fetchEmployees, createEmployee, updateEmployee, deleteEmployee, logoutEmployee,
  getTypeStyle,
  type Warehouse as BackendWarehouse, type WarehouseInput,
  type Product, type ProductInput,
  type Shipment, type ShipmentStatus,
  type Employee, type EmployeeInput,
} from "@/lib/dashboard-api";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Stockyard" },
      { name: "description", content: "Manage warehouses, managers, analytics and your payment wallet." },
    ],
  }),
});

type SectionId = "dashboard" | "managers" | "warehouses" | "products" | "shipments" | "analytics" | "wallet" | "settings";

const NAV: { id: SectionId; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", labelKey: "sidebar.dashboard", icon: LayoutDashboard },
  { id: "managers", labelKey: "sidebar.employees", icon: Users },
  { id: "warehouses", labelKey: "sidebar.warehouses", icon: Warehouse },
  { id: "products", labelKey: "sidebar.products", icon: Package },
  { id: "shipments", labelKey: "sidebar.shipments", icon: Truck },
  { id: "analytics", labelKey: "feature.analytics", icon: BarChart3 },
  { id: "wallet", labelKey: "Wallet", icon: Wallet },
  { id: "settings", labelKey: "sidebar.settings", icon: SettingsIcon },
];

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Snowflake, Package, Flame, Truck, Boxes, Warehouse,
};

export function DashboardPage() {
  const { t } = useTranslation();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [managers, setManagers] = useState<Manager[]>(initialManagers);
  const [types, setTypes] = useState<WarehouseType[]>(initialWarehouseTypes);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(getStoredUser()?.tenant?.url_slug ?? null);
  const storedUser = getStoredUser();
  const userInitials = storedUser?.full_name
    ? storedUser.full_name.split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const [loginSlug, setLoginSlug] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    if (!slug) return;
    setLogoutLoading(true);
    try {
      await logoutDashboard(slug);
    } catch { /* ignore server error, still clear local */ }
    clearStoredUser();
    setSlug(null);
    setLogoutLoading(false);
  };

  useEffect(() => {
    setAvatar(getProfilePic("admin"));
    return subscribeProfilePic("admin", setAvatar);
  }, []);

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
                const res = await loginDashboard(loginSlug.trim(), loginSlug.trim(), loginPw);
                setStoredUser({
                  id: res.dashboard_user.id,
                  full_name: res.dashboard_user.full_name,
                  email: res.dashboard_user.full_name.toLowerCase().replace(/\s+/g, ".") + "@demo.io",
                  birthday: null,
                  tenant: {
                    id: res.dashboard_user.tenant.id,
                    user_id: res.dashboard_user.tenant.user_id,
                    subscription_plan_id: res.dashboard_user.tenant.subscription_plan_id,
                    company_name: res.dashboard_user.tenant.company_name,
                    warehouses_count: res.dashboard_user.tenant.warehouses_count,
                    url_slug: res.dashboard_user.tenant.url_slug,
                    status: res.dashboard_user.tenant.status,
                    subscription_start_date: res.dashboard_user.tenant.subscription_start_date ?? "",
                    subscription_end_date: res.dashboard_user.tenant.subscription_end_date ?? "",
                    subscription_plan: {
                      id: res.dashboard_user.tenant.subscription_plan?.id ?? 0,
                      name: res.dashboard_user.tenant.subscription_plan?.name ?? "",
                      duration_days: res.dashboard_user.tenant.subscription_plan?.duration_days ?? 0,
                      price_per_warehouse: res.dashboard_user.tenant.subscription_plan?.price_per_warehouse ?? "0",
                      is_active: res.dashboard_user.tenant.subscription_plan?.is_active ?? true,
                    },
                  },
                });
                setSlug(res.dashboard_user.tenant.url_slug);
                toast.success(t("manager.login.welcome", { name: res.dashboard_user.full_name }));
              } catch (err: any) {
                const msg = err.response?.data?.message
                  || err.response?.data?.errors?.[Object.keys(err.response?.data?.errors ?? {})[0]]?.[0]
                  || "Login failed. Check your credentials.";
                toast.error(msg);
              } finally {
                setLoginLoading(false);
              }
            }}
            className="space-y-4 rounded-2xl bg-[#f0ecdb] p-6 shadow-xl"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1a2942]">Tenant Slug</label>
              <input
                value={loginSlug}
                onChange={(e) => setLoginSlug(e.target.value)}
                placeholder="e.g. roro"
                required
                className="w-full rounded-xl border border-[#1a2942]/20 bg-white px-4 py-2.5 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1a2942]">Password</label>
              <input
                type="password"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
                placeholder="Your password"
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
                <><Loader2 className="size-4 animate-spin" /> Connecting…</>
              ) : (
                <><LogIn className="size-4" /> Enter dashboard</>
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
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/10 bg-navy text-cream transition-all duration-300 md:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[oklch(0.78_0.16_75)] shadow-lg">
              <Warehouse className="size-5 text-white" />
            </div>
            {!collapsed && <span className="text-base font-bold">Stockyard</span>}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-1.5 text-cream/70 transition hover:bg-white/10 hover:text-cream"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
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
                    <Icon className={cn("size-4 shrink-0 transition", active && "text-[oklch(0.85_0.16_75)]")} />
                    {!collapsed && <span>{t(item.labelKey)}</span>}
                    {!collapsed && item.id === "warehouses" && (
                      <span className="ml-auto inline-flex size-2 animate-pulse rounded-full bg-[oklch(0.78_0.16_75)]" />
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
              <p className="truncate text-[10px] text-cream/50">{storedUser.tenant?.company_name ?? ""}</p>
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
                {!collapsed && <span>{logoutLoading ? "Logging out…" : "Log out"}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Log out</TooltipContent>}
          </Tooltip>
        </div>
      </aside>

      {/* Main */}
      <div className={cn("flex min-h-screen flex-1 flex-col transition-all duration-300", collapsed ? "md:pl-[72px]" : "md:pl-64")}>
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-navy/80 px-4 text-cream backdrop-blur-xl md:px-6">
          <button className="rounded-lg p-2 text-cream/70 hover:bg-white/10 md:hidden" aria-label="Menu">
            <Menu className="size-5" />
          </button>
          <h1 className="text-base font-semibold capitalize md:text-lg">
            {t(NAV.find((n) => n.id === section)?.labelKey ?? "")}
          </h1>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <LanguageToggle variant="header" />
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream/50" />
              <input
                placeholder="Search anything..."
                className="h-9 w-64 rounded-full border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-cream placeholder:text-cream/40 outline-none transition focus:w-72 focus:border-[oklch(0.78_0.16_75)]/60"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="relative rounded-full p-2 text-cream/80 transition hover:bg-white/10">
                  <Bell className="size-4" />
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[oklch(0.78_0.16_75)]" />
                </button>
              </TooltipTrigger>
              <TooltipContent>3 new notifications</TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-3">
              <div className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-[oklch(0.78_0.16_75)] text-xs font-bold text-navy">
                {avatar ? <img src={avatar} alt="me" className="h-full w-full object-cover" /> : userInitials}
              </div>
              <span className="hidden text-xs font-semibold sm:inline">{storedUser?.full_name ?? "Owner"}</span>
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
                <ManagersSection slug={slug} managers={managers} setManagers={setManagers} types={types} />
              )}
              {section === "warehouses" && (
                <WarehousesSection types={types} setTypes={setTypes} managers={managers} slug={slug} />
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
    <div className={cn("glass-light rounded-2xl p-5 shadow-xl text-[#1a2942]", className)}>{children}</div>
  );
}

/* -------------------- Overview -------------------- */
function Overview({ slug }: { slug: string | null }) {
  const [data, setData] = useState<{ warehouses: number; products: number; shipments: number; employees: number } | null>(null);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetchWarehouses(slug).catch(() => ({ warehouses: [], allowed_warehouses_count: 0, current_warehouses_count: 0 })),
      fetchProducts(slug).catch(() => ({ products: [] })),
      fetchShipments(slug).catch(() => ({ shipments: [] })),
    ]).then(([wRes, pRes, sRes]) => {
      const employees = new Set<number>();
      for (const w of wRes.warehouses) {
        fetchEmployees(slug, w.id).then((eRes) => {
          eRes.employees.forEach((e) => employees.add(e.id));
        }).catch(() => {});
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
    { label: "Warehouses", value: data ? data.warehouses.toString() : "—", icon: Warehouse, trend: "active" },
    { label: "Products", value: data ? data.products.toString() : "—", icon: Package, trend: "in stock" },
    { label: "Shipments", value: data ? data.shipments.toString() : "—", icon: Truck, trend: "this month" },
    { label: "Employees", value: data ? (data.employees || "—").toString() : "—", icon: Users, trend: "on staff" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="transition hover:-translate-y-0.5 hover:shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">{s.label}</p>
                <s.icon className="size-4 text-[oklch(0.74_0.02_252)]" />
              </div>
              <p className="mt-3 text-3xl font-bold text-[#1a2942]">{s.value}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="size-3" /> {s.trend}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Inventory trend</h3>
              <p className="text-xs text-[#1a2942]/70">Last 30 days (demo)</p>
            </div>
          </div>
          <ChartArea />
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 text-sm font-semibold">Quick summary</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3 transition hover:bg-white/60">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#6366f1]/20">
                <Warehouse className="size-4 text-[#6366f1]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Total warehouses</p>
                <p className="text-xs text-[#1a2942]/70">{data ? data.warehouses : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3 transition hover:bg-white/60">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#10B981]/20">
                <Package className="size-4 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Total products</p>
                <p className="text-xs text-[#1a2942]/70">{data ? data.products : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3 transition hover:bg-white/60">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#F59E0B]/20">
                <Truck className="size-4 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Total shipments</p>
                <p className="text-xs text-[#1a2942]/70">{data ? data.shipments : "—"}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="mb-4 text-sm font-semibold">Recent activity</h3>
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
  slug, managers, setManagers, types,
}: {
  slug?: string | null; managers: Manager[]; setManagers: React.Dispatch<React.SetStateAction<Manager[]>>; types: WarehouseType[];
}) {
  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const wRes = await fetchWarehouses(slug);
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
            });
          }
        }
        if (all.length > 0) setManagers(all);
      } catch { /* ignore */ }
    };
    load();
  }, [slug]);
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
      const wh = types.find((t) => t.id === m.warehouseId)?.name ?? "";
      return m.name.toLowerCase().includes(q) || wh.toLowerCase().includes(q) || m.whmId.toLowerCase().includes(q);
    });
  }, [managers, query, types]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSave = (data: { id?: string; name: string; age: number; warehouseId: string; password: string; status: Manager["status"] }) => {
    setLoading(true);
    setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      if (data.id) {
        setManagers((prev) => prev.map((m) => (m.id === data.id ? { ...m, name: data.name, age: data.age, warehouseId: data.warehouseId, status: data.status } as Manager : m)));
        toast.success("Manager updated");
      } else {
        const whmId = generateWhmId(managers);
        const newM: Manager = {
          id: `m${Date.now()}`,
          whmId,
          name: data.name,
          age: data.age,
          password: data.password,
          warehouseId: data.warehouseId,
          status: data.status,
          isTempPassword: true,
          lastPasswordChange: today,
          role: "Manager",
        };
        setManagers((prev) => [newM, ...prev]);
        toast.success(`Manager added · ${whmId}`);
      }
      setLoading(false);
      setOpen(false);
      setEditing(null);
    }, 600);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setManagers((prev) => prev.filter((m) => m.id !== deleteId));
    toast.success("Manager removed");
    setDeleteId(null);
  };

  const handleForceReset = () => {
    if (!resetId || resetPw.length < 6) {
      toast.error("Temporary password must be at least 6 characters");
      return;
    }
    setManagers((prev) => prev.map((m) => m.id === resetId ? { ...m, password: resetPw, isTempPassword: true, lastPasswordChange: new Date().toISOString().slice(0, 10) } : m));
    toast.success("Password reset · manager will be prompted on next login");
    setResetId(null);
    setResetPw("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#1a2942]/70" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search by name, ID or warehouse"
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="bg-navy text-cream hover:bg-navy/90"
        >
          <Plus className="size-4" /> Add manager
        </Button>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No managers found" subtitle="Adjust your search or add a new manager." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/40 hover:bg-transparent">
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Age</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last password change</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((m) => {
                const wh = types.find((t) => t.id === m.warehouseId);
                return (
                  <TableRow key={m.id} className="border-white/40">
                    <TableCell className="font-mono text-xs">{m.whmId}</TableCell>
                    <TableCell className="font-medium">
                      {m.name}
                      {m.isTempPassword && (
                        <Badge variant="outline" className="ml-2 border-amber-400/50 bg-amber-100/40 text-amber-800">temp pw</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{m.age}</TableCell>
                    <TableCell>
                      {wh && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${wh.color}25`, color: "#1D2D44" }}>
                          <span className="size-1.5 rounded-full" style={{ background: wh.color }} />
                          {wh.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === "active" ? "default" : "secondary"} className={cn(m.status === "active" ? "bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20" : "")}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-[#1a2942]/70 md:table-cell">{m.lastPasswordChange}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={async () => {
                              const empId = parseInt(m.id.replace("emp_", ""), 10);
                              const whId = parseInt(m.warehouseId, 10);
                              if (!slug || !empId || !whId) return;
                              try {
                                await logoutEmployee(slug, whId, empId);
                                toast.success(`${m.name} logged out`);
                              } catch (err: any) {
                                toast.error(err.response?.data?.message || "Logout failed");
                              }
                            }}>
                              <LogOut className="size-3.5 text-sky-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Log out this manager</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => { setResetId(m.id); setResetPw(""); }}>
                              <AlertTriangle className="size-3.5 text-amber-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Force password reset</TooltipContent>
                        </Tooltip>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(m.id)} className="text-destructive hover:text-destructive">
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
            <span>Page {page} of {totalPages} • {filtered.length} total</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      <ManagerDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        types={types}
        onSave={handleSave}
        loading={loading}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> Delete manager?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the manager and revoke their warehouse assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!resetId} onOpenChange={(o) => { if (!o) { setResetId(null); setResetPw(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Force password reset</DialogTitle>
            <DialogDescription>
              Set a new temporary password. The manager will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Temporary password</Label>
            <Input type="text" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="min 6 characters" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetId(null); setResetPw(""); }}>Cancel</Button>
            <Button onClick={handleForceReset} className="bg-navy text-cream hover:bg-navy/90">Reset password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManagerDialog({
  open, onOpenChange, editing, types, onSave, loading,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  editing: Manager | null; types: WarehouseType[];
  onSave: (m: { id?: string; name: string; age: number; warehouseId: string; password: string; status: Manager["status"] }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: "", age: 30, password: "",
    warehouseId: types[0]?.id ?? "", status: "active" as Manager["status"],
  });

  useMemo(() => {
    if (editing) {
      setForm({
        name: editing.name, age: editing.age, password: "",
        warehouseId: editing.warehouseId, status: editing.status,
      });
    } else {
      setForm({ name: "", age: 30, password: "", warehouseId: types[0]?.id ?? "", status: "active" });
    }
  }, [editing, types]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.warehouseId) {
      toast.error("Please fill required fields");
      return;
    }
    if (!editing && form.password.length < 6) {
      toast.error("Temporary password must be at least 6 characters");
      return;
    }
    if (form.age < 18 || form.age > 70) {
      toast.error("Age must be between 18 and 70");
      return;
    }
    onSave({
      ...(editing ? { id: editing.id } : {}),
      name: form.name, age: form.age, password: form.password,
      warehouseId: form.warehouseId, status: form.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit manager" : "Add warehouse manager"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update manager details. Use force reset to change the password." : "An ID (WHM-XXX) is generated automatically. The manager logs in with their Name + temporary password."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Name (username)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed" required />
            </div>
            <div className="grid gap-2">
              <Label>Age</Label>
              <Input type="number" min={18} max={70} value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Assign to warehouse</Label>
            <Select value={form.warehouseId} onValueChange={(v) => setForm({ ...form, warehouseId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!editing && (
            <div className="grid gap-2">
              <Label>Temporary password</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 characters" required />
              <p className="text-xs text-[#1a2942]/70">Manager will be required to change this on first login.</p>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Manager["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-navy text-cream hover:bg-navy/90">
              {loading ? "Saving..." : editing ? "Save changes" : "Add manager"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Warehouses -------------------- */
function WarehousesSection({
  types, setTypes, managers, slug,
}: {
  types: WarehouseType[]; setTypes: React.Dispatch<React.SetStateAction<WarehouseType[]>>; managers: Manager[]; slug?: string | null;
}) {
  const hasBackend = !!slug;

  if (!hasBackend) {
    return <WarehouseTypesSection types={types} setTypes={setTypes} managers={managers} />;
  }
  return <WarehouseManager slug={slug} />;
}

/* -------------------- My Warehouses (Backend) -------------------- */
function WarehouseManager({ slug }: { slug: string }) {
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWarehouses(slug);
      setWarehouses(res.warehouses);
      setAllowedCount(res.allowed_warehouses_count);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const atLimit = warehouses.length >= allowedCount;

  const handleSave = async (data: WarehouseInput & { id?: number }) => {
    if (!data.id && atLimit) {
      toast.error(`Subscription limit reached (${allowedCount} warehouses). Upgrade to add more.`);
      return;
    }
    setSaving(true);
    try {
      if (data.id) {
        await updateWarehouse(slug, data.id, data);
        toast.success("Warehouse updated");
      } else {
        await createWarehouse(slug, data);
        toast.success("Warehouse added");
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const existingTypes = [...new Set(warehouses.map((w) => w.type))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-cream">Your Warehouses</h3>
          <p className="text-xs text-[#1a2942]/70">
            {loading ? "Loading..." : `${warehouses.length} of ${allowedCount} warehouses used`}
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          disabled={atLimit}
          className="bg-navy text-cream hover:bg-navy/90"
          title={atLimit ? `Upgrade to add more (limit: ${allowedCount})` : "Add a warehouse"}
        >
          <Plus className="size-4" /> Add warehouse
        </Button>
      </div>

      {atLimit && !loading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          Subscription limit reached. You can manage existing warehouses or upgrade your plan.
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
            <Button variant="outline" onClick={load} className="mt-2">Retry</Button>
          </div>
        </GlassCard>
      ) : warehouses.length === 0 ? (
        <GlassCard><EmptyState icon={Warehouse} title="No warehouses yet" subtitle="Add your first warehouse to get started." /></GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w, i) => {
            const style = getTypeStyle(w.type);
            const Icon = ICON_MAP[style.icon] ?? Package;
            const manager = w.employees?.find(e => e.status === 'active');
            return (
              <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="group h-full transition hover:-translate-y-0.5 hover:shadow-2xl">
                  <div className="flex items-start justify-between">
                    <div className="flex size-11 items-center justify-center rounded-xl" style={{ background: `${style.color}25` }}>
                      <Icon className="size-5" style={{ color: style.color }} />
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{w.type}</Badge>
                  </div>
                  <h4 className="mt-3 text-base font-semibold">{w.warehouse_name}</h4>
                  <p className="mt-1 text-sm text-[#1a2942]/70">{w.location}, {w.governorate}</p>

                  {manager && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-[#1a2942]/80">
                      <User className="size-3.5" />
                      <span>{manager.system_user?.full_name ?? "Unknown"}</span>
                    </div>
                  )}

                  {(w.products && w.products.length > 0) && (
                    <div className="mt-2 space-y-1">
                      {w.products.slice(0, 4).map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs text-[#1a2942]/80">
                          <span className="truncate">{p.product_name}</span>
                          <span className="ml-2 shrink-0 font-medium">{p.pivot.quantity} units</span>
                        </div>
                      ))}
                      {w.products.length > 4 && (
                        <p className="text-[10px] text-[#1a2942]/50">+{w.products.length - 4} more</p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-white/40 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#1a2942]/70">
                      <Activity className="size-3.5" /> {w.area} m&sup2; &middot; ${w.financial_budgets.toLocaleString()}
                    </span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button size="sm" variant="ghost" className="text-navy hover:text-navy/80 hover:bg-white/60" onClick={() => { setEditing(w); setOpen(true); }}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={async () => {
                        setDeleteChecking(true);
                        setDeleteBlocked(null);
                        try {
                          const info = await fetchDeleteWarehouseInfo(slug, w.id);
                          if (info.employees_count > 0 || info.products_count > 0) {
                            setDeleteBlocked(`Cannot delete: ${info.employees_count} employee(s) and ${info.products_count} product(s) assigned. Remove them first.`);
                          } else {
                            setDeleteId(w.id);
                          }
                        } catch {
                          setDeleteBlocked("Failed to check warehouse status.");
                        } finally {
                          setDeleteChecking(false);
                        }
                      }}>
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

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o && !deleteDeleting) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete warehouse?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this warehouse and its data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteDeleting}
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (deleteId === null) return;
                setDeleteDeleting(true);
                try {
                  await deleteWarehouse(slug, deleteId);
                  toast.success("Warehouse deleted");
                  setDeleteId(null);
                  load();
                } catch (err: any) {
                  toast.error(err.response?.data?.message || "Delete failed");
                } finally {
                  setDeleteDeleting(false);
                }
              }}
            >
              {deleteDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteBlocked !== null} onOpenChange={(o) => { if (!o) setDeleteBlocked(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot delete warehouse</AlertDialogTitle>
            <AlertDialogDescription>{deleteBlocked}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteBlocked(null)}>OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const WAREHOUSE_TYPE_OPTIONS = ["Cold Storage", "Dry Storage", "Hazardous", "Fulfillment Center"];
const GOVERNORATE_OPTIONS = [
  "Damascus", "Aleppo", "Homs", "Latakia", "Hama", "Tartus", "Idlib",
  "Daraa", "Deir ez-Zor", "Al-Hasakah", "Al-Raqqa", "As-Suwayda", "Quneitra",
];

function WarehouseDialog({
  open, onOpenChange, editing, onSave, saving, existingTypes,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  editing: BackendWarehouse | null; onSave: (d: WarehouseInput & { id?: number }) => void;
  saving: boolean; existingTypes: string[];
}) {
  const allTypes = [...new Set([...WAREHOUSE_TYPE_OPTIONS, ...existingTypes])];
  const [form, setForm] = useState<WarehouseInput & { id?: number }>({
    warehouse_name: "", type: allTypes[0] ?? "Cold Storage",
    location: "", governorate: GOVERNORATE_OPTIONS[0] ?? "",
    area: 0, financial_budgets: 0, description: "",
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
        warehouse_name: "", type: allTypes[0] ?? "Cold Storage",
        location: "", governorate: GOVERNORATE_OPTIONS[0] ?? "",
        area: 0, financial_budgets: 0, description: "",
      });
    }
  }, [editing, existingTypes.join(",")]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.warehouse_name || !form.type || !form.location || !form.governorate || form.area <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit warehouse" : "Add warehouse"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update warehouse details." : "Fill in the details to create a new warehouse."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Warehouse name *</Label>
            <Input value={form.warehouse_name} onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })} placeholder="e.g. Cold Storage A" required />
          </div>
          <div className="grid gap-2">
            <Label>Type *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Location *</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Industrial Zone" required />
            </div>
            <div className="grid gap-2">
              <Label>Governorate *</Label>
              <Select value={form.governorate} onValueChange={(v) => setForm({ ...form, governorate: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOVERNORATE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Area (m&sup2;) *</Label>
              <Input type="number" min={0} step={0.01} value={form.area} onChange={(e) => setForm({ ...form, area: Number(e.target.value) })} placeholder="e.g. 500" required />
            </div>
            <div className="grid gap-2">
              <Label>Financial budget ($) *</Label>
              <Input type="number" min={0} step={0.01} value={form.financial_budgets} onChange={(e) => setForm({ ...form, financial_budgets: Number(e.target.value) })} placeholder="e.g. 10000" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes about this warehouse..."
              className="flex min-h-[80px] w-full rounded-xl border border-[#1a2942]/20 bg-white px-3 py-2 text-sm placeholder:text-[#1a2942]/40 focus:outline-none focus:ring-2 focus:ring-[#f3a523]"
            />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-navy text-cream hover:bg-navy/90">
              {saving ? "Saving..." : editing ? "Save changes" : "Add warehouse"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Warehouse Types -------------------- */
function WarehouseTypesSection({
  types, setTypes, managers,
}: {
  types: WarehouseType[]; setTypes: React.Dispatch<React.SetStateAction<WarehouseType[]>>; managers: Manager[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = (t: WarehouseType) => {
    if (types.some((x) => x.id === t.id)) {
      setTypes((prev) => prev.map((x) => (x.id === t.id ? t : x)));
      toast.success("Warehouse type updated");
    } else {
      setTypes((prev) => [...prev, t]);
      toast.success("Warehouse type added");
    }
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream/80">Organize warehouses by type and visual identity.</p>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-navy text-cream hover:bg-navy/90">
          <Plus className="size-4" /> Add warehouse type
        </Button>
      </div>

      {types.length === 0 ? (
        <GlassCard><EmptyState icon={Warehouse} title="No warehouse types yet" subtitle="Create your first warehouse type to begin." /></GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t, i) => {
            const Icon = ICON_MAP[t.icon] ?? Package;
            const count = managers.filter((m) => m.warehouseId === t.id).length;
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="group h-full transition hover:-translate-y-0.5 hover:shadow-2xl">
                  <div className="flex items-start justify-between">
                    <div className="flex size-11 items-center justify-center rounded-xl" style={{ background: `${t.color}25` }}>
                      <Icon className="size-5" style={{ color: t.color }} />
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                  </div>
                  <h4 className="mt-3 text-base font-semibold">{t.name}</h4>
                  <p className="mt-1 text-sm text-[#1a2942]/70">{t.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-white/40 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#1a2942]/70">
                      <Users className="size-3.5" /> {count} manager{count === 1 ? "" : "s"}
                    </span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(t.id)}>
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

      <WarehouseTypeDialog open={open} onOpenChange={setOpen} editing={editing} onSave={handleSave} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete warehouse type?</AlertDialogTitle>
            <AlertDialogDescription>Managers assigned to this type will need to be reassigned.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setTypes((prev) => prev.filter((t) => t.id !== deleteId));
                toast.success("Type deleted");
                setDeleteId(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const ICON_OPTIONS = ["Snowflake", "Package", "Flame", "Truck", "Boxes", "Warehouse"];

function WarehouseTypeDialog({
  open, onOpenChange, editing, onSave,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  editing: WarehouseType | null; onSave: (t: WarehouseType) => void;
}) {
  const [form, setForm] = useState<WarehouseType>({
    id: "", name: "", description: "", color: "#A7B3C3", icon: "Package", status: "active",
  });

  useMemo(() => {
    if (editing) setForm(editing);
    else setForm({ id: `w${Date.now()}`, name: "", description: "", color: "#A7B3C3", icon: "Package", status: "active" });
  }, [editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit type" : "Add warehouse type"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.name) { toast.error("Name required"); return; } onSave(form); }} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Type name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cold Storage" />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Color code</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-white/40 bg-transparent" />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map((name) => {
                  const I = ICON_MAP[name];
                  const active = form.icon === name;
                  return (
                    <button key={name} type="button" onClick={() => setForm({ ...form, icon: name })}
                      className={cn("flex aspect-square items-center justify-center rounded-lg border transition", active ? "border-navy bg-navy text-cream" : "border-white/40 bg-white/40 hover:bg-white/70")}>
                      <I className="size-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-navy text-cream hover:bg-navy/90">{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Analytics -------------------- */
function AnalyticsSection({ slug }: { slug?: string | null }) {
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
          <h3 className="text-lg font-semibold text-cream">Warehouse analytics</h3>
          <p className="text-sm text-cream/70">Performance and operations breakdown.</p>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full bg-white/10 text-cream sm:w-64"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
          <SelectContent>
            {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total inventory", value: "12,840", icon: Boxes },
          { label: "Active managers", value: assigned.toString(), icon: Users },
          { label: "Monthly shipments", value: "684", icon: Truck },
          { label: "Capacity used", value: "72%", icon: Activity },
        ].map((s) => (
          <GlassCard key={s.label}>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-[#1a2942]/70">{s.label}</p>
              <s.icon className="size-4 text-[oklch(0.74_0.02_252)]" />
            </div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-[#1a2942]/70">{wh?.name}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-semibold">Inventory trend</h4>
          <ChartArea />
        </GlassCard>
        <GlassCard>
          <h4 className="mb-4 text-sm font-semibold">Capacity utilization</h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={capacity} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {capacity.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs">
            {capacity.map((c) => (
              <span key={c.name} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: c.color }} />{c.name} {c.value}%</span>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h4 className="mb-4 text-sm font-semibold">Incoming vs outgoing shipments</h4>
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
          <h4 className="mb-4 text-sm font-semibold">Performance</h4>
          <div className="space-y-4">
            <Metric label="Order fulfillment rate" value={96} />
            <Metric label="On-time dispatch" value={89} />
            <Metric label="Avg processing (hrs)" raw="3.2h" value={68} />
            <Metric label="Damage rate" raw="0.4%" value={4} inverted />
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h4 className="mb-4 text-sm font-semibold">Recent activity — {wh?.name}</h4>
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

function Metric({ label, value, raw, inverted }: { label: string; value: number; raw?: string; inverted?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[#1a2942]/70">{label}</span>
        <span className="font-semibold">{raw ?? `${value}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/40">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: inverted ? "#ef4444" : "linear-gradient(90deg, #1D2D44, #A7B3C3)" }}
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
          <Area type="monotone" dataKey="inventory" stroke="#1D2D44" strokeWidth={2} fill="url(#g1)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------- Wallet -------------------- */
function WalletSection() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-[oklch(0.78_0.16_75)]/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-wider text-[#1a2942]/70">Available balance</p>
            <p className="mt-2 text-4xl font-bold">$24,820.45</p>
            <p className="mt-1 text-xs text-[#1a2942]/70">Updated just now</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button className="bg-navy text-cream hover:bg-navy/90"><Plus className="size-4" /> Top up</Button>
              <Button variant="outline"><CreditCard className="size-4" /> Manage cards</Button>
              <Button variant="outline"><ArrowUpRight className="size-4" /> Send</Button>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-[#1a2942]/70">This month</p>
          <div className="mt-2 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[#1a2942]/70">Income</span><span className="font-semibold text-emerald-600">+ $7,090</span></div>
            <div className="flex justify-between"><span className="text-[#1a2942]/70">Spending</span><span className="font-semibold text-rose-600">− $2,369</span></div>
            <div className="flex justify-between border-t border-white/40 pt-2"><span>Net</span><span className="font-bold">+ $4,721</span></div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/40 px-5 py-3">
          <h4 className="text-sm font-semibold">Recent transactions</h4>
          <Button size="sm" variant="ghost">View all</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/40 hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {walletTransactions.map((t) => (
              <TableRow key={t.id} className="border-white/40">
                <TableCell className="text-[#1a2942]/70">{t.date}</TableCell>
                <TableCell className="font-medium">{t.description}</TableCell>
                <TableCell className="text-right">
                  <span className={cn("inline-flex items-center gap-1 font-semibold", t.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                    {t.amount > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
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
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <h4 className="text-sm font-semibold">Profile picture</h4>
        <p className="mb-4 text-xs text-[#1a2942]/70">Shown in the header and across the app.</p>
        <div className="rounded-xl bg-navy/90 p-4">
          <ProfilePictureUpload role="admin" fallback="A" />
        </div>
      </GlassCard>
      <GlassCard>
        <h4 className="text-sm font-semibold">Account</h4>
        <p className="mb-4 text-xs text-[#1a2942]/70">Update your personal info.</p>
        <div className="space-y-3">
          <div className="grid gap-2"><Label>Full name</Label><Input defaultValue="Amelia Carter" /></div>
          <div className="grid gap-2"><Label>Email</Label><Input defaultValue="amelia@stockyard.io" /></div>
          <Button onClick={() => toast.success("Profile saved")} className="bg-navy text-cream hover:bg-navy/90">Save changes</Button>
        </div>
      </GlassCard>
      <GlassCard className="lg:col-span-2">
        <h4 className="text-sm font-semibold">Notifications</h4>
        <p className="mb-4 text-xs text-[#1a2942]/70">Control what you hear about.</p>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {["New shipments", "Manager updates", "Low inventory alerts", "Wallet activity"].map((n) => (
            <label key={n} className="flex items-center justify-between rounded-xl border border-white/40 bg-white/40 px-4 py-3">
              <span>{n}</span>
              <input type="checkbox" defaultChecked className="size-4 accent-[oklch(0.28_0.04_252)]" />
            </label>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* -------------------- Subscription Requests -------------------- */
function SubscriptionRequestsSection() {
  const [subs, setSubs] = useState<SubscriptionRequest[]>(() => subscriptionStore.list());
  useEffect(() => subscriptionStore.subscribe(() => setSubs(subscriptionStore.list())), []);

  const act = (id: string, status: "approved" | "rejected" | "active") => {
    subscriptionStore.update(id, status);
    toast.success(`Request ${status}`);
  };

  const badge = (s: SubscriptionRequest["status"]) =>
    s === "active" ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
    : s === "approved" ? "bg-sky-500/15 text-sky-700 border-sky-300"
    : s === "rejected" ? "bg-rose-500/15 text-rose-700 border-rose-300"
    : "bg-amber-500/15 text-amber-700 border-amber-300";

  return (
    <div className="space-y-4">
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/40 px-5 py-3">
          <h4 className="text-sm font-semibold">Subscription requests</h4>
          <Badge variant="outline">{subs.filter((s) => s.status === "pending").length} pending</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/40 hover:bg-transparent">
              <TableHead>Company</TableHead>
              <TableHead>Warehouses</TableHead>
              <TableHead>Slok</TableHead>
              <TableHead>Request date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-[#1a2942]/70">No requests yet.</TableCell></TableRow>
            )}
            {subs.map((s) => (
              <TableRow key={s.id} className="border-white/40">
                <TableCell className="font-medium">{s.companyName}</TableCell>
                <TableCell>{s.warehouses}</TableCell>
                <TableCell className="font-mono text-xs">{s.slok}</TableCell>
                <TableCell className="text-[#1a2942]/70">{s.requestDate}</TableCell>
                <TableCell><Badge variant="outline" className={cn("capitalize", badge(s.status))}>{s.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {s.status === "pending" && (
                    <div className="inline-flex gap-2">
                      <Button size="sm" onClick={() => act(s.id, "approved")} className="bg-navy text-cream hover:bg-navy/90">Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => act(s.id, "rejected")}>Reject</Button>
                    </div>
                  )}
                  {s.status === "approved" && (
                    <Button size="sm" onClick={() => act(s.id, "active")} className="bg-navy text-cream hover:bg-navy/90">Activate</Button>
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

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
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
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [slug]);

  const filtered = query.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.brand.toLowerCase().includes(query.toLowerCase()) ||
        p.type.toLowerCase().includes(query.toLowerCase())
      )
    : products;

  const handleSave = async (data: ProductInput & { id?: number }) => {
    if (!slug) return;
    setSaving(true);
    try {
      if (data.id) {
        await updateProduct(slug, data.id, data);
        toast.success("Product updated");
      } else {
        await createProduct(slug, data);
        toast.success("Product added");
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  if (!slug) {
    return <GlassCard><EmptyState icon={Package} title="Connect to a tenant" subtitle="Log in with a tenant slug to view products." /></GlassCard>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-cream/80">{products.length} products in catalogue.</p>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-navy text-cream hover:bg-navy/90">
            <Plus className="size-4" /> Add product
          </Button>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="h-9 w-full rounded-full border border-white/15 bg-white/5 pl-9 pr-3 text-sm text-cream placeholder:text-cream/40 outline-none transition focus:border-[oklch(0.78_0.16_75)]/60"
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
        <GlassCard><EmptyState icon={Package} title="No products found" subtitle={query ? "Try a different search term." : "No products in this tenant yet."} /></GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="group transition hover:-translate-y-0.5 hover:shadow-2xl">
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-[#6366f1]/20">
                    <Package className="size-5 text-[#6366f1]" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{p.type}</Badge>
                </div>
                <h4 className="mt-3 text-base font-semibold">{p.name}</h4>
                <p className="mt-1 text-sm text-[#1a2942]/70">{p.brand}</p>
                {p.piece_barcode && (
                  <div className="mt-2 flex justify-center">
                    <Barcode value={p.piece_barcode} width={1.2} height={30} fontSize={10} margin={0} background="transparent" />
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-white/40 pt-3 text-xs">
                  <span>${p.selling_price} / unit</span>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => { setEditing(p); setOpen(true); }} className="text-navy hover:text-navy/80">
                      <Pencil className="size-3.5" />
                    </button>
                    <button onClick={async () => {
                      if (!slug) return;
                      try {
                        await deleteProduct(slug, p.id);
                        toast.success("Product deleted");
                        load();
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || "Delete failed");
                      }
                    }} className="text-red-600 hover:text-red-700">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-[#1a2942]/70">{p.units_per_packing} per pack</span>
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
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetchShipments(slug);
      setShipments(res.shipments);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [slug]);

  const handleReceive = async (id: number) => {
    if (!slug) return;
    try {
      await receiveShipment(slug, id);
      toast.success("Shipment received");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to receive shipment");
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
    return <GlassCard><EmptyState icon={Truck} title="Connect to a tenant" subtitle="Log in with a tenant slug to view shipments." /></GlassCard>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-cream/80">{shipments.length} shipments found.</p>

      {loading ? (
        <GlassCard><Skeleton className="h-40 w-full bg-white/20" /></GlassCard>
      ) : shipments.length === 0 ? (
        <GlassCard><EmptyState icon={Truck} title="No shipments yet" subtitle="Shipments will appear here once created." /></GlassCard>
      ) : (
        <GlassCard className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/40 hover:bg-transparent">
                <TableHead>ID</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((s) => (
                <TableRow key={s.id} className="border-white/40">
                  <TableCell className="font-mono text-xs">#{s.id}</TableCell>
                  <TableCell className="font-medium">{s.factory_name}</TableCell>
                  <TableCell className="text-[#1a2942]/70">{s.warehouse?.warehouse_name ?? "—"}</TableCell>
                  <TableCell>${Number(s.total_price).toLocaleString()}</TableCell>
                  <TableCell>{s.arrival_date ? format(new Date(s.arrival_date), "MMM dd") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", statusBadge(s.status))}>
                      {s.status_label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.can_receive ? (
                      <Button size="sm" onClick={() => handleReceive(s.id)} className="bg-navy text-cream hover:bg-navy/90">
                        <CheckCircle2 className="size-3.5" /> Receive
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
    </div>
  );
}

/* -------------------- Product Dialog -------------------- */
function ProductDialog({
  open, onOpenChange, editing, onSave, saving,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  editing: Product | null; onSave: (d: ProductInput & { id?: number }) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ProductInput & { id?: number }>({
    name: "", brand: "", type: "",
    piece_barcode: "", parcel_barcode: "",
    units_per_packing: 1,
    current_purchase_price: 0, selling_price: 0,
    parcel_length: 0, parcel_width: 0, parcel_height: 0,
  });

  const toBarcode = (name: string, parcel = false) => {
    const cleaned = name.toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/\s+/g, "-");
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
        name: "", brand: "", type: "",
        piece_barcode: "", parcel_barcode: "",
        units_per_packing: 1,
        current_purchase_price: 0, selling_price: 0,
        parcel_length: 0, parcel_width: 0, parcel_height: 0,
      });
    }
  }, [editing]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.brand || !form.type) {
      toast.error("Please fill in name, brand, and type");
      return;
    }
    if (!form.piece_barcode) {
      toast.error("Piece barcode is required");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update product details." : "Fill in the details to create a new product."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => {
                const name = e.target.value;
                setForm({ ...form, name, piece_barcode: editing ? form.piece_barcode : toBarcode(name), parcel_barcode: editing ? form.parcel_barcode : toBarcode(name, true) });
              }} placeholder="Product name" required />
            </div>
            <div className="grid gap-2">
              <Label>Brand *</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand name" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type *</Label>
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. Electronics" required />
            </div>
            <div className="grid gap-2">
              <Label>Units per packing *</Label>
              <Input type="number" min={1} value={form.units_per_packing} onChange={(e) => setForm({ ...form, units_per_packing: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Piece barcode</Label>
              <Input value={form.piece_barcode} readOnly placeholder="Auto-generated from name" className="bg-gray-100 text-gray-500 cursor-not-allowed" />
            </div>
            <div className="grid gap-2">
              <Label>Parcel barcode</Label>
              <Input value={form.parcel_barcode} readOnly placeholder="Auto-generated from name" className="bg-gray-100 text-gray-500 cursor-not-allowed" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Purchase price ($) *</Label>
              <Input type="number" min={0} step={0.01} value={form.current_purchase_price} onChange={(e) => setForm({ ...form, current_purchase_price: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Selling price ($) *</Label>
              <Input type="number" min={0} step={0.01} value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Parcel length (cm)</Label>
              <Input type="number" min={0} step={0.1} value={form.parcel_length} onChange={(e) => setForm({ ...form, parcel_length: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Parcel width (cm)</Label>
              <Input type="number" min={0} step={0.1} value={form.parcel_width} onChange={(e) => setForm({ ...form, parcel_width: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Parcel height (cm)</Label>
              <Input type="number" min={0} step={0.1} value={form.parcel_height} onChange={(e) => setForm({ ...form, parcel_height: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-navy text-cream hover:bg-navy/90">
              {saving ? "Saving..." : editing ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
