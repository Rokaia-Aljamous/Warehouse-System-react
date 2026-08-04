import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Warehouse,
  Calendar,
  CreditCard,
  Building2,
  ArrowRight,
  Sparkles,
  Package,
  ChevronRight,
} from "lucide-react";
import { completePayPalOrder, type TenantResource } from "@/lib/api";
import { LanguageToggle } from "@/components/LanguageToggle";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/checkout/success")({
  component: CheckoutSuccess,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || "",
  }),
  head: () => ({ meta: [{ title: `${i18n.t("title.checkout_success")} — Stockyard` }] }),
});

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [t("steps.registered"), t("steps.subscribe"), t("steps.set_up")];
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  done
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                    : active
                      ? "bg-[#f3a523] text-[#1a2942] shadow-md shadow-[#f3a523]/30 ring-2 ring-[#f3a523]/30"
                      : "bg-[#1a2942]/20 text-[#f0ecdb]/40"
                }`}
              >
                {done ? <CheckCircle2 className="size-3.5" /> : step}
              </div>
              <span
                className={`text-xs font-medium transition-all ${
                  active ? "text-[#f3a523]" : done ? "text-emerald-400" : "text-[#f0ecdb]/40"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight
                className={`mx-2 size-3.5 transition-all ${
                  step <= current ? "text-[#f0ecdb]/30" : "text-[#f0ecdb]/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#1a2942]/5 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#1a2942]/10">
          <Icon className="size-4 text-[#1a2942]" />
        </div>
        <span className="text-sm text-[#1a2942]/70">{label}</span>
      </div>
      <span className="text-sm font-semibold text-[#1a2942]">{value}</span>
    </div>
  );
}

function CheckoutSuccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [tenant, setTenant] = useState<TenantResource | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(i18n.t("checkout.success.no_token"));
      return;
    }

    completePayPalOrder(token)
      .then((res) => {
        setStatus("success");
        setTenant(res.tenant);
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message || err.response?.data?.payment?.[0] || i18n.t("checkout.success.payment_failed"));
      });
  }, [token]);

  const plan = tenant?.subscription_plan;

  return (
    <main className="min-h-screen bg-[#0f1b2d]">
      <header className="border-b border-white/5 bg-[#0f1b2d]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-6 py-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#f3a523] shadow-lg shadow-[#f3a523]/30">
            <Warehouse className="size-5 text-[#1a2942]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#f0ecdb]">{t("app.name")}</span>
          <div className="ms-auto"><LanguageToggle variant="header" /></div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-8">
          <StepIndicator current={status === "success" ? 3 : status === "loading" ? 2 : 2} />
        </div>

        {status === "loading" && (
          <div className="rounded-3xl bg-[#f0ecdb] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-[#1a2942]/5">
              <Loader2 className="size-10 animate-spin text-[#f3a523]" />
            </div>
            <h2 className="text-xl font-bold text-[#1a2942]">{t("checkout.success.processing")}</h2>
            <p className="mt-2 text-sm text-[#1a2942]/60">
              {t("checkout.success.waiting")}
            </p>
            <div className="mt-6 space-y-2">
              <div className="h-2 animate-pulse rounded-full bg-[#1a2942]/10" />
              <div className="h-2 w-3/4 animate-pulse rounded-full bg-[#1a2942]/10" />
            </div>
          </div>
        )}

        {status === "success" && tenant && (
          <div className="rounded-3xl bg-[#f0ecdb] p-8 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-emerald-100 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="size-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#1a2942]">{t("checkout.success.title")}</h2>
              <p className="mt-1.5 text-sm text-[#1a2942]/60">{message || t("checkout.success.desc")}</p>
            </div>

            <div className="mx-0 my-6 border-t border-[#1a2942]/10" />

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1a2942]/50">{t("subscribe.order_summary")}</h3>

              <SummaryRow icon={Building2} label={t("checkout.summary.company")} value={tenant.company_name} />
              <SummaryRow icon={Package} label={t("checkout.summary.plan")} value={plan?.name || "—"} />
              <SummaryRow
                icon={Warehouse}
                label={t("checkout.summary.warehouses")}
                value={t("checkout.summary.warehouses_count", { count: tenant.warehouses_count })}
              />
              <SummaryRow
                icon={CreditCard}
                label={t("checkout.summary.amount_paid")}
                value={`$${plan ? (parseFloat(plan.price_per_warehouse) || 0).toFixed(2) : "0.00"}`}
              />
              <SummaryRow
                icon={Calendar}
                label={t("checkout.summary.valid_until")}
                value={
                  tenant.subscription_end_date
                    ? new Date(tenant.subscription_end_date).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"
                }
              />
            </div>

            <div className="mx-0 my-6 border-t border-[#1a2942]/10" />

            <div className="rounded-2xl bg-gradient-to-br from-[#f3a523]/10 to-[#f3a523]/5 p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f3a523] shadow-md shadow-[#f3a523]/30">
                  <Sparkles className="size-4 text-[#1a2942]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1a2942]">{t("checkout.success.next_step")}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#1a2942]/65">
                    {t("checkout.success.setup_desc", { company: tenant.company_name })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate({ to: "/tenant/setup", search: { slug: tenant.url_slug } })}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a2942] py-3 font-semibold text-[#f0ecdb] shadow-lg transition hover:bg-[#26384c]"
              >
                {t("checkout.success.setup_button")}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-3xl bg-[#f0ecdb] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-red-100 shadow-lg shadow-red-500/20">
              <XCircle className="size-10 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-[#1a2942]">{t("checkout.success.error_title")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-red-700">{message}</p>
            <div className="mx-0 my-6 border-t border-[#1a2942]/10" />
            <p className="text-sm text-[#1a2942]/60">
              {t("checkout.success.error_desc")}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={() => navigate({ to: "/" })}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a2942] py-3 font-semibold text-[#f0ecdb] shadow-lg transition hover:bg-[#26384c]"
              >
                {t("common.go_home")}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1a2942]/20 bg-transparent py-3 font-semibold text-[#1a2942] transition hover:bg-[#1a2942]/5"
              >
                {t("common.try_again")}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
