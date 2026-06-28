import { CheckCircle2, ArrowRight, UserPlus, ShieldCheck, KeyRound } from "lucide-react";

const steps = [
  { icon: UserPlus, label: "User Submits", desc: "Fill the request form" },
  { icon: ShieldCheck, label: "Admin Reviews", desc: "Verification in 24h" },
  { icon: CheckCircle2, label: "Approved / Rejected", desc: "Decision via email" },
  { icon: KeyRound, label: "Access Granted", desc: "Log in and start" },
];

export function Workflow() {
  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur shadow-lg p-5 animate-fade-up" style={{ animationDelay: "400ms" }}>
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#f0ecdb]/60">
        Approval workflow
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
              <ArrowRight className="hidden size-4 shrink-0 text-[#f0ecdb]/30 sm:block" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
