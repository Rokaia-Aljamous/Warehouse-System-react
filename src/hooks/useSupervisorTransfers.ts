import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  fetchKeeperTasks,
  assignKeeperTask,
  fetchKeeperWorkers,
  type KeeperTask,
  type KeeperWorker,
  type TransferRequest,
} from "@/lib/manager-api";
import { subscribeToTransferChannel } from "@/lib/realtime";

const PREPARATION_TASK_TYPE = "transfer_preparation";
const DELIVERY_TASK_TYPE = "transfer_delivery";
const RELATED_TYPE = "App\\Models\\TransferRequest";

export interface AssignOutcome {
  ok: boolean;
  task?: KeeperTask;
  message?: string;
}

/**
 * Supervisor transfer workflow. The backend exposes transfer requests to the
 * warehouse_secretary only via the owner-scoped realtime channel
 * (`transfer.requests.{ownerId}` — authorised for any employee of the owner),
 * so the request feed is seeded/updated by live events. Preparation and
 * delivery tasks are read/assigned exclusively through the real keeper task
 * APIs (`GET|POST /{slug}/keeper/tasks*`).
 */
export function useSupervisorTransfers(
  slug: string | null,
  ownerId: number | null | undefined,
  warehouseId: number | null | undefined,
) {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [tasks, setTasks] = useState<KeeperTask[]>([]);
  const [workers, setWorkers] = useState<KeeperWorker[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [submitting, setSubmitting] = useState<{ requestId: number; kind: "preparation" | "delivery" } | null>(null);

  const refreshTasks = useCallback(async () => {
    if (!slug) return;
    try {
      const [prep, delivery] = await Promise.all([
        fetchKeeperTasks(slug, { task_type: PREPARATION_TASK_TYPE }),
        fetchKeeperTasks(slug, { task_type: DELIVERY_TASK_TYPE }),
      ]);
      setTasks([...prep.tasks, ...delivery.tasks].sort((a, b) => b.id - a.id));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401 && status !== 403) {
        console.error("fetch keeper transfer tasks failed", err);
      }
    } finally {
      setLoadingTasks(false);
    }
  }, [slug]);

  const refreshWorkers = useCallback(async () => {
    if (!slug || !warehouseId) return;
    setLoadingWorkers(true);
    try {
      const res = await fetchKeeperWorkers(slug, warehouseId);
      setWorkers(res.employees ?? []);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401 && status !== 403) {
        console.error("fetch keeper workers failed", err);
      }
    } finally {
      setLoadingWorkers(false);
    }
  }, [slug, warehouseId]);

  useEffect(() => {
    refreshTasks();
    refreshWorkers();
  }, [refreshTasks, refreshWorkers]);

  /* Realtime discovery: the accepted transfer request reaches this warehouse's
     secretary through the owner-scoped private channel (backend-authorised for
     warehouse_secretary role). */
  useEffect(() => {
    if (!slug || !ownerId) return;
    const unsubscribe = subscribeToTransferChannel(slug, ownerId, {
      onCreated: (request) => {
        if (!request || request.warehouse_id !== warehouseId) return;
        setRequests((prev) => {
          if (prev.some((r) => r.id === request.id)) return prev;
          return [request, ...prev];
        });
      },
      onStatusUpdated: (payload) => {
        const id = payload.transfer_request?.id ?? payload.transfer_request_id;
        if (!id) return;
        const incoming = payload.transfer_request;
        if (incoming && incoming.warehouse_id !== warehouseId) return;
        setRequests((prev) => {
          if (!incoming) return prev;
          if (prev.some((r) => r.id === id)) {
            return prev.map((r) => (r.id === id ? incoming : r));
          }
          return [incoming, ...prev];
        });
      },
    });
    return unsubscribe;
  }, [slug, ownerId, warehouseId]);

  const prepTasksFor = useCallback(
    (requestId: number) =>
      tasks.filter((tk) => tk.related_id === requestId && tk.task_type === PREPARATION_TASK_TYPE),
    [tasks],
  );

  const deliveryTasksFor = useCallback(
    (requestId: number) =>
      tasks.filter((tk) => tk.related_id === requestId && tk.task_type === DELIVERY_TASK_TYPE),
    [tasks],
  );

  const isPreparationReady = useCallback(
    (requestId: number) =>
      prepTasksFor(requestId).some((tk) => tk.status === "completed"),
    [prepTasksFor],
  );

  const assignTask = useCallback(
    async (
      request: TransferRequest,
      kind: "preparation" | "delivery",
      workerOrDriverId: number,
    ): Promise<AssignOutcome> => {
      if (!slug) return { ok: false, message: "Missing tenant" };
      if (!workerOrDriverId) return { ok: false, message: "No worker selected" };
      setSubmitting({ requestId: request.id, kind });
      try {
        const res = await assignKeeperTask(slug, {
          worker_or_driver_id: workerOrDriverId,
          task_type: kind === "preparation" ? PREPARATION_TASK_TYPE : DELIVERY_TASK_TYPE,
          related_type: RELATED_TYPE,
          related_id: request.id,
        });
        await refreshTasks();
        toast.success(
          kind === "preparation" ? "Preparazione assigned" : "Deliverer assigned",
        );
        return { ok: true, task: res.task };
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Assignment failed";
        toast.error(message);
        return { ok: false, message };
      } finally {
        setSubmitting(null);
      }
    },
    [slug, refreshTasks],
  );

  const staffWorkers = useMemo(
    () => workers.filter((w) => w.role === "staff"),
    [workers],
  );

  const driverWorkers = useMemo(
    () => workers.filter((w) => w.role === "driver"),
    [workers],
  );

  return {
    requests,
    tasks,
    workers,
    staffWorkers,
    driverWorkers,
    loadingTasks,
    loadingWorkers,
    submitting,
    isSubmitting: (requestId: number, kind: string) =>
      submitting?.requestId === requestId && submitting.kind === kind,
    refreshTasks,
    refreshWorkers,
    assignTask,
    prepTasksFor,
    deliveryTasksFor,
    isPreparationReady,
  };
}