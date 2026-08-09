import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Warehouse,
  Boxes,
  Truck,
  BarChart3,
  Wallet,
  Shield,
  LayoutDashboard,
  Users,
  UserCog,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  List,
  LogIn,
  LogOut,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { SignUpForm } from "@/components/signup/SignUpForm";
import { PendingScreen } from "@/components/signup/PendingScreen";
import warehouseAisle from "@/assets/warehouse-aisle.webp";
import warehouseTeam from "@/assets/warehouse-team.webp";
import {
  api,
  getCsrfCookie,
  fetchSubscriptionPlans,
  checkSlug,
  createPayPalOrder,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  verifyStoredUser,
  type SubscriptionPlan,
} from "@/lib/api";
import { toast } from "sonner";
import i18n from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Route = createFileRoute("/")({
  component: Index,
  validateSearch: (search: Record<string, unknown>): { login?: boolean } => ({
    login: search.login === "1" || undefined,
  }),
  head: () => ({
    meta: [
      { title: `${i18n.t("title.index")} — Stockyard` },
      {
        name: "description",
        content: i18n.t("title.index_desc"),
      },
      <link rel="icon" type="image/svg+xml" href="/logo?v=2" />
    ],
  }),
});

// Relax typing for NAV to allow extension without regenerating route tree here.
const NAV: any = [
  { to: "/dashboard", label: "nav.admin_dashboard", icon: LayoutDashboard },
  { to: "/manager-login", label: "nav.manager_portal", icon: UserCog },
  { to: "/supervisor/dashboard", label: "nav.supervisor", icon: Users },
  { to: "/", label: "nav.stockyard_landing", icon: Warehouse },
] as const;

const FEATURES = [
  {
    icon: Warehouse,
    title: "feature.warehouse_management",
    desc: "feature.warehouse_management.desc",
  },
  {
    icon: Boxes,
    title: "feature.inventory_tracking",
    desc: "feature.inventory_tracking.desc",
  },
  { icon: Truck, title: "feature.shipments", desc: "feature.shipments.desc" },
  { icon: BarChart3, title: "feature.analytics", desc: "feature.analytics.desc" },
];

