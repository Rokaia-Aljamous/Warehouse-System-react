import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Boxes, ClipboardList, BarChart3, FileText, LogOut, Loader2, Plus, Trash2,
  ArrowLeftRight, CheckCircle2, Truck, RefreshCw, Eye, Pencil, X, Search,
  Warehouse as WarehouseIcon, Wallet as WalletIcon, Settings as SettingsIcon,
  AlertTriangle, TrendingUp, Package, ListChecks, Download,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from "recharts";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  loginManager, logoutManager, fetchMe,
  fetchSections, createSection, updateSection, deleteSection,
  fillSectionStock, removeSectionStock, assignProductToSection, unassignProductFromSection, transferSectionStock,
  fetchInventoryMovements,
  fetchManagerProducts, fetchManagerShipments, receiveManagerShipment,
  fetchManagerWarehouse,
  fetchManagerEmployees, createManagerEmployee, updateManagerEmployee, deleteManagerEmployee,
  fetchManagerTasks, assignTask, updateTaskStatus,
  type Section, type SectionInput,
  type ManagerProduct,
  type ManagerShipment, type ManagerShipmentStatus,
  type ManagerEmployee,
  type InventoryMovement,
  type ManagerTask, type AssignTaskInput,
} from "@/lib/manager-api";
import { api, getStoredUser, setStoredUser, getCsrfCookie } from "@/lib/api";

export const Route = createFileRoute("/manager/$slug")({
  component: ManagerDashboard,
  head: () => ({ meta: [{ title: "Manager Dashboard — Stockyard" }] }),
});

type SectionId =
  | "overview" | "sections" | "employees" | "shipments" | "movements" | "tasks" | "reports" | "settings";

const NAV: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "sections", label: "Sections", icon: Boxes },
  { id: "employees", label: "Employees", icon: Users },
  { id: "shipments", label: "Shipments", icon: Truck },
  { id: "movements", label: "Movements", icon: ArrowLeftRight },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-light rounded-2xl p-5 shadow-xl text-[#1a2942]", className)}>{children}</div>;
}

