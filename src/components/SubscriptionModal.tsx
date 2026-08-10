import { useEffect, useState, useRef } from "react";
import { X, CheckCircle2, Loader2, LogIn, Wallet, Shield } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  getCsrfCookie,
  fetchSubscriptionPlans,
  checkSlug,
  createPayPalOrder,
  getStoredUser,
  type SubscriptionPlan,
} from "@/lib/api";

export function SubscriptionModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (slug: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [company, setCompany] = useState("");
  const [count, setCount] = useState(1);
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "ok" | "taken" | "invalid" | "checking">(
    "idle",
  );
  const [paying, setPaying] = useState(false);
  const planIdRef = useRef(planId);
  planIdRef.current = planId;

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    const load = () => {
      setLoadingPlans(true);
      setPlansError(null);
      fetchSubscriptionPlans()
        .then((data) => {
          if (!mounted) return;
          const filtered = data.filter((p) => p.duration_days !== 7);
          setPlans(filtered);
          setPlansError(null);
          if (filtered.length > 0) setPlanId(filtered[0].id);
        })
        .catch(() => {
          if (!mounted) return;
          setPlansError("load_failed");
          toast.error(t("subscribe.toast_load_failed"));
        })
        .finally(() => {
          if (mounted) setLoadingPlans(false);
        });
    };

    load();

    return () => {
      mounted = false;
    };
  }, [open]);

  if (!open) return null;

  const perLabel = (days: number) => {
    if (days >= 360) return t("subscribe.per_year");
    if (days >= 28) return t("subscribe.per_month");
    return t("subscribe.per_days", { count: days });
  };
  const cycleLabel = (days: number) => {
    if (days >= 360) return t("subscribe.yearly");
    if (days >= 28) return t("subscribe.monthly");
    return t("subscribe.per_days", { count: days });
  };
  const isPopular = (days: number) => days >= 28 && days < 360;

  const selected = plans.find((p) => p.id === planId);
  const total = selected ? (parseFloat(selected.price_per_warehouse) || 0) * count : 0;

  const verify = async () => {
    if (!slug || slug.length < 3) return setSlugStatus("invalid");
    setSlugStatus("checking");
    try {
      const res = await checkSlug(slug.toLowerCase().trim());
      setSlugStatus(res.available ? "ok" : "taken");
    } catch {
      setSlugStatus("invalid");
      toast.error(t("subscribe.toast_slug_check_failed"));
    }
  };

  const pay = async () => {
    if (!user) return (window.location.href = "/?login=1");
    if (!company.trim()) return toast.error(t("subscribe.company_required"));
    if (!slug || slugStatus !== "ok") return toast.error(t("subscribe.verify_slug_first"));
    if (!planId) return toast.error(t("subscribe.select_plan_first"));
    setPaying(true);
    try {
      await getCsrfCookie();
      const res = await createPayPalOrder({
        subscription_plan_id: planId,
        company_name: company.trim(),
        warehouses_count: count,
        url_slug: slug.toLowerCase().trim(),
        return_url: `${window.location.origin}/checkout/success`,
        cancel_url: `${window.location.origin}/checkout/cancel`,
      });
      window.location.href = res.approval_url;
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errs = error.response.data.errors;
        const first = errs ? Object.values(errs)[0] : error.response.data.message;
        toast.error(Array.isArray(first) ? first[0] : first || t("subscribe.validation_failed"));
      } else if (error.response?.status === 409) {
        toast.error(t("subscribe.already_subscribed"));
      } else if (error.response?.status === 403) {
        toast.error(error.response.data?.message || t("subscribe.access_denied"));
      } else if (error.response?.status === 401) {
        toast.error(t("subscribe.login_first"));
        window.location.href = "/?login=1";
      } else {
        toast.error(t("subscribe.payment_setup_failed"));
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#f0ecdb] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute end-4 top-4 z-10 rounded-full bg-white/80 p-1.5 text-[#1a2942] shadow-sm transition hover:bg-white"
        >
          <X className="size-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <h2 className="text-2xl font-bold text-[#1a2942]">{t("subscribe.title")}</h2>
          <p className="mt-1 text-sm text-[#1a2942]/70">
            {user
              ? t("subscribe.desc")
              : t("subscribe.login_first")}
          </p>
          {!user && (
            <button
              onClick={() => (window.location.href = "/?login=1")}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#f3a523] hover:underline"
            >
              <LogIn className="size-3.5" /> {t("subscribe.login_to_continue")}
            </button>
          )}

          {/* ----- Loading ----- */}
          {loadingPlans && (
            <div className="flex flex-col items-center justify-center py-12 text-[#1a2942]/60">
              <Loader2 className="size-6 animate-spin" />
              <p className="mt-2 text-sm font-medium">{t("subscribe.loading")}</p>
            </div>
          )}

          {/* ----- Load error ----- */}
          {!loadingPlans && plansError === "load_failed" && (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-100">
                <X className="size-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-[#1a2942]">{t("subscribe.error_title")}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[#1a2942]/70">
                {t("subscribe.error_desc")}
              </p>
              <button
                onClick={() => {
                  setLoadingPlans(true);
                  setPlansError(null);
                  fetchSubscriptionPlans()
                    .then((data) => {
                      const filtered = data.filter((p) => p.duration_days !== 7);
                      setPlans(filtered);
                      setPlansError(null);
                      if (filtered.length > 0) setPlanId(filtered[0].id);
                    })
                    .catch(() => {
                      setPlansError("load_failed");
                    })
                    .finally(() => setLoadingPlans(false));
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1a2942] px-5 py-2.5 text-sm font-semibold text-[#f0ecdb] transition hover:bg-[#26384c]"
              >
                {t("common.try_again")}
              </button>
            </div>
          )}

          {/* ----- Plans ----- */}
          {!loadingPlans && !plansError && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {plans.map((p) => {
                  const active = planId === p.id;
                  const popular = isPopular(p.duration_days);
                  const price = parseFloat(p.price_per_warehouse) || 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlanId(p.id)}
                      className={`group relative flex flex-col rounded-2xl border-2 p-3 text-start transition-all duration-200 ${
                        active
                          ? "z-10 border-[#1a2942] bg-gradient-to-br from-[#1a2942] to-[#26384c] text-[#f0ecdb] scale-[1.02] shadow-lg"
                          : popular
                            ? "border-[#1a2942]/15 bg-white/90 text-[#1a2942] shadow-sm hover:border-[#f3a523]/50 hover:shadow-md hover:-translate-y-0.5"
                            : "border-[#1a2942]/8 bg-white/60 text-[#1a2942] shadow-sm hover:border-[#1a2942]/25 hover:shadow-md hover:-translate-y-0.5"
                      }`}
                    >
                      {popular && (
                        <span
                          className={`absolute -top-2 end-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm ${
                            active
                              ? "bg-[#f3a523] text-[#1a2942]"
                              : "bg-gradient-to-r from-[#f3a523] to-[#e09412] text-white"
                          }`}
                        >
                          {t("subscribe.popular")}
                        </span>
                      )}
                      <div
                        className={`text-[10px] font-semibold uppercase tracking-widest ${active ? "text-[#f3a523]" : "text-[#1a2942]/55"}`}
                      >
                        {p.name}
                      </div>

                      <div className="mt-2 flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black tracking-tight">
                            ${price.toFixed(0)}
                          </span>
                          <span
                            className={`text-[10px] ${active ? "text-[#f0ecdb]/70" : "text-[#1a2942]/55"}`}
                          >
                            / {perLabel(p.duration_days)}
                          </span>
                        </div>
                        <span
                          className={`mt-0.5 text-[10px] ${active ? "text-[#f0ecdb]/55" : "text-[#1a2942]/45"}`}
                        >
                          {t("subscribe.per_warehouse")}
                        </span>
                      </div>

                      {active && (
                        <div className="mt-auto pt-2">
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#f3a523]">
                            <CheckCircle2 className="size-3" /> {t("subscribe.selected")}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Form */}
              <div className="mt-6 space-y-4">
                {selected && (
                  <div className="rounded-xl border border-[#1a2942]/8 bg-white/80 p-3">
                    <div className="flex items-center justify-between text-sm text-[#1a2942]/60">
                      <span>{selected.name}</span>
                      <span className="font-semibold text-[#1a2942]">
                        ${(parseFloat(selected.price_per_warehouse) || 0).toFixed(0)} /{" "}
                        {perLabel(selected.duration_days)}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-[#1a2942]">{t("subscribe.company_name")}</label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#1a2942]/15 bg-white px-3 py-2.5 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523] focus:ring-4 focus:ring-[#f3a523]/15"
                    placeholder="Acme Logistics Inc."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1a2942]">{t("subscribe.warehouses")}</label>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCount(Math.max(1, count - 1))}
                      className="flex size-9 items-center justify-center rounded-lg border border-[#1a2942]/15 bg-white text-sm font-bold text-[#1a2942] transition hover:bg-[#1a2942]/5 disabled:opacity-40"
                      disabled={count <= 1}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={count}
                      onChange={(e) => setCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                      className="w-16 flex-1 rounded-lg border border-[#1a2942]/15 bg-white px-3 py-2.5 text-center text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523] focus:ring-4 focus:ring-[#f3a523]/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCount(count + 1)}
                      className="flex size-9 items-center justify-center rounded-lg border border-[#1a2942]/15 bg-white text-sm font-bold text-[#1a2942] transition hover:bg-[#1a2942]/5"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#1a2942]">{t("subscribe.subdomain")}</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                        setSlugStatus("idle");
                      }}
                      className="flex-1 rounded-lg border border-[#1a2942]/15 bg-white px-3 py-2.5 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523] focus:ring-4 focus:ring-[#f3a523]/15"
                      placeholder="your-company"
                    />
                    <button
                      onClick={verify}
                      disabled={slugStatus === "checking"}
                      className="rounded-lg bg-[#1a2942] px-4 text-sm font-semibold text-[#f0ecdb] transition hover:bg-[#26384c] disabled:opacity-60"
                    >
                      {slugStatus === "checking" ? <Loader2 className="size-4 animate-spin" /> : t("subscribe.verify")}
                    </button>
                  </div>
                  {slugStatus === "ok" && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="size-3.5" /> {slug}.stockyard.com {t("subscribe.available")}
                    </p>
                  )}
                  {slugStatus === "taken" && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <X className="size-3.5" /> {t("subscribe.taken")}
                    </p>
                  )}
                  {slugStatus === "invalid" && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                      <X className="size-3.5" /> {t("subscribe.invalid")}
                    </p>
                  )}
                </div>
              </div>

              {/* Price summary */}
              {selected && (
                <div className="mt-4 overflow-hidden rounded-xl border border-[#1a2942]/10 bg-gradient-to-br from-white to-[#f0ecdb]">
                  <div className="border-b border-[#1a2942]/5 px-4 py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1a2942]/50">
                      {t("subscribe.order_summary")}
                    </span>
                  </div>
                  <div className="space-y-2 px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#1a2942]/70">
                        {selected.name} × {t("subscribe.warehouse_count", { count })}
                      </span>
                      <span className="font-medium text-[#1a2942]">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#1a2942]/50">
                      <span>
                        ${(parseFloat(selected.price_per_warehouse) || 0).toFixed(2)} /{" "}
                        {perLabel(selected.duration_days)} {t("subscribe.per_warehouse")}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        {cycleLabel(selected.duration_days)}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-[#1a2942]/5 bg-[#1a2942]/[0.02] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1a2942]">{t("subscribe.total_due")}</span>
                      <span className="text-lg font-black text-[#1a2942]">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={pay}
                disabled={paying}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f3a523] to-[#e09412] py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] disabled:opacity-60"
              >
                {paying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> {t("subscribe.creating_order")}
                  </>
                ) : !user ? (
                  <span onClick={() => (window.location.href = "/?login=1")}>
                    <LogIn className="size-4" /> {t("subscribe.log_in_to_subscribe")}
                  </span>
                ) : (
                  <>
                    <Wallet className="size-4" /> {t("subscribe.paypal")} — ${total.toFixed(2)}
                  </>
                )}
              </button>
              {user && (
                <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#1a2942]/45">
                  <Shield className="size-3" /> {t("subscribe.secured")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
