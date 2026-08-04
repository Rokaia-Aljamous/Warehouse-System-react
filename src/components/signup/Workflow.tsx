import { useTranslation } from "react-i18next";
import { CheckCircle2, ArrowRight, UserPlus, ShieldCheck, KeyRound } from "lucide-react";

export function Workflow() {
  const { t } = useTranslation();
  const steps = [
    { icon: UserPlus, label: t("signup.workflow.submit"), desc: t("signup.workflow.submit_desc") },
    { icon: ShieldCheck, label: t("signup.workflow.review"), desc: t("signup.workflow.review_desc") },
    { icon: CheckCircle2, label: t("signup.workflow.decision"), desc: t("signup.workflow.decision_desc") },
    { icon: KeyRound, label: t("signup.workflow.access"), desc: t("signup.workflow.access_desc") },
  ];
  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur shadow-lg p-5 animate-fade-up" style={{ animationDelay: "400ms" }}>
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#f0ecdb]/60">
        {t("signup.workflow.title")}
      </p>
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-1">
        {steps.map((s, i) => (
          <li key={s.label} className="flex flex-1 items-center gap-3">
            <div className="flex flex-1 flex-col items-start gap-2 sm:items-center sm:text-center">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 transition-transform hover:scale-110">
                <s.icon className="size-5 text-[#f3a523]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#f0ecdb]">{s.label}</p>
                <p className="text-[11px] text-[#f0ecdb]/55">{s.desc}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="hidden size-4 shrink-0 text-[#f0ecdb]/30 sm:block rtl:rotate-180" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