function ManagerDashboard() {
  const { t } = useTranslation();
  const { slug } = useParams({ from: "/manager/$slug" });
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionId>("overview");

  /* Auth */
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* Data */
  const [warehouse, setWarehouse] = useState<{ id: number; name: string; type: string; location: string } | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [products, setProducts] = useState<ManagerProduct[]>([]);
  const [employees, setEmployees] = useState<ManagerEmployee[]>([]);
  const [shipments, setShipments] = useState<ManagerShipment[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [tasks, setTasks] = useState<ManagerTask[]>([]);

  /* Fetch all data */
  const fetchAll = useCallback(async () => {
    if (!session?.warehouse_id) return;
    const wid = session.warehouse_id;
    try {
      const [secRes, prodRes, empRes, shipRes, movRes, whRes, taskRes] = await Promise.all([
        fetchSections(slug).catch(() => ({ sections: [] })),
        fetchManagerProducts(slug).catch(() => ({ products: [] })),
        fetchManagerEmployees(slug, wid).catch(() => ({ employees: [] })),
        fetchManagerShipments(slug).catch(() => ({ shipments: [] })),
        fetchInventoryMovements(slug, { warehouse_id: wid, per_page: 50 }).catch(() => ({ inventory_movements: [], meta: { total: 0, current_page: 1, per_page: 50, last_page: 1 } })),
        fetchManagerWarehouse(slug).catch(() => ({ warehouse: null })),
        fetchManagerTasks(slug).catch(() => ({ tasks: [] })),
      ]);
      setSections(secRes.sections);
      setProducts(prodRes.products);
      setEmployees(empRes.employees);
      setShipments(shipRes.shipments);
      setMovements(movRes.inventory_movements);
      setTasks(taskRes.tasks);
      if (whRes.warehouse) setWarehouse({ id: whRes.warehouse.id, name: whRes.warehouse.warehouse_name, type: whRes.warehouse.type, location: whRes.warehouse.location });
    } catch (e) {
      console.error("fetchAll error", e);
    }
  }, [slug, session?.warehouse_id]);

  /* Check auth on mount */
  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("stockyard.manager") : null;
    if (!raw) {
      navigate({ to: "/manager-login" });
      return;
    }
    try {
      const s = JSON.parse(raw);
      setSession(s);
    } catch {
      navigate({ to: "/manager-login" });
      return;
    }
    setLoading(false);
  }, [slug]);

  /* Fetch data when session ready */
  useEffect(() => {
    if (session?.warehouse_id) fetchAll();
  }, [session?.warehouse_id, fetchAll]);

  const handleLogout = async () => {
    try { await logoutManager(slug); } catch {}
    localStorage.removeItem("stockyard.manager");
    navigate({ to: "/manager-login" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy">
        <Loader2 className="size-8 animate-spin text-cream" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-white/10 p-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition",
                active
                  ? "bg-white/80 text-[#1a2942] shadow-sm"
                  : "text-cream/70 hover:text-cream",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
      {section === "overview" && (
        <OverviewSection
          warehouse={warehouse}
          sections={sections}
          products={products}
          employees={employees}
          shipments={shipments}
          movements={movements}
        />
      )}
      {section === "sections" && (
        <SectionsSection
          slug={slug}
          sections={sections}
          setSections={setSections}
          products={products}
          warehouseId={session?.warehouse_id}
        />
      )}
      {section === "employees" && (
        <EmployeesSection
          slug={slug}
          warehouseId={session?.warehouse_id}
          employees={employees}
          setEmployees={setEmployees}
        />
      )}
      {section === "shipments" && (
        <ShipmentsSection
          slug={slug}
          shipments={shipments}
          setShipments={setShipments}
        />
      )}
      {section === "movements" && (
        <MovementsSection movements={movements} />
      )}
      {section === "tasks" && (
        <TasksSection
          slug={slug}
          tasks={tasks}
          setTasks={setTasks}
          employees={employees}
          warehouseId={session?.warehouse_id}
        />
      )}
      {section === "reports" && (
        <ReportsSection slug={slug} />
      )}
      {section === "settings" && (
        <SettingsSection session={session} onLogout={handleLogout} slug={slug} />
      )}
    </div>
  );
}

/* ===== Overview ===== */
function OverviewSection({
  warehouse, sections, products, employees, shipments, movements,
}: {
  warehouse: { id: number; name: string; type: string; location: string } | null;
  sections: Section[]; products: ManagerProduct[]; employees: ManagerEmployee[];
  shipments: ManagerShipment[]; movements: InventoryMovement[];
}) {
  const totalParcels = sections.reduce((s, sec) => s + (sec.quantity_parcels || 0), 0);
  const assignedSections = sections.filter((s) => s.product_id).length;
  const receivedShipments = shipments.filter((s) => s.status === "received").length;
  const pendingShipments = shipments.filter((s) => s.status !== "received").length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;

  const chartData = movements.slice(-30).reduce((acc: any[], m) => {
    const date = m.created_at?.slice(0, 10) ?? "";
    const existing = acc.find((d) => d.date === date);
    if (existing) {
      if (m.movement_type === "section_fill" || m.movement_type === "shipment_received") {
        existing.incoming += m.quantity_units;
      } else {
        existing.outgoing += m.quantity_units;
      }
    } else {
      acc.push({
        date,
        incoming: m.movement_type === "section_fill" || m.movement_type === "shipment_received" ? m.quantity_units : 0,
        outgoing: m.movement_type !== "section_fill" && m.movement_type !== "shipment_received" ? m.quantity_units : 0,
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {warehouse && (
        <GlassCard>
          <div className="flex items-center gap-3">
            <WarehouseIcon className="size-8 text-[oklch(0.78_0.16_75)]" />
            <div>
              <h2 className="text-lg font-bold text-[#1a2942]">{warehouse.name}</h2>
              <p className="text-xs text-[#1a2942]/60">{warehouse.type} &middot; {warehouse.location}</p>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard><p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">Sections</p><p className="mt-3 text-3xl font-bold text-[#1a2942]">{sections.length}</p><p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp className="size-3" /> {assignedSections} assigned</p></GlassCard>
        <GlassCard><p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">Products</p><p className="mt-3 text-3xl font-bold text-[#1a2942]">{products.length}</p><p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1"><Package className="size-3" /> {totalParcels} parcels</p></GlassCard>
        <GlassCard><p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">Employees</p><p className="mt-3 text-3xl font-bold text-[#1a2942]">{employees.length}</p><p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1"><Users className="size-3" /> {activeEmployees} active</p></GlassCard>
        <GlassCard><p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">Shipments</p><p className="mt-3 text-3xl font-bold text-[#1a2942]">{shipments.length}</p><p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="size-3" /> {receivedShipments} received</p></GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Inventory Movement Trend</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="outgoingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <RTooltip />
                <Area type="monotone" dataKey="incoming" stroke="#10B981" fill="url(#incomingGrad)" name="Incoming" />
                <Area type="monotone" dataKey="outgoing" stroke="#6366f1" fill="url(#outgoingGrad)" name="Outgoing" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[#1a2942]/50 py-8 text-center">No movement data yet</p>
          )}
        </GlassCard>
        <GlassCard>
          <h3 className="mb-4 text-sm font-semibold">Quick Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3"><Boxes className="size-4 text-[#6366f1]" /><div className="flex-1"><p className="text-sm font-semibold">Sections</p><p className="text-xs text-[#1a2942]/70">{sections.length} total ({assignedSections} with product)</p></div></div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3"><Package className="size-4 text-[#10B981]" /><div className="flex-1"><p className="text-sm font-semibold">Total Parcels</p><p className="text-xs text-[#1a2942]/70">{totalParcels} across {sections.length} sections</p></div></div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3"><Truck className="size-4 text-[#F59E0B]" /><div className="flex-1"><p className="text-sm font-semibold">Pending Shipments</p><p className="text-xs text-[#1a2942]/70">{pendingShipments} awaiting receipt</p></div></div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3"><Users className="size-4 text-[#EC4899]" /><div className="flex-1"><p className="text-sm font-semibold">Active Employees</p><p className="text-xs text-[#1a2942]/70">{activeEmployees} of {employees.length}</p></div></div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* ===== Sections ===== */
function SectionsSection({
  slug, sections, setSections, products, warehouseId,
}: {
  slug: string; sections: Section[]; setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  products: ManagerProduct[]; warehouseId: number | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [fillOpen, setFillOpen] = useState(false);
  const [fillSection, setFillSection] = useState<Section | null>(null);
  const [fillQty, setFillQty] = useState(1);
  const [fillNote, setFillNote] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [form, setForm] = useState<SectionInput>({ name: "", section_length: 1, section_width: 1, section_height: 1, product_id: null });
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      if (editSection) {
        const res = await updateSection(slug, editSection.id, { name: form.name, section_length: form.section_length, section_width: form.section_width, section_height: form.section_height });
        setSections((prev) => prev.map((s) => s.id === editSection.id ? res.section : s));
        toast.success("Section updated");
      } else {
        const res = await createSection(slug, form);
        setSections((prev) => [...prev, res.section]);
        toast.success("Section created");
      }
      setDialogOpen(false);
      setEditSection(null);
      setForm({ name: "", section_length: 1, section_width: 1, section_height: 1, product_id: null });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[Object.keys(err.response?.data?.errors ?? {})[0]]?.[0] || "Failed to save section";
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSection(slug, deleteId);
      setSections((prev) => prev.filter((s) => s.id !== deleteId));
      toast.success("Section deleted");
      setDeleteId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete section");
    }
  };

  const handleFill = async () => {
    if (!fillSection) return;
    if (!fillSection.product_id) { toast.error("Assign a product first"); return; }
    setSubmitting(true);
    try {
      const res = await fillSectionStock(slug, fillSection.id, { product_id: fillSection.product_id, quantity_parcels: fillQty, note: fillNote || undefined });
      setSections((prev) => prev.map((s) => s.id === fillSection.id ? res.section : s));
      toast.success("Stock added");
      setFillOpen(false);
      setFillSection(null);
      setFillQty(1);
      setFillNote("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fill stock");
    } finally { setSubmitting(false); }
  };

  const handleRemove = async (section: Section) => {
    if (!section.product_id || section.quantity_parcels <= 0) { toast.error("No stock to remove"); return; }
    try {
      const res = await removeSectionStock(slug, section.id, { product_id: section.product_id, quantity_parcels: 1 });
      setSections((prev) => prev.map((s) => s.id === section.id ? res.section : s));
      toast.success("Stock removed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove stock");
    }
  };

  const handleAssign = async (sectionId: number, productId: number) => {
    try {
      const res = await assignProductToSection(slug, sectionId, productId);
      setSections((prev) => prev.map((s) => s.id === sectionId ? res.section : s));
      toast.success("Product assigned");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign product");
    }
  };

  const handleUnassign = async (sectionId: number) => {
    try {
      const res = await unassignProductFromSection(slug, sectionId);
      setSections((prev) => prev.map((s) => s.id === sectionId ? res.section : s));
      toast.success("Product unassigned");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to unassign product");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1a2942]">Warehouse Sections</h2>
        <Button onClick={() => { setEditSection(null); setForm({ name: "", section_length: 1, section_width: 1, section_height: 1, product_id: null }); setDialogOpen(true); } }>
          <Plus className="size-4 mr-1" /> Add Section
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((sec) => (
          <GlassCard key={sec.id} className="relative">
            <div className="absolute right-3 top-3 flex gap-1">
              <Tooltip><TooltipTrigger asChild><button onClick={() => { setEditSection(sec); setForm({ name: sec.name, section_length: sec.dimensions.length, section_width: sec.dimensions.width, section_height: sec.dimensions.height, product_id: sec.product_id }); setDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-white/40 text-navy"><Pencil className="size-3.5" /></button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button onClick={() => setDeleteId(sec.id)} className="p-1.5 rounded-lg hover:bg-white/40 text-red-500"><Trash2 className="size-3.5" /></button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
            </div>
            <h3 className="font-semibold text-[#1a2942]">{sec.name}</h3>
            <div className="mt-2 space-y-1 text-xs text-[#1a2942]/70">
              <p>Dimensions: {sec.dimensions.length}m x {sec.dimensions.width}m x {sec.dimensions.height}m</p>
              {sec.product ? (
                <>
                  <p className="font-medium text-[#1a2942]">Product: {sec.product.name}</p>
                  <p>Parcels: <strong>{sec.quantity_parcels}</strong> / {sec.capacity.max_parcels_capacity}</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full bg-[oklch(0.78_0.16_75)]" style={{ width: `${Math.min(sec.capacity.capacity_usage_percentage, 100)}%` }} />
                  </div>
                  <p className="text-[10px]">{sec.capacity.capacity_usage_percentage.toFixed(1)}% capacity used</p>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFillSection(sec); setFillQty(1); setFillNote(""); setFillOpen(true); }}>Fill</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRemove(sec)} disabled={sec.quantity_parcels <= 0}>Remove 1</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUnassign(sec.id)}>Unassign</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-amber-600 font-medium">No product assigned</p>
                  <Select onValueChange={(v) => handleAssign(sec.id, Number(v))}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Assign product..." /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </>
              )}
            </div>
          </GlassCard>
        ))}
        {sections.length === 0 && (
          <GlassCard className="col-span-full text-center py-8">
            <p className="text-[#1a2942]/50">No sections yet. Create one to get started.</p>
          </GlassCard>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editSection ? "Edit Section" : "New Section"}</DialogTitle><DialogDescription>Configure section dimensions and optionally assign a product.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Zone A-1" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Length (m)</Label><Input type="number" step="0.1" min="0.1" value={form.section_length} onChange={(e) => setForm((f) => ({ ...f, section_length: parseFloat(e.target.value) || 1 }))} /></div>
              <div><Label>Width (m)</Label><Input type="number" step="0.1" min="0.1" value={form.section_width} onChange={(e) => setForm((f) => ({ ...f, section_width: parseFloat(e.target.value) || 1 }))} /></div>
              <div><Label>Height (m)</Label><Input type="number" step="0.1" min="0.1" value={form.section_height} onChange={(e) => setForm((f) => ({ ...f, section_height: parseFloat(e.target.value) || 1 }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete section?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fill Stock Dialog */}
      <Dialog open={fillOpen} onOpenChange={setFillOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Fill Stock</DialogTitle><DialogDescription>Add parcels to {fillSection?.name}.</DialogDescription></DialogHeader>
          {fillSection?.product && <p className="text-sm font-medium">Product: {fillSection.product.name}</p>}
          <div><Label>Quantity (parcels)</Label><Input type="number" min="1" value={fillQty} onChange={(e) => setFillQty(parseInt(e.target.value) || 1)} /></div>
          <div><Label>Note (optional)</Label><Textarea value={fillNote} onChange={(e) => setFillNote(e.target.value)} placeholder="e.g. Received from supplier" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFillOpen(false)}>Cancel</Button>
            <Button onClick={handleFill} disabled={submitting}>{submitting ? "Adding..." : "Add Stock"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== Employees ===== */
function EmployeesSection({
  slug, warehouseId, employees, setEmployees,
}: {
  slug: string; warehouseId: number | null;
  employees: ManagerEmployee[]; setEmployees: React.Dispatch<React.SetStateAction<ManagerEmployee[]>>;
}) {
  const [open, setOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<ManagerEmployee | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ full_name: "", phone_number: "", user_name: "", password: "", role: "staff", salary: 0 });
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.phone_number.trim() || (!editEmp && !form.password.trim())) { toast.error("Required fields missing"); return; }
    if (!warehouseId) return;
    setSubmitting(true);
    try {
      if (editEmp) {
        const res = await updateManagerEmployee(slug, warehouseId, editEmp.id, { full_name: form.full_name, phone_number: form.phone_number, user_name: form.user_name, role: form.role, salary: form.salary });
        setEmployees((prev) => prev.map((e) => e.id === editEmp.id ? res.employee : e));
        toast.success("Employee updated");
      } else {
        const res = await createManagerEmployee(slug, warehouseId, form);
        setEmployees((prev) => [...prev, res.employee]);
        toast.success(res.password ? `Employee created. Password: ${res.password}` : "Employee created");
      }
      setOpen(false);
      setEditEmp(null);
      setForm({ full_name: "", phone_number: "", user_name: "", password: "", role: "staff", salary: 0 });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[Object.keys(err.response?.data?.errors ?? {})[0]]?.[0] || "Failed to save";
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId || !warehouseId) return;
    try {
      await deleteManagerEmployee(slug, warehouseId, deleteId);
      setEmployees((prev) => prev.filter((e) => e.id !== deleteId));
      toast.success("Employee removed");
      setDeleteId(null);
    } catch { toast.error("Failed to delete"); }
  };

  const roleColors: Record<string, string> = { manager: "bg-purple-100 text-purple-700", warehouse_secretary: "bg-blue-100 text-blue-700", staff: "bg-green-100 text-green-700", driver: "bg-amber-100 text-amber-700" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1a2942]">Employees</h2>
        <Button onClick={() => { setEditEmp(null); setForm({ full_name: "", phone_number: "", user_name: "", password: "", role: "staff", salary: 0 }); setOpen(true); }}>
          <Plus className="size-4 mr-1" /> Add Employee
        </Button>
      </div>
      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[#1a2942]/70">Name</TableHead>
              <TableHead className="text-[#1a2942]/70">Username</TableHead>
              <TableHead className="text-[#1a2942]/70">Phone</TableHead>
              <TableHead className="text-[#1a2942]/70">Role</TableHead>
              <TableHead className="text-[#1a2942]/70">Status</TableHead>
              <TableHead className="text-[#1a2942]/70">Salary</TableHead>
              <TableHead className="text-right text-[#1a2942]/70">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id} className="border-white/40">
                <TableCell className="font-medium text-[#1a2942]">{emp.system_user.full_name}</TableCell>
                <TableCell className="text-[#1a2942]/80 font-mono text-xs">{emp.system_user.user_name}</TableCell>
                <TableCell className="text-[#1a2942]/80">{emp.system_user.phone_number}</TableCell>
                <TableCell><Badge className={cn("text-xs font-medium", roleColors[emp.role] ?? "bg-gray-100")}>{emp.role.replace("_", " ")}</Badge></TableCell>
                <TableCell><Badge variant={emp.status === "active" ? "default" : "secondary"} className="text-xs">{emp.status}</Badge></TableCell>
                <TableCell className="text-[#1a2942]">${emp.salary}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Tooltip><TooltipTrigger asChild><button onClick={() => { setEditEmp(emp); setForm({ full_name: emp.system_user.full_name, phone_number: emp.system_user.phone_number, user_name: emp.system_user.user_name, password: "", role: emp.role, salary: emp.salary }); setOpen(true); }} className="p-1.5 rounded-lg hover:bg-white/40 text-navy"><Pencil className="size-3.5" /></button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><button onClick={() => setDeleteId(emp.id)} className="p-1.5 rounded-lg hover:bg-white/40 text-red-500"><Trash2 className="size-3.5" /></button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-[#1a2942]/50">No employees yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editEmp ? "Edit Employee" : "New Employee"}</DialogTitle><DialogDescription>{editEmp ? "Update employee details." : "Add a staff member, driver, or secretary to this warehouse."}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} /></div>
            <div><Label>Username</Label><Input value={form.user_name} onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} /></div>
            {!editEmp && <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>}
            <div><Label>Role</Label><Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="warehouse_secretary">Secretary</SelectItem><SelectItem value="staff">Staff</SelectItem><SelectItem value="driver">Driver</SelectItem></SelectContent></Select></div>
            <div><Label>Salary ($)</Label><Input type="number" min="0" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove employee?</AlertDialogTitle><AlertDialogDescription>This will delete their account and access.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ===== Shipments ===== */
function ShipmentsSection({
  slug, shipments, setShipments,
}: {
  slug: string; shipments: ManagerShipment[]; setShipments: React.Dispatch<React.SetStateAction<ManagerShipment[]>>;
}) {
  const [receiving, setReceiving] = useState<number | null>(null);

  const handleReceive = async (id: number) => {
    setReceiving(id);
    try {
      const res = await receiveManagerShipment(slug, id);
      setShipments((prev) => prev.map((s) => s.id === id ? res.shipment : s));
      toast.success("Shipment received");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to receive shipment");
    } finally { setReceiving(null); }
  };

  const statusColors: Record<ManagerShipmentStatus, string> = { pending: "bg-yellow-100 text-yellow-700", in_transit: "bg-blue-100 text-blue-700", received: "bg-green-100 text-green-700" };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1a2942]">Shipments</h2>
      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[#1a2942]/70">Factory</TableHead>
              <TableHead className="text-[#1a2942]/70">Total</TableHead>
              <TableHead className="text-[#1a2942]/70">Arrival</TableHead>
              <TableHead className="text-[#1a2942]/70">Status</TableHead>
              <TableHead className="text-right text-[#1a2942]/70">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((s) => (
              <TableRow key={s.id} className="border-white/40">
                <TableCell className="font-medium text-[#1a2942]">{s.factory_name}</TableCell>
                <TableCell className="text-[#1a2942]">${s.total_price}</TableCell>
                <TableCell className="text-[#1a2942]/80">{s.arrival_date ?? "—"}</TableCell>
                <TableCell><Badge className={cn("text-xs font-medium", statusColors[s.status] ?? "")}>{s.status_label}</Badge></TableCell>
                <TableCell className="text-right">
                  {s.can_receive ? (
                    <Button size="sm" className="h-8 text-xs" onClick={() => handleReceive(s.id)} disabled={receiving === s.id}>
                      {receiving === s.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <CheckCircle2 className="size-3 mr-1" />} Receive
                    </Button>
                  ) : (
                    <span className="text-xs text-[#1a2942]/50">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {shipments.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-[#1a2942]/50">No shipments yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}

/* ===== Movements ===== */
function MovementsSection({ movements }: { movements: InventoryMovement[] }) {
  const typeColors: Record<string, string> = {
    shipment_received: "bg-green-100 text-green-700",
    section_fill: "bg-blue-100 text-blue-700",
    section_remove: "bg-red-100 text-red-700",
    section_transfer: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1a2942]">Inventory Movements</h2>
      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[#1a2942]/70">Date</TableHead>
              <TableHead className="text-[#1a2942]/70">Type</TableHead>
              <TableHead className="text-[#1a2942]/70">Product</TableHead>
              <TableHead className="text-[#1a2942]/70">Parcels</TableHead>
              <TableHead className="text-[#1a2942]/70">Units</TableHead>
              <TableHead className="text-[#1a2942]/70">By</TableHead>
              <TableHead className="text-[#1a2942]/70">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.slice(0, 100).map((m) => (
              <TableRow key={m.id} className="border-white/40">
                <TableCell className="text-xs text-[#1a2942]/80">{m.created_at?.slice(0, 16).replace("T", " ")}</TableCell>
                <TableCell><Badge className={cn("text-xs font-medium", typeColors[m.movement_type] ?? "")}>{m.movement_type_label}</Badge></TableCell>
                <TableCell className="font-medium text-[#1a2942] text-sm">{m.product.name}</TableCell>
                <TableCell className="text-[#1a2942]">{m.quantity_parcels}</TableCell>
                <TableCell className="text-[#1a2942]">{m.quantity_units}</TableCell>
                <TableCell className="text-xs text-[#1a2942]/80">{m.performed_by.full_name}</TableCell>
                <TableCell className="text-xs text-[#1a2942]/50 max-w-[120px] truncate">{m.note ?? "—"}</TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-[#1a2942]/50">No movements recorded yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}

/* ===== Tasks ===== */
function TasksSection({
  slug, tasks, setTasks, employees, warehouseId,
}: {
  slug: string; tasks: ManagerTask[]; setTasks: React.Dispatch<React.SetStateAction<ManagerTask[]>>;
  employees: ManagerEmployee[]; warehouseId: number | null;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AssignTaskInput>({ worker_or_driver_id: 0, task_type: "", related_type: "", related_id: 0 });

  const taskTypeOptions = [
    { value: "order_preparation", label: "Order Preparation" },
    { value: "order_delivery", label: "Order Delivery" },
    { value: "transfer_preparation", label: "Transfer Preparation" },
    { value: "transfer_delivery", label: "Transfer Delivery" },
    { value: "shipment_receiving", label: "Shipment Receiving" },
    { value: "damage_disposal", label: "Damage Disposal" },
    { value: "return_pickup", label: "Return Pickup" },
    { value: "restock_product", label: "Restock Product" },
  ];

  const statusColors: Record<string, string> = {
    in_preparation: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
  };

  const availableWorkers = employees.filter((e) => e.role === "staff" || e.role === "driver");

  const handleAssign = async () => {
    if (!form.worker_or_driver_id || !form.task_type || !form.related_type || !form.related_id) {
      toast.error("All fields are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await assignTask(slug, form);
      setTasks((prev) => [res.task, ...prev]);
      toast.success("Task assigned");
      setAssignOpen(false);
      setForm({ worker_or_driver_id: 0, task_type: "", related_type: "", related_id: 0 });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign task");
    } finally { setSubmitting(false); }
  };

  const handleComplete = async (taskId: number) => {
    try {
      const res = await updateTaskStatus(slug, taskId, { status: "completed" });
      setTasks((prev) => prev.map((t) => t.id === taskId ? res.task : t));
      toast.success("Task marked completed");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update task");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1a2942]">Tasks</h2>
        <Button onClick={() => setAssignOpen(true)}>
          <Plus className="size-4 mr-1" /> Assign Task
        </Button>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[#1a2942]/70">Type</TableHead>
              <TableHead className="text-[#1a2942]/70">Worker</TableHead>
              <TableHead className="text-[#1a2942]/70">Related</TableHead>
              <TableHead className="text-[#1a2942]/70">Status</TableHead>
              <TableHead className="text-[#1a2942]/70">Created</TableHead>
              <TableHead className="text-right text-[#1a2942]/70">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id} className="border-white/40">
                <TableCell className="font-medium text-[#1a2942] text-sm capitalize">{t.task_type.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-[#1a2942]/80">{t.worker.full_name}</TableCell>
                <TableCell className="text-xs text-[#1a2942]/80">{t.related?.label ?? "—"}</TableCell>
                <TableCell><Badge className={cn("text-xs font-medium", statusColors[t.status] ?? "")}>{t.status.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell className="text-xs text-[#1a2942]/60">{t.created_at?.slice(0, 10)}</TableCell>
                <TableCell className="text-right">
                  {t.status === "in_preparation" ? (
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleComplete(t.id)}>
                      <CheckCircle2 className="size-3 mr-1" /> Complete
                    </Button>
                  ) : (
                    <span className="text-xs text-[#1a2942]/50">Done</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-[#1a2942]/50">No tasks yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>

      {/* Assign Task Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Assign Task</DialogTitle><DialogDescription>Create a new task for a worker or driver.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Worker</Label><Select value={String(form.worker_or_driver_id)} onValueChange={(v) => setForm((f) => ({ ...f, worker_or_driver_id: Number(v) }))}><SelectTrigger><SelectValue placeholder="Select worker..." /></SelectTrigger><SelectContent>{availableWorkers.map((w) => <SelectItem key={w.id} value={String(w.system_user_id)}>{w.system_user.full_name} ({w.role})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Task Type</Label><Select value={form.task_type} onValueChange={(v) => setForm((f) => ({ ...f, task_type: v }))}><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger><SelectContent>{taskTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Related Type</Label><Select value={form.related_type} onValueChange={(v) => setForm((f) => ({ ...f, related_type: v }))}><SelectTrigger><SelectValue placeholder="e.g. order" /></SelectTrigger><SelectContent><SelectItem value="order">Order</SelectItem><SelectItem value="shipment">Shipment</SelectItem><SelectItem value="return">Return</SelectItem><SelectItem value="transfer_request">Transfer</SelectItem></SelectContent></Select></div>
              <div><Label>Related ID</Label><Input type="number" min="1" value={form.related_id || ""} onChange={(e) => setForm((f) => ({ ...f, related_id: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={submitting}>{submitting ? "Assigning..." : "Assign"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== Reports ===== */
const MANAGER_REPORTS = [
  { key: "orders", label: "Orders Report" },
  { key: "returns", label: "Returns Report" },
  { key: "tasks", label: "Tasks Report" },
] as const;

function ReportsSection({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);

  const baseUrl = (import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") || "");

  const openPdf = (report: string) => {
    window.open(`${baseUrl}/${slug}/manager/reports/${report}/pdf`, "_blank");
  };

  const downloadExcel = async (report: string) => {
    const id = `${report}-excel`;
    setBusy(id);
    try {
      await getCsrfCookie();
      const url = `${baseUrl}/${slug}/manager/reports/${report}/excel`;
      const res = await api.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${report}-report.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success(`${report} Excel downloaded`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || "Download failed";
      toast.error(typeof msg === "string" ? msg : "Download failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-[#1a2942]">{t("report.title")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MANAGER_REPORTS.map((r) => (
          <GlassCard key={r.key} className="transition hover:-translate-y-0.5 hover:shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{r.label}</h4>
              <FileText className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.key === "orders" && t("report.orders.desc")}
              {r.key === "returns" && t("report.returns.desc")}
              {r.key === "tasks" && t("report.tasks.desc")}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => downloadExcel(r.key)}
                disabled={busy === `${r.key}-excel`}
              >
                <Download className="mr-1 size-3.5" />
                {busy === `${r.key}-excel` ? t("report.downloading") : t("report.excel")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => openPdf(r.key)}
              >
                <Download className="mr-1 size-3.5" />
                {busy === `${r.key}-pdf` ? t("report.downloading") : t("report.pdf")}
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ===== Settings ===== */
function SettingsSection({ session, onLogout, slug }: { session: any; onLogout: () => void; slug: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1a2942]">{t("settings.title")}</h2>
      <GlassCard>
        <h3 className="font-semibold text-[#1a2942] mb-4">{t("settings.profile")}</h3>
        <div className="space-y-2 text-sm text-[#1a2942]/80">
          <p><strong>{t("settings.name")}:</strong> {session?.full_name}</p>
          <p><strong>{t("settings.username")}:</strong> {session?.user_name}</p>
          <p><strong>{t("settings.role")}:</strong> {session?.role?.replace("_", " ")}</p>
          <p><strong>{t("settings.company")}:</strong> {session?.tenant?.company_name}</p>
          <p><strong>{t("settings.slug")}:</strong> {slug}</p>
          <p><strong>{t("settings.warehouse_id")}:</strong> {session?.warehouse_id}</p>
        </div>
      </GlassCard>
      <GlassCard>
        <h3 className="font-semibold text-[#1a2942] mb-4">{t("settings.account")}</h3>
        <Button variant="destructive" onClick={onLogout}>
          <LogOut className="size-4 mr-1" /> {t("settings.sign_out")}
        </Button>
      </GlassCard>
    </div>
  );
}
