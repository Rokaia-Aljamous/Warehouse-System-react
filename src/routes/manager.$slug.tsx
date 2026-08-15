import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Boxes, ClipboardList, BarChart3, FileText, LogOut, Loader2, Plus, Trash2,
  ArrowLeftRight, CheckCircle2, Truck, RefreshCw, Eye, Pencil, X, Search,
  Warehouse as WarehouseIcon, Wallet as WalletIcon, Settings as SettingsIcon,
  AlertTriangle, TrendingUp, Package, ListChecks, Download, Send,
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
  getMovementTypeKey,
  type InventoryMovement,
  type ManagerTask, type AssignTaskInput,
} from "@/lib/manager-api";
import { api, getStoredUser, setStoredUser, getCsrfCookie } from "@/lib/api";
import i18n from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { WarehouseLayout } from "@/components/WarehouseLayout";
import { CredentialsDialog } from "@/components/CredentialsDialog";
import { useTransferRequests } from "@/hooks/useTransferRequests";
import { AvailableRequestsFeed } from "@/components/transfer/AvailableRequestsFeed";
import { MyWarehouseRequests } from "@/components/transfer/MyWarehouseRequests";
import { ManagerAnalytics } from "@/components/analytics/ManagerAnalytics";
import { StorekeeperAnalytics } from "@/components/analytics/StorekeeperAnalytics";
import { OwnerAnalytics } from "@/components/analytics/OwnerAnalytics";
import { OwnerFinancialSettings } from "@/components/analytics/OwnerFinancialSettings";

export const Route = createFileRoute("/manager/$slug")({
  component: ManagerDashboard,
  head: () => ({
    meta: [
      { title: `${i18n.t("title.manager_detail")} — Stockyard` },
      { name: "description", content: i18n.t("title.manager_detail_desc") },
    ],
  }),
});

type SectionId =
  | "overview" | "sections" | "employees" | "shipments" | "movements" | "tasks" | "transfers" | "reports" | "analytics" | "financial" | "settings"| "layout";

