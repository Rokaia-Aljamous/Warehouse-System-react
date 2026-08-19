import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Fingerprint, Scan, Radio, CheckCircle2, XCircle, Clock, Loader2,
  RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  fetchBiometricDevices, fetchEmployeeBiometric, createEnrollmentRequest,
  confirmEnrollmentRequest, cancelEnrollmentRequest, revokeEmployeeBiometric,
  fetchWarehouseAttendance, fetchEmployeeAttendanceDetail,
  type BiometricDevice, type BiometricEmployee, type EmployeeBiometric,
  type BiometricEnrollmentRequest, type AttendanceIndexResponse,
  type AttendanceDetailResponse,
} from "@/lib/biometric-api";

type ManagerBiometricSectionProps = {
  slug: string;
  warehouseId: number;
};

type Tab = "workers" | "attendance";

type EmployeeRow = {
  id: number;
  role: string;
  status: string;
  full_name: string;
  user_name: string;
  phone_number: string | null;
  biometric: EmployeeBiometric | null;
  lastRequest: BiometricEnrollmentRequest | null;
};

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    staff: "bg-sky-500/15 text-sky-300 border-sky-300/30",
    driver: "bg-amber-500/15 text-amber-300 border-amber-300/40",
  };
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize", map[role] ?? "border-white/15 bg-white/10 text-cream/80")}>{t(`biometric.role.${role}`) ?? role.replace("_", " ")}</span>;
}

function EnrollStatusBadge({
  biometric,
  lastRequest,
}: {
  biometric: EmployeeBiometric | null;
  lastRequest: BiometricEnrollmentRequest | null;
}) {
  const { t } = useTranslation();
  const openStatuses = ["pending", "processing", "awaiting_confirmation"];

  if (biometric) {
    const active = biometric.status === "active";
    return (
      <span className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        active ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-300" : "border-white/15 bg-white/10 text-cream/60",
      )}>
        {active ? t("biometric.status.active") : t("biometric.status.revoked")}
      </span>
    );
  }

  if (lastRequest && openStatuses.includes(lastRequest.status)) {
    const map: Record<string, string> = {
      pending: "border-sky-300/40 bg-sky-500/15 text-sky-300",
      processing: "border-indigo-300/40 bg-indigo-500/15 text-indigo-300",
      awaiting_confirmation: "border-amber-300/40 bg-amber-500/15 text-amber-300",
    };
    const labelMap: Record<string, string> = {
      pending: t("biometric.status.pending"),
      processing: t("biometric.status.processing"),
      awaiting_confirmation: t("biometric.status.awaiting_confirmation"),
    };
    return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", map[lastRequest.status])}>{labelMap[lastRequest.status]}</span>;
  }

  return <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-medium text-cream/50">{t("biometric.status.not_enrolled")}</span>;
}

function DeviceStatusDot({ device }: { device: BiometricDevice }) {
  const { t } = useTranslation();
  const online = !!device.last_seen_at && (Date.now() - new Date(device.last_seen_at).getTime()) < 90_000;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-cream/70">
      <span className={cn("size-2 rounded-full", online ? "bg-emerald-400" : "bg-rose-400")} />
      <span className={online ? "text-emerald-300" : "text-cream/60"}>
        {online ? t("biometric.last_seen_online") : t("biometric.last_seen_offline")}
      </span>
    </span>
  );
}

function DayStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    present: "border-emerald-300/40 bg-emerald-500/15 text-emerald-300",
    late: "border-amber-300/40 bg-amber-500/15 text-amber-300",
    early_leave: "border-orange-300/40 bg-orange-500/15 text-orange-300",
    outside_schedule: "border-sky-300/40 bg-sky-500/15 text-sky-300",
    absent: "border-rose-300/40 bg-rose-500/15 text-rose-300",
    scheduled: "border-blue-300/40 bg-blue-500/15 text-blue-300",
    day_off: "border-white/15 bg-white/10 text-cream/50",
    incomplete: "border-yellow-300/40 bg-yellow-500/15 text-yellow-300",
  };
  const labelKey = `attendance.day.${status}`;
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", map[status] ?? "border-white/15 bg-white/10 text-cream/60")}>{t(labelKey)}</span>;
}

