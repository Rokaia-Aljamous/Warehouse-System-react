import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Users, Warehouse, BarChart3, Wallet, Settings as SettingsIcon,
  Search, Menu, Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  Snowflake, Package, Flame, Truck, AlertTriangle, Activity,
  CreditCard, ArrowUpRight, CheckCircle2, Boxes,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/AppLogo";
import { NotificationsBell } from "@/components/NotificationsBell";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { getStoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fetchInventoryMovements, type InventoryMovement } from "@/lib/manager-api";
import { OwnerAnalytics } from "@/components/analytics/OwnerAnalytics";
import { formatNumber, formatMoney } from "@/lib/analytics-api";
import {
  fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  fetchProducts, fetchShipments, fetchEmployees,
  getTypeStyle, getWarehouseTypeKey, type Warehouse as BackendWarehouse, type WarehouseInput,
} from "@/lib/dashboard-api";

export const Route = createFileRoute("/dashboard/$slug")({
  component: TenantDashboardPage,
  head: () => ({
    meta: [
      { title: i18n.t("title.dashboard_detail") },
      { name: "description", content: i18n.t("title.dashboard_detail_desc") },
    ],
  }),
});

type SectionId = "dashboard" | "managers" | "warehouses" | "analytics" | "wallet" | "settings";

const NAV: { id: SectionId; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", labelKey: "sidebar.dashboard", icon: LayoutDashboard },
  { id: "managers", labelKey: "dashboard.managers", icon: Users },
  { id: "warehouses", labelKey: "sidebar.warehouses", icon: Warehouse },
  { id: "analytics", labelKey: "feature.analytics", icon: BarChart3 },
  { id: "wallet", labelKey: "dashboard.wallet", icon: Wallet },
  { id: "settings", labelKey: "sidebar.settings", icon: SettingsIcon },
];

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Snowflake, Package, Flame, Truck, Boxes, Warehouse,
};

