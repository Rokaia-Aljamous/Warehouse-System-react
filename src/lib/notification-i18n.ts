import type { DashboardNotification } from "@/lib/notifications-api";

/**
 * The backend stores notification text in the `data.i18n` block on each
 * notification row. It carries the original translation *key* (an English
 * sentence or a legacy `notifications.*` key) plus the interpolation `params`.
 *
 * The API serializes these in the backend's default language, so we re-resolve
 * the same keys through the frontend i18next resources so notification text
 * follows the UI language — without touching the API.
 *
 * Backend placeholders use Laravel's `:name` syntax; i18next uses `{{name}}`.
 * Each backend key is mapped to a stable `notification.*` frontend key in the
 * maps below. Dynamic `:action` / `:status` values are resolved at runtime and
 * translated through their own small maps.
 */

type Translate = (key: string, options?: Record<string, unknown>) => string;

type I18nBlock = {
  title?: string;
  message?: string;
  params?: Record<string, unknown>;
};

const TITLE_KEYS: Record<string, string> = {
  "Shipment Accepted": "notification.shipment_accepted.title",
  "Shipment Delivered": "notification.shipment_delivered.title",
  "Shipment In Transit": "notification.shipment_intransit.title",
  "Shipment Received": "notification.shipment_received.title",
  "Worker Checked In": "notification.worker_checked_in.title",
  "Low Stock Alert": "notification.low_stock.title",
  "Inter-Warehouse Transfer Request": "notification.transfer_request.title",
  "New Order Request": "notification.new_order.title",
  "Order Preparation Completed": "notification.order_prepared.title",
  "Order Delivered": "notification.order_delivered.title",
  "Order Approved": "notification.order_approved.title",
  "Order Rejected": "notification.order_rejected.title",
  "Order Cancelled In Transit": "notification.order_cancelled_in_transit.title",
  "Order Delivery Task": "notification.task_delivery.title",
  "Customer Return Collection Task": "notification.task_return.title",
  "Inbound Shipment Task": "notification.task_inbound.title",
  "Outbound Shipment Task": "notification.task_outbound.title",
  "Return Shipment Task": "notification.task_return_shipment.title",
  "Return Order Request": "notification.return_request.title",
  "Return Approved": "notification.return_approved.title",
  "Return Rejected": "notification.return_rejected.title",
  "Return Request Cancelled": "notification.return_cancelled.title",
  "Disposal Permission Request": "notification.disposal_request.title",
  "Disposal Request Approved": "notification.disposal_approved.title",
  "Disposal Request Rejected": "notification.disposal_rejected.title",
  "Order Status Update": "notification.order_status.title",
  "Modify Order Request": "notification.order_action_modify.title",
  "Delete Order Request": "notification.order_action_delete.title",
  "Modify Request Approved": "notification.order_action_modify.approved_title",
  "Delete Request Approved": "notification.order_action_delete.approved_title",
  "Modify Request Rejected": "notification.order_action_modify.rejected_title",
  "Delete Request Rejected": "notification.order_action_delete.rejected_title",
};

const LEGACY_TITLE_KEYS: Record<string, string> = {
  "notifications.low_stock_title": "notification.low_stock.title",
  "notifications.new_order_title": "notification.new_order.title",
  "notifications.shipment_delivered_title": "notification.shipment_delivered.title",
  "notifications.shipment_intransit_title": "notification.shipment_intransit.title",
  "notifications.shipment_received_title": "notification.shipment_received.title",
  "notifications.shipment_accepted_title": "notification.shipment_accepted.title",
  "notifications.transfer_request_title": "notification.transfer_request.title",
  "notifications.order_prepared_title": "notification.order_prepared.title",
  "notifications.order_delivered_title": "notification.order_delivered.title",
  "notifications.worker_attendance_title": "notification.worker_checked_in.title",
};

