import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subscriptionStore } from "@/lib/subscription-data";

const PAYMENT_OPTIONS = ["Credit Card", "Bank Transfer", "Wallet"] as const;
type PaymentMethod = (typeof PAYMENT_OPTIONS)[number];

const paymentKey: Record<PaymentMethod, string> = {
  "Credit Card": "options.payment.card",
  "Bank Transfer": "options.payment.bank",
  "Wallet": "options.payment.wallet",
};

const makeSchema = (t: (k: string) => string) => z.object({
  companyName: z.string().trim().min(2, t("zod.required")).max(120),
  warehouses: z.coerce.number().int().min(1).max(100),
  slok: z.string().trim().regex(/^[a-z0-9-]+$/, t("zod.slug_charset")).min(2).max(40),
  fullName: z.string().trim().min(2, t("zod.required")),
  email: z.string().trim().email(t("zod.invalid_email")),
  paymentMethod: z.enum(PAYMENT_OPTIONS),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultName?: string;
  defaultEmail?: string;
}

export function SubscriptionForm({ open, onOpenChange, defaultName = "Avery Lin", defaultEmail = "avery@stockyard.io" }: Props) {
  const { t } = useTranslation();
  const schema = makeSchema(t);
  const [form, setForm] = useState({
    companyName: "Acme Logistics",
    warehouses: "3",
    slok: "acme",
    fullName: defaultName,
    email: defaultEmail,
    paymentMethod: "Credit Card" as PaymentMethod,
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const r = schema.safeParse(form);
    if (!r.success) { toast.error(r.error.issues[0].message); return; }
    setLoading(true);
    await new Promise((res) => setTimeout(res, 900));
    subscriptionStore.add({
      companyName: r.data.companyName,
      warehouses: r.data.warehouses,
      slok: r.data.slok,
      fullName: r.data.fullName,
      email: r.data.email,
      paymentMethod: r.data.paymentMethod,
    });
    setLoading(false);
    toast.success(t("subscription.form.submitted"));
    onOpenChange(false);
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("subscription.form.title")}</DialogTitle>
          <DialogDescription>
            {t("subscription.form.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("subscription.form.company")}</Label>
            <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("subscription.form.warehouses")}</Label>
              <Input type="number" min={1} max={100} value={form.warehouses} onChange={(e) => set("warehouses", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("subscription.form.slug")}</Label>
              <Input
                value={form.slok}
                onChange={(e) => set("slok", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="acme"
              />
            </div>
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">
            {t("subscription.form.your_url")} <span className="font-mono">https://app.company.com/{form.slok || "your-slok"}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("signup.name")}</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("signup.email")}</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("subscription.form.payment_method")}</Label>
            <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{t(paymentKey[opt])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={loading} className="bg-navy text-cream hover:bg-navy/90">
            {loading ? <><Loader2 className="size-4 animate-spin" /> {t("common.submitting")}</> : t("subscription.form.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
