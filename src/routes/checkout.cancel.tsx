import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { XCircle, Warehouse, ChevronRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/checkout/cancel")({
  component: CheckoutCancel,
});

function StepIndicator({ current }: { current: 2 }) {
  const steps = ["Registered", "Subscribe", "Set up"];
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
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-500/30"
                      : "bg-[#1a2942]/20 text-[#f0ecdb]/40"
                }`}
              >
                {done ? <ChevronRight className="size-3.5" /> : step}
              </div>
              <span
                className={`text-xs font-medium transition-all ${
                  active ? "text-amber-400" : done ? "text-emerald-400" : "text-[#f0ecdb]/40"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight
                className={`mx-2 size-3.5 transition-all ${step <= current ? "text-[#f0ecdb]/30" : "text-[#f0ecdb]/10"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CheckoutCancel() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#0f1b2d]">
      <header className="border-b border-white/5 bg-[#0f1b2d]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-6 py-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#f3a523] shadow-lg shadow-[#f3a523]/30">
            <Warehouse className="size-5 text-[#1a2942]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#f0ecdb]">{t("app.name")}</span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-8">
          <StepIndicator current={2} />
        </div>

        <div className="rounded-3xl bg-[#f0ecdb] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-amber-100 shadow-lg shadow-amber-500/20">
            <XCircle className="size-10 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1a2942]">{t("checkout.cancel.title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#1a2942]/60">
            {t("checkout.cancel.desc")}
          </p>

          <div className="mx-0 my-6 border-t border-[#1a2942]/10" />

          <p className="text-sm text-[#1a2942]/60">
            You can return to the plans page and try again whenever you're ready.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={() => navigate({ to: "/" })}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a2942] py-3 font-semibold text-[#f0ecdb] shadow-lg transition hover:bg-[#26384c]"
            >
              <ArrowLeft className="size-4" />
              {t("checkout.cancel.return_home")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
