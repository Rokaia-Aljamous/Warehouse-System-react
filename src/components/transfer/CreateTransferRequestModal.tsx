import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManagerProduct } from "@/lib/manager-api";
import type { CreateTransferRequestInput } from "@/lib/manager-api";

export interface CreateRequestLine {
  product_id: number;
  quantity: number;
}

interface CreateTransferRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ManagerProduct[];
  submitting: boolean;
  onSubmit: (input: CreateTransferRequestInput) => void;
}

export function CreateTransferRequestModal({
  open,
  onOpenChange,
  products,
  submitting,
  onSubmit,
}: CreateTransferRequestModalProps) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<CreateRequestLine[]>([]);
  const [note, setNote] = useState("");

  const reset = () => {
    setLines([]);
    setNote("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const addLine = () => {
    const usedIds = new Set(lines.map((l) => l.product_id));
    const nextProduct = products.find((p) => !usedIds.has(p.id));
    setLines((prev) => [...prev, { product_id: nextProduct?.id ?? 0, quantity: 1 }]);
  };

  const updateProduct = (index: number, productId: number) => {
    const dup = lines.some((l, i) => i !== index && l.product_id === productId);
    if (dup) {
      toast.error(t("transfer_request.duplicate_product"));
      return;
    }
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, product_id: productId } : l)));
  };

  const updateQuantity = (index: number, quantity: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, quantity) } : l)),
    );
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const valid = lines.every((l) => l.product_id > 0 && l.quantity > 0);
    if (lines.length === 0) {
      toast.error(t("transfer_request.no_items"));
      return;
    }
    if (!valid) {
      toast.error(t("transfer_request.incomplete_item"));
      return;
    }
    onSubmit({
      items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    reset();
  };

  const productName = (productId: number) => products.find((p) => p.id === productId)?.name ?? "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1a2942]">{t("transfer_request.new_title")}</DialogTitle>
          <DialogDescription>{t("transfer_request.new_desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#1a2942]">{t("transfer_request.items")}</p>
            <Button size="sm" variant="outline" onClick={addLine} disabled={products.length === 0}>
              <Plus className="size-4 me-1" /> {t("transfer_request.add_item")}
            </Button>
          </div>

          {products.length === 0 && (
            <p className="text-xs text-[#1a2942]/60">{t("transfer_request.no_products")}</p>
          )}

          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#1a2942]/20 p-6 text-center">
              <Package className="mx-auto size-6 text-[#1a2942]/30" />
              <p className="mt-2 text-xs text-[#1a2942]/60">
                {t("transfer_request.no_items_hint")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="flex items-end gap-2 rounded-xl border border-white/40 bg-white/40 p-3"
                >
                  <div className="flex-1">
                    <Label className="text-[11px] text-[#1a2942]/70">
                      {t("transfer_request.product")}
                    </Label>
                    <Select
                      value={String(line.product_id)}
                      onValueChange={(v) => updateProduct(index, Number(v))}
                    >
                      <SelectTrigger className="h-9 text-xs text-[#1a2942]">
                        <SelectValue placeholder={t("transfer_request.select_product")} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={String(p.id)}
                            disabled={lines.some((l, i) => i !== index && l.product_id === p.id)}
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-[11px] text-[#1a2942]/70">
                      {t("transfer_request.qty")}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateQuantity(index, parseInt(e.target.value || "0", 10) || 0)
                      }
                      className="h-9 text-xs text-[#1a2942]"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-red-500"
                    onClick={() => removeLine(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label className="text-[11px] text-[#1a2942]/70">
              {t("transfer_request.note_optional")}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t("transfer_request.note_placeholder")}
              className="text-xs text-[#1a2942]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#1a2942] text-cream hover:bg-[#1a2942]/90"
          >
            {submitting && <Loader2 className="size-4 animate-spin me-1" />}
            {submitting ? t("transfer_request.submitting") : t("transfer_request.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
