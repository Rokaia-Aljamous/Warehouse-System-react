import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ownerAnalytics, formatMoney, type Currency, type FinancialSettings,
} from "@/lib/analytics-api";
import { useAnalyticsQuery, httpErrorMessage } from "@/components/analytics/use-analytics";

const DEFAULT_SETTINGS: FinancialSettings = {
  default_margin_percent: 0,
  delivery_fee_per_order: 0,
  insurance_percent: 0,
  storage_percent: 0,
  capital_cost_percent: 0,
  obsolescence_percent: 0,
  other_overheads: {},
  currency: "EGP",
};

export function OwnerFinancialSettings({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const query = useAnalyticsQuery(["owner-analytics", "financial-settings", slug], () => ownerAnalytics.financialSettings(slug));
  const [form, setForm] = useState<FinancialSettings>(DEFAULT_SETTINGS);
  const [overheadsText, setOverheadsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data?.settings) {
      const s = query.data.settings;
      setForm({
        default_margin_percent: Number(s.default_margin_percent ?? 0),
        delivery_fee_per_order: Number(s.delivery_fee_per_order ?? 0),
        insurance_percent: Number(s.insurance_percent ?? 0),
        storage_percent: Number(s.storage_percent ?? 0),
        capital_cost_percent: Number(s.capital_cost_percent ?? 0),
        obsolescence_percent: Number(s.obsolescence_percent ?? 0),
        other_overheads: s.other_overheads ?? {},
        currency: s.currency ?? "EGP",
      });
      setOverheadsText(
        Object.entries(s.other_overheads ?? {})
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n"),
      );
    }
  }, [query.data]);

  const parsedOverheads = useMemo(() => {
    const out: Record<string, number> = {};
    for (const line of overheadsText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf(":");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = parseFloat(trimmed.slice(idx + 1));
      if (key && !Number.isNaN(val)) out[key] = val;
    }
    return out;
  }, [overheadsText]);

  const hasChanges = useMemo(() => {
    const a = form;
    const b = query.data?.settings ?? DEFAULT_SETTINGS;
    return (
      a.default_margin_percent !== Number(b.default_margin_percent ?? 0) ||
      a.delivery_fee_per_order !== Number(b.delivery_fee_per_order ?? 0) ||
      a.insurance_percent !== Number(b.insurance_percent ?? 0) ||
      a.storage_percent !== Number(b.storage_percent ?? 0) ||
      a.capital_cost_percent !== Number(b.capital_cost_percent ?? 0) ||
      a.obsolescence_percent !== Number(b.obsolescence_percent ?? 0) ||
      JSON.stringify(parsedOverheads) !== JSON.stringify(b.other_overheads ?? {})
    );
  }, [form, parsedOverheads, query.data]);

  const setField = (key: keyof FinancialSettings, value: number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await ownerAnalytics.updateFinancialSettings(slug, {
        default_margin_percent: form.default_margin_percent,
        delivery_fee_per_order: form.delivery_fee_per_order,
        insurance_percent: form.insurance_percent,
        storage_percent: form.storage_percent,
        capital_cost_percent: form.capital_cost_percent,
        obsolescence_percent: form.obsolescence_percent,
        other_overheads: parsedOverheads,
      });
      toast.success(t("analytics.settings.saved"));
      query.refetch();
    } catch (err) {
      toast.error(httpErrorMessage(err, t("analytics.settings.save_failed")));
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: "default_margin_percent" | "delivery_fee_per_order" | "insurance_percent" | "storage_percent" | "capital_cost_percent" | "obsolescence_percent", suffix?: string) => (
    <div>
      <Label className="text-xs text-[#1a2942]/70">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={form[key]}
          onChange={(e) => setField(key, parseFloat(e.target.value) || 0)}
          className="mt-1 text-sm text-[#1a2942]"
        />
        {suffix && <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-[#1a2942]/50">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#1a2942]">{t("analytics.settings.title")}</h2>
        <p className="text-xs text-[#1a2942]/60">{t("analytics.settings.subtitle")}</p>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-[#1a2942]/50" />
        </div>
      ) : query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          {httpErrorMessage(query.error, t("analytics.settings.load_failed"))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-light border-0 text-[#1a2942]">
            <CardHeader>
              <CardTitle className="text-sm font-bold">{t("analytics.settings.pricing")}</CardTitle>
              <CardDescription className="text-xs text-[#1a2942]/60">{t("analytics.settings.pricing_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {field(t("analytics.settings.margin"), "default_margin_percent", "%")}
              {field(t("analytics.settings.delivery_fee"), "delivery_fee_per_order", form.currency)}
            </CardContent>
          </Card>

          <Card className="glass-light border-0 text-[#1a2942]">
            <CardHeader>
              <CardTitle className="text-sm font-bold">{t("analytics.settings.costs")}</CardTitle>
              <CardDescription className="text-xs text-[#1a2942]/60">{t("analytics.settings.costs_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field(t("analytics.holding.insurance"), "insurance_percent", "%")}
              {field(t("analytics.holding.storage"), "storage_percent", "%")}
              {field(t("analytics.holding.capital"), "capital_cost_percent", "%")}
              {field(t("analytics.holding.obsolescence"), "obsolescence_percent", "%")}
            </CardContent>
          </Card>

          <Card className="glass-light border-0 text-[#1a2942] lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-bold">{t("analytics.settings.overheads")}</CardTitle>
              <CardDescription className="text-xs text-[#1a2942]/60">{t("analytics.settings.overheads_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="text-xs text-[#1a2942]/70">{t("analytics.settings.overheads_hint")}</Label>
              <Input
                value={overheadsText}
                onChange={(e) => setOverheadsText(e.target.value)}
                className="mt-1 font-mono text-xs text-[#1a2942]"
                placeholder={"warehouse_rent: 5000\nutilities: 1200.5"}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {!query.isLoading && !query.error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/40 px-4 py-3">
          <p className="text-xs text-[#1a2942]/60">
            {t("analytics.settings.currency_label")}: <strong className="text-[#1a2942]">{form.currency}</strong>{" "}
            {t("analytics.settings.preview", { total: formatMoney(0, form.currency as Currency) })}
          </p>
          <Button onClick={handleSave} disabled={saving || !hasChanges} className="text-sm">
            {saving ? <Loader2 className="size-4 animate-spin me-1" /> : <Save className="size-4 me-1" />}
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
