import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subscriptionStore } from "@/lib/subscription-data";

const schema = z.object({
  companyName: z.string().trim().min(2, "Required").max(120),
  warehouses: z.coerce.number().int().min(1).max(100),
  slok: z.string().trim().regex(/^[a-z0-9-]+$/, "lowercase, no spaces").min(2).max(40),
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  paymentMethod: z.enum(["Credit Card", "Bank Transfer", "Wallet"]),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultName?: string;
  defaultEmail?: string;
}

export function SubscriptionForm({ open, onOpenChange, defaultName = "Avery Lin", defaultEmail = "avery@stockyard.io" }: Props) {
  const [form, setForm] = useState({
    companyName: "Acme Logistics",
    warehouses: "3",
    slok: "acme",
    fullName: defaultName,
    email: defaultEmail,
    paymentMethod: "Credit Card" as "Credit Card" | "Bank Transfer" | "Wallet",
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
    toast.success("Subscription request submitted. You will be contacted for payment confirmation.");
    onOpenChange(false);
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>
            Tell us about your company to provision a custom workspace URL.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Company name *</Label>
            <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Number of warehouses *</Label>
              <Input type="number" min={1} max={100} value={form.warehouses} onChange={(e) => set("warehouses", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Slok (URL slug) *</Label>
              <Input
                value={form.slok}
                onChange={(e) => set("slok", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="acme"
              />
            </div>
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">
            Your URL: <span className="font-mono">https://app.company.com/{form.slok || "your-slok"}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Full name</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Payment method</Label>
            <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v as typeof form.paymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Wallet">Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="bg-navy text-cream hover:bg-navy/90">
            {loading ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : "Submit & Pay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
