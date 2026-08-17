import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, AlertCircle, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  assignShipmentSections,
  fetchSections,
  type Section,
  type ManagerShipment,
  type ManagerShipmentItem,
} from "@/lib/manager-api";

type Row = {
  id: string;
  product_id: number;
  section_id: number | null;
  quantity: string;
};

const DIALOG_CONTENT_CLS = "border-slate-200 bg-white text-[#1D2D44] shadow-2xl sm:rounded-2xl";
const OUTLINE_BTN_CLS =
  "border-slate-300 bg-white text-[#1D2D44] hover:bg-slate-50 hover:text-[#1D2D44]";
const PRIMARY_BTN_CLS = "bg-[#1D2D44] text-white shadow-md hover:bg-[#26384c]";

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-light rounded-2xl p-5 shadow-xl text-[#1a2942]", className)}>{children}</div>;
}

export function PlanShipmentSections({
  slug,
  shipment,
  open,
  onOpenChange,
  onAssigned,
}: {
  slug: string;
  shipment: ManagerShipment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: () => void;
}) {
  const { t } = useTranslation();

  const [sections, setSections] = useState<Section[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const items = useMemo(() => shipment.items ?? [], [shipment]);

  const itemByProduct = useMemo(() => {
    const map = new Map<number, ManagerShipmentItem>();
    for (const item of items) map.set(item.product_id, item);
    return map;
  }, [items]);

  const loadSections = () => {
    setSectionsLoading(true);
    fetchSections(slug)
      .then(({ sections: res }) => setSections(res ?? []))
      .catch(() => setSections([]))
      .finally(() => setSectionsLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setSaving(false);
    setRows(
      items.map((item, idx) => ({
        id: `row-${item.product_id}-${idx}`,
        product_id: item.product_id,
        section_id: null,
        quantity: "",
      })),
    );
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shipment.id]);

  const rowsForProduct = (productId: number) => rows.filter((r) => r.product_id === productId);

  const allocatedFor = (productId: number) =>
    rowsForProduct(productId).reduce((sum, r) => sum + (Number.parseInt(r.quantity, 10) || 0), 0);

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = (productId: number) =>
    setRows((prev) => [
      ...prev,
      { id: `row-${productId}-${Date.now()}-${prev.length}`, product_id: productId, section_id: null, quantity: "" },
    ]);

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const validate = (): string | null => {
    if (rows.length === 0) return t("shipment.plan.invalid");

    const seen = new Set<string>();
    const allocatedByProduct = new Map<number, number>();

    for (const r of rows) {
      if (r.section_id == null) return t("shipment.plan.err_section");

      const qty = Number.parseInt(r.quantity, 10);
      if (!Number.isInteger(qty) || qty < 1) return t("shipment.plan.err_positive");

      const key = `${r.product_id}:${r.section_id}`;
      if (seen.has(key)) return t("shipment.plan.err_duplicate");
      seen.add(key);

      allocatedByProduct.set(r.product_id, (allocatedByProduct.get(r.product_id) ?? 0) + qty);
    }

    for (const [productId, allocated] of allocatedByProduct) {
      const item = itemByProduct.get(productId);
      if (item && allocated > item.quantity) return t("shipment.plan.err_exceeds");
    }

    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        product_id: r.product_id,
        section_id: r.section_id as number,
        quantity: Number.parseInt(r.quantity, 10),
      }));
      await assignShipmentSections(slug, shipment.id, payload);
      toast.success(t("shipment.plan.saved"));
      onAssigned?.();
      onOpenChange(false);
    } catch (err: any) {
      const message = err.response?.data?.message || t("shipment.plan.save_failed");
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-3xl ${DIALOG_CONTENT_CLS}`}
        style={{ backgroundColor: "white" }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#1D2D44]">
            {t("shipment.plan.title")} · #{shipment.id} · {shipment.factory_name || "—"}
          </DialogTitle>
          <DialogDescription className="text-[#1D2D44]/60">
            {t("shipment.plan.desc")}
          </DialogDescription>
        </DialogHeader>

        {sectionsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[#1D2D44]/60">
            <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
          </div>
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
            <Boxes className="size-8 text-[#1D2D44]/30" />
            <p className="max-w-md px-4 text-sm text-[#1D2D44]/60">{t("shipment.plan.no_sections")}</p>
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl bg-slate-50 py-8 text-center text-sm text-[#1D2D44]/60">
            {t("shipment.plan.no_items")}
          </p>
        ) : (
          <div className="max-h-[55vh] space-y-4 overflow-y-auto py-1">
            {items.map((item) => {
              const productRows = rowsForProduct(item.product_id);
              const allocated = allocatedFor(item.product_id);
              const remaining = Math.max(0, item.quantity - allocated);
              const over = allocated > item.quantity;

              return (
                <GlassCard key={item.product_id}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#1D2D44]">
                      {item.product?.name ?? `#${item.product_id}`}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">
                        {t("shipment.plan.total")}: {item.quantity}
                      </Badge>
                      <Badge className={cn(over && "bg-red-100 text-red-700")}>
                        {t("shipment.plan.allocated")}: {allocated}
                      </Badge>
                      <Badge variant="outline">
                        {t("shipment.plan.remaining")}: {remaining}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {productRows.map((row) => (
                      <div key={row.id} className="grid grid-cols-[1fr_130px_auto] items-center gap-2">
                        <Select
                          value={row.section_id ? String(row.section_id) : ""}
                          onValueChange={(v) => updateRow(row.id, { section_id: Number(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("shipment.plan.choose_section")} />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map((sec) => (
                              <SelectItem key={sec.id} value={String(sec.id)}>
                                {sec.name} ({sec.quantity_parcels}/{sec.capacity.max_parcels_capacity ?? "—"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={row.quantity}
                          onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                          placeholder={t("shipment.quantity")}
                          className="h-9"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 px-0 text-[#1D2D44]/60 hover:text-red-600"
                          onClick={() => removeRow(row.id)}
                          disabled={productRows.length <= 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addRow(item.product_id)}
                      className={cn("h-8 text-xs", OUTLINE_BTN_CLS)}
                    >
                      <Plus className="size-3 me-1" /> {t("shipment.plan.add_row")}
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {formError ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
              <AlertCircle className="size-3.5 shrink-0" /> {formError}
            </p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className={OUTLINE_BTN_CLS}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || sectionsLoading || sections.length === 0 || items.length === 0}
              className={PRIMARY_BTN_CLS}
            >
              {saving ? <Loader2 className="size-4 me-1 animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}