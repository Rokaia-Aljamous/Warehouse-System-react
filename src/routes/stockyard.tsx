import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Warehouse, BarChart3, Package, Shield, Truck } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { WAREHOUSE_IMG } from "@/lib/stockyard-store";
import { getStoredUser } from "@/lib/api";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/stockyard")({
  component: Landing,
  head: () => ({
    meta: [
      { title: `${i18n.t("title.stockyard")} — Stockyard` },
      {
        name: "description",
        content: i18n.t("title.stockyard_desc"),
      },
    ],
  }),
});

const FEATURES = [
  { icon: Package, titleKey: "stockyard.feature.inventory.title", textKey: "stockyard.feature.inventory.desc" },
  { icon: Truck, titleKey: "stockyard.feature.shipments.title", textKey: "stockyard.feature.shipments.desc" },
  { icon: BarChart3, titleKey: "stockyard.feature.analytics.title", textKey: "stockyard.feature.analytics.desc" },
  { icon: Shield, titleKey: "stockyard.feature.secure.title", textKey: "stockyard.feature.secure.desc" },
];

function Landing() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const loggedIn = !!getStoredUser();

  return (
    <main className="min-h-screen bg-[#F0EBD8] text-[#1D2D44]">
      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/stockyard" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#1D2D44]">
            <Warehouse className="size-5 text-[#F0EBD8]" />
          </div>
          <span className="text-lg font-bold tracking-tight">{t("app.name")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle variant="header" />
          {!loggedIn && (
            <Link
              to="/signup"
              className="rounded-lg border border-[#1D2D44] px-4 py-2 text-sm font-semibold hover:bg-[#1D2D44] hover:text-[#F0EBD8]"
            >
              {t("stockyard.sign_up")}
            </Link>
          )}
          <a
            href={loggedIn ? "/" : "/?login=1"}
            className="rounded-lg bg-[#1D2D44] px-4 py-2 text-sm font-semibold text-[#F0EBD8] hover:opacity-90"
          >
            {loggedIn ? t("sidebar.dashboard") : t("nav.log_in")}
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
        <div className="animate-slide-up">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            {t("stockyard.tagline")}
          </h1>
          <p className="mt-4 text-lg text-[#1D2D44]/75">
            {t("stockyard.desc")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl bg-[#1D2D44] px-6 py-3 text-sm font-semibold text-[#F0EBD8] shadow-lg transition hover:opacity-90"
            >
              {t("stockyard.subscribe_now")}
            </button>
            {!loggedIn && (
              <Link
                to="/signup"
                className="rounded-xl border-2 border-[#1D2D44] px-6 py-3 text-sm font-semibold hover:bg-[#1D2D44] hover:text-[#F0EBD8]"
              >
                {t("stockyard.get_started")}
              </Link>
            )}
          </div>
        </div>
        <div className="relative animate-slide-up [animation-delay:90ms]">
          <img
            src={WAREHOUSE_IMG}
            alt={t("stockyard.image_alt")}
            className="w-full rounded-3xl object-cover shadow-2xl"
            loading="lazy"
          />
          <div className="absolute -bottom-4 -start-4 hidden rounded-2xl bg-[#1D2D44] p-4 text-[#F0EBD8] shadow-xl sm:block">
            <div className="text-xs opacity-70">{t("stockyard.active_sites")}</div>
            <div className="text-2xl font-bold">128</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="text-2xl font-bold sm:text-3xl">{t("stockyard.features_title")}</h2>
        <div className="stagger-fade mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.titleKey}
              className="rounded-2xl border border-[#A7B3C3] bg-white/50 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#1D2D44] text-[#F0EBD8]">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{t(f.titleKey)}</h3>
              <p className="mt-1 text-sm text-[#1D2D44]/70">{t(f.textKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="animate-slide-up rounded-3xl bg-[#1D2D44] p-10 text-center text-[#F0EBD8]">
          <h3 className="text-2xl font-bold sm:text-3xl">{t("cta.title")}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm opacity-80">
            {t("stockyard.cta_desc")}
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-5 rounded-xl bg-[#F0EBD8] px-6 py-3 text-sm font-semibold text-[#1D2D44] hover:bg-white"
          >
            {t("stockyard.subscribe_now")}
          </button>
        </div>
      </section>

      <SubscriptionModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={(slug) => {
          setOpen(false);
          navigate({ to: "/dashboard/$slug", params: { slug } });
        }}
      />
    </main>
  );
}
