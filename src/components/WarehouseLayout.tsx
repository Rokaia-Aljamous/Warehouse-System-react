import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Boxes,
  Pencil,
  Trash2,
  Plus,
  ArrowLeftRight,
  QrCode,
  Copy,
  Check,
  Info,
  Warehouse as WarehouseIcon,
  Package,
  Ruler,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  createSection,
  updateSection,
  deleteSection,
  fillSectionStock,
  removeSectionStock,
  assignProductToSection,
  unassignProductFromSection,
  transferSectionStock,
  type Section,
  type SectionInput,
  type ManagerProduct,
} from "@/lib/manager-api";
import { buildSectionSlotGrid, type SlotFillState } from "@/lib/section-capacity";

type SectionVisualState = "empty" | "available" | "filling" | "full";

interface WarehouseLayoutProps {
  slug: string;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  products: ManagerProduct[];
  warehouse: { id: number; name: string; type: string; location: string } | null;
}

function sectionVisualState(section: Section): SectionVisualState {
  if (!section.product) return "empty";
  if (section.quantity_parcels <= 0) return "available";
  const usage = section.capacity.capacity_usage_percentage ?? 0;
  if (usage >= 100) return "full";
  return "filling";
}

const STATE_STYLES: Record<
  SectionVisualState,
  { badge: string; ring: string; dot: string; headerBg: string }
> = {
  empty: {
    badge: "bg-slate-200 text-slate-600",
    ring: "border-slate-200",
    dot: "bg-slate-400",
    headerBg: "from-slate-50 to-slate-100",
  },
  available: {
    badge: "bg-sky-100 text-sky-700",
    ring: "border-sky-300",
    dot: "bg-sky-400",
    headerBg: "from-sky-50 to-sky-100",
  },
  filling: {
    badge: "bg-amber-100 text-amber-700",
    ring: "border-amber-300",
    dot: "bg-amber-400",
    headerBg: "from-amber-50 to-amber-100",
  },
  full: {
    badge: "bg-emerald-100 text-emerald-700",
    ring: "border-emerald-300",
    dot: "bg-emerald-500",
    headerBg: "from-emerald-50 to-emerald-100",
  },
};

const SLOT_CELL_STYLES: Record<SlotFillState, string> = {
  filled: "bg-emerald-500 shadow-sm",
  partial: "bg-amber-400 shadow-sm",
  empty: "bg-slate-200",
};

const DIALOG_CONTENT_CLS = "border-slate-200 bg-white text-[#1D2D44] shadow-2xl sm:rounded-2xl";
const FIELD_LABEL_CLS = "text-sm font-semibold text-[#1D2D44]";
const FIELD_LABEL_SM_CLS = "text-xs font-medium text-[#1D2D44]/70";
const INPUT_CLS =
  "border-slate-300 bg-white text-[#1D2D44] placeholder:text-slate-400 focus:border-[#1D2D44] focus:ring-2 focus:ring-[#1D2D44]/20 focus-visible:ring-[#1D2D44]/20";
const SELECT_TRIGGER_CLS =
  "border-slate-300 bg-white text-[#1D2D44] data-[placeholder]:text-slate-400 focus:border-[#1D2D44] focus:ring-2 focus:ring-[#1D2D44]/20 focus-visible:ring-[#1D2D44]/20";
const SELECT_ITEM_CLS = "text-[#1D2D44] focus:bg-[#1D2D44]/5 focus:text-[#1D2D44]";
const SELECT_CONTENT_CLS = "border-slate-200 bg-white text-[#1D2D44] shadow-xl";
const OUTLINE_BTN_CLS =
  "border-slate-300 bg-white text-[#1D2D44] hover:bg-slate-50 hover:text-[#1D2D44]";
const PRIMARY_BTN_CLS = "bg-[#1D2D44] text-white shadow-md hover:bg-[#26384c]";

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("glass-light rounded-2xl p-5 shadow-xl text-[#1a2942]", className)}>
      {children}
    </div>
  );
}

