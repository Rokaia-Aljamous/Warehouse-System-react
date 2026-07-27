import { api } from "@/lib/api";

/* ===== Dashboard Auth (shared with owners) ===== */

export interface DashboardUser {
  id: number;
  full_name: string;
  birthday: string | null;
  phone_number: string;
  user_name: string;
  profile_image: string | null;
  profile_image_url: string | null;
  role: "owner" | "manager" | "warehouse_secretary";
  owner_id: number;
  employee_id: number | null;
  warehouse_id: number | null;
  must_change_password: boolean;
  tenant: {
    id: number;
    user_id: number;
    subscription_plan_id: number;
    company_name: string;
    warehouses_count: number;
    url_slug: string;
    status: string;
    subscription_start_date: string | null;
    subscription_end_date: string | null;
    subscription_plan: {
      id: number;
      name: string;
      duration_days: number;
      price_per_warehouse: string;
      is_active: boolean;
    } | null;
  };
}

export interface LoginResponse {
  message: string;
  dashboard_user: DashboardUser;
}

export const loginManager = async (slug: string, user_name: string, password: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>(`/${slug}/login`, { user_name, password });
  return response.data;
};

export const logoutManager = async (slug: string): Promise<void> => {
  await api.post(`/${slug}/logout`);
};

export const fetchMe = async (slug: string): Promise<DashboardUser> => {
  const response = await api.get<{ dashboard_user: DashboardUser }>(`/${slug}/me`);
  return response.data.dashboard_user;
};

/* ===== Sections ===== */

export interface SectionProduct {
  id: number;
  name: string;
  brand: string;
  type: string;
  parcel_barcode: string | null;
  units_per_packing: number;
  current_purchase_price: number;
  selling_price: number;
  parcel_dimensions: { length: number; width: number; height: number; unit: string };
}

export interface SectionCapacity {
  unit: string;
  section_volume: number;
  parcel_volume: number;
  used_volume: number;
  remaining_volume: number;
  volume_usage_percentage: number;
  max_parcels_capacity: number;
  remaining_parcels_capacity: number;
  quantity_parcels: number;
  quantity_units: number;
  remaining_units_capacity: number;
  capacity_usage_percentage: number;
  best_orientation: {
    parcel_length: number;
    parcel_width: number;
    parcel_height: number;
    length_fit: number;
    width_fit: number;
    height_fit: number;
    capacity: number;
  } | null;
}

export interface Section {
  id: number;
  warehouse_id: number;
  name: string;
  product_id: number | null;
  product: SectionProduct | null;
  dimensions: { length: number; width: number; height: number; unit: string };
  quantity_parcels: number;
  section_qr_code: string;
  capacity: SectionCapacity;
  created_at: string | null;
  updated_at: string | null;
}

export interface SectionListResponse {
  sections: Section[];
}

export interface SectionResponse {
  message: string;
  section: Section;
}

export interface TransferStockResponse {
  message: string;
  from_section: Section;
  to_section: Section;
}

export interface SectionInput {
  name: string;
  section_length: number;
  section_width: number;
  section_height: number;
  product_id?: number | null;
}

export interface FillStockInput {
  product_id: number;
  quantity_parcels: number;
  note?: string;
}

export interface RemoveStockInput {
  product_id: number;
  quantity_parcels: number;
  note?: string;
}

export interface TransferStockInput {
  from_section_id: number;
  to_section_id: number;
  product_id: number;
  quantity_parcels: number;
  note?: string;
}

export const fetchSections = async (slug: string, params?: { product_id?: number; assigned?: boolean; search?: string }): Promise<SectionListResponse> => {
  const response = await api.get<SectionListResponse>(`/${slug}/manager/sections`, { params });
  return response.data;
};

export const createSection = async (slug: string, data: SectionInput): Promise<SectionResponse> => {
  const response = await api.post<SectionResponse>(`/${slug}/manager/sections`, data);
  return response.data;
};

export const showSection = async (slug: string, sectionId: number): Promise<{ section: Section }> => {
  const response = await api.get<{ section: Section }>(`/${slug}/manager/sections/${sectionId}`);
  return response.data;
};

export const updateSection = async (slug: string, sectionId: number, data: Partial<Omit<SectionInput, 'product_id'>>): Promise<SectionResponse> => {
  const response = await api.patch<SectionResponse>(`/${slug}/manager/sections/${sectionId}`, data);
  return response.data;
};

export const deleteSection = async (slug: string, sectionId: number): Promise<void> => {
  await api.delete(`/${slug}/manager/sections/${sectionId}`);
};

