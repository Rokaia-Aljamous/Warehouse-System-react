import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ownerAnalytics, formatNumber, type StockStatus } from "@/lib/analytics-api";
import { useAnalyticsQuery } from "@/components/analytics/use-analytics";
import { AnalyticsCard, StatCard } from "@/components/analytics/AnalyticsCard";

const STATUS_STYLES: Record<StockStatus, { badge: string; labelKey: string }> = {
  healthy: { badge: "bg-green-100 text-green-700", labelKey: "analytics.forecast.healthy" },
  overstock: { badge: "bg-amber-100 text-amber-700", labelKey: "analytics.forecast.overstock" },
  stockout_risk: { badge: "bg-red-100 text-red-700", labelKey: "analytics.forecast.stockout_risk" },
  out_of_stock: { badge: "bg-gray-200 text-gray-700", labelKey: "analytics.forecast.out_of_stock" },
};

export function DemandForecast({ slug, warehouseId }: { slug: string; warehouseId?: number }) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lookback, setLookback] = useState("3");

  const forecast = useAnalyticsQuery(
    ["owner-analytics", "forecast", slug, lookback, String(warehouseId ?? "all")],
    () => ownerAnalytics.demandForecast(slug, { lookback_months: Number(lookback), warehouse_id: warehouseId }),
  );

  const items = useMemo(() => {
    const all = forecast.data?.items ?? [];
    if (statusFilter === "all") return all;
    return all.filter((i) => i.stock_status === statusFilter);
  }, [forecast.data, statusFilter]);

  const summary = forecast.data?.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1a2942]">{t("analytics.forecast.title")}</h3>
          <p className="text-xs text-[#1a2942]/60">
            {forecast.data && t("analytics.forecast.as_of", { date: forecast.data.as_of })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-xs text-[#1a2942]">
              <SelectValue placeholder={t("analytics.forecast.filter_status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("analytics.forecast.all_statuses")}</SelectItem>
              <SelectItem value="stockout_risk">{t("analytics.forecast.stockout_risk")}</SelectItem>
              <SelectItem value="overstock">{t("analytics.forecast.overstock")}</SelectItem>
              <SelectItem value="out_of_stock">{t("analytics.forecast.out_of_stock")}</SelectItem>
              <SelectItem value="healthy">{t("analytics.forecast.healthy")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lookback} onValueChange={setLookback}>
            <SelectTrigger className="h-8 w-32 text-xs text-[#1a2942]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1", "3", "6", "12"].map((m) => (
                <SelectItem key={m} value={m}>
                  {m} {t("analytics.months")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AnalyticsCard
        title={t("analytics.forecast.summary")}
        loading={forecast.isLoading}
        error={forecast.error}
        isEmpty={(summary?.sku_count ?? 0) === 0}
        emptyMessage={t("analytics.forecast.empty")}
      >
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("analytics.forecast.skus")} value={formatNumber(summary.sku_count)} />
            <StatCard label={t("analytics.forecast.stockout_risk_skus")} value={formatNumber(summary.stockout_risk_skus)} tone="negative" />
            <StatCard label={t("analytics.forecast.overstock_skus")} value={formatNumber(summary.overstock_skus)} tone="warning" />
            <StatCard label={t("analytics.forecast.healthy_skus")} value={formatNumber(summary.status_counts?.healthy ?? 0)} tone="positive" />
          </div>
        )}
      </AnalyticsCard>

      <AnalyticsCard
        title={t("analytics.forecast.items")}
        loading={forecast.isLoading}
        error={forecast.error}
        isEmpty={items.length === 0}
        emptyMessage={t("analytics.forecast.empty")}
      >
        <div className="max-h-[28rem] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[#1a2942]/70">{t("analytics.product")}</TableHead>
                <TableHead className="text-[#1a2942]/70">{t("analytics.forecast.stock")}</TableHead>
                <TableHead className="text-[#1a2942]/70">{t("analytics.forecast.forecast_30d")}</TableHead>
                <TableHead className="text-[#1a2942]/70">{t("analytics.forecast.reorder_point")}</TableHead>
                <TableHead className="text-[#1a2942]/70">{t("analytics.forecast.days_cover")}</TableHead>
                <TableHead className="text-[#1a2942]/70">{t("analytics.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.slice(0, 100).map((item) => {
                const style = STATUS_STYLES[item.stock_status] ?? STATUS_STYLES.healthy;
                return (
                  <TableRow key={`${item.warehouse_id}-${item.product_id}`} className="border-white/40">
                    <TableCell className="max-w-[180px] truncate font-medium text-[#1a2942] text-sm">{item.product_name}</TableCell>
                    <TableCell className="text-[#1a2942]">
                      {formatNumber(item.stock_quantity)}
                      <span className="text-[10px] text-[#1a2942]/50"> / {formatNumber(item.minimum_stock)}</span>
                    </TableCell>
                    <TableCell className="text-[#1a2942]">{formatNumber(item.forecast_next_month_units, 0)}</TableCell>
                    <TableCell className="text-[#1a2942]">{formatNumber(item.reorder_point_units, 0)}</TableCell>
                    <TableCell className="text-[#1a2942]">{item.days_of_cover !== null ? formatNumber(item.days_of_cover, 1) : "—"}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs font-medium", style.badge)}>{t(style.labelKey)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </AnalyticsCard>
    </div>
  );
}