function TenantDashboardPage() {
  const { t } = useTranslation();
  const { slug } = Route.useParams();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const [hydratedUser, setHydratedUser] = useState<ReturnType<typeof getStoredUser>>(null);

  useEffect(() => {
    setHydratedUser(getStoredUser());
  }, []);

  const displayName = hydratedUser?.full_name || hydratedUser?.tenant?.company_name || slug;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-white/10 bg-navy text-cream transition-all duration-300 md:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <AppLogo className="size-9" />
            {!collapsed && <span className="text-base font-bold">{slug}</span>}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-1.5 text-cream/70 transition hover:bg-white/10 hover:text-cream"
            aria-label={t("dashboard.toggle_sidebar")}
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
                  </button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>}
              </Tooltip>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4 text-xs text-cream/60">
          {!collapsed ? (
            <div>
              <p className="font-semibold text-cream">{displayName}</p>
              <p className="truncate">{slug}</p>
            </div>
          ) : (
            <CheckCircle2 className="size-4 text-[oklch(0.78_0.16_75)]" />
          )}
        </div>
      </aside>

      <div className={cn("flex min-h-screen flex-1 flex-col transition-all duration-300", collapsed ? "md:ps-[72px]" : "md:ps-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-navy/80 px-4 text-cream backdrop-blur-xl md:px-6">
          <button className="rounded-lg p-2 text-cream/70 hover:bg-white/10 md:hidden" aria-label={t("dashboard.menu")}>
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
                placeholder={t("placeholder.search_anything")}
                className="h-9 w-64 rounded-full border border-white/15 bg-white/5 ps-9 pe-3 text-sm text-cream placeholder:text-cream/40 outline-none transition focus:w-72 focus:border-[oklch(0.78_0.16_75)]/60"
              />
            </div>
            <NotificationsBell slug={slug} />
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 ps-1 pe-3">
              <div className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-[oklch(0.78_0.16_75)] text-xs font-bold text-navy">
                {initials}
              </div>
              <span className="hidden text-xs font-semibold sm:inline">{displayName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {section === "dashboard" && <TenantOverview slug={slug} />}
              {section === "managers" && <TenantManagersSection slug={slug} />}
              {section === "warehouses" && (
                <TenantWarehousesSection slug={slug} />
              )}
              {section === "analytics" && <TenantAnalyticsSection slug={slug} />}
              {section === "wallet" && <TenantWalletSection />}
              {section === "settings" && <TenantSettingsSection />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("glass-light rounded-2xl p-5 shadow-xl", className)}>{children}</div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-white/40">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

/* -------------------- Overview -------------------- */
function TenantOverview({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<{
    warehouses: number;
    products: number;
    shipments: number;
    pendingShipments: number;
    inventoryUnits: number;
    employees: number;
    activeManagers: number;
    movements: InventoryMovement[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [wRes, pRes, sRes, mRes] = await Promise.all([
        fetchWarehouses(slug).catch(() => ({ warehouses: [], allowed_warehouses_count: 0, current_warehouses_count: 0 })),
        fetchProducts(slug).catch(() => ({ products: [] })),
        fetchShipments(slug).catch(() => ({ shipments: [] })),
        fetchInventoryMovements(slug).catch(() => ({
          inventory_movements: [],
          meta: { current_page: 1, per_page: 1, total: 0, last_page: 1 },
        })),
      ]);

      const employeeResults = await Promise.all(
        wRes.warehouses.map((w) => fetchEmployees(slug, w.id).catch(() => ({ employees: [] }))),
      );
      const employees = employeeResults.flatMap((r) => r.employees);
      const activeManagers = employees.filter((e) =>
        (e.role === "manager" || e.role === "warehouse_secretary") && e.status === "available",
      ).length;

      const now = new Date();
      const inventoryUnits = wRes.warehouses.reduce(
        (sum, w) => sum + (w.products ?? []).reduce((s, p) => s + (p.pivot.quantity ?? 0), 0),
        0,
      );

      if (cancelled) return;
      setData({
        warehouses: wRes.warehouses.length,
        products: pRes.products.length,
        shipments: sRes.shipments.filter((s) => {
          if (!s.created_at) return false;
          const d = new Date(s.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
        pendingShipments: sRes.shipments.filter((s) => s.status !== "received").length,
        inventoryUnits,
        employees: employees.length,
        activeManagers,
        movements: mRes.inventory_movements,
      });
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const chartData = (data?.movements ?? []).slice(-30).reduce<{ date: string; incoming: number; outgoing: number }[]>((acc, m) => {
    const date = m.created_at?.slice(0, 10) ?? "";
    const isInbound = m.movement_type === "section_fill" || m.movement_type === "shipment_received";
    const existing = acc.find((d) => d.date === date);
    if (existing) {
      if (isInbound) existing.incoming += m.quantity_units;
      else existing.outgoing += m.quantity_units;
    } else {
      acc.push({
        date,
        incoming: isInbound ? m.quantity_units : 0,
        outgoing: isInbound ? 0 : m.quantity_units,
      });
    }
    return acc;
  }, []);

  const stats = [
    { label: t("sidebar.warehouses"), value: data ? formatNumber(data.warehouses) : "—", icon: Warehouse },
    { label: t("sidebar.products"), value: data ? formatNumber(data.products) : "—", icon: Boxes, sub: data ? `${formatNumber(data.inventoryUnits)} ${t("analytics.units")}` : "" },
    { label: t("dashboard.stat_monthly_shipments"), value: data ? formatNumber(data.shipments) : "—", icon: Truck, sub: data ? t("manager.awaiting_receipt", { count: data.pendingShipments }) : "" },
    { label: t("dashboard.stat_active_managers"), value: data ? formatNumber(data.activeManagers) : "—", icon: Users, sub: data ? t("manager.active_of", { count: data.activeManagers, total: data.employees }) : "" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="transition hover:-translate-y-0.5 hover:shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <s.icon className="size-4 text-[oklch(0.74_0.02_252)]" />
              </div>
              <p className="mt-3 text-3xl font-bold">{s.value}</p>
              {s.sub && <p className="mt-1 text-xs font-semibold text-emerald-600">{s.sub}</p>}
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h4 className="mb-4 text-sm font-semibold">{t("manager.inventory_trend")}</h4>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="outgoingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#A7B3C355" />
                <XAxis dataKey="date" stroke="#1D2D44" fontSize={11} />
                <YAxis stroke="#1D2D44" fontSize={11} />
                <RTooltip />
                <Area type="monotone" dataKey="incoming" stroke="#10B981" fill="url(#incomingGrad)" name={t("manager.incoming")} />
                <Area type="monotone" dataKey="outgoing" stroke="#6366f1" fill="url(#outgoingGrad)" name={t("manager.outgoing")} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("manager.no_movement_data")}</p>
          )}
        </GlassCard>

        <GlassCard>
          <h4 className="mb-4 text-sm font-semibold">{t("dashboard.stat_monthly_shipments")}</h4>
          {data && data.shipments > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/40 bg-white/40 p-3">
                <p className="text-xs text-muted-foreground">{t("manager.total_count", { count: data.shipments })}</p>
                <p className="text-lg font-bold">{formatNumber(data.shipments)}</p>
              </div>
              <div className="rounded-xl border border-white/40 bg-white/40 p-3">
                <p className="text-xs text-muted-foreground">{t("manager.pending_shipments")}</p>
                <p className="text-lg font-bold">{formatNumber(data.pendingShipments)}</p>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("manager.no_movement_data")}</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

/* -------------------- Managers -------------------- */
type ManagerStatus = "active" | "inactive";

interface ManagerItem {
  id: string;
  whmId: string;
  name: string;
  warehouseId: string;
  status: ManagerStatus;
  email?: string;
  phone?: string;
}

function TenantManagersSection({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [managers, setManagers] = useState<ManagerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const wRes = await fetchWarehouses(slug);
        const all: ManagerItem[] = [];
        for (const w of wRes.warehouses) {
          const eRes = await fetchEmployees(slug, w.id);
          for (const emp of eRes.employees) {
            if (emp.role !== "manager" && emp.role !== "warehouse_secretary") continue;
            all.push({
              id: `emp_${emp.id}`,
              whmId: emp.system_user.user_name,
              name: emp.system_user.full_name,
              warehouseId: w.id.toString(),
              status: emp.status === "available" ? "active" : "inactive",
              email: emp.system_user.user_name + "@warehouse.io",
              phone: emp.system_user.phone_number,
            });
          }
        }
        if (!cancelled) setManagers(all);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <GlassCard key={i}>
            <div className="space-y-3">
              <Skeleton className="h-5 w-32 bg-white/20" />
              <Skeleton className="h-4 w-48 bg-white/20" />
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream/80">{t("dashboard.managers_desc")}</p>
      </div>

      {managers.length === 0 ? (
        <GlassCard><EmptyState icon={Users} title={t("dashboard.no_managers")} subtitle={t("dashboard.no_managers_desc")} /></GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {managers.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="transition hover:-translate-y-0.5 hover:shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[oklch(0.74_0.02_252)] text-xs font-bold text-white">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge variant="secondary" className={cn("ms-auto text-[10px]", m.status === "active" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700")}>
                    {m.status}
                  </Badge>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- Warehouses -------------------- */
function TenantWarehousesSection({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<BackendWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BackendWarehouse | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWarehouses(slug);
      setWarehouses(res.warehouses);
    } catch (err: any) {
      setError(err.response?.data?.message || t("warehouse.toast_load_failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const handleSave = async (data: WarehouseInput & { id?: number }) => {
    setSaving(true);
    try {
      if (data.id) {
        await updateWarehouse(slug, data.id, data);
        toast.success(t("warehouse.toast_updated"));
      } else {
        await createWarehouse(slug, data);
        toast.success(t("warehouse.toast_added"));
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

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteWarehouse(slug, deleteId);
      toast.success(t("warehouse.toast_deleted"));
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("warehouse.toast_delete_failed"));
    }
  };

  const existingTypes = [...new Set(warehouses.map((w) => w.type))];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-cream/80">{t("dashboard.manage_warehouses")}</p>
        </div>
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
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <AlertTriangle className="size-8 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="outline" onClick={load} className="mt-2">{t("common.try_again")}</Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream/80">{t("dashboard.manage_warehouses")}</p>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-navy text-cream hover:bg-navy/90">
          <Plus className="size-4" /> {t("warehouse.add")}
        </Button>
      </div>

      {warehouses.length === 0 ? (
        <GlassCard><EmptyState icon={Warehouse} title={t("warehouse.no_warehouses_title")} subtitle={t("warehouse.no_warehouses_desc")} /></GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w, i) => {
            const style = getTypeStyle(w.type);
            const Icon = ICON_MAP[style.icon] ?? Package;
            return (
              <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="group h-full transition hover:-translate-y-0.5 hover:shadow-2xl">
                  <div className="flex items-start justify-between">
                    <div className="flex size-11 items-center justify-center rounded-xl" style={{ background: `${style.color}25` }}>
                      <Icon className="size-5" style={{ color: style.color }} />
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{getWarehouseTypeKey(w.type) ? t(getWarehouseTypeKey(w.type)) : w.type}</Badge>
                  </div>
                  <h4 className="mt-3 text-base font-bold">{w.warehouse_name}</h4>
                  <p className="mt-1 text-sm font-semibold text-[#1a2942]/80">{w.location}, {w.governorate}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-white/40 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a2942]/80">
                      <Activity className="size-3.5" /> {w.area} m&sup2; &middot; ${w.financial_budgets.toLocaleString()}
                    </span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button size="sm" variant="ghost" className="text-navy hover:text-navy/80 hover:bg-white/60" onClick={() => { setEditing(w); setOpen(true); }}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(w.id)}>
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

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("warehouse.confirm_delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("warehouse.confirm_delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
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
  const { t } = useTranslation();
  const allTypes = [...new Set([...WAREHOUSE_TYPE_OPTIONS, ...existingTypes])];
  const [form, setForm] = useState<WarehouseInput & { id?: number }>({
    warehouse_name: "", type: allTypes[0] ?? "Cold Storage",
    location: "", governorate: GOVERNORATE_OPTIONS[0] ?? "",
    area: 0, financial_budgets: 0,
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
      });
    } else {
      setForm({
        warehouse_name: "", type: allTypes[0] ?? "Cold Storage",
        location: "", governorate: GOVERNORATE_OPTIONS[0] ?? "",
        area: 0, financial_budgets: 0,
      });
    }
  }, [editing, existingTypes.join(",")]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.warehouse_name || !form.type || !form.location || !form.governorate || form.area <= 0) {
      toast.error(t("common.required_fields"));
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("warehouse.edit_warehouse") : t("warehouse.add")}</DialogTitle>
          <DialogDescription>
            {editing ? t("warehouse.update_details") : t("warehouse.create_details")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("warehouse.name")} *</Label>
            <Input value={form.warehouse_name} onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })} placeholder={t("placeholder.cold_storage_a")} required />
          </div>
          <div className="grid gap-2">
            <Label>{t("warehouse.type")} *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allTypes.map((wtype) => (
                  <SelectItem key={wtype} value={wtype}>{getWarehouseTypeKey(wtype) ? t(getWarehouseTypeKey(wtype)) : wtype}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("warehouse.location")} *</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("placeholder.industrial_zone")} required />
            </div>
            <div className="grid gap-2">
              <Label>{t("warehouse.governorate")} *</Label>
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
              <Label>{t("warehouse.area")} (m&sup2;) *</Label>
              <Input type="number" min={0} step={0.01} value={form.area} onChange={(e) => setForm({ ...form, area: Number(e.target.value) })} placeholder={t("placeholder.area_500")} required />
            </div>
            <div className="grid gap-2">
              <Label>{t("warehouse.budget")} ($) *</Label>
              <Input type="number" min={0} step={0.01} value={form.financial_budgets} onChange={(e) => setForm({ ...form, financial_budgets: Number(e.target.value) })} placeholder={t("placeholder.budget_10000")} required />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={saving} className="bg-navy text-cream hover:bg-navy/90">
              {saving ? t("common.saving") : editing ? t("common.save_changes") : t("warehouse.add_warehouse")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Analytics -------------------- */
function TenantAnalyticsSection({ slug }: { slug: string }) {
  return <OwnerAnalytics slug={slug} />;
}

/* -------------------- Wallet -------------------- */
function TenantWalletSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="relative overflow-hidden lg:col-span-2">
          <div className="absolute -end-20 -top-20 size-64 rounded-full bg-[oklch(0.78_0.16_75)]/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("wallet.available_balance")}</p>
            <p className="mt-2 text-4xl font-bold">{formatMoney(0, "USD")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("wallet.updated_just_now")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button className="bg-navy text-cream hover:bg-navy/90"><Plus className="size-4" /> {t("wallet.top_up")}</Button>
              <Button variant="outline"><CreditCard className="size-4" /> {t("wallet.manage_cards")}</Button>
              <Button variant="outline"><ArrowUpRight className="size-4" /> {t("wallet.send")}</Button>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("wallet.this_month")}</p>
          <div className="mt-2 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("wallet.income")}</span><span className="font-semibold text-emerald-600">{formatMoney(0, "USD")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("wallet.spending")}</span><span className="font-semibold text-rose-600">{formatMoney(0, "USD")}</span></div>
            <div className="flex justify-between border-t border-white/40 pt-2"><span>{t("wallet.net")}</span><span className="font-bold">{formatMoney(0, "USD")}</span></div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <EmptyState icon={CreditCard} title={t("wallet.no_transactions")} subtitle={t("wallet.no_transactions_desc")} />
      </GlassCard>
    </div>
  );
}

/* -------------------- Settings -------------------- */
function TenantSettingsSection() {
  const { t } = useTranslation();
  const user = getStoredUser();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <h4 className="text-sm font-semibold">{t("settings.account")}</h4>
        <p className="mb-4 text-xs text-muted-foreground">{t("settings.account_desc")}</p>
        <div className="space-y-3">
          <div className="grid gap-2"><Label>{t("settings.full_name")}</Label><Input defaultValue={user?.full_name ?? ""} /></div>
          <div className="grid gap-2"><Label>{t("settings.email")}</Label><Input defaultValue={user?.email ?? ""} /></div>
          <Button onClick={() => toast.success(t("settings.profile_saved"))} className="bg-navy text-cream hover:bg-navy/90">{t("common.save_changes")}</Button>
        </div>
      </GlassCard>
      <GlassCard>
        <h4 className="text-sm font-semibold">{t("settings.notifications")}</h4>
        <p className="mb-4 text-xs text-muted-foreground">{t("settings.notifications_desc")}</p>
        <div className="grid gap-3 text-sm">
          {[t("settings.notif_new_shipments"), t("settings.notif_manager_updates"), t("settings.notif_low_inventory"), t("settings.notif_wallet_activity")].map((n) => (
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
