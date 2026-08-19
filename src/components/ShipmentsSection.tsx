import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, CheckCircle2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  receiveManagerShipment,
  type ManagerShipment, type ManagerShipmentStatus,
} from "@/lib/manager-api";
import { PlanShipmentSections } from "@/components/PlanShipmentSections";

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-light rounded-2xl p-5 shadow-xl text-[#1a2942]", className)}>{children}</div>;
}

/* ===== Shipments ===== */
export function ShipmentsSection({
  slug, shipments, setShipments,
}: {
  slug: string; shipments: ManagerShipment[]; setShipments: React.Dispatch<React.SetStateAction<ManagerShipment[]>>;
}) {
  const { t } = useTranslation();
  const [receiving, setReceiving] = useState<number | null>(null);
  const [planning, setPlanning] = useState<ManagerShipment | null>(null);

  const handleReceive = async (id: number) => {
    setReceiving(id);
    try {
      const res = await receiveManagerShipment(slug, id);
      setShipments((prev) => prev.map((s) => s.id === id ? res.shipment : s));
      toast.success(t("shipment.received_success"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("shipment.receive_failed"));
    } finally { setReceiving(null); }
  };

  const statusColors: Record<ManagerShipmentStatus, string> = { pending: "bg-yellow-100 text-yellow-700", in_transit: "bg-blue-100 text-blue-700", received: "bg-green-100 text-green-700" };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1a2942]">{t("shipment.title")}</h2>
      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[#1a2942]/70">{t("shipment.factory")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("shipment.total")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("shipment.arrival")}</TableHead>
              <TableHead className="text-[#1a2942]/70">{t("employee.status")}</TableHead>
              <TableHead className="text-end text-[#1a2942]/70">{t("common.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((s) => (
              <TableRow key={s.id} className="border-white/40">
                <TableCell className="font-medium text-[#1a2942]">{s.factory_name}</TableCell>
                <TableCell className="text-[#1a2942]">${s.total_price}</TableCell>
                <TableCell className="text-[#1a2942]/80">{s.arrival_date ?? "—"}</TableCell>
                <TableCell><Badge className={cn("text-xs font-medium", statusColors[s.status] ?? "")}>{t(`shipment.status.${s.status}`)}</Badge></TableCell>
                <TableCell className="text-end">
                  <div className="flex items-center justify-end gap-2">
                    {s.status !== "received" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setPlanning(s)}
                      >
                        <LayoutGrid className="size-3 me-1" /> {t("shipment.plan.title")}
                      </Button>
                    )}
                    {s.can_receive ? (
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleReceive(s.id)} disabled={receiving === s.id}>
                        {receiving === s.id ? <Loader2 className="size-3 animate-spin me-1" /> : <CheckCircle2 className="size-3 me-1" />} {t("shipment.receive")}
                      </Button>
                    ) : (
                      <span className="text-xs text-[#1a2942]/50">—</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {shipments.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-[#1a2942]/50">{t("shipment.no_shipments")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </GlassCard>

      {planning && (
        <PlanShipmentSections
          slug={slug}
          shipment={planning}
          open={!!planning}
          onOpenChange={(o) => { if (!o) setPlanning(null); }}
        />
      )}
    </div>
  );
}