function gridScale(rows: number, cols: number): { rows: number; cols: number } {
  const MAX_CELLS = 144;
  if (rows * cols <= MAX_CELLS) return { rows, cols };
  const scale = Math.sqrt((rows * cols) / MAX_CELLS);
  return {
    rows: Math.max(2, Math.floor(rows / scale)),
    cols: Math.max(2, Math.floor(cols / scale)),
  };
}

export function WarehouseLayout({
  slug,
  sections,
  setSections,
  products,
  warehouse,
}: WarehouseLayoutProps) {
  const { t } = useTranslation();

  /* Create/Edit */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [form, setForm] = useState<SectionInput>({
    name: "",
    section_length: 1,
    section_width: 1,
    section_height: 1,
    product_id: null,
  });
  const [submitting, setSubmitting] = useState(false);

  /* Delete */
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* Fill / Remove / Transfer */
  const [fillOpen, setFillOpen] = useState(false);
  const [fillSection, setFillSection] = useState<Section | null>(null);
  const [fillQty, setFillQty] = useState(1);
  const [fillNote, setFillNote] = useState("");

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeSection, setRemoveSection] = useState<Section | null>(null);
  const [removeQty, setRemoveQty] = useState(1);
  const [removeNote, setRemoveNote] = useState("");

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSource, setTransferSource] = useState<Section | null>(null);
  const [transferDest, setTransferDest] = useState<number | null>(null);
  const [transferQty, setTransferQty] = useState(1);
  const [transferNote, setTransferNote] = useState("");

  /* QR */
  const [qrSection, setQrSection] = useState<Section | null>(null);
  const [qrCopied, setQrCopied] = useState(false);

  const totals = useMemo(() => {
    const totalParcels = sections.reduce((sum, s) => sum + s.quantity_parcels, 0);
    const withUsage = sections.filter((s) => s.capacity.capacity_usage_percentage != null);
    const avgUsage =
      withUsage.length > 0
        ? withUsage.reduce((sum, s) => sum + (s.capacity.capacity_usage_percentage ?? 0), 0) /
          withUsage.length
        : 0;
    const assigned = sections.filter((s) => s.product_id).length;
    const full = sections.filter((s) => (s.capacity.capacity_usage_percentage ?? 0) >= 100).length;
    return { totalParcels, avgUsage, assigned, full, total: sections.length };
  }, [sections]);

  const transferDestinations = useMemo(() => {
    if (!transferSource) return [];
    return sections.filter(
      (s) =>
        s.id !== transferSource.id &&
        s.product_id === transferSource.product_id &&
        s.product_id != null,
    );
  }, [sections, transferSource]);

  const errorMessage = (err: any, fallback: string) =>
    err.response?.data?.message ||
    err.response?.data?.errors?.[Object.keys(err.response?.data?.errors ?? {})[0]]?.[0] ||
    fallback;

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t("section.name_required"));
      return;
    }
    setSubmitting(true);
    try {
      if (editSection) {
        const res = await updateSection(slug, editSection.id, {
          name: form.name,
          section_length: form.section_length,
          section_width: form.section_width,
          section_height: form.section_height,
        });
        setSections((prev) => prev.map((s) => (s.id === editSection.id ? res.section : s)));
        toast.success(t("section.updated"));
      } else {
        const res = await createSection(slug, form);
        setSections((prev) => [...prev, res.section]);
        toast.success(t("section.created"));
      }
      setDialogOpen(false);
      setEditSection(null);
      setForm({
        name: "",
        section_length: 1,
        section_width: 1,
        section_height: 1,
        product_id: null,
      });
    } catch (err: any) {
      toast.error(errorMessage(err, t("section.save_failed")));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSection(slug, deleteId);
      setSections((prev) => prev.filter((s) => s.id !== deleteId));
      toast.success(t("section.deleted"));
      setDeleteId(null);
    } catch (err: any) {
      toast.error(errorMessage(err, t("section.delete_failed")));
    }
  };

  const handleFill = async () => {
    if (!fillSection?.product_id) {
      toast.error(t("section.assign_product_first"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fillSectionStock(slug, fillSection.id, {
        product_id: fillSection.product_id,
        quantity_parcels: fillQty,
        note: fillNote || undefined,
      });
      setSections((prev) => prev.map((s) => (s.id === fillSection.id ? res.section : s)));
      toast.success(t("section.stock_added"));
      setFillOpen(false);
      setFillSection(null);
      setFillQty(1);
      setFillNote("");
    } catch (err: any) {
      toast.error(errorMessage(err, t("section.fill_failed")));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeSection?.product_id) return;
    setSubmitting(true);
    try {
      const res = await removeSectionStock(slug, removeSection.id, {
        product_id: removeSection.product_id,
        quantity_parcels: removeQty,
        note: removeNote || undefined,
      });
      setSections((prev) => prev.map((s) => (s.id === removeSection.id ? res.section : s)));
      toast.success(t("section.stock_removed"));
      setRemoveOpen(false);
      setRemoveSection(null);
      setRemoveQty(1);
      setRemoveNote("");
    } catch (err: any) {
      toast.error(errorMessage(err, t("section.remove_stock_failed")));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferSource?.product_id || !transferDest) return;
    setSubmitting(true);
    try {
      const res = await transferSectionStock(slug, {
        from_section_id: transferSource.id,
        to_section_id: transferDest,
        product_id: transferSource.product_id,
        quantity_parcels: transferQty,
        note: transferNote || undefined,
      });
      setSections((prev) =>
        prev.map((s) => {
          if (s.id === res.from_section.id) return res.from_section;
          if (s.id === res.to_section.id) return res.to_section;
          return s;
        }),
      );
      toast.success(t("section.stock_transferred"));
      setTransferOpen(false);
      setTransferSource(null);
      setTransferDest(null);
      setTransferQty(1);
      setTransferNote("");
    } catch (err: any) {
      toast.error(errorMessage(err, t("section.transfer_failed")));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (sectionId: number, productId: number) => {
    try {
      const res = await assignProductToSection(slug, sectionId, productId);
      setSections((prev) => prev.map((s) => (s.id === sectionId ? res.section : s)));
      toast.success(t("section.product_assigned"));
    } catch (err: any) {
      toast.error(errorMessage(err, t("section.assign_failed")));
    }
  };

  const handleUnassign = async (sectionId: number) => {
    try {
      const res = await unassignProductFromSection(slug, sectionId);
      setSections((prev) => prev.map((s) => (s.id === sectionId ? res.section : s)));
      toast.success(t("section.product_unassigned"));
    } catch (err: any) {
      toast.error(errorMessage(err, t("section.unassign_failed")));
    }
  };

  const handleCopyQr = async () => {
    if (!qrSection?.section_qr_code) return;
    try {
      await navigator.clipboard.writeText(qrSection.section_qr_code);
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 1500);
    } catch {
      toast.error(t("layout.copy_failed"));
    }
  };

  const openTransfer = (section: Section) => {
    setTransferSource(section);
    setTransferDest(null);
    setTransferQty(Math.min(1, section.quantity_parcels || 1));
    setTransferNote("");
    setTransferOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[oklch(0.78_0.16_75)]/20 text-[oklch(0.78_0.16_75)]">
            <WarehouseIcon className="size-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#1a2942]">{t("layout.title")}</h2>
            <p className="text-xs text-[#1a2942]/60">
              {warehouse ? `${warehouse.name} · ${warehouse.type} · ${warehouse.location}` : ""}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditSection(null);
              setForm({
                name: "",
                section_length: 1,
                section_width: 1,
                section_height: 1,
                product_id: null,
              });
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4 me-1" /> {t("section.add")}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/50 bg-white/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/60">
              {t("layout.stat_sections")}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#1a2942]">{totals.total}</p>
            <p className="text-[11px] text-emerald-600 font-semibold">
              {t("layout.stat_assigned", { count: totals.assigned })}
            </p>
          </div>
          <div className="rounded-xl border border-white/50 bg-white/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/60">
              {t("layout.stat_parcels")}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#1a2942]">
              {totals.totalParcels.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#1a2942]/50">{t("layout.stat_parcels_hint")}</p>
          </div>
          <div className="rounded-xl border border-white/50 bg-white/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/60">
              {t("layout.stat_avg_capacity")}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#1a2942]">{totals.avgUsage.toFixed(1)}%</p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-[oklch(0.78_0.16_75)]"
                style={{ width: `${Math.min(totals.avgUsage, 100)}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-white/50 bg-white/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[#1a2942]/60">
              {t("layout.stat_full")}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#1a2942]">{totals.full}</p>
            <p className="text-[11px] text-[#1a2942]/50">{t("layout.stat_full_hint")}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/50 bg-white/40 p-3 text-[11px] text-[#1a2942]/70">
          <span className="flex items-center gap-1.5">
            <Info className="size-3.5 text-[#1a2942]/50" /> {t("layout.visual_note")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-emerald-500" /> {t("layout.legend_filled")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-amber-400" /> {t("layout.legend_partial")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-slate-200" /> {t("layout.legend_empty")}
          </span>
          <span className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-[#1a2942]/50" /> {t("layout.legend_stack")}
          </span>
        </div>
      </GlassCard>

      {/* Sections floor plan */}
      {sections.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Boxes className="mx-auto size-10 text-[#1a2942]/30" />
          <p className="mt-3 text-sm text-[#1a2942]/60">{t("section.empty")}</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((sec) => {
            const state = sectionVisualState(sec);
            const style = STATE_STYLES[state];
            const grid = buildSectionSlotGrid(sec);
            const display = grid ? gridScale(grid.rows, grid.cols) : null;
            const usage = sec.capacity.capacity_usage_percentage;

            return (
              <div
                key={sec.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-br to-white shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl",
                  style.headerBg,
                  style.ring,
                )}
              >
                {/* Bay header */}
                <div className="flex items-center justify-between gap-2 border-b border-white/50 px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
                    <h3 className="truncate text-sm font-bold text-[#1a2942]">{sec.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className={cn("text-[10px] font-semibold", style.badge)}>
                      {t(`layout.state_${state}`)}
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setQrSection(sec)}
                          className="p-1.5 rounded-lg hover:bg-white/60 text-[#1a2942]/70"
                        >
                          <QrCode className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t("layout.qr_code")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            setEditSection(sec);
                            setForm({
                              name: sec.name,
                              section_length: sec.dimensions.length,
                              section_width: sec.dimensions.width,
                              section_height: sec.dimensions.height,
                              product_id: sec.product_id,
                            });
                            setDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/60 text-[#1a2942]/70"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t("common.edit")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setDeleteId(sec.id)}
                          className="p-1.5 rounded-lg hover:bg-white/60 text-red-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t("common.delete")}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Floor / slots */}
                <div className="relative flex items-center justify-center overflow-hidden px-4 py-5">
                  <div className="flex flex-col items-center gap-2">
                    {display && grid ? (
                      <div
                        className="grid w-full max-w-[260px] gap-1 rounded-lg border border-white/60 bg-white/50 p-2"
                        style={{
                          gridTemplateColumns: `repeat(${display.cols}, minmax(6px, 1fr))`,
                          gridTemplateRows: `repeat(${display.rows}, minmax(6px, 1fr))`,
                          aspectRatio: `${display.cols} / ${display.rows}`,
                        }}
                      >
                        {grid.slots.slice(0, display.rows * display.cols).map((slot, idx) => (
                          <div
                            key={idx}
                            className={cn("rounded-[3px] transition", SLOT_CELL_STYLES[slot.state])}
                            title={`${t("layout.slot")} ${slot.label}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-28 w-full max-w-[260px] items-center justify-center rounded-lg border border-dashed border-white/70 bg-white/30 text-xs text-[#1a2942]/50">
                        {t("layout.no_product")}
                      </div>
                    )}
                    {grid && (
                      <div className="flex items-center gap-3 text-[10px] text-[#1a2942]/60">
                        <span className="flex items-center gap-1">
                          <Layers className="size-3" />
                          {t("layout.stack_height", { count: grid.maxPerStack })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Boxes className="size-3" />
                          {t("layout.max_slots", { count: grid.maxSlots.toLocaleString() })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="border-t border-white/50 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {sec.product ? (
                      <span className="flex items-center gap-1.5 font-medium text-[#1a2942] min-w-0">
                        <Package className="size-3.5 shrink-0 text-[oklch(0.78_0.16_75)]" />
                        <span className="truncate">{sec.product.name}</span>
                      </span>
                    ) : (
                      <span className="text-[#1a2942]/50">{t("section.no_product_assigned")}</span>
                    )}
                    {sec.product && (
                      <span className="shrink-0 font-semibold text-[#1a2942]">
                        {sec.quantity_parcels.toLocaleString()} /{" "}
                        {sec.capacity.max_parcels_capacity?.toLocaleString() ?? "—"}
                      </span>
                    )}
                  </div>
                  {sec.product && usage != null && (
                    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          usage >= 100 ? "bg-emerald-500" : "bg-[oklch(0.78_0.16_75)]",
                        )}
                        style={{ width: `${Math.min(usage, 100)}%` }}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-[#1a2942]/60">
                    <Ruler className="size-3" />
                    {t("section.dimensions_label", {
                      length: sec.dimensions.length,
                      width: sec.dimensions.width,
                      height: sec.dimensions.height,
                    })}
                    {usage != null && (
                      <span className="ms-auto font-semibold text-[#1a2942]/80">
                        {usage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto flex flex-wrap gap-1.5 border-t border-white/50 px-4 py-2.5">
                  {sec.product ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2"
                        onClick={() => {
                          setFillSection(sec);
                          setFillQty(1);
                          setFillNote("");
                          setFillOpen(true);
                        }}
                      >
                        {t("section.fill")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2"
                        onClick={() => {
                          setRemoveSection(sec);
                          setRemoveQty(1);
                          setRemoveNote("");
                          setRemoveOpen(true);
                        }}
                        disabled={sec.quantity_parcels <= 0}
                      >
                        {t("section.remove")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2"
                        onClick={() => openTransfer(sec)}
                        disabled={sec.quantity_parcels <= 0}
                      >
                        <ArrowLeftRight className="size-3" /> {t("layout.transfer")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] px-2 text-[#1a2942]/60 hover:text-[#1a2942]"
                        onClick={() => handleUnassign(sec.id)}
                      >
                        {t("section.unassign")}
                      </Button>
                    </>
                  ) : (
                    <Select onValueChange={(v) => handleAssign(sec.id, Number(v))}>
                      <SelectTrigger className="h-7 flex-1 text-[11px]">
                        <SelectValue placeholder={t("placeholder.assign_product")} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={`sm:max-w-md ${DIALOG_CONTENT_CLS}`}
          style={{ backgroundColor: "white" }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2D44]">
              {editSection ? t("section.edit_title") : t("section.new_title")}
            </DialogTitle>
            <DialogDescription className="text-[#1D2D44]/60">
              {t("section.edit_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLS}>{t("product.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("placeholder.zone_example")}
                className={INPUT_CLS}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL_CLS}>{t("section.dimensions")}</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className={FIELD_LABEL_SM_CLS}>{t("section.length_m")}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.section_length}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, section_length: parseFloat(e.target.value) || 1 }))
                    }
                    className={INPUT_CLS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={FIELD_LABEL_SM_CLS}>{t("section.width_m")}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.section_width}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, section_width: parseFloat(e.target.value) || 1 }))
                    }
                    className={INPUT_CLS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={FIELD_LABEL_SM_CLS}>{t("section.height_m")}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.section_height}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, section_height: parseFloat(e.target.value) || 1 }))
                    }
                    className={INPUT_CLS}
                  />
                </div>
              </div>
              <p className="text-xs text-[#1D2D44]/50">{t("layout.dimensions_hint")}</p>
            </div>
            {!editSection && (
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL_CLS}>{t("layout.assign_on_create")}</Label>
                <Select
                  value={form.product_id ? String(form.product_id) : "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, product_id: v === "__none__" ? null : Number(v) }))
                  }
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder={t("layout.assign_optional")} />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT_CLS}>
                    <SelectItem value="__none__" className={SELECT_ITEM_CLS}>
                      {t("layout.assign_none")}
                    </SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} className={SELECT_ITEM_CLS}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#1D2D44]/50">{t("layout.assign_hint")}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
  type="button"
  variant="outline"
  onClick={() => setDialogOpen(false)}
  className={`${OUTLINE_BTN_CLS} bg-[#f2a618] text-[#1D2D44] border border-[#1D2D44]/20 hover:bg-[#f2a618]/90 hover:text-[#1D2D44] opacity-100 cursor-pointer pointer-events-auto`}
>
  {t("common.cancel")}
</Button>
            <Button onClick={handleSave} disabled={submitting} className={PRIMARY_BTN_CLS}>
              {submitting ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1D2D44]">
  {t("section.delete_confirm_title")}
</AlertDialogTitle>
            <AlertDialogDescription>{t("common.cannot_undo")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
           <AlertDialogCancel 
  onClick={() => setDeleteId(null)}
  className="bg-[#f2a618] text-[#1D2D44] border border-[#1D2D44]/20 hover:bg-[#f2a618]/90 hover:text-[#1D2D44] opacity-100 cursor-pointer pointer-events-auto"
>
  {t("common.cancel")}
</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fill Dialog */}
      <Dialog open={fillOpen} onOpenChange={setFillOpen}>
        <DialogContent
          className={`sm:max-w-sm ${DIALOG_CONTENT_CLS}`}
          style={{ backgroundColor: "white" }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2D44]">
              {t("section.fill")}
            </DialogTitle>
            <DialogDescription className="text-[#1D2D44]/60">
              {t("section.fill_desc", { name: fillSection?.name })}
            </DialogDescription>
          </DialogHeader>
          {fillSection?.product && (
            <p className="text-sm font-medium text-[#1D2D44]">
              {t("section.product")}: {fillSection.product.name}
            </p>
          )}
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLS}>{t("section.quantity_parcels")}</Label>
            <Input
              type="number"
              min="1"
              value={fillQty}
              onChange={(e) => setFillQty(parseInt(e.target.value) || 1)}
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLS}>{t("section.note_optional")}</Label>
            <Textarea
              value={fillNote}
              onChange={(e) => setFillNote(e.target.value)}
              placeholder={t("placeholder.supplier_example")}
              className={`${INPUT_CLS} min-h-[70px]`}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setFillOpen(false)}
              className={OUTLINE_BTN_CLS}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleFill} disabled={submitting} className={PRIMARY_BTN_CLS}>
              {submitting ? t("section.adding") : t("section.add_stock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent
          className={`sm:max-w-sm ${DIALOG_CONTENT_CLS}`}
          style={{ backgroundColor: "white" }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2D44]">
              {t("section.remove")}
            </DialogTitle>
            <DialogDescription className="text-[#1D2D44]/60">
              {t("layout.remove_desc", { name: removeSection?.name })}
            </DialogDescription>
          </DialogHeader>
          {removeSection?.product && (
            <p className="text-sm font-medium text-[#1D2D44]">
              {t("section.product")}: {removeSection.product.name}
            </p>
          )}
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLS}>{t("section.quantity_parcels")}</Label>
            <Input
              type="number"
              min="1"
              max={removeSection?.quantity_parcels ?? 1}
              value={removeQty}
              onChange={(e) => setRemoveQty(parseInt(e.target.value) || 1)}
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLS}>{t("section.note_optional")}</Label>
            <Textarea
              value={removeNote}
              onChange={(e) => setRemoveNote(e.target.value)}
              placeholder={t("placeholder.supplier_example")}
              className={`${INPUT_CLS} min-h-[70px]`}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setRemoveOpen(false)}
              className={OUTLINE_BTN_CLS}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={submitting}
              className="bg-red-600 text-white shadow-md hover:bg-red-700"
            >
              {submitting ? t("common.saving") : t("layout.remove_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent
          className={`sm:max-w-md ${DIALOG_CONTENT_CLS}`}
          style={{ backgroundColor: "white" }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2D44]">
              {t("layout.transfer")}
            </DialogTitle>
            <DialogDescription className="text-[#1D2D44]/60">
              {t("layout.transfer_desc", { name: transferSource?.name })}
            </DialogDescription>
          </DialogHeader>
          {transferSource?.product && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-[#1a2942]">
              <Package className="size-3.5" />{" "}
              <span className="font-medium">{transferSource.product.name}</span>
              <span className="ms-auto text-[#1a2942]/60">
                {t("layout.source_stock", { count: transferSource.quantity_parcels })}
              </span>
            </div>
          )}
          {transferDestinations.length === 0 ? (
            <p className="text-sm text-[#1a2942]/60">{t("layout.no_destination")}</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL_CLS}>{t("layout.destination")}</Label>
                <Select
                  value={String(transferDest ?? "")}
                  onValueChange={(v) => setTransferDest(Number(v))}
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLS}>
                    <SelectValue placeholder={t("layout.select_destination")} />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT_CLS}>
                    {transferDestinations.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} className={SELECT_ITEM_CLS}>
                        {s.name} ({s.quantity_parcels}/{s.capacity.max_parcels_capacity ?? "—"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL_CLS}>{t("section.quantity_parcels")}</Label>
                <Input
                  type="number"
                  min="1"
                  max={transferSource?.quantity_parcels ?? 1}
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL_CLS}>{t("section.note_optional")}</Label>
                <Textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder={t("placeholder.supplier_example")}
                  className={`${INPUT_CLS} min-h-[70px]`}
                />
              </div>
            </>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setTransferOpen(false)}
              className={OUTLINE_BTN_CLS}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={submitting || !transferDest || transferDestinations.length === 0}
              className={PRIMARY_BTN_CLS}
            >
              {submitting ? (
                t("common.saving")
              ) : (
                <>
                  <ArrowRight className="size-4 me-1" /> {t("layout.transfer")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog
        open={qrSection !== null}
        onOpenChange={(o) => {
          if (!o) setQrSection(null);
        }}
      >
        <DialogContent
          className={`sm:max-w-sm ${DIALOG_CONTENT_CLS}`}
          style={{ backgroundColor: "white" }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1D2D44]">
              {t("layout.qr_title")}
            </DialogTitle>
            <DialogDescription className="text-[#1D2D44]/60">
              {t("layout.qr_desc", { name: qrSection?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <QrCode className="mx-auto size-24 text-[#1a2942]" />
            <p className="mt-4 break-all font-mono text-xs text-[#1a2942]/70">
              {qrSection?.section_qr_code}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
           <Button
  type="button"
  variant="outline"
  onClick={() => setQrSection(null)}
  className={`${OUTLINE_BTN_CLS} bg-[#f2a618] text-[#1D2D44] border border-[#1D2D44]/20 hover:bg-[#f2a618]/90 hover:text-[#1D2D44] opacity-100 cursor-pointer pointer-events-auto`}
>
  {t("common.close")}
</Button>
            <Button onClick={handleCopyQr} className={PRIMARY_BTN_CLS}>
              {qrCopied ? <Check className="size-4 me-1" /> : <Copy className="size-4 me-1" />}
              {qrCopied ? t("layout.copied") : t("layout.copy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
