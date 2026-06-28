export type WarehouseType = {
  id: string;
  name: string;
  description: string;
  color: string; // hex
  icon: string; // lucide icon name
  status: "active" | "inactive";
};

export type Manager = {
  id: string;
  whmId: string;             // WHM-XXX
  name: string;              // also serves as username
  age: number;
  password: string;
  warehouseId: string;
  status: "active" | "inactive";
  lastPasswordChange: string;
  isTempPassword: boolean;
  // legacy / optional
  email?: string;
  phone?: string;
  joinDate?: string;
  role?: "Manager" | "Supervisor" | "Lead";
};

export function generateWhmId(existing: { whmId: string }[] = []): string {
  const used = new Set(existing.map((m) => m.whmId));
  let n = existing.length + 1;
  while (used.has(`WHM-${String(n).padStart(3, "0")}`)) n++;
  return `WHM-${String(n).padStart(3, "0")}`;
}

export const initialWarehouseTypes: WarehouseType[] = [
  { id: "w1", name: "Cold Storage", description: "Temperature-controlled units for perishables", color: "#38BDF8", icon: "Snowflake", status: "active" },
  { id: "w2", name: "Dry Storage", description: "Standard ambient storage for general goods", color: "#A7B3C3", icon: "Package", status: "active" },
  { id: "w3", name: "Hazardous", description: "Certified storage for hazardous materials", color: "#F59E0B", icon: "Flame", status: "active" },
  { id: "w4", name: "Fulfillment Center", description: "High-throughput pick & pack operations", color: "#10B981", icon: "Truck", status: "active" },
];

export const initialManagers: Manager[] = [
  { id: "m1", whmId: "WHM-001", name: "Ahmed Mansour", age: 34, password: "temp123", warehouseId: "w1", status: "active", isTempPassword: true,  lastPasswordChange: "2026-04-02", role: "Manager", email: "ahmed@acme.io" },
  { id: "m2", whmId: "WHM-002", name: "Sara Khalil",   age: 29, password: "temp123", warehouseId: "w2", status: "active", isTempPassword: true,  lastPasswordChange: "2026-04-12", role: "Manager", email: "sara@northwind.io" },
  { id: "m3", whmId: "WHM-003", name: "Omar Haddad",   age: 42, password: "temp123", warehouseId: "w4", status: "active", isTempPassword: true,  lastPasswordChange: "2026-04-21", role: "Manager", email: "omar@fulfill.io" },
  { id: "m4", whmId: "WHM-004", name: "Ahmed",         age: 31, password: "manager123", warehouseId: "w1", status: "active", isTempPassword: false, lastPasswordChange: "2026-05-01", role: "Manager", email: "ahmed@warehouse.io" },
  { id: "m5", whmId: "WHM-005", name: "JohnSmith",     age: 38, password: "manager123", warehouseId: "w3", status: "active", isTempPassword: false, lastPasswordChange: "2026-05-04", role: "Manager", email: "john@northwind.io" },
  { id: "m6", whmId: "WHM-006", name: "Hana Suzuki",   age: 27, password: "manager123", warehouseId: "w2", status: "inactive", isTempPassword: false, lastPasswordChange: "2026-03-10", role: "Manager", email: "hana@acme.io" },
];

export const inventoryTrend = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  inventory: 4200 + Math.round(Math.sin(i / 3) * 600 + i * 18 + Math.random() * 200),
}));

export const shipmentsData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  incoming: 200 + Math.round(Math.random() * 180),
  outgoing: 180 + Math.round(Math.random() * 220),
}));

export const recentActivity = [
  { id: 1, text: "Shipment #SH-3421 dispatched to Berlin DC", time: "2m ago" },
  { id: 2, text: "Manager Amelia approved restock for SKU-8821", time: "18m ago" },
  { id: 3, text: "Cold Storage humidity threshold normalized", time: "1h ago" },
  { id: 4, text: "Wallet top-up of $4,200 completed", time: "3h ago" },
  { id: 5, text: "New PO #PO-9821 received from Acme Co.", time: "5h ago" },
];

export const walletTransactions = [
  { id: "t1", date: "2026-05-10", description: "Top up — Visa •• 4242", amount: 4200, type: "credit" as const },
  { id: "t2", date: "2026-05-09", description: "Carrier payout — DHL", amount: -1280, type: "debit" as const },
  { id: "t3", date: "2026-05-07", description: "Subscription — Pro plan", amount: -149, type: "debit" as const },
  { id: "t4", date: "2026-05-04", description: "Customer settlement #INV-2231", amount: 2890, type: "credit" as const },
  { id: "t5", date: "2026-05-02", description: "Carrier payout — FedEx", amount: -940, type: "debit" as const },
];
