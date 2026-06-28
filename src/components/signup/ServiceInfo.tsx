import { Warehouse, Boxes, Truck, BarChart3, Wallet, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const features = [
  { icon: Warehouse, title: "Warehouse Management", desc: "Multi-zone control, bin mapping, smart picking routes." },
  { icon: Boxes, title: "Inventory Tracking", desc: "Real-time stock levels, low-stock alerts, batch & SKU history." },
  { icon: Truck, title: "Shipments", desc: "Inbound & outbound dispatch with carrier tracking." },
  { icon: BarChart3, title: "Analytics", desc: "Throughput, dwell time and turnover dashboards." },
];

export function ServiceInfo() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#f0ecdb]/90 backdrop-blur">
          <span className="size-1.5 rounded-full bg-[#f3a523] animate-pulse" />
          Operations Suite
        </span>
        <h1 className="text-4xl font-bold leading-tight text-[#f0ecdb] md:text-5xl">
          Run your warehouse like <span className="text-[#f3a523]">clockwork</span>.
        </h1>
        <p className="max-w-md text-base text-[#f0ecdb]/75">
          Request access to the unified platform for inventory, dispatch and finance — built for modern logistics teams.
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
            <h3 className="text-sm font-semibold text-[#f0ecdb]">{f.title}</h3>
            <p className="mt-1 text-xs text-[#f0ecdb]/60">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Highlighted Wallet */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 animate-fade-up animate-pulse-glow"
        style={{ background: "linear-gradient(135deg, #f3a523, #e09412)", animationDelay: "320ms" }}
      >
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 backdrop-blur animate-float">
            <Wallet className="size-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90">
                New
              </span>
              <h3 className="text-lg font-bold text-white">Online Payment Wallet</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Wallet info">
                    <HelpCircle className="size-4 text-white/80 hover:text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Top up, settle invoices and pay carriers — all in-app.</TooltipContent>
              </Tooltip>
            </div>
            <p className="mt-1 text-sm text-white/95">
              Settle invoices, pay carriers and top up balances instantly — without leaving the platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
