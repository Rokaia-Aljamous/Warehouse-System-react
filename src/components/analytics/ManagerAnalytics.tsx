import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  managerAnalytics,
  formatMoney,
  formatNumber,
  formatPercent,
  type Currency,
  type DeadStockItem,
} from "@/lib/analytics-api";
import { useAnalyticsQuery } from "@/components/analytics/use-analytics";
import { AnalyticsCard, StatCard } from "@/components/analytics/AnalyticsCard";

const PERIOD_PRESETS = [30, 60, 90, 180] as const;

function usePeriodParams(days: number) {
  return useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { date_from: from.toISOString().slice(0, 10), date_to: to.toISOString().slice(0, 10) };
  }, [days]);
}

function PeriodSelector({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1 rounded-xl bg-[#1a2942]/5 p-1">
      {PERIOD_PRESETS.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            days === d ? "bg-[#1a2942] text-cream shadow-sm" : "text-[#1a2942]/70 hover:text-[#1a2942]",
          )}
        >
          {d} {t("analytics.days")}
        </button>
      ))}
    </div>
  );
}

const TOOLTIP_STYLE = {
  background: "#f0ecdb",
  border: "1px solid rgba(26,41,66,0.15)",
  borderRadius: 10,
  color: "#1a2942",
  fontSize: 12,
} as const;

function deadStockBuckets(items: DeadStockItem[]) {
  const byBucket: Record<string, number> = {};
  for (const item of items) {
    const d = item.inactive_days;
    const bucket = d < 30 ? "<30" : d < 60 ? "30-60" : d < 90 ? "60-90" : "90+";
    byBucket[bucket] = (byBucket[bucket] ?? 0) + item.stock_quantity;
  }
  return ["<30", "30-60", "60-90", "90+"].map((b) => ({ bucket: b, units: byBucket[b] ?? 0 }));
}