export function ManagerBiometricSection({ slug, warehouseId }: ManagerBiometricSectionProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("workers");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceIndexResponse | null>(null);

  const [details, setDetails] = useState<EmployeeRow | null>(null);
  const [enroll, setEnroll] = useState<EmployeeRow | null>(null);
  const [revoke, setRevoke] = useState<EmployeeRow | null>(null);

  const loadDevices = async () => {
    try {
      const res = await fetchBiometricDevices(slug, warehouseId);
      setDevices(res.devices);
    } catch {
      setDevices([]);
    }
  };

  const loadRows = async () => {
    try {
      const res = await fetchWarehouseAttendance(slug, warehouseId);
      const empRows: EmployeeRow[] = [];
      for (const item of res.employees) {
        const emp = item.employee;
        let show: Awaited<ReturnType<typeof fetchEmployeeBiometric>> | null = null;
        try {
          show = await fetchEmployeeBiometric(slug, warehouseId, emp.id);
        } catch {
          show = null;
        }
        const active = show?.active_biometrics?.[0] ?? null;
        const requests = show?.recent_enrollment_requests ?? [];
        const openReq = requests.find((r) => ["pending", "processing", "awaiting_confirmation"].includes(r.status));
        empRows.push({
          id: emp.id,
          role: emp.role,
          status: emp.status,
          full_name: emp.system_user?.full_name ?? `#${emp.id}`,
          user_name: emp.system_user?.user_name ?? "",
          phone_number: emp.system_user?.phone_number ?? null,
          biometric: active,
          lastRequest: openReq ?? requests[0] ?? null,
        });
      }
      setRows(empRows);
    } catch (err: any) {
      setError(err.response?.data?.message || t("common.operation_failed"));
    }
  };

  const loadAttendance = async () => {
    try {
      const res = await fetchWarehouseAttendance(slug, warehouseId);
      setAttendance(res);
    } catch (err: any) {
      setError(err.response?.data?.message || t("common.operation_failed"));
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([loadDevices(), loadRows()])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [warehouseId]);

  useEffect(() => {
    if (tab === "attendance") loadAttendance();
  }, [tab, warehouseId]);

  const refresh = async () => {
    await Promise.all([loadDevices(), loadRows()]);
    if (tab === "attendance") await loadAttendance();
  };

  const activeDevice = devices.find((d) => d.status === "active") ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-cream md:text-3xl">{t("biometric.title")}</h1>
          <p className="mt-1 text-sm text-cream/70">{t("biometric.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={refresh} aria-label={t("common.refresh")}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10 w-fit">
        <button
          onClick={() => setTab("workers")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition",
            tab === "workers" ? "bg-accent text-foreground shadow-sm" : "text-cream/70 hover:text-cream",
          )}
        >
          <Fingerprint className="size-3.5" />
          {t("biometric.section.workers")}
        </button>
        <button
          onClick={() => setTab("attendance")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition",
            tab === "attendance" ? "bg-accent text-foreground shadow-sm" : "text-cream/70 hover:text-cream",
          )}
        >
          <CalendarDays className="size-3.5" />
          {t("biometric.section.attendance")}
        </button>
      </div>

      {error && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.04] p-6 text-center ring-1 ring-white/10">
          <AlertTriangle className="size-8 text-rose-400" />
          <p className="text-sm text-rose-300">{error}</p>
          <Button size="sm" variant="outline" className="border-white/20 text-cream hover:bg-white/10" onClick={refresh}>{t("common.try_again")}</Button>
        </div>
      )}

      {loading && !error ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
              <Skeleton className="mb-3 h-4 w-40 bg-white/10" />
              <Skeleton className="h-3 w-full bg-white/10" />
              <Skeleton className="mt-2 h-3 w-3/4 bg-white/10" />
            </div>
          ))}
        </div>
      ) : tab === "workers" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <p className="text-xs font-medium uppercase tracking-wider text-cream/60">{t("biometric.status.active")}</p>
              <p className="mt-2 text-2xl font-bold text-cream">{rows.filter((r) => r.biometric?.status === "active").length}<span className="text-sm font-medium text-cream/60"> / {rows.length}</span></p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <p className="text-xs font-medium uppercase tracking-wider text-cream/60">{t("biometric.status.awaiting_confirmation")}</p>
              <p className="mt-2 text-2xl font-bold text-amber-300">{rows.filter((r) => r.lastRequest?.status === "awaiting_confirmation").length}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <p className="text-xs font-medium uppercase tracking-wider text-cream/60">{t("biometric.device")}</p>
              <div className="mt-2 flex items-center gap-2">
                {activeDevice ? (
                  <>
                    <span className={cn("size-2.5 rounded-full", (Date.now() - new Date(activeDevice.last_seen_at ?? "").getTime()) < 90_000 ? "bg-emerald-400" : "bg-rose-400")} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cream">{activeDevice.name}</p>
                      <p className="truncate font-mono text-xs text-cream/60">{activeDevice.device_code}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-cream/60">{t("biometric.no_devices")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-cream/70">{t("biometric.employee")}</TableHead>
                    <TableHead className="text-cream/70">{t("biometric.role")}</TableHead>
                    <TableHead className="text-cream/70">{t("biometric.status")}</TableHead>
                    <TableHead className="text-cream/70">{t("biometric.template")}</TableHead>
                    <TableHead className="text-cream/70">{t("biometric.device")}</TableHead>
                    <TableHead className="text-end text-cream/70">{t("biometric.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-white/10 text-cream hover:bg-white/5">
                      <TableCell>
                        <p className="font-medium">{row.full_name}</p>
                        <p className="font-mono text-xs text-cream/60">{row.user_name}</p>
                      </TableCell>
                      <TableCell><RoleBadge role={row.role} /></TableCell>
                      <TableCell><EnrollStatusBadge biometric={row.biometric} lastRequest={row.lastRequest} /></TableCell>
                      <TableCell>
                        {row.biometric ? (
                          <span className="inline-flex items-center gap-1 font-mono text-sm">
                            <Fingerprint className="size-3.5 text-emerald-400" /> #{row.biometric.fingerprint_template_id}
                          </span>
                        ) : (
                          <span className="text-cream/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-cream/70">
                        {row.biometric?.device?.name ?? row.lastRequest?.device?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="text-cream hover:bg-white/10" onClick={() => setDetails(row)}>
                            <Scan className="size-3.5" /> {t("biometric.details")}
                          </Button>
                          {row.lastRequest?.status === "awaiting_confirmation" && (
                            <Button size="sm" className="h-8 bg-amber-500 text-xs text-white hover:bg-amber-600" onClick={() => setEnroll(row)}>
                              {t("biometric.confirm")}
                            </Button>
                          )}
                          {!row.biometric && !["pending", "processing", "awaiting_confirmation"].includes(row.lastRequest?.status ?? "") && (
                            <Button size="sm" className="h-8 text-xs" onClick={() => setEnroll(row)} disabled={!activeDevice}>
                              <Fingerprint className="size-3.5" /> {t("biometric.enroll")}
                            </Button>
                          )}
                          {row.biometric?.status === "active" && (
                            <Button size="sm" variant="outline" className="h-8 border-rose-300/40 text-xs text-rose-300 hover:bg-rose-500/10 hover:text-rose-200" onClick={() => setRevoke(row)}>
                              {t("biometric.revoke")}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-cream/50">{t("biometric.no_employees")}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {!activeDevice && rows.length > 0 && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
              {t("biometric.device_hint")}
            </div>
          )}
        </div>
      ) : (
        <AttendanceTable attendance={attendance} slug={slug} warehouseId={warehouseId} />
      )}

      <EnrollmentDialog
        slug={slug}
        warehouseId={warehouseId}
        employee={enroll}
        devices={devices}
        onDone={refresh}
      />

      <BiometricDetailsDialog slug={slug} warehouseId={warehouseId} row={details} onRefresh={refresh} />

      <RevokeDialog slug={slug} warehouseId={warehouseId} row={revoke} onDone={refresh} />
    </div>
  );
}

/* ================= Attendance table ================= */

function AttendanceTable({
  attendance,
  slug,
  warehouseId,
}: {
  attendance: AttendanceIndexResponse | null;
  slug: string;
  warehouseId: number;
}) {
  const { t } = useTranslation();
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AttendanceIndexResponse | null>(attendance);

  useEffect(() => {
    setData(attendance);
  }, [attendance]);

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    fetchWarehouseAttendance(slug, warehouseId, { from, to })
      .then((res) => setData(res))
      .catch((err: any) => toast.error(err.response?.data?.message || t("common.operation_failed")))
      .finally(() => setLoading(false));
  }, [from, to, warehouseId]);

  const days = data?.employees?.[0]?.attendance ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-cream/70">{t("attendance.range")}</Label>
          <Input type="date" value={from ?? ""} onChange={(e) => setFrom(e.target.value)} className="h-9 w-44 border-white/15 bg-white/5 text-cream" />
          <span className="text-cream/50">→</span>
          <Input type="date" value={to ?? ""} onChange={(e) => setTo(e.target.value)} className="h-9 w-44 border-white/15 bg-white/5 text-cream" />
        </div>
        {loading && <Loader2 className="size-4 animate-spin text-cream/60" />}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="min-w-48 text-cream/70">{t("attendance.employee")}</TableHead>
              <TableHead className="text-cream/70">{t("biometric.role")}</TableHead>
              {days.map((d) => (
                <TableHead key={d.date} className="text-center text-cream/70">
                  <span className="block text-xs">{new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}</span>
                  <span className="block text-[10px] font-normal text-cream/50">{d.date}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.employees ?? []).map((item) => (
              <TableRow key={item.employee.id} className="border-white/10 text-cream hover:bg-white/5">
                <TableCell>
                  <p className="font-medium">{item.employee.system_user?.full_name}</p>
                  <p className="font-mono text-xs text-cream/60">{item.employee.system_user?.user_name}</p>
                </TableCell>
                <TableCell><RoleBadge role={item.employee.role} /></TableCell>
                {item.attendance.map((d) => (
                  <TableCell key={d.date} className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <DayStatusBadge status={d.day_status} />
                      {(d.attendance?.check_in_time || d.attendance?.check_out_time) && (
                        <span className="font-mono text-[10px] text-cream/70">
                          {d.attendance?.check_in_time ?? "—"} / {d.attendance?.check_out_time ?? "—"}
                        </span>
                      )}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {(data?.employees?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={2 + days.length} className="py-10 text-center text-cream/50">{t("attendance.no_records")}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ================= Details dialog ================= */

function BiometricDetailsDialog({
  slug,
  warehouseId,
  row,
  onRefresh,
}: {
  slug: string;
  warehouseId: number;
  row: EmployeeRow | null;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [show, setShow] = useState<Awaited<ReturnType<typeof fetchEmployeeBiometric>> | null>(null);
  const [attendance, setAttendance] = useState<AttendanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!row) {
      setShow(null);
      setAttendance(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchEmployeeBiometric(slug, warehouseId, row.id).catch(() => null),
      fetchEmployeeAttendanceDetail(slug, warehouseId, row.id).catch(() => null),
    ])
      .then(([s, a]) => {
        setShow(s);
        setAttendance(a);
      })
      .finally(() => setLoading(false));
  }, [row, warehouseId]);

  if (!row) return null;

  const requests = [...(show?.recent_enrollment_requests ?? [])].reverse();

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onRefresh()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1D2D44]">{row.full_name}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{row.user_name}</span> · <RoleBadge role={row.role} /> · {row.phone_number}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="size-5 animate-spin text-[#1D2D44]/60" /></div>
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[#1D2D44]">{t("biometric.status.active")}</h4>
              {show?.active_biometrics?.length ? (
                <div className="space-y-2">
                  {show.active_biometrics.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-xl border bg-muted px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1D2D44]">
                        <Fingerprint className="size-4 text-emerald-600" /> Template #{b.fingerprint_template_id}
                      </span>
                      <div className="text-end">
                        <p className="font-mono text-xs text-[#1D2D44]">{b.device?.name} · {b.device?.device_code}</p>
                        <p className="text-xs text-muted-foreground">{t("biometric.enrolled_at")}: {b.enrolled_at ? new Date(b.enrolled_at).toLocaleString() : "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{t("biometric.status.not_enrolled")}</p>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-[#1D2D44]">{t("biometric.enroll.step.confirm")} / {t("attendance.history")}</h4>
              <div className="space-y-2">
                {requests.slice(0, 5).map((r) => (
                  <div key={r.id} className="rounded-xl border bg-muted p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#1D2D44]">Request #{r.id}</span>
                      <EnrollStatusBadge biometric={null} lastRequest={r} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("biometric.device")}: {r.device?.name ?? "—"} · {t("biometric.template")}: #{r.fingerprint_template_id}
                    </p>
                    {r.error_message && <p className="mt-1 text-xs text-red-500">{r.error_message}</p>}
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{t("attendance.no_records")}</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-[#1D2D44]">{t("attendance.title")}</h4>
              {attendance?.attendance?.length ? (
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[#1D2D44]">{t("attendance.date")}</TableHead>
                        <TableHead className="text-[#1D2D44]">{t("attendance.check_in")}</TableHead>
                        <TableHead className="text-[#1D2D44]">{t("attendance.check_out")}</TableHead>
                        <TableHead className="text-[#1D2D44]">{t("attendance.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.attendance.slice(0, 14).map((d) => (
                        <TableRow key={d.date} className="border-white/40">
                          <TableCell className="font-mono text-xs text-[#1D2D44]">{d.date}</TableCell>
                          <TableCell className="font-mono text-xs text-[#1D2D44]">{d.attendance?.check_in_time ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs text-[#1D2D44]">{d.attendance?.check_out_time ?? "—"}</TableCell>
                          <TableCell><DayStatusBadge status={d.day_status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{t("attendance.no_records")}</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ================= Enrollment dialog with guided steps ================= */

type EnrollStep =
  | "device"
  | "active_request"
  | "waiting"
  | "scanning"
  | "confirm_ready"
  | "completed"
  | "failed";

function stepFromRequest(req: BiometricEnrollmentRequest | null): EnrollStep {
  if (!req) return "device";
  switch (req.status) {
    case "pending":
      return "waiting";
    case "processing":
      return "scanning";
    case "awaiting_confirmation":
      return "confirm_ready";
    case "completed":
      return "completed";
    default:
      return "failed";
  }
}

function isDuplicateFingerprintError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /already exists on sensor as template ID/i.test(message);
}

function EnrollmentDialog({
  slug,
  warehouseId,
  employee,
  devices,
  onDone,
}: {
  slug: string;
  warehouseId: number;
  employee: EmployeeRow | null;
  devices: BiometricDevice[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [activeDevice, setActiveDevice] = useState<string>("");
  const [note, setNote] = useState("");
  const [request, setRequest] = useState<BiometricEnrollmentRequest | null>(null);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const open = !!employee;

  const activeDevices = devices.filter((d) => d.status === "active");

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      stopPolling();
      setRequest(null);
      setNote("");
      setStarting(false);
      setBusy(false);
      setCountdown(null);
      setActiveDevice(activeDevices[0]?.device_code ?? "");
    }
  }, [open, devices.length]);

  useEffect(() => () => stopPolling(), []);

  const step = stepFromRequest(request);

  const role = employee?.role === "driver" ? "driver" : "staff";

  const poll = async () => {
    if (!request) return;
    try {
      const show = await fetchEmployeeBiometric(slug, warehouseId, request.employee_id);
      const fresh = show.recent_enrollment_requests.find((r) => r.id === request.id) ?? null;
      setRequest(fresh);
      setCountdown(fresh?.expires_in_seconds ?? null);
      if (fresh && ["pending", "processing"].includes(fresh.status)) {
        if (fresh.status === "processing") {
          stopPolling();
          timerRef.current = setInterval(poll, 4000);
        }
      }
      if (fresh && ["awaiting_confirmation", "completed", "failed", "expired", "cancelled"].includes(fresh.status)) {
        stopPolling();
      }
    } catch {
      /* transient network error, keep polling */
    }
  };

  useEffect(() => {
    if (!request || !open) return;
    stopPolling();
    timerRef.current = setInterval(poll, 3000);
    return () => stopPolling();
  }, [request?.id, open]);

  const start = async () => {
    if (!employee || !activeDevice) return;
    setStarting(true);
    try {
      const res = await createEnrollmentRequest(slug, warehouseId, employee.id, {
        device_code: activeDevice,
        note: note || undefined,
        role,
      });
      setRequest(res.enrollment_request);
      toast.success(t("biometric.enroll.start"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.operation_failed"));
    } finally {
      setStarting(false);
    }
  };

  const confirmNow = async () => {
    if (!employee || !request) return;
    setBusy(true);
    try {
      await confirmEnrollmentRequest(slug, warehouseId, employee.id, request.id, role);
      toast.success(t("biometric.enroll.confirm_success"));
      stopPolling();
      setRequest({ ...request, status: "completed" });
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.operation_failed"));
    } finally {
      setBusy(false);
    }
  };

  const cancelNow = async () => {
    if (!employee || !request) return;
    if (!["pending", "processing", "awaiting_confirmation"].includes(request.status)) return;
    setBusy(true);
    try {
      await cancelEnrollmentRequest(slug, warehouseId, employee.id, request.id, role);
      toast.success(t("biometric.cancel_success"));
      stopPolling();
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.operation_failed"));
    } finally {
      setBusy(false);
    }
  };

  const elapsed = useMemo(() => {
    if (!request) return "";
    if (request.status === "awaiting_confirmation") return t("biometric.enroll.scan_complete");
    if (request.status === "pending") return t("biometric.enroll.waiting");
    if (request.status === "processing") return t("biometric.enroll.place_finger");
    if (countdown != null) return `${Math.ceil(countdown / 60)}m ${countdown % 60}s`;
    return "";
  }, [request, countdown]);

  const steps: { id: EnrollStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "device", label: t("biometric.enroll.step.device"), icon: Radio },
    { id: "waiting", label: t("biometric.enroll.step.wait"), icon: Clock },
    { id: "scanning", label: t("biometric.enroll.step.place"), icon: Scan },
    { id: "confirm_ready", label: t("biometric.enroll.step.captured"), icon: CheckCircle2 },
    { id: "completed", label: t("biometric.enroll.step.confirm"), icon: CheckCircle2 },
  ];

  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && stopPolling()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1D2D44]">
            {employee?.lastRequest?.status === "awaiting_confirmation"
              ? t("biometric.confirm_title")
              : t("biometric.enroll")}
          </DialogTitle>
          <DialogDescription>
            {employee?.full_name} · <RoleBadge role={employee?.role ?? ""} />
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = i < stepIndex || step === "completed";
            const current = i === stepIndex;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "grid size-8 place-items-center rounded-full text-xs font-bold",
                  done ? "bg-emerald-500 text-white" : current ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-400",
                )}>
                  {done ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                </div>
                <span className={cn("text-[10px] font-medium", current ? "text-amber-600" : "text-[#1D2D44]/60")}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-muted p-4">
          {step === "device" && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-[#1D2D44]/70">{t("biometric.device")}</Label>
                <Select value={activeDevice} onValueChange={setActiveDevice}>
                  <SelectTrigger className="mt-1 w-full text-[#1D2D44]">
                    <SelectValue placeholder={t("common.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDevices.map((d) => (
                      <SelectItem key={d.id} value={d.device_code}>
                        {`${d.name} (${d.device_code}) · ${d.template_capacity}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#1D2D44]/70">{t("common.note")}</Label>
                <Input className="mt-1 text-[#1D2D44]" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <p className="text-xs text-[#1D2D44]/60">{t("biometric.enroll.desc")}</p>
              <Button
                className="w-full bg-amber-500 text-white hover:bg-amber-600"
                onClick={start}
                disabled={starting || !activeDevice}
              >
                {starting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Radio className="size-4" />
                )}{" "}
                {t("biometric.enroll.start")}
              </Button>
            </div>
          )}

          {step === "waiting" && (
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-sky-600" />
              <p className="text-sm text-[#1D2D44]">{t("biometric.enroll.waiting")}</p>
            </div>
          )}

          {step === "scanning" && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                <Scan className="size-4" /> {t("biometric.enroll.place_finger")}
              </p>
              <p className="text-xs text-[#1D2D44]/70">{t("biometric.enroll.remove_finger")}</p>
              <p className="text-xs text-[#1D2D44]/70">{t("biometric.enroll.repeat_scan")}</p>
            </div>
          )}

          {step === "confirm_ready" && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <CheckCircle2 className="size-4" /> {t("biometric.enroll.scan_complete")}
              </p>
              <p className="text-xs text-[#1D2D44]/70">{t("biometric.enroll.close")}</p>
              <div className="flex gap-2">
                <Button className="bg-amber-500 text-white hover:bg-amber-600" onClick={confirmNow} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} {t("biometric.confirm")}
                </Button>
                <Button variant="outline" onClick={cancelNow} disabled={busy}>{t("biometric.cancel")}</Button>
              </div>
            </div>
          )}

          {step === "completed" && (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="size-4" /> {t("biometric.enroll.done")}
            </p>
          )}

          {step === "failed" && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium text-red-600">
                <XCircle className="size-4" />
                {request?.status === "expired"
                  ? t("biometric.enroll.timeout")
                  : isDuplicateFingerprintError(request?.error_message)
                    ? t("biometric.enroll.duplicate")
                    : t("biometric.enroll.failed", { error: request?.error_message ?? request?.status ?? "" })}
              </p>
              <Button size="sm" variant="outline" onClick={start} disabled={starting}>
                {starting ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {t("biometric.enroll.start")}
              </Button>
            </div>
          )}

          {elapsed && ["waiting", "scanning", "pending", "processing", "awaiting_confirmation"].includes(step) && (
            <p className="mt-3 text-xs text-[#1D2D44]/60">{elapsed}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {["waiting", "scanning"].includes(step) && (
            <Button variant="outline" onClick={cancelNow} disabled={busy}>{t("biometric.cancel")}</Button>
          )}
          <Button variant="ghost" onClick={() => stopPolling()}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Revoke dialog ================= */

function RevokeDialog({
  slug,
  warehouseId,
  row,
  onDone,
}: {
  slug: string;
  warehouseId: number;
  row: EmployeeRow | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!row) return;
    setBusy(true);
    try {
      await revokeEmployeeBiometric(slug, warehouseId, row.id);
      toast.success(t("biometric.revoke_success"));
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.operation_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={!!row} onOpenChange={(o) => !o && onDone()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1D2D44]">{t("biometric.revoke_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {row ? t("biometric.revoke_desc", { employee: row.full_name }) : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={run} className="bg-red-600 hover:bg-red-700" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} {t("biometric.revoke")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}