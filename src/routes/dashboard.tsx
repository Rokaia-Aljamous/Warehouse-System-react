import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Users, Warehouse, BarChart3, Wallet, Settings as SettingsIcon,
  Search, Bell, Menu, Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  Snowflake, Package, Flame, Truck, AlertTriangle, TrendingUp, Activity,
  CreditCard, ArrowUpRight, ArrowDownRight, CheckCircle2, Boxes,
  PackagePlus, Send, Save, CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Stockyard" },
      { name: "description", content: "Manage warehouses, managers, analytics and your payment wallet." },
    ],
  }),
});

type SectionId = "dashboard" | "managers" | "warehouses" | "analytics" | "wallet" | "subscriptions" | "add-product" | "request-shipment" | "settings";

const NAV: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "managers", label: "Managers", icon: Users },
  { id: "warehouses", label: "Warehouses", icon: Warehouse },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "subscriptions", label: "Subscription requests", icon: CreditCard },
  { id: "add-product", label: "Add Product", icon: PackagePlus },
  { id: "request-shipment", label: "Request Shipment", icon: Send },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Snowflake, Package, Flame, Truck, Boxes, Warehouse,
};

function DashboardPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/manager" }); }, []);
  const [section, setSection] = useState<SectionId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [managers, setManagers] = useState<Manager[]>(initialManagers);
  const [types, setTypes] = useState<WarehouseType[]>(initialWarehouseTypes);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    setAvatar(getProfilePic("admin"));
    return subscribeProfilePic("admin", setAvatar);
  }, []);


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
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.id === "warehouses" && (
                      <span className="ml-auto inline-flex size-2 animate-pulse rounded-full bg-[oklch(0.78_0.16_75)]" />
                    )}
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
              <p className="font-semibold text-cream">Pro plan</p>
              <p>Unlimited warehouses</p>
            </div>
          ) : (
            <CheckCircle2 className="size-4 text-[oklch(0.78_0.16_75)]" />
          )}
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
                {avatar ? <img src={avatar} alt="me" className="h-full w-full object-cover" /> : "AC"}
              </div>
              <span className="hidden text-xs font-semibold sm:inline">Amelia C.</span>
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
              {section === "dashboard" && <Overview managers={managers} types={types} />}
              {section === "managers" && (
                <ManagersSection managers={managers} setManagers={setManagers} types={types} />
              )}
              {section === "warehouses" && (
                <WarehousesSection types={types} setTypes={setTypes} managers={managers} />
              )}
              {section === "analytics" && <AnalyticsSection types={types} managers={managers} />}
              {section === "wallet" && <WalletSection />}
              {section === "subscriptions" && <SubscriptionRequestsSection />}
              {section === "add-product" && <AddProductSection types={types} />}
              {section === "request-shipment" && <RequestShipmentSection types={types} />}
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
    <div className={cn("glass-light rounded-2xl p-5 shadow-xl", className)}>{children}</div>
  );
}

