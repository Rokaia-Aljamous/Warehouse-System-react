import { api } from "@/lib/api";

/* ===== Biometric devices ===== */

export interface BiometricWarehouse {
  id: number;
  warehouse_name: string;
}

export interface BiometricDeviceRef {
  id: number;
  device_code: string;
  name: string;
}

export interface BiometricDevice {
  id: number;
  device_code: string;
  name: string;
  device_model: string | null;
  current_warehouse_id: number | null;
  current_warehouse: BiometricWarehouse | null;
  template_capacity: number;
  status: string;
  last_seen_at: string | null;
}

export interface BiometricDevicesResponse {
  warehouse: BiometricWarehouse;
  devices: BiometricDevice[];
}

export const fetchBiometricDevices = async (
  slug: string,
  warehouseId: number,
): Promise<BiometricDevicesResponse> => {
  const response = await api.get<BiometricDevicesResponse>(
    `/${slug}/warehouses/${warehouseId}/biometric-devices`,
  );
  return response.data;
};

export interface AssignBiometricDeviceInput {
  device_code: string;
  name: string;
  device_model?: string;
  template_capacity?: number;
  status?: "active" | "inactive";
}

export const assignBiometricDevice = async (
  slug: string,
  warehouseId: number,
  data: AssignBiometricDeviceInput,
): Promise<{ message: string; device: BiometricDevice }> => {
  const response = await api.post<{ message: string; device: BiometricDevice }>(
    `/${slug}/warehouses/${warehouseId}/biometric-devices`,
    data,
  );
  return response.data;
};

/* ===== Employee biometrics ===== */

export interface BiometricSystemUser {
  id: number | null;
  full_name: string | null;
  user_name: string | null;
  phone_number: string | null;
}

export interface BiometricEmployee {
  id: number;
  role: string;
  status: string;
  system_user: BiometricSystemUser;
}

export type EnrollmentRequestStatus =
  | "pending"
  | "processing"
  | "awaiting_confirmation"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export interface BiometricEnrollmentRequest {
  id: number;
  employee_id: number;
  warehouse_id: number;
  device_id: number;
  fingerprint_template_id: number;
  status: EnrollmentRequestStatus;
  error_message: string | null;
  note: string | null;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  expires_in_seconds: number | null;
  employee: BiometricEmployee | null;
  device: BiometricDeviceRef | null;
}

export interface EmployeeBiometric {
  id: number;
  fingerprint_template_id: number;
  status: string;
  enrolled_at: string | null;
  revoked_at: string | null;
  employee: BiometricEmployee | null;
  device: BiometricDeviceRef | null;
}

export interface EmployeeBiometricShow {
  employee: BiometricEmployee;
  active_biometrics: EmployeeBiometric[];
  recent_enrollment_requests: BiometricEnrollmentRequest[];
}

export interface EnrollRequestInput {
  device_code: string;
  note?: string;
  role?: "staff" | "driver";
}

export const fetchEmployeeBiometric = async (
  slug: string,
  warehouseId: number,
  employeeId: number,
): Promise<EmployeeBiometricShow> => {
  const response = await api.get<EmployeeBiometricShow>(
    `/${slug}/warehouses/${warehouseId}/employees/${employeeId}/biometric`,
  );
  return response.data;
};

export const createEnrollmentRequest = async (
  slug: string,
  warehouseId: number,
  employeeId: number,
  data: EnrollRequestInput,
): Promise<{ message: string; enrollment_request: BiometricEnrollmentRequest }> => {
  const response = await api.post<{
    message: string;
    enrollment_request: BiometricEnrollmentRequest;
  }>(`/${slug}/warehouses/${warehouseId}/employees/${employeeId}/biometric/enroll-request`, data);
  return response.data;
};

export const confirmEnrollmentRequest = async (
  slug: string,
  warehouseId: number,
  employeeId: number,
  requestId: number,
  role?: "staff" | "driver",
): Promise<{ message: string; biometric: EmployeeBiometric }> => {
  const response = await api.post<{ message: string; biometric: EmployeeBiometric }>(
    `/${slug}/warehouses/${warehouseId}/employees/${employeeId}/biometric/enroll-requests/${requestId}/confirm`,
    role ? { role } : undefined,
  );
  return response.data;
};

export const cancelEnrollmentRequest = async (
  slug: string,
  warehouseId: number,
  employeeId: number,
  requestId: number,
  role?: "staff" | "driver",
): Promise<{ message: string; enrollment_request: BiometricEnrollmentRequest }> => {
  const response = await api.post<{
    message: string;
    enrollment_request: BiometricEnrollmentRequest;
  }>(
    `/${slug}/warehouses/${warehouseId}/employees/${employeeId}/biometric/enroll-requests/${requestId}/cancel`,
    role ? { role } : undefined,
  );
  return response.data;
};

export const revokeEmployeeBiometric = async (
  slug: string,
  warehouseId: number,
  employeeId: number,
): Promise<{ message: string; biometric: EmployeeBiometric }> => {
  const response = await api.delete<{ message: string; biometric: EmployeeBiometric }>(
    `/${slug}/warehouses/${warehouseId}/employees/${employeeId}/biometric`,
  );
  return response.data;
};

/* ===== Attendance ===== */

export interface AttendanceSchedule {
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
  grace_minutes: number | null;
}

export interface AttendanceRecord {
  id: number;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_local_at: string | null;
  check_out_local_at: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  timezone: string;
  check_in_status: string | null;
  check_out_status: string | null;
  status: string;
  check_in_source: string | null;
  check_out_source: string | null;
  device: BiometricDeviceRef | null;
}

export interface AttendanceDayRow {
  date: string;
  day_of_week: string;
  schedule: AttendanceSchedule | null;
  attendance: AttendanceRecord | null;
  day_status: string;
}

export interface AttendanceEmployeeRow {
  employee: BiometricEmployee;
  attendance: AttendanceDayRow[];
}

export interface AttendanceIndexResponse {
  warehouse: BiometricWarehouse;
  range: { from: string; to: string; timezone: string };
  employees: AttendanceEmployeeRow[];
}

export interface AttendanceParams {
  from?: string;
  to?: string;
  role?: "staff" | "driver";
  employee_id?: number;
}

export const fetchWarehouseAttendance = async (
  slug: string,
  warehouseId: number,
  params?: AttendanceParams,
): Promise<AttendanceIndexResponse> => {
  const response = await api.get<AttendanceIndexResponse>(
    `/${slug}/warehouses/${warehouseId}/attendance`,
    { params },
  );
  return response.data;
};

export interface AttendanceDetailResponse {
  warehouse: BiometricWarehouse;
  employee: BiometricEmployee;
  range: { from: string; to: string; timezone: string };
  attendance: AttendanceDayRow[];
}

export const fetchEmployeeAttendanceDetail = async (
  slug: string,
  warehouseId: number,
  employeeId: number,
  params?: { from?: string; to?: string },
): Promise<AttendanceDetailResponse> => {
  const response = await api.get<AttendanceDetailResponse>(
    `/${slug}/warehouses/${warehouseId}/employees/${employeeId}/attendance`,
    { params },
  );
  return response.data;
};
