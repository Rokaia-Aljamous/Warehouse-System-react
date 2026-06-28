import axios from "axios";

export const api = axios.create({
  baseURL: "",
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

export const getCsrfCookie = async () => {
  await api.get("/sanctum/csrf-cookie");
};

/* ===== Types ===== */

export interface SubscriptionPlan {
  id: number;
  name: string;
  duration_days: number;
  price_per_warehouse: string;
  is_active: boolean;
}

export interface TenantResource {
  id: number;
  user_id: number;
  subscription_plan_id: number;
  company_name: string;
  warehouses_count: number;
  url_slug: string;
  status: string;
  subscription_start_date: string;
  subscription_end_date: string;
  subscription_plan: SubscriptionPlan;
}

export interface CheckSlugResponse {
  available: boolean;
  message: string;
}

export interface PayPalOrderResponse {
  message: string;
  paypal_order_id: string;
  approval_url: string;
  amount: string;
  currency: string;
}

export interface CompleteOrderResponse {
  message: string;
  payment_status: string;
  tenant: TenantResource;
}

export interface CancelOrderResponse {
  message: string;
}

export interface OwnerData {
  full_name: string;
  birthday?: string;
  phone_number: string;
  user_name: string;
  password: string;
  password_confirmation: string;
}

export interface OwnerResource {
  id: number;
  tenant_id: number;
  system_user_id: number;
  system_user: {
    id: number;
    full_name: string;
    user_name: string;
    phone_number: string;
    email?: string;
  };
  tenant: TenantResource;
}

export interface OwnerSetupResponse {
  message: string;
  owner: OwnerResource;
}

/* ===== Subscription Plans ===== */

export const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get<{ data: SubscriptionPlan[] }>("/subscription-plans");
  return response.data.data;
};

/* ===== Slug Check ===== */

export const checkSlug = async (url_slug: string): Promise<CheckSlugResponse> => {
  const response = await api.post<CheckSlugResponse>("/tenants/check-slug", { url_slug });
  return response.data;
};

/* ===== PayPal Checkout ===== */

export interface CreateOrderData {
  subscription_plan_id: number;
  company_name: string;
  warehouses_count: number;
  url_slug: string;
}

export const createPayPalOrder = async (data: CreateOrderData): Promise<PayPalOrderResponse> => {
  const response = await api.post<PayPalOrderResponse>("/checkout/paypal/create-order", data);
  return response.data;
};

export const completePayPalOrder = async (token: string): Promise<CompleteOrderResponse> => {
  const response = await api.get<CompleteOrderResponse>("/checkout/paypal/success", {
    params: { token },
  });
  return response.data;
};

export const cancelPayPalOrder = async (): Promise<CancelOrderResponse> => {
  const response = await api.get<CancelOrderResponse>("/checkout/paypal/cancel");
  return response.data;
};

/* ===== Tenant Owner Setup ===== */

export const setupTenantOwner = async (data: OwnerData): Promise<OwnerSetupResponse> => {
  const formData = new FormData();
  formData.append("full_name", data.full_name);
  formData.append("phone_number", data.phone_number);
  formData.append("user_name", data.user_name);
  formData.append("password", data.password);
  formData.append("password_confirmation", data.password_confirmation);
  if (data.birthday) formData.append("birthday", data.birthday);

  const response = await api.post<OwnerSetupResponse>("/tenant/owner/setup", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/* ===== Email Verification ===== */

export const resendVerificationEmail = async (): Promise<void> => {
  await getCsrfCookie();
  await api.post("/email/verification-notification");
};

/* ===== User Helpers ===== */

export interface UserResource {
  id: number;
  full_name: string;
  email: string;
  birthday: string | null;
  email_verified_at: string | null;
  tenant: TenantResource | null;
}

const USER_KEY = "stockyard.user";

export const getStoredUser = (): UserResource | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: UserResource) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem(USER_KEY);
};