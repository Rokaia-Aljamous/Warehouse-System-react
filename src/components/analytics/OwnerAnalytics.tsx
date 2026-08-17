import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer, ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, BarChart,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ownerAnalytics, formatMoney, formatNumber, formatPercent, formatMonth,
  type Currency, type PeriodRange,
} from "@/lib/analytics-api";
import { fetchWarehouses, type Warehouse } from "@/lib/dashboard-api";
import { useAnalyticsQuery } from "@/components/analytics/use-analytics";
import { AnalyticsCard, StatCard } from "@/components/analytics/AnalyticsCard";
import { DemandForecast } from "@/components/analytics/DemandForecast";

const TOOLTIP_STYLE = {
  background: "#f0ecdb",
  border: "1px solid rgba(26,41,66,0.15)",
  borderRadius: 10,
  color: "#1a2942",
  fontSize: 12,
} as const;

function usePeriodParams(days: number): PeriodRange & { date_from: string; date_to: string } {
  return useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      date_from: from.toISOString().slice(0, 10),
      date_to: to.toISOString().slice(0, 10),
    };
  }, [days]);
}

export function OwnerAnalytics({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [months, setMonths] = useState("6");
  const [gmroiiDays, setGmroiiDays] = useState(90);

  const warehousesQuery = useAnalyticsQuery(["owner-analytics", "warehouses", slug], () => fetchWarehouses(slug));
  const warehouses = warehousesQuery.data?.warehouses ?? [];
  const warehouseScope = warehouseId;

  const inventoryValue = useAnalyticsQuery(["owner-analytics", "inventory-value", slug, String(warehouseScope ?? "all")], () =>
    ownerAnalytics.inventoryValue(slug, warehouseScope),
  );
  const gmroiiParams = usePeriodParams(gmroiiDays);
  const gmroii = useAnalyticsQuery(
    ["owner-analytics", "gmroii", slug, String(warehouseScope ?? "all"), gmroiiParams.date_from, gmroiiParams.date_to],
    () => ownerAnalytics.gmroii(slug, { ...gmroiiParams, warehouse_id: warehouseScope }),
  );
  const holdingCosts = useAnalyticsQuery(["owner-analytics", "holding-costs", slug, String(warehouseScope ?? "all")], () =>
    ownerAnalytics.holdingCosts(slug, warehouseScope),
  );
  const pnl = useAnalyticsQuery(["owner-analytics", "pnl", slug, String(months), String(warehouseScope ?? "all")], () =>
    ownerAnalytics.monthlyPnl(slug, Number(months), warehouseScope),
  );

  const currency: Currency = pnl.data?.currency ?? "EGP";

  const pnlChart = useMemo(
    () =>
      (pnl.data?.months ?? []).map((m) => ({
        month: formatMonth(m.month),
        revenue: m.revenue,
        cogs: m.cogs,
        gross_profit: m.gross_profit,
        net_profit: m.net_profit,
        net_margin: m.net_margin_percent,
      })),
    [pnl.data],
  );

  const byWarehouseChart = useMemo(
    () =>
      (inventoryValue.data?.by_warehouse ?? []).map((w) => ({
        name: w.warehouse_name,
        cost: w.cost_value,
        retail: w.retail_value,
      })),
    [inventoryValue.data],
  );

  const holdingComponents = useMemo(() => {
    const c = holdingCosts.data?.components;
    if (!c) return [];
    const labels: Record<string, string> = {
      insurance_percent: t("analytics.holding.insurance"),
      storage_percent: t("analytics.holding.storage"),
      capital_cost_percent: t("analytics.holding.capital"),
      obsolescence_percent: t("analytics.holding.obsolescence"),
    };
    return Object.entries(c).map(([key, value]) => ({ name: labels[key] ?? key, value }));
  }, [holdingCosts.data, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1a2942]">{t("analytics.owner.title")}</h2>
          <p className="text-xs text-[#1a2942]/60">{t("analytics.owner.subtitle")}</p>
        </div>
        {warehouses.length > 0 && (
          <Select
            value={warehouseId ? String(warehouseId) : "all"}
            onValueChange={(v) => setWarehouseId(v === "all" ? undefined : Number(v))}
          >
            <SelectTrigger className="h-8 w-56 text-xs text-[#1a2942]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("analytics.owner.all_warehouses")}</SelectItem>
              {warehouses.map((w: Warehouse) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.warehouse_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Inventory Value / Tied-up Capital */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AnalyticsCard
          title={t("analytics.inventory.title")}
          loading={inventoryValue.isLoading}
          error={inventoryValue.error}
          isEmpty={(inventoryValue.data?.by_warehouse.length ?? 0) === 0}
          emptyMessage={t("analytics.inventory.empty")}
        >
          {inventoryValue.data && (
            <div className="space-y-4">
              <StatCard
                label={t("analytics.inventory.tied_up")}
                value={formatMoney(inventoryValue.data.tied_up_capital, currency)}
                tone="accent"
                sub={`${formatNumber(inventoryValue.data.totals.units)} ${t("analytics.units")} · ${formatNumber(inventoryValue.data.totals.skus)} ${t("analytics.skus")}`}
              />
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={t("analytics.inventory.cost")} value={formatMoney(inventoryValue.data.totals.cost_value, currency)} />
                <StatCard label={t("analytics.inventory.retail")} value={formatMoney(inventoryValue.data.totals.retail_value, currency)} tone="positive" />
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byWarehouseChart} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-18} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(26,41,66,0.05)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cost" name={t("analytics.inventory.cost")} fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="retail" name={t("analytics.inventory.retail")} fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title={t("analytics.gmroii.title")}
          description={t("analytics.gmroii.desc")}
          loading={gmroii.isLoading}
          error={gmroii.error}
          isEmpty={(gmroii.data?.revenue ?? 0) === 0}
          emptyMessage={t("analytics.gmroii.empty")}
          action={
            <Select value={String(gmroiiDays)} onValueChange={(v) => setGmroiiDays(Number(v))}>
              <SelectTrigger className="h-8 w-28 text-xs text-[#1a2942]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[30, 60, 90, 180].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} {t("analytics.days")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {gmroii.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label={t("analytics.gmroii.rate")}
                  value={formatPercent(gmroii.data.gmroii_percent)}
                  tone="accent"
                />
                <StatCard
                  label={t("analytics.gmroii.gross_margin")}
                  value={formatPercent(gmroii.data.gross_margin_percent)}
                  tone="positive"
                />
                <StatCard label={t("analytics.gmroii.revenue")} value={formatMoney(gmroii.data.revenue, currency)} />
                <StatCard
                  label={t("analytics.gmroii.avg_inventory")}
                  value={formatMoney(gmroii.data.average_inventory_cost, currency)}
                />
              </div>
              <p className="text-[11px] text-[#1a2942]/50">{t("analytics.gmroii.note")}</p>
            </div>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title={t("analytics.holding.title")}
          loading={holdingCosts.isLoading}
          error={holdingCosts.error}
          isEmpty={(holdingCosts.data?.total_annual_holding_cost ?? 0) === 0}
          emptyMessage={t("analytics.holding.empty")}
        >
          {holdingCosts.data && (
            <div className="space-y-4">
              {holdingCosts.data.settings_missing && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-700">{t("analytics.holding.settings_missing")}</p>
                </div>
              )}
              <StatCard
                label={t("analytics.holding.total")}
                value={formatMoney(holdingCosts.data.total_annual_holding_cost, currency)}
                tone="negative"
                sub={`${formatPercent(holdingCosts.data.holding_cost_percent)} · ${t("analytics.holding.inventory_value")}: ${formatMoney(holdingCosts.data.inventory_value, currency)}`}
              />
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={holdingComponents} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-18} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(26,41,66,0.05)" }} />
                    <Bar dataKey="value" name={t("analytics.holding.annual")} fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </AnalyticsCard>
      </div>

      {/* P&L */}
      <AnalyticsCard
        title={t("analytics.pnl.title")}
        description={t("analytics.pnl.desc")}
        loading={pnl.isLoading}
        error={pnl.error}
        isEmpty={pnlChart.length === 0}
        emptyMessage={t("analytics.pnl.empty")}
        action={
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="h-8 w-32 text-xs text-[#1a2942]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["3", "6", "12", "24"].map((m) => (
                <SelectItem key={m} value={m}>
                  {m} {t("analytics.months")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {pnl.data && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("analytics.pnl.revenue")} value={formatMoney(pnl.data.totals.revenue, currency)} tone="positive" />
              <StatCard label={t("analytics.pnl.product_revenue")} value={formatMoney(pnl.data.totals.product_revenue, currency)} />
              <StatCard label={t("analytics.pnl.shipping_revenue")} value={formatMoney(pnl.data.totals.shipping_revenue, currency)} />
              <StatCard label={t("analytics.pnl.gross_profit")} value={formatMoney(pnl.data.totals.gross_profit, currency)} />
              <StatCard label={t("analytics.pnl.net_profit")} value={formatMoney(pnl.data.totals.net_profit, currency)} tone={pnl.data.totals.net_profit >= 0 ? "positive" : "negative"} />
              <StatCard label={t("analytics.pnl.orders")} value={formatNumber(pnl.data.months.reduce((s, m) => s + m.orders_count, 0))} />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={pnlChart}>
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RTooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name={t("analytics.pnl.revenue")} fill="#6366f1" barSize={18} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cogs" name={t("analytics.pnl.cogs")} fill="#F59E0B" barSize={18} radius={[4, 4, 0, 0]} />
                  <Area type="monotone" dataKey="gross_profit" name={t("analytics.pnl.gross_profit")} stroke="#06B6D4" strokeWidth={2} fill="url(#netGrad)" />
                  <Line type="monotone" dataKey="net_profit" name={t("analytics.pnl.net_profit")} stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </AnalyticsCard>

      {/* Demand Forecast */}
      <DemandForecast slug={slug} warehouseId={warehouseScope} />
    </div>
  );
}