const MESSAGE_KEYS: Record<string, string> = {
  "Shipment #:id from :factory has been accepted for :warehouse.":
    "notification.shipment_accepted.message",
  "Shipment #:id from :factory has arrived at :warehouse.":
    "notification.shipment_delivered.message",
  "Shipment #:id from :factory is now in transit to :warehouse.":
    "notification.shipment_intransit.message",
  "Shipment #:id from :factory has been received at :warehouse by :worker.":
    "notification.shipment_received.message",
  "Worker :worker checked in at :warehouse.": "notification.worker_checked_in.message",
  "Low stock alert: :product has only :quantity units left in :warehouse (minimum :minimum).":
    "notification.low_stock.message",
  "Manager :requester at :warehouse requests a transfer of :count product(s) (Request #:id).":
    "notification.transfer_request.message",
  "Customer :customer placed order #:id totaling $:total.": "notification.new_order.message",
  "Order #:id has been prepared by :worker.": "notification.order_prepared.message",
  "Order #:id has been delivered by :worker.": "notification.order_delivered.message",
  "Your order #:id has been approved.": "notification.order_approved.message",
  "Your order #:id was rejected. Reason: :reason": "notification.order_rejected.message",
  "Customer :customer cancelled order #:id while in transit. Please stop the delivery.":
    "notification.order_cancelled_in_transit.stop_message",
  "Customer :customer cancelled order #:id while in transit.":
    "notification.order_cancelled.message",
  "You have been assigned a delivery task for order #:id.": "notification.task_delivery.message",
  "You have been assigned a return-collection task for return #:id.":
    "notification.task_return.message",
  "You have been assigned a shipment receipt task (Task #:id).":
    "notification.task_inbound.message",
  "You have been assigned a shipment preparation task (Task #:id).":
    "notification.task_outbound.message",
  "You have been assigned a shipment return task (Task #:id).":
    "notification.task_return_shipment.message",
  "Customer :customer requested a return for order #:order_id (Return #:return_id).":
    "notification.return_request.message",
  "Your return request #:return_id for order #:order_id has been approved.":
    "notification.return_approved.message",
  "Your return request #:id was rejected. Reason: :reason": "notification.return_rejected.message",
  "Customer :customer cancelled their return request #:return_id for order #:order_id.":
    "notification.return_cancelled.message",
  "Worker :worker requests permission to dispose :quantity unit(s) of a damaged product.":
    "notification.disposal_request.message",
  "Your disposal request #:id was approved.": "notification.disposal_approved.message",
  "Your disposal request #:id was rejected. Reason: :reason":
    "notification.disposal_rejected.message",
  // Order status update variants (static wording, order id only).
  "Your order #:id has been delivered. Thank you!": "notification.order_status.delivered_message",
  "Your order #:id has been shipped and is on its way.":
    "notification.order_status.shipped_message",
  "Your order #:id is now being prepared.": "notification.order_status.preparing_message",
  "Your order #:id status has been updated.": "notification.order_status.updated_message",
};

const LEGACY_MESSAGE_KEYS: Record<string, string> = {
  "notifications.worker_attendance_message": "notification.worker_checked_in.legacy_message",
  "notifications.low_stock_message": "notification.low_stock.legacy_message",
  "notifications.shipment_delivered_message": "notification.shipment_delivered.legacy_message",
  "notifications.shipment_intransit_message": "notification.shipment_intransit.legacy_message",
  "notifications.shipment_received_message": "notification.shipment_received.legacy_message",
  "notifications.shipment_accepted_message": "notification.shipment_accepted.legacy_message",
  "notifications.transfer_request_message": "notification.transfer_request.legacy_message",
  "notifications.order_prepared_message": "notification.order_prepared.legacy_message",
  "notifications.order_delivered_message": "notification.order_delivered.legacy_message",
  "notifications.new_order_message": "notification.new_order.legacy_message",
};

