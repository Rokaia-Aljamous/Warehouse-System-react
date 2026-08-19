import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Package, Building2, User as UserIcon, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CreateTransferRequestModal } from "@/components/transfer/CreateTransferRequestModal";
import type {
  TransferRequest,
  TransferRequestStatus,
  CreateTransferRequestInput,
  ManagerProduct,
} from "@/lib/manager-api";

interface MyWarehouseRequestsProps {
  requests: TransferRequest[];
  loading: boolean;
  products: ManagerProduct[];
  submitting: boolean;
  onCreate: (input: CreateTransferRequestInput) => void;
}

const STATUS_STYLES: Record<TransferRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  fulfilled: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

export function MyWarehouseRequests({
  requests,
  loading,
  products,
  submitting,
  onCreate,
}: MyWarehouseRequestsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1a2942]">{t("transfer_request.mine_title")}</h3>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="bg-[#1a2942] text-cream hover:bg-[#1a2942]/90"
        >
          <Plus className="size-4 me-1" /> {t("transfer_request.new_request")}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="glass-light rounded-2xl p-4 space-y-3 shadow-xl">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-light rounded-2xl p-8 text-center shadow-xl">
          <Package className="mx-auto size-8 text-[#1a2942]/30" />
          <p className="mt-3 text-sm font-medium text-[#1a2942]">
            {t("transfer_request.mine_empty")}
          </p>
          <p className="mt-1 text-xs text-[#1a2942]/60">{t("transfer_request.mine_empty_desc")}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {requests.map((req) => (
            <div key={req.id} className="glass-light flex flex-col rounded-2xl p-4 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-[oklch(0.78_0.16_75)]" />
                  <h4 className="text-sm font-bold text-[#1a2942]">
                    {req.origin_warehouse.warehouse_name}
                  </h4>
                </div>
                <Badge className={cn("text-xs font-medium", STATUS_STYLES[req.status] ?? "")}>
                  {t(`transfer_request.status.${req.status}`)}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#1a2942]/70">
                <span className="flex items-center gap-1">
                  <UserIcon className="size-3" /> {req.requested_by_name}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" /> {req.created_at?.slice(0, 10)}
                </span>
              </div>

              {req.status === "accepted" && req.accepted_by_warehouse && (
                <p className="mt-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  {t("transfer_request.accepted_by", {
                    warehouse: req.accepted_by_warehouse.warehouse_name,
                  })}
                </p>
              )}

              <div className="mt-3 rounded-xl border border-white/40 bg-white/40 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#1a2942]/60">
                  {t("transfer_request.items")} ({req.items.length})
                </p>
                <ul className="space-y-1">
                  {req.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between text-xs text-[#1a2942]"
                    >
                      <span className="truncate pe-2 font-medium">{item.product_name}</span>
                      <span className="shrink-0 text-[#1a2942]/70">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTransferRequestModal
        open={open}
        onOpenChange={setOpen}
        products={products}
        submitting={submitting}
        onSubmit={onCreate}
      />
    </div>
  );
}