const NAV: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "manager.overview", icon: LayoutDashboard },
  { id: "layout", label: "sidebar.layout", icon: WarehouseIcon },
  { id: "sections", label: "sidebar.sections", icon: Boxes },
  { id: "employees", label: "sidebar.employees", icon: Users },
  { id: "shipments", label: "sidebar.shipments", icon: Truck },
  { id: "movements", label: "manager.movements", icon: ArrowLeftRight },
  { id: "tasks", label: "sidebar.tasks", icon: ListChecks },
  { id: "transfers", label: "sidebar.transfers", icon: Send },
  { id: "reports", label: "sidebar.reports", icon: FileText },
  { id: "analytics", label: "sidebar.analytics", icon: BarChart3 },
  { id: "financial", label: "sidebar.financial", icon: WalletIcon },
  { id: "settings", label: "sidebar.settings", icon: SettingsIcon },
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
      if (s.must_change_password) {
        navigate({ to: "/force-password-change", replace: true });
        return;
      }
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-white/10 p-1">
          {NAV.filter((item) => item.id !== "financial" || session?.role === "owner").map((item) => {
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
                {t(item.label)}
              </button>
            );
          })}
        </div>
        <div className="ms-auto">
          <LanguageToggle variant="header" />
        </div>
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
      {section === "layout" && (
        <WarehouseLayout
          slug={slug}
          sections={sections}
          setSections={setSections}
          products={products}
          warehouse={warehouse}
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
      {section === "transfers" && (
        <TransfersSection
          slug={slug}
          ownerId={session?.owner_id}
          warehouseId={session?.warehouse_id}
          products={products}
        />
      )}
      {section === "reports" && (
        <ReportsSection slug={slug} />
      )}
      {section === "analytics" && (
        <AnalyticsSection slug={slug} role={session?.role} />
      )}
      {section === "financial" && (
        <OwnerFinancialSettings slug={slug} />
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
  const { t } = useTranslation();
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
        <GlassCard><p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">{t("sidebar.sections")}</p><p className="mt-3 text-3xl font-bold text-[#1a2942]">{sections.length}</p><p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp className="size-3" /> {t("manager.assigned", { count: assignedSections })}</p></GlassCard>
        <GlassCard><p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">{t("product.title")}</p><p className="mt-3 text-3xl font-bold text-[#1a2942]">{products.length}</p><p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1"><Package className="size-3" /> {t("manager.parcels", { count: totalParcels })}</p></GlassCard>
        <GlassCard><p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">{t("employee.title")}</p><p className="mt-3 text-3xl font-bold text-[#1a2942]">{employees.length}</p><p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1"><Users className="size-3" /> {t("manager.active_count", { count: activeEmployees })}</p></GlassCard>
        <GlassCard><p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/70">{t("shipment.title")}</p><p className="mt-3 text-3xl font-bold text-[#1a2942]">{shipments.length}</p><p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="size-3" /> {t("manager.received_count", { count: receivedShipments })}</p></GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">{t("manager.inventory_trend")}</h3>
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
                <Area type="monotone" dataKey="incoming" stroke="#10B981" fill="url(#incomingGrad)" name={t("manager.incoming")} />
                <Area type="monotone" dataKey="outgoing" stroke="#6366f1" fill="url(#outgoingGrad)" name={t("manager.outgoing")} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[#1a2942]/50 py-8 text-center">{t("manager.no_movement_data")}</p>
          )}
        </GlassCard>
        <GlassCard>
          <h3 className="mb-4 text-sm font-semibold">{t("manager.quick_summary")}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3"><Boxes className="size-4 text-[#6366f1]" /><div className="flex-1"><p className="text-sm font-semibold">{t("sidebar.sections")}</p><p className="text-xs text-[#1a2942]/70">{t("manager.total_count", { count: sections.length })} ({t("manager.with_product", { count: assignedSections })})</p></div></div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3"><Package className="size-4 text-[#10B981]" /><div className="flex-1"><p className="text-sm font-semibold">{t("manager.total_parcels")}</p><p className="text-xs text-[#1a2942]/70">{t("manager.parcels_across", { count: totalParcels, total: sections.length })}</p></div></div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3"><Truck className="size-4 text-[#F59E0B]" /><div className="flex-1"><p className="text-sm font-semibold">{t("manager.pending_shipments")}</p><p className="text-xs text-[#1a2942]/70">{t("manager.awaiting_receipt", { count: pendingShipments })}</p></div></div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-3"><Users className="size-4 text-[#EC4899]" /><div className="flex-1"><p className="text-sm font-semibold">{t("manager.active_employees")}</p><p className="text-xs text-[#1a2942]/70">{t("manager.active_of", { count: activeEmployees, total: employees.length })}</p></div></div>
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
  const { t } = useTranslation();
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
    if (!form.name.trim()) { toast.error(t("section.name_required")); return; }
    setSubmitting(true);
    try {
      if (editSection) {
        const res = await updateSection(slug, editSection.id, { name: form.name, section_length: form.section_length, section_width: form.section_width, section_height: form.section_height });
        setSections((prev) => prev.map((s) => s.id === editSection.id ? res.section : s));
        toast.success(t("section.updated"));
      } else {
        const res = await createSection(slug, form);
        setSections((prev) => [...prev, res.section]);
        toast.success(t("section.created"));
      }
      setDialogOpen(false);
      setEditSection(null);
      setForm({ name: "", section_length: 1, section_width: 1, section_height: 1, product_id: null });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[Object.keys(err.response?.data?.errors ?? {})[0]]?.[0] || t("section.save_failed");
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSection(slug, deleteId);
      setSections((prev) => prev.filter((s) => s.id !== deleteId));
      toast.success(t("section.deleted"));
      setDeleteId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("section.delete_failed"));
    }
  };

  const handleFill = async () => {
    if (!fillSection) return;
    if (!fillSection.product_id) { toast.error(t("section.assign_product_first")); return; }
    setSubmitting(true);
    try {
      const res = await fillSectionStock(slug, fillSection.id, { product_id: fillSection.product_id, quantity_parcels: fillQty, note: fillNote || undefined });
      setSections((prev) => prev.map((s) => s.id === fillSection.id ? res.section : s));
      toast.success(t("section.stock_added"));
      setFillOpen(false);
      setFillSection(null);
      setFillQty(1);
      setFillNote("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("section.fill_failed"));
    } finally { setSubmitting(false); }
  };

  const handleRemove = async (section: Section) => {
    if (!section.product_id || section.quantity_parcels <= 0) { toast.error(t("section.no_stock_to_remove")); return; }
    try {
      const res = await removeSectionStock(slug, section.id, { product_id: section.product_id, quantity_parcels: 1 });
      setSections((prev) => prev.map((s) => s.id === section.id ? res.section : s));
      toast.success(t("section.stock_removed"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("section.remove_stock_failed"));
    }
  };

  const handleAssign = async (sectionId: number, productId: number) => {
    try {
      const res = await assignProductToSection(slug, sectionId, productId);
      setSections((prev) => prev.map((s) => s.id === sectionId ? res.section : s));
      toast.success(t("section.product_assigned"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("section.assign_failed"));
    }
  };

  const handleUnassign = async (sectionId: number) => {
    try {
      const res = await unassignProductFromSection(slug, sectionId);
      setSections((prev) => prev.map((s) => s.id === sectionId ? res.section : s));
      toast.success(t("section.product_unassigned"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("section.unassign_failed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1a2942]">{t("manager.warehouse_sections")}</h2>
        <Button onClick={() => { setEditSection(null); setForm({ name: "", section_length: 1, section_width: 1, section_height: 1, product_id: null }); setDialogOpen(true); } }>
          <Plus className="size-4 me-1" /> {t("section.add")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((sec) => (
          <GlassCard key={sec.id} className="relative">
            <div className="absolute end-3 top-3 flex gap-1">
              <Tooltip><TooltipTrigger asChild><button onClick={() => { setEditSection(sec); setForm({ name: sec.name, section_length: sec.dimensions.length, section_width: sec.dimensions.width, section_height: sec.dimensions.height, product_id: sec.product_id }); setDialogOpen(true); }} className="p-1.5 rounded-lg hover:bg-white/40 text-navy"><Pencil className="size-3.5" /></button></TooltipTrigger><TooltipContent>{t("common.edit")}</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button onClick={() => setDeleteId(sec.id)} className="p-1.5 rounded-lg hover:bg-white/40 text-red-500"><Trash2 className="size-3.5" /></button></TooltipTrigger><TooltipContent>{t("common.delete")}</TooltipContent></Tooltip>
            </div>
            <h3 className="font-semibold text-[#1a2942]">{sec.name}</h3>
            <div className="mt-2 space-y-1 text-xs text-[#1a2942]/70">
              <p>{t("section.dimensions_label", { length: sec.dimensions.length, width: sec.dimensions.width, height: sec.dimensions.height })}</p>
              {sec.product ? (
                <>
                  <p className="font-medium text-[#1a2942]">{t("section.product")}: {sec.product.name}</p>
                  <p>{t("section.parcels")}: <strong>{sec.quantity_parcels}</strong> / {sec.capacity.max_parcels_capacity}</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full bg-[oklch(0.78_0.16_75)]" style={{ width: `${Math.min(sec.capacity.capacity_usage_percentage, 100)}%` }} />
                  </div>
                  <p className="text-[10px]">{t("section.capacity_used", { percent: sec.capacity.capacity_usage_percentage.toFixed(1) })}</p>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFillSection(sec); setFillQty(1); setFillNote(""); setFillOpen(true); }}>{t("section.fill_button")}</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRemove(sec)} disabled={sec.quantity_parcels <= 0}>{t("section.remove_one")}</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUnassign(sec.id)}>{t("section.unassign")}</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-amber-600 font-medium">{t("section.no_product_assigned")}</p>
                  <Select onValueChange={(v) => handleAssign(sec.id, Number(v))}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder={t("placeholder.assign_product")} /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </>
              )}
            </div>
          </GlassCard>
        ))}
        {sections.length === 0 && (
          <GlassCard className="col-span-full text-center py-8">
            <p className="text-[#1a2942]/50">{t("section.empty")}</p>
          </GlassCard>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editSection ? t("section.edit_title") : t("section.new_title")}</DialogTitle><DialogDescription>{t("section.edit_desc")}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("product.name")}</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("placeholder.zone_example")} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t("section.length_m")}</Label><Input type="number" step="0.1" min="0.1" value={form.section_length} onChange={(e) => setForm((f) => ({ ...f, section_length: parseFloat(e.target.value) || 1 }))} /></div>
              <div><Label>{t("section.width_m")}</Label><Input type="number" step="0.1" min="0.1" value={form.section_width} onChange={(e) => setForm((f) => ({ ...f, section_width: parseFloat(e.target.value) || 1 }))} /></div>
              <div><Label>{t("section.height_m")}</Label><Input type="number" step="0.1" min="0.1" value={form.section_height} onChange={(e) => setForm((f) => ({ ...f, section_height: parseFloat(e.target.value) || 1 }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("section.delete_confirm_title")}</AlertDialogTitle><AlertDialogDescription>{t("common.cannot_undo")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fill Stock Dialog */}
      <Dialog open={fillOpen} onOpenChange={setFillOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("section.fill")}</DialogTitle><DialogDescription>{t("section.fill_desc", { name: fillSection?.name })}</DialogDescription></DialogHeader>
          {fillSection?.product && <p className="text-sm font-medium">{t("section.product")}: {fillSection.product.name}</p>}
          <div><Label>{t("section.quantity_parcels")}</Label><Input type="number" min="1" value={fillQty} onChange={(e) => setFillQty(parseInt(e.target.value) || 1)} /></div>
          <div><Label>{t("section.note_optional")}</Label><Textarea value={fillNote} onChange={(e) => setFillNote(e.target.value)} placeholder={t("placeholder.supplier_example")} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFillOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleFill} disabled={submitting}>{submitting ? t("section.adding") : t("section.add_stock")}</Button>
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<ManagerEmployee | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ full_name: "", phone_number: "", user_name: "", role: "staff", salary: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ user_name: string; password: string } | null>(null);

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.phone_number.trim() || !form.user_name.trim()) { toast.error(t("employee.required_fields")); return; }
    if (!/^09\d{8}$/.test(form.phone_number.trim())) { toast.error(t("manager.toast_phone_invalid")); return; }
    if (!warehouseId) return;
    setSubmitting(true);
    try {
      if (editEmp) {
        const res = await updateManagerEmployee(slug, warehouseId, editEmp.id, { full_name: form.full_name, phone_number: form.phone_number, user_name: form.user_name, role: form.role, salary: form.salary });
        setEmployees((prev) => prev.map((e) => e.id === editEmp.id ? res.employee : e));
        toast.success(t("employee.updated"));
      } else {
        const res = await createManagerEmployee(slug, warehouseId, form);
        setEmployees((prev) => [...prev, res.employee]);
        setCreatedCreds({ user_name: res.employee.system_user.user_name, password: res.password ?? "" });
        toast.success(t("employee.created"));
      }
      setOpen(false);
      setEditEmp(null);
      setForm({ full_name: "", phone_number: "", user_name: "", role: "staff", salary: 0 });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[Object.keys(err.response?.data?.errors ?? {})[0]]?.[0] || t("employee.save_failed");
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteId || !warehouseId) return;
    try {
      await deleteManagerEmployee(slug, warehouseId, deleteId);
      setEmployees((prev) => prev.filter((e) => e.id !== deleteId));
      toast.success(t("employee.removed"));
      setDeleteId(null);
    } catch { toast.error(t("employee.delete_failed")); }
  };

  const roleColors: Record<string, string> = { manager: "bg-purple-100 text-purple-700", warehouse_secretary: "bg-blue-100 text-blue-700", staff: "bg-green-100 text-green-700", driver: "bg-amber-100 text-amber-700" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1a2942]">{t("employee.title")}</h2>
        <Button onClick={() => { setEditEmp(null); setForm({ full_name: "", phone_number: "", user_name: "", role: "staff", salary: 0 }); setOpen(true); }}>
          <Plus className="size-4 me-1" /> {t("employee.add")}
        </Button>
      </div>
      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[#1a2942]/70">{t("product.name")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("employee.username")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("common.phone")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("employee.role")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("employee.status")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("employee.salary")}</TableHead>
              <TableHead className="text-end text-[#1a2942]/70">{t("common.actions")}</TableHead>
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
                <TableCell className="text-end">
                  <div className="flex justify-end gap-1">
                    <Tooltip><TooltipTrigger asChild><button onClick={() => { setEditEmp(emp); setForm({ full_name: emp.system_user.full_name, phone_number: emp.system_user.phone_number, user_name: emp.system_user.user_name, role: emp.role, salary: emp.salary }); setOpen(true); }} className="p-1.5 rounded-lg hover:bg-white/40 text-navy"><Pencil className="size-3.5" /></button></TooltipTrigger><TooltipContent>{t("common.edit")}</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><button onClick={() => setDeleteId(emp.id)} className="p-1.5 rounded-lg hover:bg-white/40 text-red-500"><Trash2 className="size-3.5" /></button></TooltipTrigger><TooltipContent>{t("common.delete")}</TooltipContent></Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-[#1a2942]/50">{t("employee.no_employees")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editEmp ? t("employee.edit_title") : t("employee.new_title")}</DialogTitle><DialogDescription>{editEmp ? t("employee.edit_desc") : t("employee.new_desc")}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("employee.name")}</Label><Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} /></div>
            <div><Label>{t("employee.username")}</Label><Input value={form.user_name} onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))} /></div>
            <div><Label>{t("common.phone")}</Label><Input value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} /></div>
            <div><Label>{t("employee.role")}</Label><Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="warehouse_secretary">{t("employee.role.secretary")}</SelectItem><SelectItem value="staff">{t("employee.role.staff")}</SelectItem><SelectItem value="driver">{t("employee.role.driver")}</SelectItem></SelectContent></Select></div>
            <div><Label>{t("employee.salary_currency")}</Label><Input type="number" min="0" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("employee.delete_confirm_title")}</AlertDialogTitle><AlertDialogDescription>{t("employee.delete_confirm_desc")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t("common.remove")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CredentialsDialog
        open={!!createdCreds}
        onOpenChange={(o) => !o && setCreatedCreds(null)}
        userName={createdCreds?.user_name ?? ""}
        password={createdCreds?.password ?? ""}
        title={t("employee.credentials.title")}
        description={t("employee.credentials.desc")}
      />
    </div>
  );
}

/* ===== Shipments ===== */
function ShipmentsSection({
  slug, shipments, setShipments,
}: {
  slug: string; shipments: ManagerShipment[]; setShipments: React.Dispatch<React.SetStateAction<ManagerShipment[]>>;
}) {
  const { t } = useTranslation();
  const [receiving, setReceiving] = useState<number | null>(null);

  const handleReceive = async (id: number) => {
    setReceiving(id);
    try {
      const res = await receiveManagerShipment(slug, id);
      setShipments((prev) => prev.map((s) => s.id === id ? res.shipment : s));
      toast.success(t("shipment.received_success"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("shipment.receive_failed"));
    } finally { setReceiving(null); }
  };

  const statusColors: Record<ManagerShipmentStatus, string> = { pending: "bg-yellow-100 text-yellow-700", in_transit: "bg-blue-100 text-blue-700", received: "bg-green-100 text-green-700" };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1a2942]">{t("shipment.title")}</h2>
      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[#1a2942]/70">{t("shipment.factory")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("shipment.total")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("shipment.arrival")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("employee.status")}</TableHead>
              <TableHead className="text-end text-[#1a2942]/70">{t("common.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((s) => (
              <TableRow key={s.id} className="border-white/40">
                <TableCell className="font-medium text-[#1a2942]">{s.factory_name}</TableCell>
                <TableCell className="text-[#1a2942]">${s.total_price}</TableCell>
                <TableCell className="text-[#1a2942]/80">{s.arrival_date ?? "—"}</TableCell>
                <TableCell><Badge className={cn("text-xs font-medium", statusColors[s.status] ?? "")}>{t(`shipment.status.${s.status}`)}</Badge></TableCell>
                <TableCell className="text-end">
                  {s.can_receive ? (
                    <Button size="sm" className="h-8 text-xs" onClick={() => handleReceive(s.id)} disabled={receiving === s.id}>
                      {receiving === s.id ? <Loader2 className="size-3 animate-spin me-1" /> : <CheckCircle2 className="size-3 me-1" />} {t("shipment.receive")}
                    </Button>
                  ) : (
                    <span className="text-xs text-[#1a2942]/50">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {shipments.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-[#1a2942]/50">{t("shipment.no_shipments")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}

/* ===== Movements ===== */
function MovementsSection({ movements }: { movements: InventoryMovement[] }) {
  const { t } = useTranslation();
  const typeColors: Record<string, string> = {
    shipment_received: "bg-green-100 text-green-700",
    section_fill: "bg-blue-100 text-blue-700",
    section_remove: "bg-red-100 text-red-700",
    section_transfer: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1a2942]">{t("inventory.movements")}</h2>
      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[#1a2942]/70">{t("inventory.date")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("warehouse.type")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("section.product")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("section.parcels")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("section.units")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("inventory.by")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("inventory.note")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.slice(0, 100).map((m) => (
              <TableRow key={m.id} className="border-white/40">
                <TableCell className="text-xs text-[#1a2942]/80">{m.created_at?.slice(0, 16).replace("T", " ")}</TableCell>
                <TableCell><Badge className={cn("text-xs font-medium", typeColors[m.movement_type] ?? "")}>{getMovementTypeKey(m.movement_type) ? t(getMovementTypeKey(m.movement_type)) : m.movement_type}</Badge></TableCell>
                <TableCell className="font-medium text-[#1a2942] text-sm">{m.product.name}</TableCell>
                <TableCell className="text-[#1a2942]">{m.quantity_parcels}</TableCell>
                <TableCell className="text-[#1a2942]">{m.quantity_units}</TableCell>
                <TableCell className="text-xs text-[#1a2942]/80">{m.performed_by.full_name}</TableCell>
                <TableCell className="text-xs text-[#1a2942]/50 max-w-[120px] truncate">{m.note ?? "—"}</TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-[#1a2942]/50">{t("inventory.no_movements_recorded")}</TableCell></TableRow>
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
  const { t } = useTranslation();
  const [assignOpen, setAssignOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AssignTaskInput>({ worker_or_driver_id: 0, task_type: "", related_type: "", related_id: 0 });

  const taskTypeOptions = [
    { value: "order_preparation", label: "task.type.order_preparation" },
    { value: "order_delivery", label: "task.type.order_delivery" },
    { value: "transfer_preparation", label: "task.type.transfer_preparation" },
    { value: "transfer_delivery", label: "task.type.transfer_delivery" },
    { value: "shipment_receiving", label: "task.type.shipment_receiving" },
    { value: "damage_disposal", label: "task.type.damage_disposal" },
    { value: "return_pickup", label: "task.type.return_pickup" },
    { value: "restock_product", label: "task.type.restock_product" },
  ];

  const statusColors: Record<string, string> = {
    in_preparation: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
  };

  const availableWorkers = employees.filter((e) => e.role === "staff" || e.role === "driver");

  const handleAssign = async () => {
    if (!form.worker_or_driver_id || !form.task_type || !form.related_type || !form.related_id) {
      toast.error(t("task.all_fields_required"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await assignTask(slug, form);
      setTasks((prev) => [res.task, ...prev]);
      toast.success(t("task.assigned"));
      setAssignOpen(false);
      setForm({ worker_or_driver_id: 0, task_type: "", related_type: "", related_id: 0 });
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("task.assign_failed"));
    } finally { setSubmitting(false); }
  };

  const handleComplete = async (taskId: number) => {
    try {
      const res = await updateTaskStatus(slug, taskId, { status: "completed" });
      setTasks((prev) => prev.map((t) => t.id === taskId ? res.task : t));
      toast.success(t("task.marked_completed"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("task.update_failed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1a2942]">{t("task.title")}</h2>
        <Button onClick={() => setAssignOpen(true)}>
          <Plus className="size-4 me-1" /> {t("task.add")}
        </Button>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[#1a2942]/70">{t("warehouse.type")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("task.worker")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("task.related")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("task.status")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("task.created")}</TableHead>
              <TableHead className="text-end text-[#1a2942]/70">{t("common.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className="border-white/40">
                <TableCell className="font-medium text-[#1a2942] text-sm capitalize">{task.task_type.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-[#1a2942]/80">{task.worker.full_name}</TableCell>
                <TableCell className="text-xs text-[#1a2942]/80">{task.related?.label ?? "—"}</TableCell>
                <TableCell><Badge className={cn("text-xs font-medium", statusColors[task.status] ?? "")}>{t(`task.status.${task.status}`)}</Badge></TableCell>
                <TableCell className="text-xs text-[#1a2942]/60">{task.created_at?.slice(0, 10)}</TableCell>
                <TableCell className="text-end">
                  {task.status === "in_preparation" ? (
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleComplete(task.id)}>
                      <CheckCircle2 className="size-3 me-1" /> {t("task.complete")}
                    </Button>
                  ) : (
                    <span className="text-xs text-[#1a2942]/50">{t("task.done")}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-[#1a2942]/50">{t("task.no_tasks_yet")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>

      {/* Assign Task Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t("task.add")}</DialogTitle><DialogDescription>{t("task.assign_desc")}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("task.worker")}</Label><Select value={String(form.worker_or_driver_id)} onValueChange={(v) => setForm((f) => ({ ...f, worker_or_driver_id: Number(v) }))}><SelectTrigger><SelectValue placeholder={t("placeholder.select_worker")} /></SelectTrigger><SelectContent>{availableWorkers.map((w) => <SelectItem key={w.id} value={String(w.system_user_id)}>{w.system_user.full_name} ({w.role})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t("task.type")}</Label><Select value={form.task_type} onValueChange={(v) => setForm((f) => ({ ...f, task_type: v }))}><SelectTrigger><SelectValue placeholder={t("placeholder.select_type")} /></SelectTrigger><SelectContent>{taskTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{t(o.label)}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("task.related_type")}</Label><Select value={form.related_type} onValueChange={(v) => setForm((f) => ({ ...f, related_type: v }))}><SelectTrigger><SelectValue placeholder={t("placeholder.related_type_example")} /></SelectTrigger><SelectContent><SelectItem value="order">{t("task.related.order")}</SelectItem><SelectItem value="shipment">{t("task.related.shipment")}</SelectItem><SelectItem value="return">{t("task.related.return")}</SelectItem><SelectItem value="transfer_request">{t("task.related.transfer")}</SelectItem></SelectContent></Select></div>
              <div><Label>{t("task.related_id")}</Label><Input type="number" min="1" value={form.related_id || ""} onChange={(e) => setForm((f) => ({ ...f, related_id: parseInt(e.target.value) || 0 }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAssign} disabled={submitting}>{submitting ? t("task.assigning") : t("task.assign")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== Inter-Warehouse Transfers ===== */
function TransfersSection({
  slug, ownerId, warehouseId, products,
}: {
  slug: string;
  ownerId: number | null | undefined;
  warehouseId: number | null | undefined;
  products: ManagerProduct[];
}) {
  const { t } = useTranslation();
  const { available, mine, loading, creating, isAccepting, refresh, acceptRequest, createRequest } =
    useTransferRequests(slug, ownerId, warehouseId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1a2942]">{t("transfer_request.title")}</h2>
          <p className="text-xs text-[#1a2942]/60">{t("transfer_request.desc")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="text-[#1a2942]">
          <RefreshCw className="size-3.5 me-1" /> {t("common.refresh")}
        </Button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-[#1a2942]">{t("transfer_request.available_title")}</h3>
        <AvailableRequestsFeed requests={available} loading={loading} isAccepting={isAccepting} onAccept={acceptRequest} />
      </div>

      <MyWarehouseRequests requests={mine} loading={loading} products={products} submitting={creating} onCreate={createRequest} />
    </div>
  );
}

/* ===== Reports ===== */
const MANAGER_REPORTS = [
  { key: "orders", label: "manager.report_orders" },
  { key: "returns", label: "manager.report_returns" },
  { key: "tasks", label: "manager.report_tasks" },
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
      toast.success(t("manager.excel_downloaded", { report: t(`manager.report_${report}`) }));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || t("manager.download_failed");
      toast.error(typeof msg === "string" ? msg : t("manager.download_failed"));
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
              <h4 className="text-sm font-semibold">{t(r.label)}</h4>
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
                <Download className="me-1 size-3.5" />
                {busy === `${r.key}-excel` ? t("report.downloading") : t("report.excel")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => openPdf(r.key)}
              >
                <Download className="me-1 size-3.5" />
                {busy === `${r.key}-pdf` ? t("report.downloading") : t("report.pdf")}
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ===== Analytics ===== */
function AnalyticsSection({ slug, role }: { slug: string; role?: string }) {
  if (role === "owner") return <OwnerAnalytics slug={slug} />;
  if (role === "warehouse_secretary") return <StorekeeperAnalytics slug={slug} />;
  return <ManagerAnalytics slug={slug} currency="EGP" />;
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
          <LogOut className="size-4 me-1" /> {t("settings.sign_out")}
        </Button>
      </GlassCard>
    </div>
  );
}
