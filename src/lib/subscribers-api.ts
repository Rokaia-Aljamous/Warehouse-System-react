import { api } from "@/lib/api";

export interface BackendSubscriber {
  id: number;
  full_name: string;
  email: string;
  tenant: {
    company_name: string;
    warehouses_count: number;
    url_slug: string;
    status: string;
    subscription_start_date: string | null;
    subscription_end_date: string | null;
  } | null;
}

export const fetchSubscribers = async (): Promise<BackendSubscriber[]> => {
  const response = await api.get<{ data: BackendSubscriber[] }>("/platform-admin/subscribed-users");
  return response.data.data;
};
