export type WorkerStatus = "active" | "pending" | "suspended";
export type WorkerSection = "Receiving" | "Picking" | "Packing" | "Shipping";

export type Worker = {
  id: string;
  workerId: string;
  name: string;
  email: string;
  phone: string;
  section: WorkerSection;
  status: WorkerStatus;
  lastActive: string;
  ordersProcessed: number;
  avgHandlingMin: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  location: string;
  unitPrice: number;
};

export type StockMovement = {
  id: string;
  date: string;
  sku: string;
  type: "incoming" | "outgoing";
  qty: number;
  reference: string;
};

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
export type Order = {
  id: string;
  customer: string;
  items: number;
  qty: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  assignedTo?: string;
};

export type TransferStatus = "Pending Approval" | "Approved" | "In Transit" | "Received" | "Rejected";
export type Transfer = {
  id: string;
  direction: "outgoing" | "incoming";
  fromWarehouse: string;
  toWarehouse: string;
  product: string;
  qty: number;
  priority: "High" | "Medium" | "Low";
  status: TransferStatus;
  createdAt: string;
  notes?: string;
};

export const CURRENT_WAREHOUSE = {
  id: "w1",
  name: "Cold Storage Warehouse A",
  type: "Cold Storage",
};

export const ALL_WAREHOUSES = [
  { id: "w1", name: "Cold Storage Warehouse A" },
  { id: "w2", name: "Dry Storage Hub B" },
  { id: "w3", name: "Hazardous Facility C" },
  { id: "w4", name: "Fulfillment Center D" },
  { id: "w5", name: "Regional Depot E" },
];

export const initialWorkers: Worker[] = [
  { id: "1", workerId: "WRK-1042", name: "Marco Hill", email: "marco@stockyard.io", phone: "+1 415 555 1042", section: "Receiving", status: "active", lastActive: "2m ago", ordersProcessed: 142, avgHandlingMin: 6.2 },
  { id: "2", workerId: "WRK-1043", name: "Yuki Tanaka", email: "yuki@stockyard.io", phone: "+1 415 555 1043", section: "Picking", status: "active", lastActive: "11m ago", ordersProcessed: 198, avgHandlingMin: 4.8 },
  { id: "3", workerId: "WRK-1044", name: "Aisha Khan", email: "aisha@stockyard.io", phone: "+1 415 555 1044", section: "Packing", status: "active", lastActive: "1h ago", ordersProcessed: 176, avgHandlingMin: 5.4 },
  { id: "4", workerId: "WRK-1045", name: "Jonas Weber", email: "jonas@stockyard.io", phone: "+1 415 555 1045", section: "Shipping", status: "pending", lastActive: "—", ordersProcessed: 0, avgHandlingMin: 0 },
  { id: "5", workerId: "WRK-1046", name: "Lara Costa", email: "lara@stockyard.io", phone: "+1 415 555 1046", section: "Picking", status: "suspended", lastActive: "3d ago", ordersProcessed: 88, avgHandlingMin: 7.1 },
  { id: "6", workerId: "WRK-1047", name: "Omar Idris", email: "omar@stockyard.io", phone: "+1 415 555 1047", section: "Receiving", status: "active", lastActive: "23m ago", ordersProcessed: 121, avgHandlingMin: 5.9 },
];

export const initialProducts: Product[] = [
  { id: "p1", name: "Frozen Salmon Fillet", sku: "CS-SAL-001", quantity: 240, reorderLevel: 80, location: "A-12", unitPrice: 18.5 },
  { id: "p2", name: "Vacuum Beef Tenderloin", sku: "CS-BEF-014", quantity: 64, reorderLevel: 70, location: "A-14", unitPrice: 32 },
  { id: "p3", name: "Organic Blueberries 1kg", sku: "CS-BER-220", quantity: 410, reorderLevel: 120, location: "B-03", unitPrice: 9.4 },
  { id: "p4", name: "Greek Yogurt Tubs", sku: "CS-YOG-088", quantity: 28, reorderLevel: 60, location: "B-07", unitPrice: 4.2 },
  { id: "p5", name: "Ice Cream Vanilla 5L", sku: "CS-ICE-451", quantity: 180, reorderLevel: 90, location: "C-01", unitPrice: 22 },
  { id: "p6", name: "Frozen Pizza Margherita", sku: "CS-PZA-330", quantity: 92, reorderLevel: 100, location: "C-09", unitPrice: 6.8 },
];

