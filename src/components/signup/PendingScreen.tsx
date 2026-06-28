import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PendingScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="glass-light w-full max-w-lg rounded-3xl p-8 text-center animate-fade-up sm:p-10">
      <div className="relative mx-auto mb-6 flex size-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[oklch(0.78_0.16_75_/_0.35)]" />
        <span className="relative flex size-20 items-center justify-center rounded-full bg-[oklch(0.78_0.16_75)] shadow-lg animate-float">
          <Sparkles className="size-9 text-white" />
        </span>
      </div>

      <h2 className="text-2xl font-bold text-[oklch(0.28_0.04_252)] sm:text-3xl">
        Welcome to Stockyard!
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm text-[oklch(0.4_0.03_252)]">
        Your account is ready. Now choose a subscription plan to unlock your workspace and start
        managing your warehouse operations.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
        {["Registered", "Subscribe", "Set up"].map((label, i) => (
          <div
            key={label}
            className={`rounded-xl px-2 py-2 font-semibold ${
              i === 0
                ? "bg-[oklch(0.28_0.04_252)] text-[oklch(0.94_0.02_90)]"
                : i === 1
                  ? "bg-[oklch(0.74_0.02_252_/_0.4)] text-[oklch(0.28_0.04_252)] animate-pulse"
                  : "bg-white/50 text-[oklch(0.45_0.03_252)]"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm text-[oklch(0.4_0.03_252)]">
        <ArrowRight className="mr-1 inline size-4" />
        You'll be taken to the plans section automatically.
      </p>

      <Button
        variant="ghost"
        onClick={onBack}
        className="mt-6 text-[oklch(0.35_0.03_252)] hover:bg-white/40 hover:text-[oklch(0.28_0.04_252)]"
      >
        Back to form
      </Button>
    </div>
  );
}