const STATUS_KEYS: Record<string, string> = {
  pending: "notification.status.pending",
  approved: "notification.status.approved",
  in_preparation: "notification.status.in_preparation",
  shipped: "notification.status.shipped",
  delivered: "notification.status.delivered",
  rejected: "notification.status.rejected",
  cancelled: "notification.status.cancelled",
};

const ACTION_KEYS: Record<string, string> = {
  modify: "notification.action.modify",
  edit: "notification.action.modify",
  delete: "notification.action.delete",
};

function paramsOf(i18n: I18nBlock | undefined): Record<string, unknown> {
  return i18n?.params && typeof i18n.params === "object" ? i18n.params : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function lookup(map: Record<string, string>, key: string | undefined): string | undefined {
  if (!key) return undefined;
  return map[key];
}

export function translateNotificationTitle(
  notification: DashboardNotification,
  t: Translate,
): string {
  const i18n = (notification.data?.i18n as I18nBlock | undefined) ?? undefined;
  const backendKey = i18n?.title;
  const raw = notification.title || "";

  const frontendKey = lookup(TITLE_KEYS, backendKey) ?? lookup(LEGACY_TITLE_KEYS, backendKey);

  if (frontendKey) {
    return t(frontendKey, paramsOf(i18n));
  }

  return raw;
}

export function translateNotificationMessage(
  notification: DashboardNotification,
  t: Translate,
): string {
  const i18n = (notification.data?.i18n as I18nBlock | undefined) ?? undefined;
  const backendKey = i18n?.message;
  const raw = notification.message || "";
  const params = paramsOf(i18n);

  const frontendKey = lookup(MESSAGE_KEYS, backendKey) ?? lookup(LEGACY_MESSAGE_KEYS, backendKey);

  if (frontendKey) {
    const translated = t(frontendKey, params);
    if (translated && translated !== frontendKey) return translated;
  }

  // Dynamic `:status`-based order updates.
  if (backendKey && backendKey.includes(":status")) {
    return translateStatusMessage(backendKey, notification, t, raw);
  }

  // Dynamic `:action`-based order requests.
  if (backendKey && backendKey.includes(":action")) {
    return translateActionMessage(backendKey, notification, t, raw);
  }

  return raw;
}

function translateStatusMessage(
  backendKey: string,
  notification: DashboardNotification,
  t: Translate,
  raw: string,
): string {
  const data = (notification.data ?? {}) as {
    order_id?: number | string | null;
    status?: string | null;
  };
  const params = paramsOf(notification.data?.i18n as I18nBlock | undefined);
  const statusValue = asString(params.status) ?? asString(data.status) ?? "";
  const statusLabel = STATUS_KEYS[statusValue] ? t(STATUS_KEYS[statusValue]) : statusValue;
  const id = params.id ?? data.order_id;

  if (backendKey.includes("is already")) {
    return t("notification.order_status.already_message", { status: statusLabel, id });
  }
  return t("notification.order_status.now_message", { status: statusLabel, id });
}

function translateActionMessage(
  backendKey: string,
  notification: DashboardNotification,
  t: Translate,
  raw: string,
): string {
  const data = (notification.data ?? {}) as {
    order_id?: number | string | null;
    action?: string | null;
  };
  const params = paramsOf(notification.data?.i18n as I18nBlock | undefined);
  const actionValue = asString(params.action) ?? asString(data.action) ?? "";
  const actionLabel = ACTION_KEYS[actionValue] ? t(ACTION_KEYS[actionValue]) : actionValue;
  const reason = asString(params.reason) ?? "";
  const merged: Record<string, unknown> = {
    action: actionLabel,
    id: params.id ?? data.order_id,
    reason,
  };

  if (backendKey.includes("requests to")) {
    return t("notification.order_action.request", merged);
  }
  if (backendKey.includes("has been approved")) {
    return t("notification.order_action.approved_msg", merged);
  }
  if (backendKey.includes("was rejected")) {
    return t("notification.order_action.rejected_msg", merged);
  }
  return raw;
}