export const initialMovements: StockMovement[] = [
  { id: "m1", date: "2026-05-12", sku: "CS-SAL-001", type: "incoming", qty: 60, reference: "PO-9821" },
  { id: "m2", date: "2026-05-12", sku: "CS-BEF-014", type: "outgoing", qty: 24, reference: "ORD-3421" },
  { id: "m3", date: "2026-05-11", sku: "CS-BER-220", type: "incoming", qty: 120, reference: "PO-9820" },
  { id: "m4", date: "2026-05-11", sku: "CS-YOG-088", type: "outgoing", qty: 40, reference: "ORD-3418" },
  { id: "m5", date: "2026-05-10", sku: "CS-ICE-451", type: "incoming", qty: 80, reference: "PO-9818" },
];

export const initialOrders: Order[] = [
  { id: "ORD-3421", customer: "BlueMart Foods", items: 4, qty: 64, total: 2890, status: "Processing", createdAt: "2026-05-12", assignedTo: "WRK-1043" },
  { id: "ORD-3422", customer: "Acme Restaurants", items: 2, qty: 30, total: 1240, status: "Pending", createdAt: "2026-05-12" },
  { id: "ORD-3418", customer: "Fresh & Co.", items: 6, qty: 88, total: 3210, status: "Shipped", createdAt: "2026-05-11", assignedTo: "WRK-1044" },
  { id: "ORD-3415", customer: "Polar Hotels", items: 3, qty: 42, total: 1980, status: "Delivered", createdAt: "2026-05-10", assignedTo: "WRK-1042" },
  { id: "ORD-3411", customer: "GreenLeaf Stores", items: 1, qty: 12, total: 410, status: "Cancelled", createdAt: "2026-05-09" },
  { id: "ORD-3424", customer: "Nordic Bistro", items: 5, qty: 70, total: 2540, status: "Pending", createdAt: "2026-05-13" },
];

export const initialTransfers: Transfer[] = [
  { id: "TR-201", direction: "outgoing", fromWarehouse: "Cold Storage Warehouse A", toWarehouse: "Fulfillment Center D", product: "Frozen Salmon Fillet", qty: 200, priority: "High", status: "In Transit", createdAt: "2026-05-12" },
  { id: "TR-202", direction: "outgoing", fromWarehouse: "Cold Storage Warehouse A", toWarehouse: "Regional Depot E", product: "Ice Cream Vanilla 5L", qty: 120, priority: "Medium", status: "Pending Approval", createdAt: "2026-05-13" },
  { id: "TR-198", direction: "incoming", fromWarehouse: "Dry Storage Hub B", toWarehouse: "Cold Storage Warehouse A", product: "Cardboard Inserts", qty: 800, priority: "Low", status: "Pending Approval", createdAt: "2026-05-13" },
  { id: "TR-195", direction: "incoming", fromWarehouse: "Fulfillment Center D", toWarehouse: "Cold Storage Warehouse A", product: "Insulation Panels", qty: 50, priority: "Medium", status: "Approved", createdAt: "2026-05-11" },
];

export const dailyVolume = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  incoming: 120 + Math.round(Math.sin(i / 2) * 40 + Math.random() * 60),
  outgoing: 100 + Math.round(Math.cos(i / 2) * 30 + Math.random() * 70),
}));

export const monthlyVolume = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m) => ({
  month: m,
  incoming: 1800 + Math.round(Math.random() * 800),
  outgoing: 1700 + Math.round(Math.random() * 900),
}));

export const peakHours = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h}:00`,
  activity: Math.max(2, Math.round(40 * Math.exp(-Math.pow((h - 13) / 4, 2)) + Math.random() * 8)),
}));

export const attendanceTrend = Array.from({ length: 7 }, (_, i) => ({
  day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
  active: 14 + Math.round(Math.random() * 6),
  scheduled: 22,
}));

export function generateWorkerId() {
  return `WRK-${Math.floor(1000 + Math.random() * 8999)}`;
}
