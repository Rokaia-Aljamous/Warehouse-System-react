import { useTranslation } from "react-i18next";
import {
  Loader2,
  CheckCircle2,
  Package,
  Building2,
  User as UserIcon,
  CalendarDays,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TransferRequest } from "@/lib/manager-api";

interface AvailableRequestsFeedProps {
  requests: TransferRequest[];
  loading: boolean;
  isAccepting: (id: number) => boolean;
  onAccept: (id: number) => void;
}

export function AvailableRequestsFeed({
  requests,
  loading,
  isAccepting,
  onAccept,
}: AvailableRequestsFeedProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass-light rounded-2xl p-5 space-y-3 shadow-xl">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.length === 0 ? (
        <div className="glass-light rounded-2xl p-8 text-center shadow-xl">
          <Radio className="mx-auto size-8 text-[#1a2942]/30" />
          <p className="mt-3 text-sm font-medium text-[#1a2942]">
            {t("transfer_request.available_empty")}
          </p>
          <p className="mt-1 text-xs text-[#1a2942]/60">
            {t("transfer_request.available_empty_desc")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((req) => (
            <div
              key={req.id}
              className="glass-light flex flex-col rounded-2xl p-5 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-[oklch(0.78_0.16_75)]" />
                  <h4 className="text-sm font-bold text-[#1a2942]">
                    {req.origin_warehouse.warehouse_name}
                  </h4>
                </div>
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  {t("transfer_request.badge_pending")}
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

              <div className="mt-3 rounded-xl border border-white/40 bg-white/40 p-3">
                <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#1a2942]/60">
                  <Package className="size-3" /> {t("transfer_request.items")} ({req.items.length})
                </p>
                <ul className="space-y-1">
                  {req.items.slice(0, 4).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between text-xs text-[#1a2942]"
                    >
                      <span className="truncate pe-2 font-medium">{item.product_name}</span>
                      <span className="shrink-0 text-[#1a2942]/70">x{item.quantity}</span>
                    </li>
                  ))}
                  {req.items.length > 4 && (
                    <li className="text-[11px] text-[#1a2942]/50">
                      {t("transfer_request.more_items", { count: req.items.length - 4 })}
                    </li>
                  )}
                </ul>
              </div>

              <div className="mt-4 flex-1" />
              <Button
                onClick={() => onAccept(req.id)}
                disabled={isAccepting(req.id)}
                className="w-full bg-[#1a2942] text-cream hover:bg-[#1a2942]/90"
              >
                {isAccepting(req.id) ? (
                  <>
                    <Loader2 className="size-4 animate-spin me-1" />{" "}
                    {t("transfer_request.accepting")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 me-1" /> {t("transfer_request.accept")}
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
