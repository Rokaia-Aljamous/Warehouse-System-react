import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Warehouse, Package, Truck, BarChart3, LogOut } from "lucide-react";
import {
  getSubBySlug,
  PLANS,
  setSession,
  type SYSubscription,
} from "@/lib/stockyard-store";

export const Route = createFileRoute("/dashboard/$slug")({
  component: SlugDashboard,
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Stockyard` }] }),
});

function SlugDashboard() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState<SYSubscription | null | undefined>(undefined);

  useEffect(() => {
    setSub(getSubBySlug(slug) ?? null);
  }, [slug]);

  if (sub === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F0EBD8] text-[#1D2D44]">
        Loading…
      </main>
    );
  }

  if (!sub || sub.status !== "active") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F0EBD8] px-6 text-center text-[#1D2D44]">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold">No active subscription</h1>
          <p className="mt-2 text-sm text-[#1D2D44]/70">
            We couldn't find an active subscription for <strong>/{slug}</strong>.
          </p>
          <Link
            to="/stockyard"
            className="mt-5 inline-block rounded-xl bg-[#1D2D44] px-5 py-2.5 text-sm font-semibold text-[#F0EBD8]"
          >
            Go to landing
          </Link>
        </div>
      </main>
    );
  }

  const plan = PLANS.find((p) => p.id === sub.plan)!;

  return (
    <main className="min-h-screen bg-[#F0EBD8] text-[#1D2D44]">
      <header className="border-b border-[#A7B3C3] bg-[#1D2D44] text-[#F0EBD8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Warehouse className="size-5" />
            <span className="font-bold">Stockyard</span>
            <span className="ml-2 rounded-full bg-[#A7B3C3]/30 px-2 py-0.5 text-xs">
              /{sub.slug}
            </span>
          </div>
          <button
            onClick={() => {
              setSession(null);
              window.location.href = "/?login=1";
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#A7B3C3]/20 px-3 py-1.5 text-xs font-semibold hover:bg-[#A7B3C3]/40"
          >
            <LogOut className="size-3.5" /> Log out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-bold">{sub.companyName}</h1>
        <p className="mt-1 text-sm text-[#1D2D44]/70">
          {plan.label} plan · ${plan.price} / {plan.per} · {sub.warehouseCount} warehouse
          {sub.warehouseCount > 1 ? "s" : ""}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Warehouse} label="Warehouses" value={sub.warehouseCount} />
          <Stat icon={Package} label="SKUs" value={1240} />
          <Stat icon={Truck} label="Shipments / wk" value={86} />
          <Stat icon={BarChart3} label="Fill rate" value="97%" />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: sub.warehouseCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#A7B3C3] bg-white/60 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Warehouse #{i + 1}</h3>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Operational
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-[#1D2D44]/60">Capacity</div>
                  <div className="font-semibold">{60 + i * 5}%</div>
                </div>
                <div>
                  <div className="text-xs text-[#1D2D44]/60">Workers</div>
                  <div className="font-semibold">{12 + i * 3}</div>
                </div>
                <div>
                  <div className="text-xs text-[#1D2D44]/60">Open orders</div>
                  <div className="font-semibold">{18 + i * 2}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#A7B3C3] bg-white/60 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[#1D2D44]/70">
        <Icon className="size-4" />
        <span className="text-xs font-semibold uppercase">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
