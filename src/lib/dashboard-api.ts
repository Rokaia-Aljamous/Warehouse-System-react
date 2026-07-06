import { api } from "@/lib/api";

export interface Warehouse {
  id: number;
  owner_id: number;
  warehouse_name: string;
  type: string;
  location: string;
  governorate: string;
  area: number;
  financial_budgets: number;
  created_at: string;
}

export interface WarehouseListResponse {
  warehouses: Warehouse[];
  allowed_warehouses_count: number;
  current_warehouses_count: number;
}

export interface WarehouseStoreResponse {
  message: string;
  warehouse: Warehouse;
}

export interface WarehouseInput {
  warehouse_name: string;
  type: string;
  location: string;
  governorate: string;
  area: number;
  financial_budgets: number;
}

export const WAREHOUSE_TYPE_STYLES: Record<string, { color: string; icon: string }> = {
  "Cold Storage": { color: "#38BDF8", icon: "Snowflake" },
  "Dry Storage": { color: "#A7B3C3", icon: "Package" },
  Hazardous: { color: "#F59E0B", icon: "Flame" },
  "Fulfillment Center": { color: "#10B981", icon: "Truck" },
};

export function getTypeStyle(type: string): { color: string; icon: string } {
  return WAREHOUSE_TYPE_STYLES[type] ?? { color: "#6366f1", icon: "Warehouse" };
}

export const fetchWarehouses = async (slug: string): Promise<WarehouseListResponse> => {
  const response = await api.get<WarehouseListResponse>(`/${slug}/warehouses`);
  return response.data;
};

export const createWarehouse = async (slug: string, data: WarehouseInput): Promise<WarehouseStoreResponse> => {
  const response = await api.post<WarehouseStoreResponse>(`/${slug}/warehouses`, data);
  return response.data;
};

export const updateWarehouse = async (slug: string, id: number, data: Partial<WarehouseInput>): Promise<WarehouseStoreResponse> => {
  const response = await api.patch<WarehouseStoreResponse>(`/${slug}/warehouses/${id}`, data);
  return response.data;
};

export const deleteWarehouse = async (slug: string, id: number): Promise<void> => {
  await api.delete(`/${slug}/warehouses/${id}`);
};