export function ManagerAnalytics({ slug, currency }: { slug: string; currency: Currency }) {
  const { t } = useTranslation();
  const [days, setDays] = useState(90);
  const params = usePeriodParams(days);
  const [threshold, setThreshold] = useState("90");

  const turnover = useAnalyticsQuery(["manager-analytics", "turnover", slug, params.date_from, params.date_to], () =>
    managerAnalytics.inventoryTurnover(slug, params),
  );
  const deadStock = useAnalyticsQuery(["manager-analytics", "dead-stock", slug, threshold], () =>
    managerAnalytics.deadStock(slug, { threshold_days: Number(threshold) }),
  );
  const accuracy = useAnalyticsQuery(["manager-analytics", "accuracy", slug, params.date_from, params.date_to], () =>
    managerAnalytics.orderPreparationAccuracy(slug, params),
  );
  const labor = useAnalyticsQuery(["manager-analytics", "labor", slug, params.date_from, params.date_to], () =>
    managerAnalytics.laborProductivity(slug, params),
  );
  const cycle = useAnalyticsQuery(["manager-analytics", "cycle", slug, params.date_from, params.date_to], () =>
    managerAnalytics.fulfillmentCycleTime(slug, params),
  );

  const laborChart = useMemo(
    () => (labor.data?.workers ?? []).slice(0, 10).map((w) => ({ name: w.worker_name, tasks: w.tasks_completed, units: w.units_prepared })),
    [labor.data],
  );

  const accuracyData = accuracy.data?.summary;
  const cycleData = cycle.data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1a2942]">{t("analytics.manager.title")}</h2>
          <p className="text-xs text-[#1a2942]/60">{t("analytics.manager.subtitle")}</p>
        </div>
        <PeriodSelector days={days} onChange={setDays} />
      </div>

      {/* Inventory Turnover */}
      <AnalyticsCard title={t("analytics.turnover.title")} loading={turnover.isLoading} error={turnover.error}>
        {turnover.data && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("analytics.turnover.rate")}
              value={formatNumber(turnover.data.inventory_turnover_rate, 2)}
              sub={`${formatNumber(turnover.data.days_in_inventory, 1)} ${t("analytics.turnover.days")}`}
              tone="accent"
            />
            <StatCard label={t("analytics.turnover.cogs")} value={formatMoney(turnover.data.cogs, currency)} tone="positive" />
            <StatCard label={t("analytics.turnover.avg_value")} value={formatMoney(turnover.data.average_inventory_value, currency)} />
            <StatCard label={t("analytics.turnover.closing")} value={formatMoney(turnover.data.closing_inventory_value, currency)} />
          </div>
        )}
      </AnalyticsCard>

      {/* Dead Stock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AnalyticsCard
          title={t("analytics.deadstock.title")}
          description={t("analytics.deadstock.desc")}
          loading={deadStock.isLoading}
          error={deadStock.error}
          isEmpty={(deadStock.data?.items.length ?? 0) === 0}
          emptyMessage={t("analytics.deadstock.empty")}
          className="lg:col-span-1"
          action={
            <Select value={threshold} onValueChange={setThreshold}>
              <SelectTrigger className="h-8 w-28 text-xs text-[#1a2942]">
                <SelectValue placeholder={t("analytics.threshold")} />
              </SelectTrigger>
              <SelectContent>
                {[30, 60, 90, 120, 180].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} {t("analytics.days")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {deadStock.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label={t("analytics.deadstock.skus")}
                  value={formatNumber(deadStock.data.summary.dead_stock_skus)}
                  tone="warning"
                />
                <StatCard
                  label={t("analytics.deadstock.units")}
                  value={formatNumber(deadStock.data.summary.dead_stock_units)}
                  tone="warning"
                />
                <StatCard
                  label={t("analytics.deadstock.tied_up")}
                  value={formatMoney(deadStock.data.summary.tied_up_capital, currency)}
                  tone="negative"
                />
                <StatCard
                  label={t("analytics.deadstock.share")}
                  value={formatPercent(deadStock.data.summary.share_of_total_value_percent)}
                />
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deadStockBuckets(deadStock.data.items)} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(26,41,66,0.05)" }} />
                    <Bar dataKey="units" name={t("analytics.deadstock.units")} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title={t("analytics.deadstock.items")}
          loading={deadStock.isLoading}
          error={deadStock.error}
          isEmpty={(deadStock.data?.items.length ?? 0) === 0}
          className="lg:col-span-2"
        >
          {deadStock.data && (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[#1a2942]/70">{t("analytics.product")}</TableHead>
                    <TableHead className="text-[#1a2942]/70">{t("analytics.quantity")}</TableHead>
                    <TableHead className="text-[#1a2942]/70">{t("analytics.value")}</TableHead>
                    <TableHead className="text-[#1a2942]/70">{t("analytics.last_sale")}</TableHead>
                    <TableHead className="text-[#1a2942]/70">{t("analytics.inactive_days")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deadStock.data.items.slice(0, 50).map((item) => (
                    <TableRow key={`${item.warehouse_id}-${item.product_id}`} className="border-white/40">
                      <TableCell className="font-medium text-[#1a2942] text-sm">{item.product_name}</TableCell>
                      <TableCell className="text-[#1a2942]">{formatNumber(item.stock_quantity)}</TableCell>
                      <TableCell className="text-[#1a2942]">{formatMoney(item.stock_value, currency)}</TableCell>
                      <TableCell className="text-xs text-[#1a2942]/70">{item.last_sale_date ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs font-medium",
                            item.inactive_days >= 90
                              ? "bg-red-100 text-red-700"
                              : item.inactive_days >= 60
                                ? "bg-amber-100 text-amber-700"
                                : "bg-yellow-100 text-yellow-700",
                          )}
                        >
                          {formatNumber(item.inactive_days, 0)} {t("analytics.days")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </AnalyticsCard>
      </div>

      {/* Order Preparation Accuracy */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AnalyticsCard
          title={t("analytics.accuracy.title")}
          loading={accuracy.isLoading}
          error={accuracy.error}
          isEmpty={(accuracyData?.orders_prepared ?? 0) === 0}
          emptyMessage={t("analytics.accuracy.empty")}
        >
          {accuracyData && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={t("analytics.accuracy.error_rate")} value={formatPercent(accuracyData.error_rate_percent)} tone="negative" />
              <StatCard label={t("analytics.accuracy.return_rate")} value={formatPercent(accuracyData.return_rate_percent)} tone="warning" />
              <StatCard label={t("analytics.accuracy.damage_rate")} value={formatPercent(accuracyData.damage_rate_percent)} tone="warning" />
              <StatCard
                label={t("analytics.accuracy.units")}
                value={formatNumber(accuracyData.units_prepared)}
                sub={t("analytics.accuracy.orders", { count: accuracyData.orders_prepared })}
                tone="positive"
              />
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title={t("analytics.labor.title")}
          loading={labor.isLoading}
          error={labor.error}
          isEmpty={(labor.data?.workers.length ?? 0) === 0}
          emptyMessage={t("analytics.labor.empty")}
          className="lg:col-span-2"
        >
          {labor.data && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label={t("analytics.labor.workers")} value={formatNumber(labor.data.summary.workers)} />
                <StatCard label={t("analytics.labor.tasks")} value={formatNumber(labor.data.summary.tasks_completed)} />
                <StatCard label={t("analytics.labor.units")} value={formatNumber(labor.data.summary.units_prepared)} tone="positive" />
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={laborChart} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(26,41,66,0.05)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="tasks" name={t("analytics.labor.tasks")} fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="units" name={t("analytics.labor.units")} fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </AnalyticsCard>
      </div>

      {/* Fulfillment Cycle Time */}
      <AnalyticsCard
        title={t("analytics.cycle.title")}
        loading={cycle.isLoading}
        error={cycle.error}
        isEmpty={(cycleData?.orders_delivered ?? 0) === 0}
        emptyMessage={t("analytics.cycle.empty")}
      >
        {cycleData && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label={t("analytics.cycle.avg_days")} value={formatNumber(cycleData.avg_cycle_days, 1)} tone="accent" />
            <StatCard label={t("analytics.cycle.avg_hours")} value={formatNumber(cycleData.avg_cycle_hours, 1)} />
            <StatCard label={t("analytics.cycle.min_hours")} value={formatNumber(cycleData.min_cycle_hours, 1)} tone="positive" />
            <StatCard label={t("analytics.cycle.max_hours")} value={formatNumber(cycleData.max_cycle_hours, 1)} tone="negative" />
            <StatCard label={t("analytics.cycle.orders")} value={formatNumber(cycleData.orders_delivered)} />
          </div>
        )}
      </AnalyticsCard>
    </div>
  );
}