function Index() {
  const { t } = useTranslation();
  const { login } = Route.useSearch();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState(getStoredUser());

  const handleLogout = async () => {
    try {
      await getCsrfCookie();
      const endpoint = user?.is_admin ? "/platform-admin/logout" : "/logout";
      await api.post(endpoint);
    } catch {
      // Proceed with local logout even if the server request fails
    }
    clearStoredUser();
    setUser(null);
    toast.success(t("index.logged_out"));
  };

  useEffect(() => {
    if (login) setLoginOpen(true);
  }, [login]);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      verifyStoredUser().then((valid) => {
        if (valid) setUser(valid);
        else setUser(null);
      });
    }
  }, []);

  useEffect(() => {
    if (showPlans) {
      const t = setTimeout(() => {
        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
      return () => clearTimeout(t);
    }
  }, [showPlans]);

  return (
    <main className="relative min-h-screen overflow-x-hidden text-[#f0ecdb]">
      {/* ============ Top Nav ============ */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0f1b2d]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#f3a523] shadow-lg shadow-[#f3a523]/30">
              <Warehouse className="size-5 text-[#1a2942]" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#f0ecdb]">{t("app.name")}</span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 lg:flex">
            {NAV.map((n: any) => {
              const params = n.to === "/dashboard" ? undefined : undefined;
              return (
                <Link
                  key={n.label}
                  to={n.to}
                  params={params}
                  activeOptions={{ exact: true }}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#f0ecdb]/75 transition hover:bg-white/10 hover:text-[#f0ecdb] [&.active]:bg-[#f3a523] [&.active]:text-[#1a2942]"
                >
                  <n.icon className="size-3.5" />
                  {t(n.label)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageToggle variant="header" />
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#f0ecdb]/60">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-[#f0ecdb] shadow transition hover:-translate-y-0.5 hover:bg-white/[0.12]"
                >
                  <LogOut className="size-3.5" /> {t("nav.log_out")}
                </button>
              </div>
            ) : (
              <>
                <span className="hidden text-xs text-[#f0ecdb]/60 sm:inline">{t("nav.existing_user")}</span>
                <button
                  onClick={() => setLoginOpen(true)}
                  className="rounded-full bg-[#f3a523] px-4 py-2 text-xs font-bold text-[#1a2942] shadow transition hover:-translate-y-0.5 hover:bg-[#ffb840]"
                >
                  {t("nav.log_in")}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============ Admin Bar ============ */}
      {user?.is_admin && (
        <div className="border-b border-[#f3a523]/20 bg-[#f3a523]/5">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f3a523]">
              {t("nav.admin")}
            </span>
            <Link
              to="/subscribers"
              className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold text-[#f0ecdb]/80 transition hover:bg-white/10 hover:text-[#f0ecdb]"
            >
              <List className="size-3.5" /> {t("nav.subscribers")}
            </Link>
          </div>
        </div>
      )}

      {/* ============ Hero + Form ============ */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute -top-32 right-1/3 size-[480px] rounded-full bg-[#f3a523]/15 blur-[120px]" />
          <div className="absolute -bottom-20 left-0 size-[420px] rounded-full bg-[#3b6fa0]/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-start gap-10 px-6 py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:py-20">
          <div className="space-y-6 animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#f0ecdb]/85 backdrop-blur">
                <Sparkles className="size-3.5 text-[#f3a523]" />
                {t("index.ops_badge")}
              </span>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-[#f0ecdb] md:text-6xl">
              {t("app.tagline")}
            </h1>
            <p className="max-w-xl text-base text-[#f0ecdb]/70 md:text-lg">
              {t("app.description")}
            </p>

            {/* Feature cards */}
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#f3a523]/40 hover:bg-white/[0.07] animate-fade-up"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-[#f3a523]/15">
                    <f.icon className="size-4 text-[#f3a523]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#f0ecdb]">{t(f.title)}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#f0ecdb]/60">{t(f.desc)}</p>
                </div>
              ))}
            </div>

            {/* Wallet banner */}
            <div
              className="relative overflow-hidden rounded-2xl p-5 shadow-xl"
              style={{ background: "linear-gradient(135deg, #f3a523, #e09412)" }}
            >
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/20 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/25 backdrop-blur">
                  <Wallet className="size-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      {t("wallet.new")}
                    </span>
                    <h3 className="text-base font-bold text-white">{t("wallet.title")}</h3>
                  </div>
                  <p className="mt-0.5 text-sm text-white/95">
                    {t("wallet.desc")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:sticky lg:top-24">
            {submitted ? (
              <div className="rounded-3xl bg-[#f0ecdb] p-1">
                <PendingScreen onBack={() => setSubmitted(false)} />
              </div>
            ) : (
              <SignUpForm
                onSubmitted={() => {
                  setUser(getStoredUser());
                  setSubmitted(true);
                  setShowPlans(true);
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* ============ Real-world Operations ============ */}
      <section className="relative border-t border-white/5 bg-[#0d1828]/40">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#f0ecdb]/80">
                <Shield className="size-3.5 text-[#f3a523]" />
                {t("index.built_for_floor")}
              </span>
              <h2 className="mt-3 text-3xl font-bold text-[#f0ecdb] md:text-4xl">
                {t("operations.title")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-[#f0ecdb]/70">
                {t("operations.desc")}
              </p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <figure className="group overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              <img
                src={warehouseAisle}
                alt={t("index.alt_aisle")}
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <figcaption className="bg-[#0f1b2d] px-5 py-3 text-sm text-[#f0ecdb]/80">
                <span className="font-semibold text-[#f3a523]">{t("operations.smart_aisles")}</span> · {t("operations.smart_aisles.desc")}
              </figcaption>
            </figure>
            <figure className="group overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              <img
                src={warehouseTeam}
                alt={t("index.alt_team")}
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <figcaption className="bg-[#0f1b2d] px-5 py-3 text-sm text-[#f0ecdb]/80">
                <span className="font-semibold text-[#f3a523]">{t("operations.team_first")}</span> · {t("operations.team_first.desc")}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ============ Footer CTA + inline plans ============ */}
      <section id="plans" className="relative border-t border-white/5 bg-[#0a1525]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#13243d] to-[#0f1b2d] p-8 text-center shadow-2xl md:p-12">
            <h2 className="text-3xl font-bold text-[#f0ecdb] md:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[#f0ecdb]/70">
              {t("cta.desc")}
            </p>
            <button
              type="button"
              onClick={() => setShowPlans((s) => !s)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f0ecdb] px-6 py-3 text-sm font-bold text-[#1a2942] shadow-lg transition hover:-translate-y-0.5 hover:bg-white"
            >
              {showPlans ? t("cta.hide_plans") : t("cta.review_plans")}
              <ArrowRight
                className={`size-4 transition-transform ${showPlans ? "rotate-90" : ""}`}
              />
            </button>
          </div>

          {showPlans && (
            <div className="mt-8 animate-fade-up">
              <PlansPanel />
            </div>
          )}
        </div>

        <div className="border-t border-white/5 py-6 text-center text-xs text-[#f0ecdb]/40">
          &copy; {new Date().getFullYear()} {t("app.name")} &middot; {t("cta.footer")}
        </div>
      </section>

      {loginOpen && (
        <LoginOverlay
          onClose={() => setLoginOpen(false)}
          onLoginSuccess={() => {
            const u = getStoredUser();
            setUser(u);
            setLoginOpen(false);
            if (!u?.is_admin) {
              setTimeout(() => window.location.href = "/manager", 50);
            }
          }}
          onRegisterSuccess={() => {
            setUser(getStoredUser());
            setTimeout(() => {
              setLoginOpen(false);
              setTimeout(() => {
                setShowPlans(true);
                setTimeout(() => {
                  document
                    .getElementById("plans")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 300);
              }, 50);
            }, 2000);
          }}
        />
      )}
    </main>
  );
}

/* ================= Inline Plans Panel ================= */
const filterPlans = (data: SubscriptionPlan[]) => data.filter((p) => p.duration_days !== 7);

function PlansPanel() {
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
    const abort = new AbortController();
    let mounted = true;

    const load = (signal: AbortSignal) => {
      setLoadingPlans(true);
      fetchSubscriptionPlans(signal)
        .then((data) => {
          if (signal.aborted) return;
          const filtered = filterPlans(data);
          setPlans(filtered);
          setPlansError(null);
          if (filtered.length > 0) setPlanId(filtered[0].id);
        })
        .catch(() => {
          if (signal.aborted) return;
          setPlansError("load_failed");
          toast.error(t("subscribe.load_failed"));
        })
        .finally(() => {
          if (!signal.aborted) setLoadingPlans(false);
        });
    };

    load(abort.signal);

    return () => {
      abort.abort();
    };
  }, []);

  const perLabel = (days: number) => {
    if (days >= 360) return t("plans.year");
    if (days >= 28) return t("plans.month");
    return i18n.t("plans.days", { count: days });
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
      toast.error(t("subscribe.verify_slug_failed"));
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

  /* ----- Loading state ----- */
  if (loadingPlans) {
    return (
      <div className="flex animate-fade-up items-center justify-center rounded-3xl bg-[#f0ecdb] py-20 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-[#1a2942]/60">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm font-medium">{t("subscribe.loading")}</p>
        </div>
      </div>
    );
  }

  /* ----- Load error state ----- */
  if (plansError === "load_failed") {
    return (
      <div className="animate-fade-up overflow-hidden rounded-3xl bg-[#f0ecdb] text-[#1a2942] shadow-2xl">
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-red-100">
            <X className="size-8 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold">{t("subscribe.error_title")}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#1a2942]/70">
            {t("subscribe.error_desc")}
          </p>
          <button
            onClick={() => {
              setLoadingPlans(true);
              setPlansError(null);
              fetchSubscriptionPlans()
                .then((data) => {
                  const filtered = filterPlans(data);
                  setPlans(filtered);
                  setPlansError(null);
                  if (filtered.length > 0) setPlanId(filtered[0].id);
                })
                .catch(() => {
                  setPlansError("load_failed");
                  toast.error(t("subscribe.load_failed"));
                })
                .finally(() => setLoadingPlans(false));
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1a2942] px-6 py-3 text-sm font-semibold text-[#f0ecdb] shadow-lg transition hover:bg-[#26384c]"
          >
            {t("subscribe.try_again")}
          </button>
        </div>
      </div>
    );
  }

  /* ----- Main plans UI ----- */
  return (
    <div className="animate-fade-up overflow-hidden rounded-3xl bg-[#f0ecdb] text-[#1a2942] shadow-2xl">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-[#1a2942]/10 bg-gradient-to-br from-[#f0ecdb] via-[#f5f1e0] to-[#ebe5d0] px-6 py-6 md:px-10">
        <div className="absolute -right-16 -top-16 size-40 rounded-full bg-[#f3a523]/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#f3a523] shadow-md shadow-[#f3a523]/30">
              <Warehouse className="size-4 text-[#1a2942]" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{t("subscribe.title")}</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#1a2942]/70">
            {user
              ? t("subscribe.desc")
              : t("subscribe.login_first")}
          </p>
          {!user && (
            <a
              href="/?login=1"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#f3a523] hover:underline"
            >
              <LogIn className="size-3.5" /> {t("subscribe.login_to_continue")}
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.3fr_1fr] md:px-10">
        {/* ---- Plans grid ---- */}
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#1a2942]/50">
              {t("subscribe.select_plan")}
            </h4>
            {selected && (
              <span className="text-[11px] text-[#1a2942]/50">
                {selected.duration_days}{t("subscribe.billing_cycle")}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-[#1a2942]/60">
                {t("subscribe.no_plans")}
              </div>
            )}
            {plans.map((p) => {
              const active = planId === p.id;
              const popular = isPopular(p.duration_days);
              const price = parseFloat(p.price_per_warehouse) || 0;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={`group relative flex flex-col rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                    active
                      ? "z-10 border-[#1a2942] bg-gradient-to-br from-[#1a2942] to-[#26384c] text-[#f0ecdb] shadow-xl scale-[1.03]"
                      : popular
                        ? "border-[#1a2942]/15 bg-white/90 text-[#1a2942] shadow-md hover:border-[#f3a523]/50 hover:shadow-lg hover:-translate-y-0.5"
                        : "border-[#1a2942]/8 bg-white/60 text-[#1a2942] shadow-sm hover:border-[#1a2942]/25 hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  {popular && (
                    <span
                      className={`absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
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
                      <span className="text-3xl font-black tracking-tight">
                        ${price.toFixed(0)}
                      </span>
                      <span
                        className={`text-xs ${active ? "text-[#f0ecdb]/70" : "text-[#1a2942]/55"}`}
                      >
                        / {perLabel(p.duration_days)}
                      </span>
                    </div>
                    <span
                      className={`mt-0.5 text-[11px] ${active ? "text-[#f0ecdb]/55" : "text-[#1a2942]/45"}`}
                    >
                      {t("subscribe.per_warehouse")}
                    </span>
                  </div>

                  <div className="mt-auto pt-3">
                    {active ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#f3a523]">
                        <CheckCircle2 className="size-3.5" /> {t("subscribe.selected")}
                      </div>
                    ) : (
                      <div
                        className={`text-[11px] font-medium ${popular ? "text-[#1a2942]/60" : "text-[#1a2942]/40"}`}
                      >
                        {p.duration_days} {t("subscribe.days")}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- Form ---- */}
        <div className="space-y-4">
          {selected && (
            <div className="rounded-xl border border-[#1a2942]/8 bg-white/80 p-3">
              <div className="flex items-center justify-between text-sm text-[#1a2942]/60">
                <span>{selected.name}</span>
                <span className="font-semibold text-[#1a2942]">
                  ${(parseFloat(selected.price_per_warehouse) || 0).toFixed(0)} / {perLabel(selected.duration_days)}
                </span>
              </div>
            </div>
          )}

          <Field label={t("subscribe.company_name")}>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t("subscribe.company_placeholder")}
              className="w-full rounded-lg border border-[#1a2942]/15 bg-white px-3 py-2.5 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523] focus:ring-4 focus:ring-[#f3a523]/15"
            />
          </Field>

          <Field label={t("subscribe.warehouses")}>
            <div className="flex items-center gap-2">
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
          </Field>

          <Field label={t("subscribe.subdomain")}>
            <div className="flex gap-2">
              <input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setSlugStatus("idle");
                }}
                placeholder={t("subscribe.slug_placeholder")}
                className="flex-1 rounded-lg border border-[#1a2942]/15 bg-white px-3 py-2.5 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523] focus:ring-4 focus:ring-[#f3a523]/15"
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
          </Field>

          {/* Price summary */}
          {selected && (
            <div className="overflow-hidden rounded-xl border border-[#1a2942]/10 bg-gradient-to-br from-white to-[#f0ecdb]">
              <div className="border-b border-[#1a2942]/5 px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1a2942]/50">
                  {t("subscribe.order_summary")}
                </span>
              </div>
              <div className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#1a2942]/70">
                    {i18n.t("subscribe.warehouse_count", { name: selected.name, count })}
                  </span>
                  <span className="font-medium text-[#1a2942]">${total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#1a2942]/50">
                  <span>
                    {i18n.t("subscribe.per_warehouse_full", {
                      price: (parseFloat(selected.price_per_warehouse) || 0).toFixed(2),
                      period: perLabel(selected.duration_days),
                    })}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    {i18n.t("subscribe.per_period", { period: perLabel(selected.duration_days) })}
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
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#1a2942]">{label}</label>
      {children}
    </div>
  );
}

/* ================= Full-page Login / Signup Overlay ================= */
function LoginOverlay({
  onClose,
  onLoginSuccess,
  onRegisterSuccess,
}: {
  onClose: () => void;
  onLoginSuccess: () => void;
  onRegisterSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupSubmitted, setSignupSubmitted] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [open, setOpen] = useState(false);
  const loggedIn = !!getStoredUser();

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
  }, []);

  useEffect(() => {
    if (loggedIn) {
      verifyStoredUser().then((valid) => {
        if (valid) onLoginSuccess();
      });
    }
  }, []);

  const close = () => {
    setOpen(false);
    setTimeout(onClose, 400);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await getCsrfCookie();
      const endpoint = adminMode ? "/platform-admin/login" : "/login";
      const res = await api.post(endpoint, { email, password });
      const admin = adminMode ? res.data?.admin : null;
      const user = adminMode ? (admin ? { ...admin, is_admin: true } : null) : (res.data?.user || res.data);
      if (user && user.id) {
        setStoredUser(user);
        toast.success(res.data?.message || t("auth.welcome_back_toast"));
        onLoginSuccess();
      } else {
        toast.error(t("auth.no_user_data"));
        setStoredUser(res.data);
      }
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data;
        const msg = data?.message || "";
        const user = data?.user || data;

        if (error.response.status === 409) {
          try {
            await getCsrfCookie();
            const endpoint = adminMode ? "/platform-admin/login" : "/login";
            const res = await api.post(endpoint, { email, password });
            const admin = adminMode ? res.data?.admin : null;
            const recoveredUser = adminMode ? (admin ? { ...admin, is_admin: true } : null) : (res.data?.user || res.data);
            if (recoveredUser && recoveredUser.id) {
              setStoredUser(recoveredUser);
              toast.success(res.data?.message || t("auth.welcome_back_toast"));
              onLoginSuccess();
              return;
            }
          } catch {
            if (user && user.id) {
              setStoredUser(user);
              toast.success(t("auth.logged_in"));
              onLoginSuccess();
              return;
            }
          }
          toast.error(msg || t("auth.session_issue"));
        } else if (error.response.status === 419) {
          toast.error(t("auth.session_expired"));
        } else if (error.response.status >= 500 && user && user.id) {
          setStoredUser(user);
          toast.success(t("auth.logged_in"));
          onLoginSuccess();
        } else {
          toast.error(msg || i18n.t("auth.server_error", { status: error.response.status }));
        }
      } else if (error.request) {
        toast.error(t("auth.no_response"));
      } else {
        toast.error(t("auth.something_went_wrong"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#0f1b2d]/80 backdrop-blur-xl transition-opacity duration-500"
        style={{ opacity: open ? 1 : 0 }}
        onClick={close}
      />

      <div
        className="relative z-10 min-h-screen transition-all duration-700 ease-out"
        style={{
          transform: open ? "translateY(0)" : "translateY(-100%)",
          opacity: open ? 1 : 0,
        }}
      >
        <button
          onClick={close}
          className="fixed right-6 top-6 z-20 rounded-full bg-white/10 p-2 text-[#f0ecdb] backdrop-blur hover:bg-white/20"
        >
          <X className="size-5" />
        </button>

        {/* Login card position: center when login only, drops to bottom when signup shows */}
        <div
          className="flex min-h-screen items-start justify-center px-4 pb-10 transition-all duration-700 ease-out"
          style={{ paddingTop: showSignup ? "50vh" : "20vh" }}
        >
          <div className="w-full max-w-md space-y-6">
            {/* Login card */}
            <div className="rounded-3xl bg-[#f0ecdb] p-8 shadow-2xl transition-all duration-500">
              <h1 className="text-2xl font-bold text-[#1a2942]">{t("auth.welcome_back")}</h1>
              {!loggedIn && (
                <p className="mt-1 text-sm text-[#1a2942]/70">
                  {t("auth.new_here")}{" "}
                  <button
                    onClick={() => setShowSignup(!showSignup)}
                    className="font-semibold text-[#f3a523] hover:underline"
                  >
                    {showSignup ? t("auth.log_in_instead") : t("auth.create_account")}
                  </button>
                </p>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#1a2942]">
                    {adminMode ? t("auth.admin_email") : t("auth.email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={adminMode ? t("auth.admin_email_placeholder") : t("auth.email_placeholder")}
                    className="w-full rounded-lg border border-[#dcdace] bg-white px-3 py-2.5 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523] focus:ring-4 focus:ring-[#f3a523]/15"
                  />
                </div>
                <div className="relative">
                  <label className="mb-1.5 block text-xs font-semibold text-[#1a2942]">
                    {t("auth.password")}
                  </label>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[#dcdace] bg-white px-3 py-2.5 pr-10 text-sm text-[#1a2942] outline-none transition focus:border-[#f3a523] focus:ring-4 focus:ring-[#f3a523]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-[34px] text-[#1a2942]/50 hover:text-[#1a2942]"
                  >
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a2942] py-3 font-semibold text-[#f0ecdb] shadow-lg transition hover:bg-[#26384c] disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> {t("auth.signing_in")}
                    </>
                  ) : (
                    <>
                      <LogIn className="size-4" /> {adminMode ? t("auth.admin_log_in") : t("auth.log_in")}
                    </>
                  )}
                </button>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setAdminMode(!adminMode)}
                    className="text-xs text-[#1a2942]/50 hover:text-[#f3a523] transition-colors"
                  >
                    {adminMode ? t("auth.switch_to_user") : t("auth.switch_to_admin")}
                  </button>
                </div>
              </form>
            </div>

            {/* Signup form - fades in when login drops down */}
            {!loggedIn && (
              <div
                className={`transition-all duration-700 ease-out ${showSignup ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden"}`}
              >
              {signupSubmitted ? (
                <div className="rounded-3xl bg-[#f0ecdb] p-1">
                  <PendingScreen onBack={() => setSignupSubmitted(false)} />
                </div>
              ) : (
                <SignUpForm
                  onSubmitted={() => {
                    setSignupSubmitted(true);
                    onRegisterSuccess?.();
                  }}
                />
              )}
            </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
