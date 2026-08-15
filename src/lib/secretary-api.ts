import { api } from "@/lib/api";

/* ===== Secretary (warehouse_secretary) ===== */

export interface SecretaryOrderCustomer {
  id: number;
  full_name: string;
  phone_number: string;
}

export interface SecretaryOrderWarehouse {
  id: number;
  warehouse_name: string;
}

export interface SecretaryOrderItem {
  id: number;
  product: { id: number; name: string; selling_price: number };
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface SecretaryOrder {
  id: number;
  customer: SecretaryOrderCustomer;
  warehouse: SecretaryOrderWarehouse;
  status: string;
  total_price: string;
  order_date: string;
  customer_location: string;
  order_qr_code: string;
  items_count: number;
  items?: SecretaryOrderItem[];
}

export interface SecretaryOrderListResponse {
  orders: SecretaryOrder[];
}

export const fetchSecretaryOrders = async (slug: string): Promise<SecretaryOrderListResponse> => {
  const response = await api.get<SecretaryOrderListResponse>(`/${slug}/secretary/orders`);
  return response.data;
};

export interface SecretaryTaskRelated {
  id: number;
  status?: string;
  total_price?: number;
  type?: string;
  label?: string;
}

export interface SecretaryTask {
  id: number;
  status: string;
  task_type: string;
  worker: { id: number; full_name: string; phone_number: string };
  superadmin: { id: number; full_name: string };
  related_type: string | null;
  related_id: number | null;
  related: SecretaryTaskRelated | null;
  created_at: string;
  updated_at: string;
}

export interface SecretaryTaskListResponse {
  tasks: SecretaryTask[];
}

export interface SecretaryTaskResponse {
  task: SecretaryTask;
}

export const fetchSecretaryTasks = async (slug: string, params?: { status?: string; task_type?: string; worker_id?: number }): Promise<SecretaryTaskListResponse> => {
  const response = await api.get<SecretaryTaskListResponse>(`/${slug}/secretary/tasks`, { params });
  return response.data;
};

export const showSecretaryTask = async (slug: string, taskId: number): Promise<SecretaryTaskResponse> => {
  const response = await api.get<SecretaryTaskResponse>(`/${slug}/secretary/tasks/${taskId}`);
  return response.data;
};

export interface SecretaryReturnItem {
  id: number;
  quantity: number;
  product: { id: number; name: string; selling_price: number };
  unit_price: string;
  subtotal: string;
}

export interface SecretaryReturn {
  id: number;
  status: string;
  return_type: string;
  return_reason: string;
  order: {
    id: number;
    status: string;
    total_price: string;
    order_date: string;
    order_qr_code: string;
    customer: SecretaryOrderCustomer;
  };
  warehouse: SecretaryOrderWarehouse;
  superadmin: { id: number; full_name: string };
  items: SecretaryReturnItem[];
  created_at: string;
}

export interface SecretaryReturnListResponse {
  returns: SecretaryReturn[];
}

export const fetchSecretaryReturns = async (slug: string, params?: { status?: string }): Promise<SecretaryReturnListResponse> => {
  const response = await api.get<SecretaryReturnListResponse>(`/${slug}/secretary/returns`, { params });
  return response.data;
};
