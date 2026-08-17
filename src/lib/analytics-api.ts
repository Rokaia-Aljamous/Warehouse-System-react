import { api, getCsrfCookie } from "@/lib/api";

/* ===== Shared ===== */

export interface PeriodRange {
  from: string;
  to: string;
}

export type DateRangeParams = {
  date_from?: string;
  date_to?: string;
  warehouse_id?: number;
};

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<T>(url, { params });
  return res.data;
}

/* ===== Formatting helpers ===== */

const CURRENCIES = { EGP: "EGP", USD: "USD", EUR: "EUR", SAR: "SAR", AED: "AED" } as const;
export type Currency = keyof typeof CURRENCIES;

export function formatMoney(value: number | null | undefined, currency: Currency = "EGP"): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  const n = Number(value ?? 0);
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n)}%`;
}

export function formatMonth(month: string): string {
  const d = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(d.getTime())
    ? month
    : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/* ===== Manager Analytics ===== */

export interface InventoryTurnover {
  period: PeriodRange;
  cogs: number;
  opening_inventory_value: number;
  closing_inventory_value: number;
  average_inventory_value: number;
  inventory_turnover_rate: number;
  days_in_inventory: number;
  notes: {
    opening_inventory_value_is_estimated: boolean;
    cogs_uses_current_purchase_price: boolean;
  };
}

export interface DeadStockItem {
  product_id: number;
  product_name: string;
  warehouse_id: number;
  stock_quantity: number;
  minimum_stock: number;
  stock_value: number;
  last_sale_date: string | null;
  inactive_days: number;
  is_dead_stock: boolean;
}

export interface DeadStock {
  as_of: string;
  threshold_days: number;
  summary: {
    dead_stock_skus: number;
    dead_stock_units: number;
    tied_up_capital: number;
    share_of_total_value_percent: number;
  };
  items: DeadStockItem[];
}

export interface OrderPreparationAccuracy {
  period: PeriodRange;
  summary: {
    orders_prepared: number;
    order_lines: number;
    units_prepared: number;
    orders_with_returns: number;
    orders_with_damage: number;
    error_rate_percent: number;
    damage_rate_percent: number;
    return_rate_percent: number;
  };
}

export interface LaborProductivityWorker {
  worker_id: number;
  worker_name: string;
  role: string;
  tasks_assigned: number;
  tasks_completed: number;
  completion_rate_percent: number;
  units_prepared: number;
  avg_prep_minutes_per_task: number | null;
  tasks_per_day: number;
}

export interface LaborProductivity {
  period: PeriodRange;
  summary: {
    workers: number;
    tasks_completed: number;
    units_prepared: number;
    avg_tasks_per_worker: number;
    avg_units_per_worker: number;
  };
  workers: LaborProductivityWorker[];
}

export interface FulfillmentCycleTime {
  period: PeriodRange;
  summary: {
    orders_delivered: number;
    avg_cycle_hours: number;
    avg_cycle_days: number;
    min_cycle_hours: number;
    max_cycle_hours: number;
  };
  notes: {
    cycle_time_is_approximated_with_updated_at: boolean;
    add_dedicated_status_timestamp_columns_for_exact_measurement: boolean;
  };
}

export const managerAnalytics = {
  inventoryTurnover: (slug: string, params?: DateRangeParams) =>
    get<InventoryTurnover>(`/${slug}/manager/analytics/inventory-turnover`, params),
  deadStock: (slug: string, params?: DateRangeParams & { threshold_days?: number }) =>
    get<DeadStock>(`/${slug}/manager/analytics/dead-stock`, params),
  orderPreparationAccuracy: (slug: string, params?: DateRangeParams) =>
    get<OrderPreparationAccuracy>(`/${slug}/manager/analytics/order-preparation-accuracy`, params),
  laborProductivity: (slug: string, params?: DateRangeParams) =>
    get<LaborProductivity>(`/${slug}/manager/analytics/labor-productivity`, params),
  fulfillmentCycleTime: (slug: string, params?: DateRangeParams) =>
    get<FulfillmentCycleTime>(`/${slug}/manager/analytics/fulfillment-cycle-time`, params),
};

/* ===== Storekeeper Analytics ===== */

export interface DailyMovementRow {
  date: string;
  inbound_units: number;
  outbound_units: number;
  net_movement_units: number;
}

export interface DailyMovements {
  range: PeriodRange;
  daily: DailyMovementRow[];
  totals: { inbound_units: number; outbound_units: number };
}

export type StockAccuracyStatus = "not_counted" | "accurate" | "missing" | "surplus";

export interface StockAccuracyLine {
  product_id: number;
  product_name: string;
  warehouse_id: number;
  system_quantity: number;
  physical_quantity: number | null;
  variance: number | null;
  status: StockAccuracyStatus;
}

export interface StockAccuracy {
  summary: {
    items_checked: number;
    accurate_items: number;
    accuracy_rate_percent: number;
    total_variance_units: number;
  };
  lines: StockAccuracyLine[];
}

export interface CapacitySectionRow {
  section_id: number;
  section_name: string;
  warehouse_id: number;
  stored_parcels: number;
  section_volume_m3: number;
  parcel_volume_m3: number;
  occupied_volume_m3: number;
  free_volume_m3: number;
  volume_utilization_percent: number;
  max_parcels_capacity: number;
  remaining_parcels_capacity: number;
  parcel_capacity_utilization_percent: number;
}

export interface CapacityUtilization {
  summary: {
    sections: number;
    total_capacity_m3: number;
    occupied_m3: number;
    free_m3: number;
    volume_utilization_percent: number;
    total_parcels_capacity: number;
    total_parcels_stored: number;
    parcel_capacity_utilization_percent: number;
  };
  sections: CapacitySectionRow[];
}

export const storekeeperAnalytics = {
  dailyMovements: (slug: string, params?: DateRangeParams) =>
    get<DailyMovements>(`/${slug}/storekeeper/analytics/daily-movements`, params),
  stockAccuracy: (slug: string, physicalCounts?: Record<string, number>) =>
    get<StockAccuracy>(`/${slug}/storekeeper/analytics/stock-accuracy`, {
      ...(physicalCounts && Object.keys(physicalCounts).length > 0
        ? { physical_counts: physicalCounts }
        : {}),
    }),
  capacityUtilization: (slug: string) =>
    get<CapacityUtilization>(`/${slug}/storekeeper/analytics/capacity-utilization`),
};

/* ===== Owner Analytics ===== */

export interface WarehouseInventory {
  warehouse_id: number;
  warehouse_name: string;
  units: number;
  skus: number;
  cost_value: number;
  retail_value: number;
  potential_gross_margin: number;
}

export interface InventoryValue {
  as_of: string;
  totals: {
    units: number;
    skus: number;
    cost_value: number;
    retail_value: number;
  };
  tied_up_capital: number;
  by_warehouse: WarehouseInventory[];
}

export interface Gmroii {
  period: PeriodRange;
  revenue: number;
  cogs: number;
  gross_margin: number;
  gross_margin_percent: number;
  average_inventory_cost: number;
  gmroii_percent: number;
  notes: { opening_inventory_is_estimated_from_earliest_stock_rows: boolean };
}

export interface HoldingCosts {
  as_of: string;
  inventory_value: number;
  settings_missing: boolean;
  rates: {
    insurance_percent: number;
    storage_percent: number;
    capital_cost_percent: number;
    obsolescence_percent: number;
  };
  components: {
    insurance_percent: number;
    storage_percent: number;
    capital_cost_percent: number;
    obsolescence_percent: number;
  };
  total_annual_holding_cost: number;
  holding_cost_percent: number;
}

export interface PnlMonth {
  month: string;
  orders_count: number;
  product_revenue: number;
  shipping_revenue: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin_percent: number;
  returns_value: number;
  additional_costs: number;
  net_profit: number;
  net_margin_percent: number;
}

export interface MonthlyPnl {
  currency: Currency;
  period: PeriodRange;
  totals: {
    product_revenue: number;
    shipping_revenue: number;
    revenue: number;
    cogs: number;
    gross_profit: number;
    net_profit: number;
    cumulative_net_profit: number;
  };
  months: PnlMonth[];
}

export type StockStatus = "out_of_stock" | "stockout_risk" | "overstock" | "healthy";

export interface ForecastItem {
  product_id: number;
  product_name: string;
  warehouse_id: number;
  stock_quantity: number;
  minimum_stock: number;
  sold_last_period: number;
  avg_daily_demand: number;
  forecast_next_month_units: number;
  reorder_point_units: number;
  stock_status: StockStatus;
  days_of_cover: number | null;
}

export interface DemandForecast {
  as_of: string;
  lookback_months: number;
  lead_time_days: number;
  service_level_days: number;
  summary: {
    sku_count: number;
    status_counts: Partial<Record<StockStatus, number>>;
    stockout_risk_skus: number;
    overstock_skus: number;
  };
  items: ForecastItem[];
}

export interface FinancialSettings {
  default_margin_percent: number;
  delivery_fee_per_order: number;
  delivery_cross_region_multiplier: number;
  insurance_percent: number;
  storage_percent: number;
  capital_cost_percent: number;
  obsolescence_percent: number;
  other_overheads: Record<string, number>;
  currency: Currency;
}

export interface FinancialSettingsResponse {
  settings: FinancialSettings;
}

export interface FinancialSettingsSaveResponse {
  message: string;
  settings: FinancialSettings & {
    owner_id?: number;
    created_at?: string | null;
    updated_at?: string | null;
  };
}

export const ownerAnalytics = {
  inventoryValue: (slug: string, warehouseId?: number) =>
    get<InventoryValue>(`/${slug}/owner/analytics/inventory-value`, {
      ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    }),
  gmroii: (slug: string, params?: DateRangeParams) =>
    get<Gmroii>(`/${slug}/owner/analytics/gmroii`, params),
  holdingCosts: (slug: string, warehouseId?: number) =>
    get<HoldingCosts>(`/${slug}/owner/analytics/holding-costs`, {
      ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    }),
  monthlyPnl: (slug: string, months = 6, warehouseId?: number) =>
    get<MonthlyPnl>(`/${slug}/owner/analytics/monthly-pnl`, {
      months,
      ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    }),
  demandForecast: (
    slug: string,
    opts: {
      lookback_months?: number;
      lead_time_days?: number;
      service_level_days?: number;
      warehouse_id?: number;
    } = {},
  ) => get<DemandForecast>(`/${slug}/owner/analytics/demand-forecast`, opts),
  financialSettings: (slug: string) =>
    get<FinancialSettingsResponse>(`/${slug}/owner/analytics/financial-settings`),
  updateFinancialSettings: async (slug: string, data: Partial<FinancialSettings>): Promise<FinancialSettingsSaveResponse> => {
    await getCsrfCookie();
    const res = await api.put<FinancialSettingsSaveResponse>(
      `/${slug}/owner/analytics/financial-settings`,
      data,
    );
    return res.data;
  },
};
