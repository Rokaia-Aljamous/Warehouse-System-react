import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Users, Warehouse, BarChart3, Wallet, Settings as SettingsIcon,
  Search, Bell, Menu, Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  Snowflake, Package, Flame, Truck, AlertTriangle, TrendingUp, Activity,
  CreditCard, ArrowUpRight, ArrowDownRight, CheckCircle2, Boxes,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { initialManagers, inventoryTrend, shipmentsData, walletTransactions, type Manager } from "@/lib/demo-data";
import { getStoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  getTypeStyle, type Warehouse as BackendWarehouse, type WarehouseInput,
} from "@/lib/dashboard-api";

export const Route = createFileRoute("/dashboard/$slug")({
  component: TenantDashboardPage,
  head: ({ params }) => ({
    meta: [
      { title: `Dashboard — ${params.slug}` },
      { name: "description", content: `Manage ${params.slug} warehouses, managers, and analytics.` },
    ],
  }),
});

type SectionId = "dashboard" | "managers" | "warehouses" | "analytics" | "wallet" | "settings";

const NAV: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "managers", label: "Managers", icon: Users },
  { id: "warehouses", label: "Warehouses", icon: Warehouse },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Snowflake, Package, Flame, Truck, Boxes, Warehouse,
};

function TenantDashboardPage() {
  const { slug } = Route.useParams();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [managers] = useState<Manager[]>(initialManagers);

  const user = getStoredUser();
  const displayName = user?.full_name || user?.tenant?.company_name || slug;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen w-full">
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
            {!collapsed && <span className="text-base font-bold">{slug}</span>}
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
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
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

      <div className={cn("flex min-h-screen flex-1 flex-col transition-all duration-300", collapsed ? "md:pl-[72px]" : "md:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-navy/80 px-4 text-cream backdrop-blur-xl md:px-6">
          <button className="rounded-lg p-2 text-cream/70 hover:bg-white/10 md:hidden" aria-label="Menu">
            <Menu className="size-5" />
          </button>
          <h1 className="text-base font-semibold capitalize md:text-lg">
            {NAV.find((n) => n.id === section)?.label}
          </h1>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
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
              {section === "dashboard" && <TenantOverview managers={managers} />}
              {section === "managers" && (
                <TenantManagersSection managers={managers} />
              )}
              {section === "warehouses" && (
                <TenantWarehousesSection slug={slug} managers={managers} />
              )}
              {section === "analytics" && <TenantAnalyticsSection managers={managers} />}
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
function TenantOverview({ managers }: { managers: Manager[] }) {
  const stats = [
    { label: "Total inventory", value: "48,210", icon: Boxes, trend: "+4.2%" },
    { label: "Active managers", value: managers.filter((m) => m.status === "active").length.toString(), icon: Users, trend: "+1" },
    { label: "Monthly shipments", value: "2,184", icon: Truck, trend: "+8.1%" },
    { label: "Capacity used", value: "72%", icon: Activity, trend: "+3%" },
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
              <p className="mt-2 text-3xl font-bold">{s.value}</p>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <TrendingUp className="size-3" /> {s.trend} from last month
              </span>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h4 className="mb-4 text-sm font-semibold">Inventory trend</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={inventoryTrend}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1D2D44" stopOpacity={0.3} />
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
        </GlassCard>

        <GlassCard>
          <h4 className="mb-4 text-sm font-semibold">Monthly shipments</h4>
          <div className="grid grid-cols-2 gap-3">
            {shipmentsData.slice(-4).map((s) => (
              <div key={s.month} className="rounded-xl border border-white/40 bg-white/40 p-3">
                <p className="text-xs text-muted-foreground">{s.month}</p>
                <p className="text-lg font-bold">{s.incoming + s.outgoing}</p>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">{s.incoming} in / {s.outgoing} out</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* -------------------- Managers -------------------- */
function TenantManagersSection({ managers }: { managers: Manager[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream/80">All warehouse managers under your tenancy.</p>
        <Button className="bg-navy text-cream hover:bg-navy/90"><Plus className="size-4" /> Add manager</Button>
      </div>

      {managers.length === 0 ? (
        <GlassCard><EmptyState icon={Users} title="No managers yet" subtitle="Invite your first warehouse manager." /></GlassCard>
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
                  <Badge variant="secondary" className={cn("ml-auto text-[10px]", m.status === "active" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700")}>
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
function TenantWarehousesSection({ slug, managers }: { slug: string; managers: Manager[] }) {
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
      setError(err.response?.data?.message || "Failed to load warehouses");
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

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteWarehouse(slug, deleteId);
      toast.success("Warehouse deleted");
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const existingTypes = [...new Set(warehouses.map((w) => w.type))];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-cream/80">Manage your warehouses.</p>
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
          <Button variant="outline" onClick={load} className="mt-2">Retry</Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream/80">Manage your warehouses.</p>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-navy text-cream hover:bg-navy/90">
          <Plus className="size-4" /> Add warehouse
        </Button>
      </div>

      {warehouses.length === 0 ? (
        <GlassCard><EmptyState icon={Warehouse} title="No warehouses yet" subtitle="Add your first warehouse to get started." /></GlassCard>
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
                    <Badge variant="secondary" className="text-[10px]">{w.type}</Badge>
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
            <AlertDialogTitle>Delete warehouse?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this warehouse and its associated data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
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

/* -------------------- Analytics -------------------- */
function TenantAnalyticsSection({ managers }: { managers: Manager[] }) {
  const [selected, setSelected] = useState("");
  const wh = managers.find((m) => m.warehouseId === selected);
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
          <p className="text-sm text-muted-foreground">Monitor usage, capacity and manager distribution.</p>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select a warehouse type" /></SelectTrigger>
          <SelectContent>
            {[...new Set(managers.map((m) => m.warehouseId))].map((id) => (
              <SelectItem key={id} value={id}>{id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard>
          <h4 className="mb-3 text-sm font-semibold">Capacity split</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={capacity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {capacity.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h4 className="mb-3 text-sm font-semibold">Manager distribution</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={managers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#A7B3C355" />
              <XAxis dataKey="warehouseId" stroke="#1D2D44" fontSize={11} />
              <YAxis stroke="#1D2D44" fontSize={11} />
              <RTooltip />
              <Bar dataKey="status === 'active'" fill="#1D2D44" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h4 className="text-sm font-semibold">Selected warehouse type</h4>
          {wh ? (
            <div className="mt-3 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Assigned managers:</span> <strong>{assigned}</strong></p>
              <p><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{wh.status}</Badge></p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Pick a type from the dropdown.</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

/* -------------------- Wallet -------------------- */
function TenantWalletSection() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="relative overflow-hidden lg:col-span-2">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-[oklch(0.78_0.16_75)]/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Available balance</p>
            <p className="mt-2 text-4xl font-bold">$24,820.45</p>
            <p className="mt-1 text-xs text-muted-foreground">Updated just now</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button className="bg-navy text-cream hover:bg-navy/90"><Plus className="size-4" /> Top up</Button>
              <Button variant="outline"><CreditCard className="size-4" /> Manage cards</Button>
              <Button variant="outline"><ArrowUpRight className="size-4" /> Send</Button>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">This month</p>
          <div className="mt-2 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Income</span><span className="font-semibold text-emerald-600">+ $7,090</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Spending</span><span className="font-semibold text-rose-600">− $2,369</span></div>
            <div className="flex justify-between border-t border-white/40 pt-2"><span>Net</span><span className="font-bold">+ $4,721</span></div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden p-0">
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
                <TableCell className="text-muted-foreground">{t.date}</TableCell>
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
function TenantSettingsSection() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <h4 className="text-sm font-semibold">Account</h4>
        <p className="mb-4 text-xs text-muted-foreground">Update your personal info.</p>
        <div className="space-y-3">
          <div className="grid gap-2"><Label>Full name</Label><Input defaultValue="Tenant User" /></div>
          <div className="grid gap-2"><Label>Email</Label><Input defaultValue="user@tenant.io" /></div>
          <Button onClick={() => toast.success("Profile saved")} className="bg-navy text-cream hover:bg-navy/90">Save changes</Button>
        </div>
      </GlassCard>
      <GlassCard>
        <h4 className="text-sm font-semibold">Notifications</h4>
        <p className="mb-4 text-xs text-muted-foreground">Control what you hear about.</p>
        <div className="grid gap-3 text-sm">
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

void Skeleton;
