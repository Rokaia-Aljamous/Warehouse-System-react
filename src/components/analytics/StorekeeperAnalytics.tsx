import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend } from "recharts";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { storekeeperAnalytics, formatNumber, formatPercent, type StockAccuracyStatus } from "@/lib/analytics-api";
import { useAnalyticsQuery } from "@/components/analytics/use-analytics";
import { AnalyticsCard, StatCard, ProgressRing } from "@/components/analytics/AnalyticsCard";

const TOOLTIP_STYLE = {
  background: "#f0ecdb",
  border: "1px solid rgba(26,41,66,0.15)",
  borderRadius: 10,
  color: "#1a2942",
  fontSize: 12,
} as const;

const STATUS_STYLES: Record<StockAccuracyStatus, { badge: string; labelKey: string }> = {
  not_counted: { badge: "bg-gray-100 text-gray-600", labelKey: "analytics.status.not_counted" },
  accurate: { badge: "bg-green-100 text-green-700", labelKey: "analytics.status.accurate" },
  missing: { badge: "bg-red-100 text-red-700", labelKey: "analytics.status.missing" },
  surplus: { badge: "bg-amber-100 text-amber-700", labelKey: "analytics.status.surplus" },
};

export function StorekeeperAnalytics({ slug }: { slug: string }) {
  const { t } = useTranslation();

  const movements = useAnalyticsQuery(["storekeeper-analytics", "movements", slug], () =>
    storekeeperAnalytics.dailyMovements(slug),
  );
  const capacity = useAnalyticsQuery(["storekeeper-analytics", "capacity", slug], () =>
    storekeeperAnalytics.capacityUtilization(slug),
  );

  /* Stock accuracy: draft inputs -> submitted counts -> re-query */
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, number> | null>(null);
  const [saving, setSaving] = useState(false);

  const accuracy = useAnalyticsQuery(
    ["storekeeper-analytics", "accuracy", slug, submitted ? JSON.stringify(submitted) : "base"],
    () => storekeeperAnalytics.stockAccuracy(slug, submitted ?? undefined),
  );

  const accuracyChart = useMemo(() => {
    const s = accuracy.data?.summary;
    if (!s) return [];
    return [
      { name: t("analytics.accuracy.accurate_short"), value: s.accurate_items, fill: "#10B981" },
      { name: t("analytics.accuracy.missing_short"), value: Math.max(s.items_checked - s.accurate_items, 0), fill: "#EF4444" },
      { name: t("analytics.accuracy.unchecked_short"), value: Math.max((accuracy.data?.lines.length ?? 0) - s.items_checked, 0), fill: "#CBD5E1" },
    ];
  }, [accuracy.data, t]);

  const submitCounts = () => {
    const counts: Record<string, number> = {};
    for (const [key, value] of Object.entries(draft)) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) counts[key] = parsed;
    }
    setSubmitted(counts);
    setSaving(true);
  };

  const clearCounts = () => {
    setDraft({});
    setSubmitted(null);
  };

  const rows = accuracy.data?.lines ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#1a2942]">{t("analytics.storekeeper.title")}</h2>
        <p className="text-xs text-[#1a2942]/60">{t("analytics.storekeeper.subtitle")}</p>
      </div>

      {/* Daily Inbound / Outbound */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-1">
          <StatCard
            label={t("analytics.movements.inbound")}
            value={formatNumber(movements.data?.totals.inbound_units)}
            sub={movements.data ? `${movements.data.range.from} → ${movements.data.range.to}` : undefined}
            tone="positive"
          />
          <StatCard
            label={t("analytics.movements.outbound")}
            value={formatNumber(movements.data?.totals.outbound_units)}
            tone="negative"
          />
        </div>
        <AnalyticsCard
          title={t("analytics.movements.title")}
          loading={movements.isLoading}
          error={movements.error}
          isEmpty={(movements.data?.daily.length ?? 0) === 0}
          emptyMessage={t("analytics.movements.empty")}
          className="lg:col-span-2"
        >
          {movements.data && (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movements.data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(26,41,66,0.05)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="inbound_units" name={t("analytics.movements.inbound")} fill="#10B981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="outbound_units" name={t("analytics.movements.outbound")} fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsCard>
      </div>

      {/* Stock Accuracy */}
      <AnalyticsCard
        title={t("analytics.accuracy.title")}
        description={t("analytics.accuracy.desc")}
        loading={accuracy.isLoading}
        error={accuracy.error}
        isEmpty={rows.length === 0}
        emptyMessage={t("analytics.accuracy.no_products")}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs text-[#1a2942]" onClick={clearCounts}>
              {t("analytics.accuracy.clear")}
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={submitCounts} disabled={Object.keys(draft).length === 0}>
              {saving ? <Loader2 className="me-1 size-3 animate-spin" /> : <Save className="me-1 size-3" />}
              {t("analytics.accuracy.save_counts")}
            </Button>
          </div>
        }
      >
        {accuracy.data && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <StatCard
                label={t("analytics.accuracy.rate")}
                value={formatPercent(accuracy.data.summary.accuracy_rate_percent)}
                tone="accent"
              />
              <StatCard
                label={t("analytics.accuracy.checked")}
                value={`${formatNumber(accuracy.data.summary.accurate_items)} / ${formatNumber(accuracy.data.summary.items_checked)}`}
                sub={t("analytics.accuracy.variance", { count: accuracy.data.summary.total_variance_units })}
              />
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={accuracyChart} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                    <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(26,41,66,0.05)" }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[#1a2942]/70">{t("analytics.product")}</TableHead>
                    <TableHead className="text-[#1a2942]/70">{t("analytics.system_qty")}</TableHead>
                    <TableHead className="text-[#1a2942]/70">{t("analytics.physical_qty")}</TableHead>
                    <TableHead className="text-[#1a2942]/70">{t("analytics.variance")}</TableHead>
                    <TableHead className="text-[#1a2942]/70">{t("analytics.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const key = `${row.warehouse_id}:${row.product_id}`;
                    const style = STATUS_STYLES[row.status];
                    return (
                      <TableRow key={key} className="border-white/40">
                        <TableCell className="font-medium text-[#1a2942] text-sm">{row.product_name}</TableCell>
                        <TableCell className="text-[#1a2942]">{formatNumber(row.system_quantity)}</TableCell>
                        <TableCell className="w-28">
                          <Input
                            type="number"
                            min={0}
                            value={draft[key] ?? (row.physical_quantity !== null ? String(row.physical_quantity) : "")}
                            placeholder="—"
                            onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="h-8 text-sm text-[#1a2942] placeholder:text-[#1a2942]/40"
                          />
                        </TableCell>
                        <TableCell className={cn("font-semibold", row.variance === null ? "text-[#1a2942]/50" : row.variance === 0 ? "text-emerald-600" : "text-red-600")}>
                          {row.variance === null ? "—" : row.variance > 0 ? `+${row.variance}` : String(row.variance)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs font-medium", style.badge)}>{t(style.labelKey)}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </AnalyticsCard>

      {/* Capacity Utilization */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AnalyticsCard
          title={t("analytics.capacity.title")}
          loading={capacity.isLoading}
          error={capacity.error}
          isEmpty={(capacity.data?.sections.length ?? 0) === 0}
          emptyMessage={t("analytics.capacity.empty")}
        >
          {capacity.data && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <ProgressRing value={capacity.data.summary.volume_utilization_percent} color="#10B981" label={t("analytics.capacity.m3")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={t("analytics.capacity.occupied_m3")} value={formatNumber(capacity.data.summary.occupied_m3, 1)} />
                <StatCard label={t("analytics.capacity.free_m3")} value={formatNumber(capacity.data.summary.free_m3, 1)} tone="positive" />
                <StatCard label={t("analytics.capacity.parcels_stored")} value={formatNumber(capacity.data.summary.total_parcels_stored)} />
                <StatCard
                  label={t("analytics.capacity.parcel_capacity")}
                  value={formatPercent(capacity.data.summary.parcel_capacity_utilization_percent)}
                />
              </div>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title={t("analytics.capacity.sections")}
          loading={capacity.isLoading}
          error={capacity.error}
          isEmpty={(capacity.data?.sections.length ?? 0) === 0}
          className="lg:col-span-2"
        >
          {capacity.data && (
            <div className="grid gap-4 sm:grid-cols-2">
              {capacity.data.sections.map((section) => (
                <div key={section.section_id} className="flex items-center gap-4 rounded-xl border border-[#1a2942]/10 bg-[#1a2942]/5 p-4">
                  <ProgressRing value={section.volume_utilization_percent} size={76} stroke={8} color="#6366f1" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#1a2942]">{section.section_name}</p>
                    <p className="text-xs text-[#1a2942]/60">
                      {formatNumber(section.occupied_volume_m3, 1)} / {formatNumber(section.section_volume_m3, 1)} m³
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1a2942]/10">
                      <div
                        className="h-full rounded-full bg-[#6366f1]"
                        style={{ width: `${Math.min(section.volume_utilization_percent, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-[#1a2942]/60">
                      {t("analytics.capacity.parcels", { count: formatNumber(section.stored_parcels) })} ·{" "}
                      {formatNumber(section.remaining_parcels_capacity)} {t("analytics.capacity.remaining")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnalyticsCard>
      </div>
    </div>
  );
}
