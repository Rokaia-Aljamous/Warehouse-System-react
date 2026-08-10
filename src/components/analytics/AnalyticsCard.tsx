import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isForbiddenError, httpErrorMessage } from "@/components/analytics/use-analytics";

export function AnalyticsCard({
  title,
  description,
  loading,
  error,
  isEmpty,
  emptyMessage,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("glass-light rounded-2xl p-5 shadow-xl text-[#1a2942]", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#1a2942]">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-[#1a2942]/60">{description}</p>}
        </div>
        {action}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4 bg-[#1a2942]/10" />
          <Skeleton className="h-24 w-full bg-[#1a2942]/10" />
          <Skeleton className="h-24 w-full bg-[#1a2942]/10" />
        </div>
      ) : error ? (
        isForbiddenError(error) ? (
          <ForbiddenState />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-red-50 py-6 text-center">
            <AlertTriangle className="size-5 text-red-500" />
            <p className="text-xs text-red-600">{httpErrorMessage(error, t("analytics.error_loading"))}</p>
          </div>
        )
      ) : isEmpty ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-[#1a2942]/20 bg-[#1a2942]/5 py-10 text-center">
          <p className="text-sm text-[#1a2942]/50">{emptyMessage ?? t("analytics.empty")}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "warning" | "accent";
}) {
  const tones: Record<string, string> = {
    default: "text-[#1a2942]",
    positive: "text-emerald-600",
    negative: "text-red-600",
    warning: "text-amber-600",
    accent: "text-[#d99415]",
  };

  return (
    <div className="glass-light rounded-2xl p-4 shadow-xl text-[#1a2942]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1a2942]/60">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight", tones[tone])}>{value}</p>
      {sub && <div className="mt-1 text-xs text-[#1a2942]/60">{sub}</div>}
    </div>
  );
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 10,
  color = "#10B981",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(26,41,66,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-[#1a2942]">{clamped.toFixed(1)}%</span>
        {label && <span className="text-[10px] text-[#1a2942]/60">{label}</span>}
      </div>
    </div>
  );
}

export function ForbiddenState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-8 text-center">
      <Lock className="size-5 text-amber-600" />
      <p className="text-sm font-semibold text-amber-700">{t("analytics.forbidden")}</p>
      <p className="text-xs text-amber-700/70">{t("analytics.forbidden_desc")}</p>
    </div>
  );
}

export function RetryState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-sm text-[#1a2942]/60">{t("analytics.error_loading")}</p>
      <Button size="sm" variant="outline" onClick={onRetry} className="text-[#1a2942]">
        <RefreshCw className="me-1 size-3.5" /> {t("common.retry")}
      </Button>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-10", className)}>
      <Loader2 className="size-6 animate-spin text-[#1a2942]/50" />
    </div>
  );
}
