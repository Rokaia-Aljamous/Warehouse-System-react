// LocalStorage-backed subscription requests (demo)
export type SubscriptionStatus = "pending" | "approved" | "active" | "rejected";

export interface SubscriptionRequest {
  id: string;
  companyName: string;
  warehouses: number;
  slok: string;
  fullName: string;
  email: string;
  paymentMethod: string;
  status: SubscriptionStatus;
  requestDate: string; // YYYY-MM-DD
}

const KEY = "stockyard.subscriptions";

function read(): SubscriptionRequest[] {
  if (typeof window === "undefined") return seed();
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const seeded = seed();
    localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  }
  try { return JSON.parse(raw) as SubscriptionRequest[]; } catch { return seed(); }
}

function write(items: SubscriptionRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("stockyard:subs"));
}

function seed(): SubscriptionRequest[] {
  return [
    {
      id: "SUB-1001", companyName: "Acme Logistics", warehouses: 3, slok: "acme",
      fullName: "Ahmed Mansour", email: "ahmed@acme.io", paymentMethod: "Credit Card",
      status: "active", requestDate: "2026-04-12",
    },
    {
      id: "SUB-1002", companyName: "Northwind Co", warehouses: 8, slok: "northwind",
      fullName: "Sara Khalil", email: "sara@northwind.io", paymentMethod: "Bank Transfer",
      status: "pending", requestDate: "2026-05-08",
    },
  ];
}

export const subscriptionStore = {
  list: read,
  add(req: Omit<SubscriptionRequest, "id" | "status" | "requestDate">) {
    const items = read();
    const created: SubscriptionRequest = {
      ...req,
      id: `SUB-${1000 + items.length + 1}`,
      status: "pending",
      requestDate: new Date().toISOString().slice(0, 10),
    };
    write([created, ...items]);
    return created;
  },
  update(id: string, status: SubscriptionStatus) {
    const items = read().map((s) => (s.id === id ? { ...s, status } : s));
    write(items);
  },
  subscribe(cb: () => void) {
    if (typeof window === "undefined") return () => {};
    const h = () => cb();
    window.addEventListener("stockyard:subs", h);
    return () => window.removeEventListener("stockyard:subs", h);
  },
};