/* -------------------- Overview -------------------- */
function Overview({ managers, types }: { managers: Manager[]; types: WarehouseType[] }) {
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
              <p className="mt-3 text-3xl font-bold text-foreground">{s.value}</p>
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
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </div>
          <ChartArea />
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 text-sm font-semibold">Warehouse types</h3>
          <div className="space-y-3">
            {types.map((t) => {
              const count = managers.filter((m) => m.warehouseId === t.id).length;
              const Icon = ICON_MAP[t.icon] ?? Package;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3 transition hover:bg-white/60">
                  <div className="flex size-9 items-center justify-center rounded-lg" style={{ background: `${t.color}20` }}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{count} manager{count === 1 ? "" : "s"}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="mb-4 text-sm font-semibold">Recent activity</h3>
        <ul className="divide-y divide-white/40">
          {recentActivity.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-3 text-sm">
              <span>{a.text}</span>
              <span className="text-xs text-muted-foreground">{a.time}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}

/* -------------------- Managers (CRUD) -------------------- */
function ManagersSection({
  managers, setManagers, types,
}: {
  managers: Manager[]; setManagers: React.Dispatch<React.SetStateAction<Manager[]>>; types: WarehouseType[];
}) {
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
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
                    <TableCell className="hidden text-muted-foreground md:table-cell">{m.lastPasswordChange}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
          <div className="flex items-center justify-between border-t border-white/40 px-4 py-3 text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">Manager will be required to change this on first login.</p>
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

/* -------------------- Warehouse Types -------------------- */
function WarehousesSection({
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
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-white/40 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
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
function AnalyticsSection({ types, managers }: { types: WarehouseType[]; managers: Manager[] }) {
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
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <s.icon className="size-4 text-[oklch(0.74_0.02_252)]" />
            </div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{wh?.name}</p>
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
              <span className="text-xs text-muted-foreground">{a.time}</span>
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
        <span className="text-muted-foreground">{label}</span>
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
function SettingsSection() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <h4 className="text-sm font-semibold">Profile picture</h4>
        <p className="mb-4 text-xs text-muted-foreground">Shown in the header and across the app.</p>
        <div className="rounded-xl bg-navy/90 p-4">
          <ProfilePictureUpload role="admin" fallback="A" />
        </div>
      </GlassCard>
      <GlassCard>
        <h4 className="text-sm font-semibold">Account</h4>
        <p className="mb-4 text-xs text-muted-foreground">Update your personal info.</p>
        <div className="space-y-3">
          <div className="grid gap-2"><Label>Full name</Label><Input defaultValue="Amelia Carter" /></div>
          <div className="grid gap-2"><Label>Email</Label><Input defaultValue="amelia@stockyard.io" /></div>
          <Button onClick={() => toast.success("Profile saved")} className="bg-navy text-cream hover:bg-navy/90">Save changes</Button>
        </div>
      </GlassCard>
      <GlassCard className="lg:col-span-2">
        <h4 className="text-sm font-semibold">Notifications</h4>
        <p className="mb-4 text-xs text-muted-foreground">Control what you hear about.</p>
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
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No requests yet.</TableCell></TableRow>
            )}
            {subs.map((s) => (
              <TableRow key={s.id} className="border-white/40">
                <TableCell className="font-medium">{s.companyName}</TableCell>
                <TableCell>{s.warehouses}</TableCell>
                <TableCell className="font-mono text-xs">{s.slok}</TableCell>
                <TableCell className="text-muted-foreground">{s.requestDate}</TableCell>
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
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// Suppress unused import warnings for components included for future use
void Skeleton; void DialogTrigger;

/* -------------------- Add Product -------------------- */
function AddProductSection({ types }: { types: WarehouseType[] }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [storage, setStorage] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setSku(""); setCategory(""); setDescription(""); setQty(""); setStorage("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !category || !storage || qty === "") {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      toast.success(`Product card saved · ${name}`);
      setSaving(false);
      reset();
    }, 600);
  };

  const labelCls = "text-sm font-semibold text-[#1D2D44]";
  const inputCls =
    "bg-white border-navy/25 text-[#1D2D44] placeholder:text-gray-400 placeholder:opacity-80 focus-visible:ring-[#1D2D44]/40";
  const selectCls =
    "bg-white border-navy/25 text-[#1D2D44] data-[placeholder]:text-gray-400 focus:ring-[#1D2D44]/40";

  return (
    <div className="mx-auto max-w-3xl">
      <GlassCard>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-navy">Add Product</h2>
          <p className="mt-1 text-sm text-navy/70">Create a new product card in the catalogue.</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-name" className={labelCls}>Product Name</Label>
            <Input id="p-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Olive Oil 1L" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-sku" className={labelCls}>SKU / Serial Number</Label>
            <Input id="p-sku" className={inputCls} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. SKU-00219" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-category" className={labelCls}>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="p-category" className={selectCls}><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="food">Food & Beverage</SelectItem>
                <SelectItem value="chemical">Chemical</SelectItem>
                <SelectItem value="textiles">Textiles</SelectItem>
                <SelectItem value="pharmaceuticals">Pharmaceuticals</SelectItem>
                <SelectItem value="machinery">Machinery & Tools</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-qty" className={labelCls}>Initial Stock Quantity</Label>
            <Input id="p-qty" className={inputCls} type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="p-storage" className={labelCls}>Storage Type Requirement</Label>
            <Select value={storage} onValueChange={setStorage}>
              <SelectTrigger id="p-storage" className={selectCls}><SelectValue placeholder="Select storage type" /></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="p-desc" className={labelCls}>Product Description & Notes</Label>
            <Textarea id="p-desc" className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Details, dimensions, handling notes..." />
          </div>
          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button type="submit" disabled={saving} className="bg-[oklch(0.78_0.16_75)] text-navy hover:bg-[oklch(0.82_0.16_75)] font-semibold">
              <Save className="size-4" /> {saving ? "Saving..." : "Save Product Card"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

/* -------------------- Request Shipment -------------------- */
function RequestShipmentSection({ types }: { types: WarehouseType[] }) {
  const [factory, setFactory] = useState("");
  const [destination, setDestination] = useState("");
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [priority, setPriority] = useState("medium");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const factories = ["Damascus Main Factory", "Aleppo Industrial Plant", "Homs Processing Line", "Latakia Port Facility"];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!factory || !destination || !product || qty === "" || !date) {
      toast.error("Please complete all fields");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.success(`Shipment request created · ${product} → ${types.find(t => t.id === destination)?.name}`);
      setSubmitting(false);
      setFactory(""); setDestination(""); setProduct(""); setQty(""); setPriority("medium"); setDate(undefined);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <GlassCard>
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <Truck className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Request Shipment</h2>
            <p className="text-xs text-muted-foreground">طلب شحنة — Internal request to move stock from a factory to a warehouse.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Source Factory</Label>
            <Select value={factory} onValueChange={setFactory}>
              <SelectTrigger><SelectValue placeholder="Select factory" /></SelectTrigger>
              <SelectContent>
                {factories.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Destination Warehouse</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
              <SelectContent>
                {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-product">Product</Label>
            <Input id="s-product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Type product name..." list="product-suggestions" />
            <datalist id="product-suggestions">
              <option value="Premium Olive Oil 1L" />
              <option value="Cotton T-Shirts Pack" />
              <option value="Industrial Cleaner 5L" />
              <option value="LED Smart Bulbs" />
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-qty">Quantity Requested</Label>
            <Input id="s-qty" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Priority Level</Label>
            <RadioGroup value={priority} onValueChange={setPriority} className="flex gap-2">
              {[
                { v: "low", l: "Low" },
                { v: "medium", l: "Medium" },
                { v: "high", l: "High" },
              ].map((p) => (
                <label
                  key={p.v}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                    priority === p.v
                      ? "border-navy bg-navy text-cream"
                      : "border-white/40 bg-white/40 text-foreground hover:bg-white/60",
                  )}
                >
                  <RadioGroupItem value={p.v} className="sr-only" />
                  {p.l}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Expected Delivery Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="size-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button type="submit" disabled={submitting} className="bg-navy text-cream hover:bg-navy/90 font-semibold">
              <Truck className="size-4" /> {submitting ? "Submitting..." : "Create Shipment Request"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
