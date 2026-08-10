import { api } from "@/lib/api";
import type {
  TransferRequest,
  TransferRequestStatus,
  TransferRequestWarehouse,
} from "@/lib/manager-api";

/* Minimal Pusher-protocol client over native WebSocket.
   Reverb and Pusher both speak this protocol, so no laravel-echo/pusher-js
   dependency is required. If broadcasting is not configured (no app key),
   connection is skipped and callers should fall back to polling. */

export interface TransferRequestStatusPayload {
  transfer_request?: TransferRequest;
  transfer_request_id?: number;
  status?: TransferRequestStatus;
  accepted_by_warehouse?: TransferRequestWarehouse | null;
}

export interface TransferRealtimeHandlers {
  onStatusUpdated?: (payload: TransferRequestStatusPayload) => void;
  onCreated?: (request: TransferRequest) => void;
}

interface PusherEvent {
  event: string;
  data?: string;
  channel?: string;
}

function readEnv(key: string): string {
  return (import.meta.env[key] as string | undefined)?.trim() ?? "";
}

function isBroadcastConfigured(): boolean {
  return Boolean(readEnv("VITE_REVERB_APP_KEY") || readEnv("VITE_PUSHER_APP_KEY"));
}

function parseEvent(raw: string): PusherEvent | null {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.event === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function parseData<T>(evt: PusherEvent): T | null {
  const raw = evt.data;
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function subscribeToTransferChannel(
  slug: string,
  ownerId: number,
  handlers: TransferRealtimeHandlers,
): () => void {
  if (typeof window === "undefined" || !isBroadcastConfigured()) {
    return () => {};
  }

  const key = readEnv("VITE_REVERB_APP_KEY") || readEnv("VITE_PUSHER_APP_KEY");
  const host =
    readEnv("VITE_REVERB_HOST") || readEnv("VITE_PUSHER_HOST") || window.location.hostname;
  const port = readEnv("VITE_REVERB_PORT") || readEnv("VITE_PUSHER_PORT") || "8080";
  const scheme = readEnv("VITE_REVERB_SCHEME") || readEnv("VITE_PUSHER_SCHEME") || "http";
  const wsScheme = scheme === "https" ? "wss" : "ws";
  const channelName = `private-transfer.requests.${ownerId}`;

  let ws: WebSocket | null = null;
  let socketId = "";
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;

  const cleanupTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const subscribe = () => {
    ws?.send(
      JSON.stringify({
        event: "pusher:subscribe",
        data: { auth: "", channel: channelName },
      }),
    );
  };

  const authenticate = () => {
    if (!socketId) return;
    api
      .post<{ auth: string }>(`/broadcasting/auth`, {
        socket_id: socketId,
        channel_name: channelName,
      })
      .then((res) => {
        if (closed) return;
        ws?.send(
          JSON.stringify({
            event: "pusher:subscribe",
            data: { auth: res.data.auth, channel: channelName },
          }),
        );
      })
      .catch(() => {
        if (!closed) scheduleReconnect();
      });
  };

  const handleMessage = (raw: string) => {
    const evt = parseEvent(raw);
    if (!evt) return;

    if (evt.event === "pusher:connection_established") {
      const data = parseData<{ socket_id: string }>(evt);
      if (data?.socket_id) {
        socketId = data.socket_id;
        authenticate();
      }
      return;
    }

    if (evt.event === "pusher:ping") {
      ws?.send(JSON.stringify({ event: "pusher:pong", data: {} }));
      return;
    }

    if (evt.event === "pusher:error") {
      scheduleReconnect();
      return;
    }

    if (evt.event === "TransferRequestStatusUpdated") {
      handlers.onStatusUpdated?.(parseData(evt) ?? {});
      return;
    }

    if (evt.event === "TransferRequestCreated") {
      const request = parseData<TransferRequest>(evt);
      if (request?.id) handlers.onCreated?.(request);
    }
  };

  const connect = () => {
    cleanupTimer();
    if (closed) return;
    ws = new WebSocket(
      `${wsScheme}://${host}:${port}/app/${key}?protocol=7&client=js&version=8.0.0&flash=false`,
    );
    ws.onopen = () => {
      attempts = 0;
      subscribe();
    };
    ws.onmessage = (msg) => handleMessage(String(msg.data));
    ws.onerror = () => {
      ws?.close();
    };
    ws.onclose = () => {
      ws = null;
      if (!closed) scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (closed || reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** attempts, 15000);
    attempts += 1;
    reconnectTimer = setTimeout(connect, delay);
  };

  connect();

  return () => {
    closed = true;
    cleanupTimer();
    try {
      ws?.send(JSON.stringify({ event: "pusher:unsubscribe", data: { channel: channelName } }));
    } catch {
      /* noop */
    }
    ws?.close();
    ws = null;
  };
}
