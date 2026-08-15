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

export function generateWorkerId() {
  return `WRK-${Math.floor(1000 + Math.random() * 8999)}`;
}
