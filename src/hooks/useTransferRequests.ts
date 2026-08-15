import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  fetchAvailableTransferRequests,
  fetchMyTransferRequests,
  createTransferRequest,
  acceptTransferRequest,
  type TransferRequest,
  type CreateTransferRequestInput,
} from "@/lib/manager-api";
import { subscribeToTransferChannel } from "@/lib/realtime";

const POLL_INTERVAL_MS = 15000;

export function useTransferRequests(
  slug: string,
  ownerId: number | null | undefined,
  warehouseId: number | null | undefined,
) {
  const { t } = useTranslation();
  const [available, setAvailable] = useState<TransferRequest[]>([]);
  const [mine, setMine] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingIds, setAcceptingIds] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [availRes, mineRes] = await Promise.all([
        fetchAvailableTransferRequests(slug),
        fetchMyTransferRequests(slug),
      ]);
      setAvailable(availRes.transfer_requests);
      setMine(mineRes.transfer_requests);
    } catch (err: any) {
      if (err?.response?.status !== 401 && err?.response?.status !== 403) {
        console.error("fetch transfer requests failed", err);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  /* Polling fallback (keeps the feed fresh when realtime is unavailable). */
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  /* Real-time subscription to the owner's private channel. */
  useEffect(() => {
    if (!ownerId) return;
    const unsubscribe = subscribeToTransferChannel(slug, ownerId, {
      onCreated: (request) => {
        if (request.warehouse_id === warehouseId) return;
        setAvailable((prev) => {
          if (prev.some((r) => r.id === request.id)) return prev;
          return [request, ...prev];
        });
      },
      onStatusUpdated: (payload) => {
        const id = payload.transfer_request?.id ?? payload.transfer_request_id;
        if (!id) return;
        const status = payload.transfer_request?.status ?? payload.status;
        if (!status) return;

        setMine((prev) => {
          if (!prev.some((r) => r.id === id)) return prev;
          return prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...(payload.transfer_request ?? {}),
                  status,
                  accepted_by_warehouse: payload.accepted_by_warehouse ?? r.accepted_by_warehouse,
                }
              : r,
          );
        });

        setAvailable((prev) => {
          const exists = prev.some((r) => r.id === id);
          if (!exists) {
            const incoming = payload.transfer_request;
            if (status === "pending" && incoming && incoming.warehouse_id !== warehouseId) {
              return [incoming, ...prev];
            }
            return prev;
          }
          if (status === "pending") {
            return prev.map((r) =>
              r.id === id ? { ...r, ...(payload.transfer_request ?? {}) } : r,
            );
          }
          return prev.filter((r) => r.id !== id);
        });
      },
    });
    return unsubscribe;
  }, [slug, ownerId, warehouseId]);

  const acceptRequest = useCallback(
    async (requestId: number) => {
      setAcceptingIds((prev) => new Set(prev).add(requestId));
      try {
        const res = await acceptTransferRequest(slug, requestId);
        const accepted = res.transfer_request;
        setAvailable((prev) => prev.filter((r) => r.id !== requestId));
        setMine((prev) => {
          if (prev.some((r) => r.id === requestId)) {
            return prev.map((r) => (r.id === requestId ? accepted : r));
          }
          return [accepted, ...prev];
        });
        toast.success(
          t("transfer_request.accepted", {
            warehouse: accepted.accepted_by_warehouse?.warehouse_name ?? "",
          }),
        );
      } catch (err: any) {
        if (err?.response?.status === 409) {
          toast.error(t("transfer_request.already_accepted"));
          setAvailable((prev) => prev.filter((r) => r.id !== requestId));
          setMine((prev) =>
            prev.map((r) =>
              r.id === requestId
                ? {
                    ...r,
                    status: "accepted" as const,
                    accepted_by_warehouse: { id: -1, warehouse_name: "", type: "", location: "" },
                  }
                : r,
            ),
          );
        } else {
          toast.error(err?.response?.data?.message || t("transfer_request.accept_failed"));
        }
      } finally {
        setAcceptingIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }
    },
    [slug, t],
  );

  const createRequest = useCallback(
    async (input: CreateTransferRequestInput): Promise<TransferRequest | null> => {
      setCreating(true);
      try {
        const res = await createTransferRequest(slug, input);
        setMine((prev) => [res.transfer_request, ...prev]);
        toast.success(t("transfer_request.created"));
        return res.transfer_request;
      } catch (err: any) {
        toast.error(err?.response?.data?.message || t("transfer_request.create_failed"));
        return null;
      } finally {
        setCreating(false);
      }
    },
    [slug, t],
  );

  return {
    available,
    mine,
    loading,
    creating,
    acceptingIds,
    isAccepting: (id: number) => acceptingIds.has(id),
    refresh,
    acceptRequest,
    createRequest,
  };
}
