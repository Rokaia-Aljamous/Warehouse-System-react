import { api } from "@/lib/api";

export interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  notification_type: string | null;
  reference_id: number | string | null;
  group_id: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationListResponse {
  data: DashboardNotification[];
  total: number;
}

export const fetchUnreadNotificationCount = async (slug: string): Promise<number> => {
  const response = await api.get<{ unread_count: number }>(`/${slug}/notifications/unread-count`);
  return response.data.unread_count;
};

export const fetchNotifications = async (slug: string): Promise<DashboardNotification[]> => {
  const response = await api.get<NotificationListResponse>(`/${slug}/notifications`, {
    params: { per_page: 20 },
  });
  return response.data.data;
};

export const markNotificationAsRead = async (slug: string, id: number): Promise<void> => {
  await api.post(`/${slug}/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (slug: string): Promise<void> => {
  await api.post(`/${slug}/notifications/read-all`);
};

export const deleteNotification = async (slug: string, id: number): Promise<void> => {
  await api.delete(`/${slug}/notifications/${id}`);
};