export const fillSectionStock = async (slug: string, sectionId: number, data: FillStockInput): Promise<SectionResponse> => {
  const response = await api.post<SectionResponse>(`/${slug}/manager/sections/${sectionId}/fill`, data);
  return response.data;
};

export const removeSectionStock = async (slug: string, sectionId: number, data: RemoveStockInput): Promise<SectionResponse> => {
  const response = await api.post<SectionResponse>(`/${slug}/manager/sections/${sectionId}/remove-stock`, data);
  return response.data;
};

export const assignProductToSection = async (slug: string, sectionId: number, productId: number): Promise<SectionResponse> => {
  const response = await api.post<SectionResponse>(`/${slug}/manager/sections/${sectionId}/assign-product`, { product_id: productId });
  return response.data;
};

export const unassignProductFromSection = async (slug: string, sectionId: number): Promise<SectionResponse> => {
  const response = await api.post<SectionResponse>(`/${slug}/manager/sections/${sectionId}/unassign-product`);
  return response.data;
};

export const transferSectionStock = async (slug: string, data: TransferStockInput): Promise<TransferStockResponse> => {
  const response = await api.post<TransferStockResponse>(`/${slug}/manager/sections/transfer-stock`, data);
  return response.data;
};

/* ===== Inventory Movements ===== */

export interface InventoryMovementProduct {
  id: number;
  name: string;
  brand: string;
  type: string;
  units_per_packing: number;
}

export interface InventoryMovementWarehouse {
  id: number;
  warehouse_name: string;
}

export interface InventoryMovementSection {
  id: number;
  name: string;
}

export interface InventoryMovementPerformer {
  id: number;
  full_name: string;
  user_name: string;
}

