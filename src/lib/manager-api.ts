import { api } from "@/lib/api";

/* ===== Dashboard Auth (shared with owners) ===== */

export interface DashboardUser {
  id: number;
  full_name: string;
  email?: string;
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

export const forceChangePassword = async (slug: string, password: string, password_confirmation: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(`/${slug}/force-password-change`, {
    password,
    password_confirmation,
  });
  return response.data;
};

export const updateDashboardProfile = async (
  slug: string,
  data: { full_name?: string; phone_number?: string },
): Promise<{ message: string }> => {
  const response = await api.patch<{ message: string }>(`/${slug}/profile`, data);
  return response.data;
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

const MOVEMENT_TYPE_KEYS: Record<string, string> = {
  shipment_received: "inventory.movement.shipment_received",
  section_fill: "inventory.movement.section_fill",
  section_remove: "inventory.movement.section_remove",
  section_transfer: "inventory.movement.section_transfer",
  return_restock: "inventory.movement.return_restock",
  disposal: "inventory.movement.disposal",
};

export function getMovementTypeKey(type: string): string {
  return MOVEMENT_TYPE_KEYS[type] ?? "";
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
  brand?: string;
  type?: string;
  piece_barcode?: string | null;
  parcel_barcode?: string | null;
  units_per_packing?: number;
  current_purchase_price?: number;
  selling_price?: number;
  parcel_length?: number;
  parcel_width?: number;
  parcel_height?: number;
  warehouses_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
  quantity?: number;
  minimum_stock?: number;
}

export interface ManagerInventoryItem {
  product_id: number;
  name: string;
  pivot: { quantity: number; minimum_stock: number } | null;
}

export const fetchManagerProducts = async (
  slug: string,
): Promise<{ products: ManagerProduct[] }> => {
  const response = await api.get<{ inventory: ManagerInventoryItem[] }>(
    `/${slug}/manager/inventory`,
  );
  return {
    products: (response.data.inventory ?? []).map((item) => ({
      id: item.product_id,
      name: item.name,
      quantity: item.pivot?.quantity ?? 0,
      minimum_stock: item.pivot?.minimum_stock ?? 0,
    })),
  };
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
  const response = await api.get<{ shipments: ManagerShipment[] }>(`/${slug}/manager/shipments`);
  return response.data;
};

export const receiveManagerShipment = async (slug: string, id: number): Promise<{ message: string; shipment: ManagerShipment }> => {
  const response = await api.post<{ message: string; shipment: ManagerShipment }>(`/${slug}/shipments/${id}/receive`);
  return response.data;
};

/* ===== Manager: plan shipment departments (assign-sections) ===== */

export interface AssignShipmentSectionItem {
  product_id: number;
  section_id: number;
  quantity: number;
}

export interface ShipmentSectionAssignment {
  shipment_id: number;
  section_id: number;
  product_id: number;
  planned_quantity: number;
  received_quantity: number;
}

export interface AssignShipmentSectionsResponse {
  message: string;
  assignments: ShipmentSectionAssignment[];
}

export const assignShipmentSections = async (slug: string, shipmentId: number, items: AssignShipmentSectionItem[]): Promise<AssignShipmentSectionsResponse> => {
  const response = await api.post<AssignShipmentSectionsResponse>(
    `/${slug}/manager/shipments/${shipmentId}/assign-sections`,
    { items },
  );
  return response.data;
};

/* ===== Orders (manager views incoming customer orders) ===== */

export interface ManagerOrderCustomer {
  id: number;
  full_name: string;
  phone_number: string;
}

export interface ManagerOrderWarehouse {
  id: number;
  warehouse_name: string;
}

export interface ManagerOrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  product?: {
    id: number;
    name: string;
    brand?: string | null;
    type?: string | null;
    main_image: string | null;
    main_image_url: string | null;
  };
}

export interface ManagerOrder {
  id: number;
  customer: ManagerOrderCustomer;
  warehouse: ManagerOrderWarehouse;
  status: "pending" | "approved" | "in_preparation" | "shipped" | "delivered" | "rejected" | "cancelled";
  payment_status: "not_started" | "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";
  payment_method: string | null;
  payment_currency: string | null;
  paid_at: string | null;
  can_prepare: boolean;
  total_price: string;
  delivery_fee: string;
  delivery_region: string | null;
  transfer_assignment: string;
  order_date: string;
  customer_location: string;
  customer_latitude?: string | null;
  customer_longitude?: string | null;
  order_qr_code: string;
  items_count: number;
  items?: ManagerOrderItem[];
}

export const fetchManagerOrders = async (slug: string): Promise<{ orders: ManagerOrder[] }> => {
  const response = await api.get<{ orders: ManagerOrder[] }>(`/${slug}/manager/orders`, {
    params: { status: "all" },
  });
  return response.data;
};

export const fetchKeeperOrders = async (slug: string): Promise<{ orders: ManagerOrder[] }> => {
  const response = await api.get<{ orders: ManagerOrder[] }>(`/${slug}/keeper/orders`, {
    params: { status: "all" },
  });
  return response.data;
};

export const acceptKeeperOrder = async (
  slug: string,
  orderId: number,
  transferAssignment = 0,
): Promise<{ message: string; order: ManagerOrder }> => {
  const response = await api.post<{ message: string; order: ManagerOrder }>(
    `/${slug}/keeper/orders/${orderId}/accept`,
    { transfer_assignment: transferAssignment },
  );
  return response.data;
};

export const rejectKeeperOrder = async (
  slug: string,
  orderId: number,
): Promise<{ message: string; order: ManagerOrder }> => {
  const response = await api.post<{ message: string; order: ManagerOrder }>(
    `/${slug}/keeper/orders/${orderId}/reject`,
  );
  return response.data;
};

export const updateKeeperOrderStatus = async (
  slug: string,
  orderId: number,
  status: "in_preparation" | "shipped" | "delivered",
): Promise<{ message: string; order: ManagerOrder }> => {
  const response = await api.patch<{ message: string; order: ManagerOrder }>(
    `/${slug}/keeper/orders/${orderId}/status`,
    { status },
  );
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
  const response = await api.get<{ employees: ManagerEmployee[] }>(`/${slug}/manager/workers/${warehouseId}`);
  return response.data;
};

/* ===== Keeper (warehouse secretary) disposals ===== */

export type DisposalStatus = "pending" | "approved" | "rejected";

export interface KeeperDisposal {
  id: number;
  status: DisposalStatus;
  quantity: number;
  damage_reason: string;
  barcode: string;
  task_id: number | null;
  created_at: string | null;
  product: { id: number; name: string } | null;
  warehouse: { id: number; warehouse_name: string } | null;
  worker: { id: number; full_name: string | null } | null;
  employee: { id: number; full_name: string | null } | null;
}

export const fetchKeeperDisposals = async (
  slug: string,
  status?: DisposalStatus,
): Promise<{ disposals: KeeperDisposal[] }> => {
  const response = await api.get<{ disposals: KeeperDisposal[] }>(`/${slug}/keeper/disposals`, {
    params: status ? { status } : undefined,
  });
  return response.data;
};

export const decideKeeperDisposal = async (
  slug: string,
  disposalId: number,
  data: { status: "approved" | "rejected"; reason?: string },
): Promise<{ message: string; disposal: KeeperDisposal }> => {
  const response = await api.post<{ message: string; disposal: KeeperDisposal }>(
    `/${slug}/keeper/disposals/${disposalId}/decision`,
    data,
  );
  return response.data;
};

/* ===== Keeper (warehouse secretary) returns ===== */

export type KeeperReturnStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "return_to_stock"
  | "damaged"
  | "picked_by_driver"
  | "return_to_warehouse"
  | "cancelled";

export interface KeeperReturnItem {
  id: number;
  quantity: number;
  product: { id: number; name: string; selling_price: string };
  unit_price: string;
  subtotal: string;
}

export interface KeeperReturn {
  id: number;
  status: KeeperReturnStatus;
  return_type: string;
  return_reason: string;
  order: {
    id: number;
    status: string;
    total_price: string;
    order_date: string;
    order_qr_code: string;
    customer: { id: number; full_name: string; phone_number: string };
  };
  warehouse: { id: number; warehouse_name: string };
  employee: { id: number; full_name: string | null } | null;
  items: KeeperReturnItem[];
  created_at: string;
}

export const fetchKeeperReturns = async (
  slug: string,
  status?: KeeperReturnStatus,
): Promise<{ returns: KeeperReturn[] }> => {
  const response = await api.get<{ returns: KeeperReturn[] }>(`/${slug}/keeper/returns`, {
    params: status ? { status } : undefined,
  });
  return response.data;
};

export const decideKeeperReturn = async (
  slug: string,
  returnId: number,
  data: { status: "approved" | "rejected"; reason?: string },
): Promise<{ message: string; return: KeeperReturn }> => {
  const response = await api.post<{ message: string; return: KeeperReturn }>(
    `/${slug}/keeper/returns/${returnId}/decision`,
    data,
  );
  return response.data;
};

export const processKeeperReturn = async (
  slug: string,
  returnId: number,
  data: { status: "return_to_stock" | "damaged" | "rejected"; worker_or_driver_id?: number },
): Promise<{ message: string; return: KeeperReturn }> => {
  const response = await api.post<{ message: string; return: KeeperReturn }>(
    `/${slug}/keeper/returns/${returnId}/process`,
    data,
  );
  return response.data;
};

export const createManagerEmployee = async (
  slug: string,
  warehouseId: number,
  data: { full_name: string; phone_number: string; user_name: string; role: string; salary: number; status?: string }
): Promise<{ message: string; employee: ManagerEmployee; worker?: ManagerEmployee; password?: string }> => {
  const response = await api.post<{ message: string; employee: ManagerEmployee; worker?: ManagerEmployee; password?: string }>(
    `/${slug}/manager/workers/${warehouseId}`,
    { ...data, status: data.status ?? "available" },
  );
  return {
    message: response.data.message,
    employee: response.data.employee ?? response.data.worker!,
    password: response.data.password,
  };
};

export const updateManagerEmployee = async (
  slug: string,
  warehouseId: number,
  employeeId: number,
  data: Partial<{ full_name: string; phone_number: string; user_name: string; role: string; salary: number; status: string }>
): Promise<{ message: string; employee: ManagerEmployee }> => {
  const response = await api.patch<{ message: string; employee: ManagerEmployee }>(`/${slug}/manager/workers/${warehouseId}/${employeeId}`, data);
  return { message: response.data.message, employee: response.data.employee };
};

export const deleteManagerEmployee = async (slug: string, warehouseId: number, employeeId: number): Promise<void> => {
  await api.delete(`/${slug}/manager/workers/${warehouseId}/${employeeId}`);
};

export const logoutManagerEmployee = async (slug: string, warehouseId: number, employeeId: number): Promise<void> => {
  await api.post(`/${slug}/manager/workers/${warehouseId}/${employeeId}/logout`);
};

/* ===== Workers (manager creates workers in their warehouse) ===== */

export interface ManagerWorkerInput {
  full_name: string;
  birthday?: string | null;
  phone_number: string;
  user_name: string;
  role: "manager" | "warehouse_secretary" | "staff" | "driver";
  status: "available" | "busy";
  salary: number;
}

export interface ManagerWorkerResponse {
  message: string;
  employee: ManagerEmployee;
  worker?: ManagerEmployee;
  password?: string | null;
}

export const createManagerWorker = async (
  slug: string,
  warehouseId: number,
  data: ManagerWorkerInput,
): Promise<ManagerWorkerResponse> => {
  const response = await api.post<ManagerWorkerResponse>(`/${slug}/manager/workers/${warehouseId}`, data);
  const body = response.data;
  return { ...body, employee: body.employee ?? body.worker! };
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

/* ===== Keeper (Supervisor) Tasks & Worker Roster ===== */

export interface KeeperTaskWorker {
  id: number;
  full_name: string;
  phone_number: string;
}

export interface KeeperTaskEmployee {
  id: number | null;
  full_name: string | null;
}

export interface KeeperTaskRelated {
  id: number;
  type?: string;
  label?: string;
  status?: string;
  total_price?: number;
}

export interface KeeperTask {
  id: number;
  status: "in_preparation" | "completed";
  task_type: string;
  worker: KeeperTaskWorker;
  employee: KeeperTaskEmployee | null;
  related_type: string | null;
  related_id: number | null;
  related: KeeperTaskRelated | null;
  created_at: string;
  updated_at: string;
}

export const fetchKeeperTasks = async (slug: string, params?: { status?: string; task_type?: string; worker_id?: number }): Promise<{ tasks: KeeperTask[] }> => {
  const response = await api.get<{ tasks: KeeperTask[] }>(`/${slug}/keeper/tasks`, { params });
  return response.data;
};

export const assignKeeperTask = async (slug: string, data: AssignTaskInput): Promise<{ message: string; task: KeeperTask }> => {
  const response = await api.post<{ message: string; task: KeeperTask }>(`/${slug}/keeper/tasks/assign`, data);
  return response.data;
};

export interface KeeperRosterSystemUser {
  id: number;
  full_name: string;
  phone_number: string | null;
}

export interface KeeperWorker {
  id: number;
  system_user_id: number;
  warehouse_id: number;
  role: "manager" | "warehouse_secretary" | "staff" | "driver";
  status: string;
  salary: string | number | null;
  system_user?: KeeperRosterSystemUser;
}

export const fetchKeeperWorkers = async (slug: string, warehouseId: number): Promise<{ employees: KeeperWorker[] }> => {
  const response = await api.get<{ employees: KeeperWorker[] }>(`/${slug}/keeper/workers/${warehouseId}`);
  return response.data;
};

/* ===== Inter-Warehouse Transfer Requests ===== */

export type TransferRequestStatus = "pending" | "accepted" | "fulfilled" | "rejected" | "cancelled";

export interface TransferRequestWarehouse {
  id: number;
  warehouse_name: string;
  type: string;
  location: string;
}

export interface TransferRequestItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
}

export interface TransferRequest {
  id: number;
  owner_id: number;
  warehouse_id: number;
  requested_by_name: string;
  requested_by_user_id: number;
  status: TransferRequestStatus;
  status_label: string;
  origin_warehouse: TransferRequestWarehouse;
  accepted_by_warehouse: TransferRequestWarehouse | null;
  items: TransferRequestItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateTransferRequestInput {
  items: { product_id: number; quantity: number }[];
  note?: string;
}

export interface TransferRequestListResponse {
  transfer_requests: TransferRequest[];
}

export interface TransferRequestResponse {
  message: string;
  transfer_request: TransferRequest;
}

export const fetchAvailableTransferRequests = async (slug: string): Promise<TransferRequestListResponse> => {
  const response = await api.get<TransferRequestListResponse>(`/${slug}/manager/transfer-requests/available`);
  return response.data;
};

export const fetchMyTransferRequests = async (slug: string): Promise<TransferRequestListResponse> => {
  const response = await api.get<TransferRequestListResponse>(`/${slug}/manager/transfer-requests/mine`);
  return response.data;
};

export const fetchKeeperTransferRequests = async (slug: string): Promise<TransferRequestListResponse> => {
  const response = await api.get<TransferRequestListResponse>(`/${slug}/keeper/transfer-requests`);
  return response.data;
};

export const createTransferRequest = async (slug: string, data: CreateTransferRequestInput): Promise<TransferRequestResponse> => {
  const response = await api.post<TransferRequestResponse>(`/${slug}/manager/transfer-requests`, data);
  return response.data;
};

export const acceptTransferRequest = async (slug: string, requestId: number): Promise<TransferRequestResponse> => {
  const response = await api.post<TransferRequestResponse>(`/${slug}/manager/transfer-requests/${requestId}/accept`);
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

/* ===== Driver GPS Tracking ===== */

export interface DriverLivePosition {
  driver_id: number;
  latitude: number;
  longitude: number;
  speed: number;
  updated_at: string | null;
}

export interface DriverEta {
  total_seconds: number;
  total_minutes: number;
  hours: number;
  minutes: number;
}

export interface DriverDestination {
  current: DriverLivePosition;
  distance_km: number;
  eta: DriverEta | null;
}

export interface DriverTrackingResponse {
  location: DriverLivePosition;
  destination: DriverDestination | null;
}

export interface DriverRouteWaypoint {
  latitude: number;
  longitude: number;
  recorded_at: string;
}

export interface DriverRouteResponse {
  driver_id: number;
  waypoints: DriverRouteWaypoint[];
}

export const fetchDriverTracking = async (
  slug: string,
  driverId: number,
  destination?: { latitude: number; longitude: number; shipment_id?: number },
): Promise<DriverTrackingResponse> => {
  const response = await api.get<DriverTrackingResponse>(`/${slug}/drivers/${driverId}/tracking`, {
    params: destination
      ? {
          latitude: destination.latitude,
          longitude: destination.longitude,
          ...(destination.shipment_id ? { shipment_id: destination.shipment_id } : {}),
        }
      : undefined,
  });
  return response.data;
};

export const fetchDriverRoute = async (
  slug: string,
  driverId: number,
  limit = 100,
): Promise<DriverRouteResponse> => {
  const response = await api.get<DriverRouteResponse>(`/${slug}/drivers/${driverId}/route`, {
    params: { limit },
  });
  return response.data;
};
