import { useTranslation } from "react-i18next";
import { Warehouse, Boxes, Truck, BarChart3, Wallet, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const features = [
  { icon: Warehouse, title: "feature.warehouse_management", desc: "feature.warehouse_management.desc" },
  { icon: Boxes, title: "feature.inventory_tracking", desc: "feature.inventory_tracking.desc" },
  { icon: Truck, title: "feature.shipments", desc: "feature.shipments.desc" },
  { icon: BarChart3, title: "feature.analytics", desc: "feature.analytics.desc" },
];

export function ServiceInfo() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="space-y-3 animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#f0ecdb]/90 backdrop-blur">
          <span className="size-1.5 rounded-full bg-[#f3a523] animate-pulse" />
          {t("signup.operations_suite")}
        </span>
        <h1 className="text-4xl font-bold leading-tight text-[#f0ecdb] md:text-5xl">
          {t("signup.hero_pre")} <span className="text-[#f3a523]">{t("signup.hero_em")}</span>
          {t("signup.hero_post")}
        </h1>
        <p className="max-w-md text-base text-[#f0ecdb]/75">
          {t("signup.hero_desc")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="rounded-2xl bg-white/5 border border-white/10 p-4 shadow-lg backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:border-white/20 animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <f.icon className="mb-2 size-5 text-[#f3a523]" />
            <h3 className="text-sm font-semibold text-[#f0ecdb]">{t(f.title)}</h3>
            <p className="mt-1 text-xs text-[#f0ecdb]/60">{t(f.desc)}</p>
          </div>
        ))}
      </div>

      {/* Highlighted Wallet */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 animate-fade-up animate-pulse-glow"
        style={{ background: "linear-gradient(135deg, #f3a523, #e09412)", animationDelay: "320ms" }}
      >
        <div className="absolute -end-8 -top-8 size-40 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 backdrop-blur animate-float">
            <Wallet className="size-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90">
                {t("wallet.new")}
              </span>
              <h3 className="text-lg font-bold text-white">{t("wallet.title")}</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={t("signup.wallet_info")}>
                    <HelpCircle className="size-4 text-white/80 hover:text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{t("signup.wallet_tooltip")}</TooltipContent>
              </Tooltip>
            </div>
            <p className="mt-1 text-sm text-white/95">
              {t("wallet.desc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