export interface InventoryMovement {
  id: number;
  owner_id: number;
  warehouse_id: number;
  product_id: number;
  section_id: number | null;
  from_section_id: number | null;
  to_section_id: number | null;
  movement_type: string;
  movement_type_label: string;
  quantity_units: number;
  quantity_parcels: number;
  performed_by_system_user_id: number;
  performed_by_role: string;
  reference_type: string | null;
  reference_id: number | null;
  note: string | null;
  warehouse: InventoryMovementWarehouse;
  product: InventoryMovementProduct;
  section: InventoryMovementSection | null;
  from_section: InventoryMovementSection | null;
  to_section: InventoryMovementSection | null;
  performed_by: InventoryMovementPerformer;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovementsResponse {
  inventory_movements: InventoryMovement[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export const fetchInventoryMovements = async (slug: string, params?: {
  warehouse_id?: number;
  product_id?: number;
  section_id?: number;
  movement_type?: string;
  from_date?: string;
  to_date?: string;
  per_page?: number;
  page?: number;
}): Promise<InventoryMovementsResponse> => {
  const response = await api.get<InventoryMovementsResponse>(`/${slug}/inventory-movements`, { params });
  return response.data;
};

/* ===== Products (read-only for manager) ===== */

export interface ManagerProduct {
  id: number;
  name: string;
  brand: string;
  type: string;
  piece_barcode: string | null;
  parcel_barcode: string | null;
  units_per_packing: number;
  current_purchase_price: number;
  selling_price: number;
  parcel_length: number;
  parcel_width: number;
  parcel_height: number;
  warehouses_count?: number;
  created_at: string | null;
  updated_at: string | null;
}

export const fetchManagerProducts = async (slug: string): Promise<{ products: ManagerProduct[] }> => {
  const response = await api.get<{ products: ManagerProduct[] }>(`/${slug}/products`);
  return response.data;
};

/* ===== Shipments (view + receive for manager) ===== */

export interface ManagerShipmentWarehouse {
  id: number;
  warehouse_name: string;
  type: string;
  location: string;
}

export interface ManagerShipmentItem {
  id: number;
  product_id: number;
  quantity: number;
  purchase_price: number;
  subtotal: string;
  product?: { id: number; name: string; brand: string; type: string };
}

export type ManagerShipmentStatus = "pending" | "in_transit" | "received";

export interface ManagerShipment {
  id: number;
  owner_id: number;
  warehouse_id: number;
  factory_name: string;
  total_price: number;
  arrival_date: string | null;
  status: ManagerShipmentStatus;
  status_label: string;
  can_receive: boolean;
  warehouse?: ManagerShipmentWarehouse;
  items?: ManagerShipmentItem[];
  created_at: string | null;
  updated_at: string | null;
}

export const fetchManagerShipments = async (slug: string): Promise<{ shipments: ManagerShipment[] }> => {
  const response = await api.get<{ shipments: ManagerShipment[] }>(`/${slug}/shipments`);
  return response.data;
};

export const receiveManagerShipment = async (slug: string, id: number): Promise<{ message: string; shipment: ManagerShipment }> => {
  const response = await api.post<{ message: string; shipment: ManagerShipment }>(`/${slug}/shipments/${id}/receive`);
  return response.data;
};

/* ===== Employees (manager can manage non-manager roles) ===== */

export interface ManagerEmployeeSystemUser {
  id: number;
  full_name: string;
  birthday: string | null;
  phone_number: string;
  user_name: string;
  profile_image: string | null;
  must_change_password: boolean;
}

export interface ManagerEmployee {
  id: number;
  system_user_id: number;
  warehouse_id: number;
  role: string;
  status: string;
  salary: number;
  system_user: ManagerEmployeeSystemUser;
}

export const fetchManagerEmployees = async (slug: string, warehouseId: number): Promise<{ employees: ManagerEmployee[] }> => {
  const response = await api.get<{ employees: ManagerEmployee[] }>(`/${slug}/warehouses/${warehouseId}/employees`);
  return response.data;
};

export const createManagerEmployee = async (
  slug: string,
  warehouseId: number,
  data: { full_name: string; phone_number: string; user_name: string; password?: string; role: string; salary: number }
): Promise<{ message: string; employee: ManagerEmployee; password?: string }> => {
  const response = await api.post(`/${slug}/warehouses/${warehouseId}/employees`, data);
  return response.data;
};

export const updateManagerEmployee = async (
  slug: string,
  warehouseId: number,
  employeeId: number,
  data: Partial<{ full_name: string; phone_number: string; user_name: string; role: string; salary: number; status: string }>
): Promise<{ message: string; employee: ManagerEmployee }> => {
  const response = await api.patch(`/${slug}/warehouses/${warehouseId}/employees/${employeeId}`, data);
  return response.data;
};

export const deleteManagerEmployee = async (slug: string, warehouseId: number, employeeId: number): Promise<void> => {
  await api.delete(`/${slug}/warehouses/${warehouseId}/employees/${employeeId}`);
};

export const logoutManagerEmployee = async (slug: string, warehouseId: number, employeeId: number): Promise<void> => {
  await api.post(`/${slug}/warehouses/${warehouseId}/employees/${employeeId}/logout`);
};

/* ===== Tasks ===== */

export interface ManagerTaskWorker {
  id: number;
  full_name: string;
  phone_number: string;
}

export interface ManagerTaskSuperadmin {
  id: number;
  full_name: string;
}

export interface ManagerTaskRelated {
  id: number;
  type?: string;
  label?: string;
  status?: string;
  total_price?: number;
}

export interface ManagerTask {
  id: number;
  status: "in_preparation" | "completed";
  task_type: string;
  worker: ManagerTaskWorker;
  superadmin: ManagerTaskSuperadmin;
  related_type: string | null;
  related_id: number | null;
  related: ManagerTaskRelated | null;
  created_at: string;
  updated_at: string;
}

export interface AssignTaskInput {
  worker_or_driver_id: number;
  task_type: string;
  related_type: string;
  related_id: number;
}

export interface UpdateTaskStatusInput {
  status: "in_preparation" | "completed";
}

export const fetchManagerTasks = async (slug: string, params?: { status?: string; task_type?: string; worker_id?: number }): Promise<{ tasks: ManagerTask[] }> => {
  const response = await api.get<{ tasks: ManagerTask[] }>(`/${slug}/manager/tasks`, { params });
  return response.data;
};

export const showManagerTask = async (slug: string, taskId: number): Promise<{ task: ManagerTask }> => {
  const response = await api.get<{ task: ManagerTask }>(`/${slug}/manager/tasks/${taskId}`);
  return response.data;
};

export const assignTask = async (slug: string, data: AssignTaskInput): Promise<{ message: string; task: ManagerTask }> => {
  const response = await api.post<{ message: string; task: ManagerTask }>(`/${slug}/manager/tasks/assign`, data);
  return response.data;
};

export const updateTaskStatus = async (slug: string, taskId: number, data: UpdateTaskStatusInput): Promise<{ message: string; task: ManagerTask }> => {
  const response = await api.patch<{ message: string; task: ManagerTask }>(`/${slug}/manager/tasks/${taskId}/status`, data);
  return response.data;
};

/* ===== Warehouse (manager sees only their own) ===== */

export interface ManagerWarehouseDetail {
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
}

export const fetchManagerWarehouse = async (slug: string): Promise<{ warehouse: ManagerWarehouseDetail }> => {
  const response = await api.get<{ warehouse: ManagerWarehouseDetail }>(`/${slug}/manager/warehouse`);
  return response.data;
};
