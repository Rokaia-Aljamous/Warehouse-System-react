import { api } from "@/lib/api";

/* ===== Warehouses ===== */

export interface WarehouseEmployee {
  id: number;
  status: string;
  system_user: {
    id: number;
    full_name: string;
  } | null;
}

export interface WarehouseProductPivot {
  quantity: number;
  minimum_stock: number;
}

export interface Warehouse {
  id: number;
  owner_id: number;
  warehouse_name: string;
  type: string;
  location: string;
  governorate: string;
  area: number;
  financial_budgets: number;
  description: string | null;
  created_at: string;
  employees?: WarehouseEmployee[];
  products?: { id: number; product_name: string; pivot: WarehouseProductPivot }[];
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
  description?: string | null;
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

const WAREHOUSE_TYPE_KEYS: Record<string, string> = {
  "Cold Storage": "warehouse.type.cold_storage",
  "Dry Storage": "warehouse.type.dry_storage",
  Hazardous: "warehouse.type.hazardous",
  "Fulfillment Center": "warehouse.type.fulfillment_center",
};

export function getWarehouseTypeKey(type: string): string {
  return WAREHOUSE_TYPE_KEYS[type] ?? "";
}

export const fetchWarehouses = async (slug: string): Promise<WarehouseListResponse> => {
  const response = await api.get<WarehouseListResponse>(`/${slug}/owner/warehouses`);
  return response.data;
};

export const createWarehouse = async (slug: string, data: WarehouseInput): Promise<WarehouseStoreResponse> => {
  const response = await api.post<WarehouseStoreResponse>(`/${slug}/owner/warehouses`, data);
  return response.data;
};

export const updateWarehouse = async (slug: string, id: number, data: Partial<WarehouseInput>): Promise<WarehouseStoreResponse> => {
  const response = await api.patch<WarehouseStoreResponse>(`/${slug}/owner/warehouses/${id}`, data);
  return response.data;
};

export const deleteWarehouse = async (slug: string, id: number): Promise<void> => {
  await api.delete(`/${slug}/owner/warehouses/${id}`);
};

export interface DeleteWarehouseInfo {
  employees_count: number;
  products_count: number;
  other_warehouses: { id: number; warehouse_name: string }[];
  has_shipments: boolean;
}

export const fetchDeleteWarehouseInfo = async (slug: string, id: number): Promise<DeleteWarehouseInfo> => {
  const response = await api.get<DeleteWarehouseInfo>(`/${slug}/owner/warehouses/${id}/delete-info`);
  return response.data;
};

/* ===== Products ===== */

export interface ProductWarehousePivot {
  id: number;
  warehouse_name: string;
  quantity: number;
  minimum_stock: number;
}

export interface Product {
  id: number;
  owner_id: number;
  name: string;
  brand: string;
  type: string;
  piece_barcode: string | null;
  parcel_barcode: string | null;
  units_per_packing: number;
  main_image: string | null;
  main_image_url: string | null;
  current_purchase_price: number;
  selling_price: number;
  parcel_length: number;
  parcel_width: number;
  parcel_height: number;
  extra_data: Record<string, unknown> | null;
  warehouses_count?: number;
  warehouses?: ProductWarehousePivot[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductListResponse {
  products: Product[];
}

export interface ProductStoreResponse {
  message: string;
  product: Product;
}

export interface ProductInput {
  name: string;
  brand: string;
  type: string;
  piece_barcode: string;
  parcel_barcode: string;
  units_per_packing: number;
  current_purchase_price: number;
  selling_price: number;
  parcel_length: number;
  parcel_width: number;
  parcel_height: number;
}

export interface ProductSubmitInput extends ProductInput {
  id?: number;
  main_image?: File | null;
  extra_data?: Record<string, unknown> | null;
}

const toProductFormData = (data: Partial<ProductSubmitInput>): FormData => {
  const fd = new FormData();
  fd.append("name", data.name ?? "");
  fd.append("brand", data.brand ?? "");
  fd.append("type", data.type ?? "");
  fd.append("piece_barcode", data.piece_barcode ?? "");
  fd.append("parcel_barcode", data.parcel_barcode ?? "");
  fd.append("units_per_packing", String(data.units_per_packing ?? ""));
  fd.append("current_purchase_price", String(data.current_purchase_price ?? ""));
  fd.append("selling_price", String(data.selling_price ?? ""));
  fd.append("parcel_length", String(data.parcel_length ?? ""));
  fd.append("parcel_width", String(data.parcel_width ?? ""));
  fd.append("parcel_height", String(data.parcel_height ?? ""));

  if (data.main_image instanceof File) {
    fd.append("main_image", data.main_image);
  } else if (data.main_image === null) {
    fd.append("main_image", "");
  }

  const extra =
    data.extra_data && Object.keys(data.extra_data).length > 0 ? data.extra_data : null;
  fd.append("extra_data", extra ? JSON.stringify(extra) : "");

  return fd;
};

export const fetchProducts = async (slug: string): Promise<ProductListResponse> => {
  const response = await api.get<ProductListResponse>(`/${slug}/owner/products`);
  return response.data;
};

export const createProduct = async (slug: string, data: ProductSubmitInput): Promise<ProductStoreResponse> => {
  const response = await api.post<ProductStoreResponse>(`/${slug}/owner/products`, toProductFormData(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateProduct = async (slug: string, id: number, data: Partial<ProductSubmitInput>): Promise<ProductStoreResponse> => {
  const response = await api.patch<ProductStoreResponse>(`/${slug}/owner/products/${id}`, toProductFormData(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteProduct = async (slug: string, id: number): Promise<void> => {
  await api.delete(`/${slug}/owner/products/${id}`);
};

export const updateProductStock = async (slug: string, warehouseId: number, productId: number, data: { minimum_stock: number }): Promise<ProductStoreResponse> => {
  const response = await api.patch<ProductStoreResponse>(`/${slug}/owner/warehouses/${warehouseId}/products/${productId}/stock`, data);
  return response.data;
};

export const updateProductQuantity = async (slug: string, warehouseId: number, productId: number, quantity: number): Promise<ProductStoreResponse> => {
  const response = await api.patch<ProductStoreResponse>(`/${slug}/owner/warehouses/${warehouseId}/products/${productId}/quantity`, { quantity });
  return response.data;
};

/* ===== Shipments ===== */

export interface ShipmentItemProduct {
  id: number;
  name: string;
  brand: string;
  type: string;
  piece_barcode: string | null;
  parcel_barcode: string | null;
  units_per_packing: number;
  current_purchase_price: number;
  selling_price: number;
}

export interface ShipmentItem {
  id: number;
  shipment_id: number;
  product_id: number;
  quantity: number;
  purchase_price: number;
  subtotal: string;
  product?: ShipmentItemProduct;
  created_at: string | null;
  updated_at: string | null;
}

export interface ShipmentWarehouse {
  id: number;
  warehouse_name: string;
  type: string;
  location: string;
  governorate: string;
}

export type ShipmentStatus = "pending" | "in_transit" | "received";

export interface Shipment {
  id: number;
  owner_id: number;
  warehouse_id: number;
  factory_name: string;
  total_price: number;
  arrival_date: string | null;
  status: ShipmentStatus;
  status_label: string;
  can_receive: boolean;
  warehouse?: ShipmentWarehouse;
  items?: ShipmentItem[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ShipmentListResponse {
  shipments: Shipment[];
}

export interface ShipmentStoreResponse {
  message: string;
  shipment: Shipment;
}

export interface ShipmentInput {
  warehouse_id: number;
  factory_name: string;
  arrival_date: string;
  items: ShipmentItemInput[];
}

export interface ShipmentItemInput {
  product_id: number;
  quantity: number;
  purchase_price: number;
}

export const fetchShipments = async (slug: string): Promise<ShipmentListResponse> => {
  const response = await api.get<ShipmentListResponse>(`/${slug}/owner/shipments`);
  return response.data;
};

export const createShipment = async (slug: string, data: ShipmentInput): Promise<ShipmentStoreResponse> => {
  const response = await api.post<ShipmentStoreResponse>(`/${slug}/owner/shipments`, data);
  return response.data;
};

export const updateShipment = async (slug: string, id: number, data: Partial<ShipmentInput>): Promise<ShipmentStoreResponse> => {
  const response = await api.patch<ShipmentStoreResponse>(`/${slug}/owner/shipments/${id}`, data);
  return response.data;
};

export const deleteShipment = async (slug: string, id: number): Promise<void> => {
  await api.delete(`/${slug}/owner/shipments/${id}`);
};

export const receiveShipment = async (slug: string, id: number): Promise<ShipmentStoreResponse> => {
  const response = await api.post<ShipmentStoreResponse>(`/${slug}/owner/shipments/${id}/receive`);
  return response.data;
};

export const fetchStorekeeperShipments = async (slug: string): Promise<ShipmentListResponse> => {
  const response = await api.get<ShipmentListResponse>(`/${slug}/shipments`);
  return response.data;
};

/* ===== Employees (Managers) ===== */

export interface EmployeeSystemUser {
  id: number;
  full_name: string;
  birthday: string | null;
  phone_number: string;
  user_name: string;
  profile_image: string | null;
  must_change_password: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Employee {
  id: number;
  system_user_id: number;
  warehouse_id: number;
  role: string;
  status: string;
  salary: number;
  system_user: EmployeeSystemUser;
}

export interface EmployeeListResponse {
  employees: Employee[];
}

export interface EmployeeStoreResponse {
  message: string;
  employee: Employee;
  password?: string;
}

export interface EmployeeInput {
  full_name: string;
  birthday?: string | null;
  phone_number: string;
  user_name: string;
  password?: string;
  role: string;
  salary: number;
  status?: string;
}

export const fetchEmployees = async (slug: string, warehouseId: number): Promise<EmployeeListResponse> => {
  const response = await api.get<EmployeeListResponse>(`/${slug}/owner/warehouses/${warehouseId}/employees`);
  return response.data;
};

export const createEmployee = async (slug: string, warehouseId: number, data: EmployeeInput): Promise<EmployeeStoreResponse> => {
  const response = await api.post<EmployeeStoreResponse>(`/${slug}/warehouses/${warehouseId}/employees`, data);
  return response.data;
};

export const updateEmployee = async (slug: string, warehouseId: number, employeeId: number, data: Partial<EmployeeInput>): Promise<EmployeeStoreResponse> => {
  const response = await api.patch<EmployeeStoreResponse>(`/${slug}/warehouses/${warehouseId}/employees/${employeeId}`, data);
  return response.data;
};

export const deleteEmployee = async (slug: string, warehouseId: number, employeeId: number): Promise<void> => {
  await api.delete(`/${slug}/warehouses/${warehouseId}/employees/${employeeId}`);
};

export const logoutEmployee = async (slug: string, warehouseId: number, employeeId: number): Promise<void> => {
  await api.post(`/${slug}/warehouses/${warehouseId}/employees/${employeeId}/logout`);
};
