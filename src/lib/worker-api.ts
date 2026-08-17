import { api } from "@/lib/api";

/* ===== Worker (Staff / Driver) API client =====
 * These endpoints are bearer-token authenticated (workers-token) and live
 * under /api/workers/*. Call setWorkerToken() after a successful login.
 */

let workerToken: string | null = null;

export const setWorkerToken = (token: string | null): void => {
  workerToken = token;
};

export const getWorkerToken = (): string | null => workerToken;

function authHeaders(): Record<string, string> {
  return workerToken ? { Authorization: `Bearer ${workerToken}` } : {};
}

/* ===== Auth ===== */

export interface WorkerSystemUser {
  id: number;
  full_name: string;
  user_name: string;
  phone_number: string;
}

export interface WorkerProfile {
  id: number;
  role: "staff" | "driver";
  status: string;
  salary: string | number;
  warehouse_id: number | null;
  owner_id: number | null;
  system_user: WorkerSystemUser;
}

export interface WorkerLoginResponse {
  message: string;
  token: string;
  worker: WorkerProfile;
  must_change_password: boolean;
}

export const loginWorker = async (user_name: string, password: string): Promise<WorkerLoginResponse> => {
  const response = await api.post<WorkerLoginResponse>("/api/workers/login", { user_name, password });
  return response.data;
};

export const logoutWorker = async (): Promise<void> => {
  await api.post("/api/workers/logout", null, { headers: authHeaders() });
};

export const sendWorkerLoginOtp = async (phone_number: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>("/api/workers/login/otp", { phone_number });
  return response.data;
};

export const verifyWorkerLoginOtp = async (phone_number: string, code: string): Promise<WorkerLoginResponse> => {
  const response = await api.post<WorkerLoginResponse>("/api/workers/login/otp/verify", { phone_number, code });
  return response.data;
};

/* ===== Profile ===== */

export interface WorkerFullProfile {
  full_name: string;
  birthday: string | null;
  phone_number: string;
  user_name: string;
  profile_image: string | null;
  role: string | null;
  warehouse_id: number | null;
}

export const fetchWorkerProfile = async (): Promise<WorkerFullProfile> => {
  const response = await api.get<WorkerFullProfile>("/api/workers/profile", { headers: authHeaders() });
  return response.data;
};

export const updateWorkerProfile = async (
  data: Partial<{ full_name: string; birthday: string | null; phone_number: string }>,
): Promise<{ message: string; profile: WorkerFullProfile }> => {
  const response = await api.patch<{ message: string; profile: WorkerFullProfile }>("/api/workers/profile", data, {
    headers: authHeaders(),
  });
  return response.data;
};

export const changeWorkerPassword = async (
  password: string,
  password_confirmation: string,
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(
    "/api/workers/password/change",
    { password, password_confirmation },
    { headers: authHeaders() },
  );
  return response.data;
};

/* ===== GPS / Location ===== */

export interface WorkerLocationUpdateResponse {
  message: string;
  location: {
    id: number;
    employee_id: number;
    latitude: number;
    longitude: number;
    recorded_at: string;
  };
}

export const updateWorkerLocation = async (
  latitude: number,
  longitude: number,
): Promise<WorkerLocationUpdateResponse> => {
  const response = await api.post<WorkerLocationUpdateResponse>(
    "/api/workers/location",
    { latitude, longitude },
    { headers: authHeaders() },
  );
  return response.data;
};

export interface DriverTrackingPushResponse {
  message: string;
  data: {
    shipment_id: number;
    driver_id: number;
    latitude: number;
    longitude: number;
    speed: number;
    updated_at: string;
  };
}

export const pushDriverTrackingLocation = async (
  data: {
    shipment_id: number;
    driver_id: number;
    latitude: number;
    longitude: number;
    speed: number;
  },
): Promise<DriverTrackingPushResponse> => {
  const response = await api.post<DriverTrackingPushResponse>("/api/workers/tracking/location", data, {
    headers: authHeaders(),
  });
  return response.data;
};

/* ===== Tasks ===== */

export interface WorkerTaskItem {
  id: number;
  task_type: string;
  status: string;
  related_type: string | null;
  related_id: number | null;
  created_at: string;
}

export interface WorkerTasksResponse {
  category: string | null;
  status: string | null;
  task_type: string | null;
  in_preparation: WorkerTaskItem[];
  completed: WorkerTaskItem[];
}

export const fetchWorkerTasks = async (params?: {
  category?: string;
  status?: string;
  task_type?: string;
}): Promise<WorkerTasksResponse> => {
  const response = await api.get<WorkerTasksResponse>("/api/workers/tasks", {
    params,
    headers: authHeaders(),
  });
  return response.data;
};

export const fetchWorkerTasksSummary = async (): Promise<Record<string, unknown>> => {
  const response = await api.get<Record<string, unknown>>("/api/workers/tasks/summary", { headers: authHeaders() });
  return response.data;
};
