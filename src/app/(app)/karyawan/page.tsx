"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Check, Printer, Save, Users } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatAngka, formatTanggal, formatWaktu, rupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { useAppSession } from "@/components/SessionProvider";
import type { AttendanceStatus, Role } from "@/lib/types";
import type { PayrollView } from "@/lib/services/payroll";

type UserView = {
  id: string;
  name: string;
  role: Role;
};

type AttRecord = {
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
};

type AttView = {
  userId: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  note?: string;
};

type PayrollItem = {
  userId: string;
  name: string;
  role: string;
  dailyRate: number;
  daysPresent: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  cuti: number;
  totalHours: number;
  allowance: number;
  overtimePay: number;
  deductions: number;
  gross: number;
  net: number;
};

type Adjustment = { tunjangan: number; lembur: number; potongan: number };

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  active: string;
}[] = [
  { value: "hadir", label: "Hadir", active: "bg-success-soft text-success border-success" },
  { value: "izin", label: "Izin", active: "bg-info-soft text-info border-info" },
  { value: "sakit", label: "Sakit", active: "bg-accent-soft text-amber-800 border-accent" },
  { value: "alpha", label: "Alpha", active: "bg-danger-soft text-danger border-danger" },
  { value: "cuti", label: "Cuti", active: "bg-stone-100 text-muted border-line" },
];

const INACTIVE_CHIP = "bg-surface text-muted border-line hover:bg-brand/20";

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function currentMonthISO() {
  return todayISO().slice(0, 7);
}

export default function KaryawanPage() {
  const { role: currentRole } = useAppSession();
  const isAdmin = currentRole === "admin";
  const [tab, setTab] = useState<"absensi" | "gaji">("absensi");

  const { toast, showToast, dismiss } = useToast();

  // ---------- Absensi ----------
  const [attDate, setAttDate] = useState(todayISO());
  const [users, setUsers] = useState<UserView[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttRecord>>({});
  const [attLoading, setAttLoading] = useState(false);
  const [attSaving, setAttSaving] = useState(false);
  const [attError, setAttError] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: UserView[] }>("/api/users?light=1");
      setUsers(res?.data ?? []);
    } catch (e) {
      setUsers([]);
      showToast(e instanceof Error ? e.message : "Gagal memuat daftar karyawan", "error");
    }
  }, [showToast]);

  const loadAttendance = useCallback(
    async (date: string) => {
      setAttLoading(true);
      setAttError("");
      try {
        const res = await apiFetch<{ data: AttView[] }>(
          `/api/attendance?date=${encodeURIComponent(date)}`,
        );
        const map: Record<string, AttRecord> = {};
        for (const row of res?.data ?? []) {
          map[row.userId] = {
            status: row.status,
            checkIn: row.checkIn ?? undefined,
            checkOut: row.checkOut ?? undefined,
          };
        }
        setAttendance(map);
      } catch (e) {
        setAttendance({});
        setAttError(e instanceof Error ? e.message : "Gagal memuat absensi");
      } finally {
        setAttLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadAttendance(attDate);
  }, [attDate, loadAttendance]);

  // Initialize default "hadir" record for every user on load.
  useEffect(() => {
    if (attLoading) return;
    setAttendance((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const u of users) {
        if (!next[u.id]) {
          next[u.id] = { status: "hadir", checkIn: null, checkOut: null };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [users, attLoading]);

  function setRecStatus(empId: string, status: AttendanceStatus) {
    setAttendance((prev) => ({
      ...prev,
      [empId]: { ...(prev[empId] ?? { status: "hadir" }), status },
    }));
  }

  function setRecTime(empId: string, field: "checkIn" | "checkOut", value: string) {
    setAttendance((prev) => ({
      ...prev,
      [empId]: { ...(prev[empId] ?? { status: "hadir" }), [field]: value || null },
    }));
  }

  async function saveAttendance() {
    setAttError("");
    setAttSaving(true);
    try {
      const activeIds = new Set(users.map((u) => u.id));
      const sanitizedRecords: Record<
        string,
        { status: AttendanceStatus; checkIn?: string; checkOut?: string }
      > = {};
      // Build default record for every user, then overlay existing state.
      for (const u of users) {
        const rec = attendance[u.id] ?? { status: "hadir" as AttendanceStatus };
        sanitizedRecords[u.id] = {
          status: rec.status,
          checkIn: rec.checkIn?.trim() ? rec.checkIn.trim() : undefined,
          checkOut: rec.checkOut?.trim() ? rec.checkOut.trim() : undefined,
        };
      }
      for (const [userId, rec] of Object.entries(attendance)) {
        if (!activeIds.has(userId)) continue;
        if (sanitizedRecords[userId]) continue;
        sanitizedRecords[userId] = {
          status: rec.status,
          checkIn: rec.checkIn?.trim() ? rec.checkIn.trim() : undefined,
          checkOut: rec.checkOut?.trim() ? rec.checkOut.trim() : undefined,
        };
      }
      await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ date: attDate, records: sanitizedRecords }),
      });
      await loadAttendance(attDate);
      showToast("Absensi tersimpan.", "success");
    } catch (e) {
      setAttError(e instanceof Error ? e.message : "Gagal menyimpan absensi");
    } finally {
      setAttSaving(false);
    }
  }

  // ---------- Gaji ----------
  const [period, setPeriod] = useState(currentMonthISO());
  const [payroll, setPayroll] = useState<PayrollView | null>(null);
  const [adjustments, setAdjustments] = useState<Record<string, Adjustment>>({});
  const [payLoading, setPayLoading] = useState(false);
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState("");
  type PayrollRow = PayrollItem & { adj: Adjustment; pokok: number };
  const [printSlip, setPrintSlip] = useState<PayrollRow | null>(null);
  const finalized = payroll?.status === "final";

  const loadPayroll = useCallback(async () => {
    if (!period) {
      setPayError("Periode wajib diisi");
      return;
    }
    setPayLoading(true);
    setPayError("");
    try {
      const res = await apiFetch<{ data: PayrollView }>(
        `/api/payroll?period=${encodeURIComponent(period)}`,
      );
      const data = res?.data ?? null;
      setPayroll(data);
      setAdjustments(
        Object.fromEntries(
          (data?.items ?? []).map((it) => [
            it.userId,
            { tunjangan: it.allowance, lembur: it.overtimePay, potongan: it.deductions },
          ]),
        ),
      );
    } catch (e) {
      setPayroll(null);
      setPayError(e instanceof Error ? e.message : "Gagal memuat rekap gaji");
    } finally {
      setPayLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadPayroll();
  }, [loadPayroll]);

  function adjust(empId: string, field: keyof Adjustment, value: number) {
    if (!Number.isFinite(value) || value < 0) {
      showToast("Nilai tidak boleh negatif", "error");
      return;
    }
    if (!Number.isInteger(value)) {
      showToast("Masukkan angka bulat", "error");
      return;
    }
    setAdjustments((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] ?? { tunjangan: 0, lembur: 0, potongan: 0 }),
        [field]: value,
      },
    }));
  }

  async function persistPayroll(finalize: boolean): Promise<PayrollView | null> {
    if (!period) {
      showToast("Periode wajib diisi", "error");
      return null;
    }
    // Validate integer, non-negative adjustments.
    for (const [uid, adj] of Object.entries(adjustments)) {
      for (const v of [adj.tunjangan, adj.lembur, adj.potongan]) {
        if (!Number.isInteger(v) || v < 0) {
          showToast("Penyesuaian harus berupa angka bulat non-negatif", "error");
          return null;
        }
      }
      void uid;
    }
    setPaySaving(true);
    setPayError("");
    try {
      const res = await apiFetch<{ data: PayrollView }>("/api/payroll", {
        method: "POST",
        body: JSON.stringify({ period, adjustments, finalize }),
      });
      const data = res?.data ?? null;
      setPayroll(data);
      showToast(finalize ? "Payroll difinalisasi." : "Draft payroll tersimpan.", "success");
      return data;
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Gagal menyimpan payroll");
      return null;
    } finally {
      setPaySaving(false);
    }
  }

  function finalizePayroll() {
    if (!isAdmin || finalized) return;
    if (payLoading) {
      showToast("Masih memuat data payroll", "error");
      return;
    }
    if (payError || !payroll) {
      showToast("Gagal memuat payroll; muat ulang terlebih dahulu", "error");
      return;
    }
    if (!window.confirm("Finalisasi payroll bulan ini? Nominal akan terkunci dan tidak dapat diubah.")) {
      return;
    }
    void (async () => {
      const saved = await persistPayroll(false);
      if (!saved) return;
      await persistPayroll(true);
    })();
  }

  const rows = useMemo<PayrollRow[]>(() => {
    return (payroll?.items ?? []).map((it) => {
      const adj = adjustments[it.userId] ?? {
        tunjangan: it.allowance,
        lembur: it.overtimePay,
        potongan: it.deductions,
      };
      const pokok = it.daysPresent * it.dailyRate;
      const computedNet = pokok + adj.tunjangan + adj.lembur - adj.potongan;
      const net = payroll?.status === "final" ? it.net : computedNet;
      return { ...it, adj, pokok, net };
    });
  }, [payroll, adjustments]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          hadir: acc.hadir + r.hadir,
          izin: acc.izin + r.izin,
          sakit: acc.sakit + r.sakit,
          alpha: acc.alpha + r.alpha,
          cuti: acc.cuti + r.cuti,
          totalHours: acc.totalHours + r.totalHours,
          pokok: acc.pokok + r.pokok,
          tunjangan: acc.tunjangan + r.adj.tunjangan,
          lembur: acc.lembur + r.adj.lembur,
          potongan: acc.potongan + r.adj.potongan,
          net: acc.net + r.net,
        }),
        { hadir: 0, izin: 0, sakit: 0, alpha: 0, cuti: 0, totalHours: 0, pokok: 0, tunjangan: 0, lembur: 0, potongan: 0, net: 0 },
      ),
    [rows],
  );

  // Print slip: single trigger.
  useEffect(() => {
    if (printSlip) window.print();
  }, [printSlip]);

  useEffect(() => {
    setPrintSlip(null);
  }, [period]);

  useEffect(() => {
    if (!printSlip) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPrintSlip(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [printSlip]);

  const TAB_ORDER: ("absensi" | "gaji")[] = ["absensi", "gaji"];
  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, current: "absensi" | "gaji") {
    const idx = TAB_ORDER.indexOf(current);
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % TAB_ORDER.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TAB_ORDER.length - 1;
    else return;
    e.preventDefault();
    const nextKey = TAB_ORDER[next];
    setTab(nextKey);
    document.getElementById(`tab-${nextKey}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Karyawan</h1>
        <p className="text-sm text-muted">Absensi harian dan rekap gaji bulanan.</p>
      </div>

      {/* Tabs */}
      <div role="tablist" className="grid grid-cols-2 gap-2 rounded-[var(--radius-md)] bg-stone-100 p-1">
        {[
          { key: "absensi" as const, label: "Absensi", icon: Users, panel: "panel-absensi" },
          { key: "gaji" as const, label: "Gaji", icon: Calendar, panel: "panel-gaji" },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={t.panel}
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKeyDown(e, t.key)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold transition",
                tab === t.key ? "bg-ink text-white" : "text-muted hover:bg-stone-200",
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ============ Tab Absensi ============ */}
      {tab === "absensi" && (
        <div role="tabpanel" id="panel-absensi" aria-labelledby="tab-absensi" tabIndex={0} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-brand shrink-0" />
              <Field label="Tanggal" htmlFor="att-date">
                <Input
                  id="att-date"
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                />
              </Field>
            </div>
            {attError && <p role="alert" className="text-sm text-danger">{attError}</p>}
          </Card>

          {attLoading && (
            <div className="flex items-center gap-2 text-muted">
              <Spinner className="text-brand" /> Memuat daftar karyawan...
            </div>
          )}

          <div className="flex flex-col gap-2">
            {users.map((u) => {
              const rec = attendance[u.id] ?? { status: "hadir" as AttendanceStatus };
              const opt = STATUS_OPTIONS.find((o) => o.value === rec.status) ?? STATUS_OPTIONS[0];
              return (
                <Card key={u.id} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold shrink-0">
                      {u.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-ink">{u.name}</p>
                      <p className="text-xs text-muted capitalize">{u.role}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setRecStatus(u.id, s.value)}
                        aria-pressed={rec.status === s.value}
                        className={cn(
                          "tap-target rounded-[var(--radius-sm)] border py-2 text-xs font-semibold transition",
                          rec.status === s.value
                            ? `${opt.active} ring-2 ring-brand/30`
                            : INACTIVE_CHIP,
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Jam masuk" htmlFor={`checkin-${u.id}`}>
                      <Input
                        id={`checkin-${u.id}`}
                        type="time"
                        value={rec.checkIn ?? ""}
                        onChange={(e) => setRecTime(u.id, "checkIn", e.target.value)}
                        className="h-12 text-base"
                      />
                    </Field>
                    <Field label="Jam keluar" htmlFor={`checkout-${u.id}`}>
                      <Input
                        id={`checkout-${u.id}`}
                        type="time"
                        value={rec.checkOut ?? ""}
                        onChange={(e) => setRecTime(u.id, "checkOut", e.target.value)}
                        className="h-12 text-base"
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-muted">
                    {rec.checkIn ? `Masuk: ${formatWaktu(rec.checkIn)}` : ""}
                    {rec.checkIn && rec.checkOut ? " · " : ""}
                    {rec.checkOut ? `Keluar: ${formatWaktu(rec.checkOut)}` : ""}
                  </p>
                </Card>
              );
            })}
            {!attLoading && users.length === 0 && (
              <p className="text-sm text-muted text-center py-6">Tidak ada data karyawan.</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={saveAttendance}
              disabled={attSaving || !isAdmin}
              fullWidth
              size="lg"
            >
              {attSaving ? (
                <>
                  <Spinner className="text-white" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" /> Simpan Absensi
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ============ Tab Gaji ============ */}
      {tab === "gaji" && (
        <div role="tabpanel" id="panel-gaji" aria-labelledby="tab-gaji" tabIndex={0} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-brand shrink-0" />
              <Field label="Periode (YYYY-MM)" htmlFor="pay-period">
                <Input
                  id="pay-period"
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={finalized ? "success" : "muted"}>
                {finalized ? "Payroll final" : "Draft · belum final"}
              </Badge>
              {payLoading && <span className="text-xs text-muted">Memuat...</span>}
            </div>
            {payError && <p role="alert" className="mt-2 text-sm text-danger">{payError}</p>}
          </Card>

          {payLoading && (
            <div className="flex items-center gap-2 text-muted">
              <Spinner className="text-brand" /> Memuat rekap gaji...
            </div>
          )}

          <Card>
            <h2 className="font-display text-base font-bold text-ink">Ringkasan periode</h2>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-[var(--radius-sm)] bg-surface p-3 border border-line">
                <p className="text-xs text-muted">Total karyawan</p>
                <p className="font-bold text-ink tabular-nums">{formatAngka(rows.length)}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] bg-success-soft p-3">
                <p className="text-xs text-muted">Hari hadir</p>
                <p className="font-bold text-success tabular-nums">{formatAngka(totals.hadir)}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] bg-stone-100 p-3">
                <p className="text-xs text-muted">Total gaji pokok</p>
                <p className="font-bold text-ink tabular-nums">{rupiah(totals.pokok)}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] bg-brand-soft text-brand p-3">
                <p className="text-xs text-muted">Total gaji bersih</p>
                <p className="font-bold text-ink tabular-nums">{rupiah(totals.net)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-base font-bold text-ink">Rekap per Karyawan</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th scope="col" className="pb-3 font-semibold text-ink">Karyawan</th>
                    <th scope="col" className="pb-3 font-semibold text-ink">Role</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Hadir</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Izin</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Sakit</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Alpha</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Cuti</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Jam</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Gaji Pokok</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Tunjangan</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Lembur</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Potongan</th>
                    <th scope="col" className="pb-3 font-semibold text-ink text-right">Bersih</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.userId} className="border-b border-line/50">
                      <td scope="row" className="py-3">{r.name}</td>
                      <td className="py-3 text-xs text-muted capitalize">{r.role}</td>
                      <td className="py-3 text-right font-semibold tabular-nums">{r.hadir}</td>
                      <td className="py-3 text-right tabular-nums">{r.izin}</td>
                      <td className="py-3 text-right tabular-nums">{r.sakit}</td>
                      <td className="py-3 text-right tabular-nums">{r.alpha}</td>
                      <td className="py-3 text-right tabular-nums">{r.cuti}</td>
                      <td className="py-3 text-right tabular-nums">{formatAngka(r.totalHours)}</td>
                      <td className="py-3 text-right tabular-nums">{rupiah(r.pokok)}</td>
                      <td className="py-3 text-right tabular-nums">
                        <Input
                          id={`pay-${r.userId}-tunjangan`}
                          type="number"
                          step="1"
                          inputMode="numeric"
                          value={r.adj.tunjangan}
                          onChange={(e) => adjust(r.userId, "tunjangan", Number(e.target.value) || 0)}
                          disabled={finalized || !isAdmin}
                          aria-label={`Tunjangan ${r.name}`}
                          className="w-full h-10 px-2 text-right text-xs bg-transparent border-0 focus:ring-0"
                        />
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        <Input
                          id={`pay-${r.userId}-lembur`}
                          type="number"
                          step="1"
                          inputMode="numeric"
                          value={r.adj.lembur}
                          onChange={(e) => adjust(r.userId, "lembur", Number(e.target.value) || 0)}
                          disabled={finalized || !isAdmin}
                          aria-label={`Lembur ${r.name}`}
                          className="w-full h-10 px-2 text-right text-xs bg-transparent border-0 focus:ring-0"
                        />
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        <Input
                          id={`pay-${r.userId}-potongan`}
                          type="number"
                          step="1"
                          inputMode="numeric"
                          value={r.adj.potongan}
                          onChange={(e) => adjust(r.userId, "potongan", Number(e.target.value) || 0)}
                          disabled={finalized || !isAdmin}
                          aria-label={`Potongan ${r.name}`}
                          className="w-full h-10 px-2 text-right text-xs bg-transparent border-0 focus:ring-0"
                        />
                      </td>
                      <td className="py-3 text-right font-bold tabular-nums">{rupiah(r.net)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={13}
                        className="py-6 text-center text-sm text-muted"
                      >
                        Belum ada data payroll untuk periode ini.
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-line font-bold">
                    <td colSpan={8} className="py-3">Total ({formatAngka(totals.hadir)} hari hadir)</td>
                    <td className="py-3 text-right tabular-nums">{rupiah(totals.pokok)}</td>
                    <td className="py-3 text-right tabular-nums">{rupiah(totals.tunjangan)}</td>
                    <td className="py-3 text-right tabular-nums">{rupiah(totals.lembur)}</td>
                    <td className="py-3 text-right tabular-nums">{rupiah(totals.potongan)}</td>
                    <td className="py-3 text-right tabular-nums">{rupiah(totals.net)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {rows.map((r) => (
              <details key={`slip-${r.userId}`} className="mt-3 rounded-[var(--radius-sm)] border border-line p-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  Slip gaji {r.name}
                </summary>
                <div className="mt-3 flex flex-col gap-2 text-sm print-slip">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Karyawan</span>
                    <span className="font-medium text-ink">{r.name}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Periode</span>
                    <span className="font-medium text-ink">{period}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Role</span>
                    <span className="font-medium text-ink capitalize">{r.role}</span>
                  </div>
                  <div className="h-px bg-line my-1" />
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Gaji pokok ({r.hadir} hari × {rupiah(r.dailyRate)})</span>
                    <span className="font-medium text-ink tabular-nums">{rupiah(r.pokok)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Tunjangan</span>
                    <span className="font-medium text-ink tabular-nums">{rupiah(r.adj.tunjangan)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Lembur</span>
                    <span className="font-medium text-ink tabular-nums">{rupiah(r.adj.lembur)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Potongan</span>
                    <span className="font-medium text-ink tabular-nums">−{rupiah(r.adj.potongan)}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-line pt-2 font-bold">
                    <span>Gaji bersih</span>
                    <span className="text-brand">{rupiah(r.net)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {finalized ? "Payroll final; nominal terkunci." : "Draft · simpan perubahan sebelum finalisasi."}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setPrintSlip(r);
                      }}
                      className="no-print"
                    >
                      <Printer className="h-4 w-4" /> Cetak/Unduh PDF
                    </Button>
                  </div>
                </div>
              </details>
            ))}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {isAdmin && !finalized && (
                <Button
                  onClick={() => void persistPayroll(false)}
                  disabled={paySaving}
                  variant="secondary"
                  size="lg"
                >
                  {paySaving ? "Menyimpan..." : <><Save className="h-4 w-4" /> Simpan Draft</>}
                </Button>
              )}
              {isAdmin && !finalized && (
                <Button
                  variant="primary"
                  onClick={finalizePayroll}
                  disabled={paySaving}
                  fullWidth={false}
                  size="lg"
                >
                  {paySaving
                    ? "Menyimpan..."
                    : <><Check className="h-4 w-4" /> Finalisasi Gaji</>}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <Toast message={toast.message} variant={toast.variant} onDismiss={dismiss} />
        </div>
      )}

      {/* Print overlay */}
      {printSlip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
          onClick={() => setPrintSlip(null)}
        >
          <style>{`
            @page { size: A4; margin: 12mm; }
            @media print {
              body, html { margin: 0 !important; background: #fff !important; }
              body * { visibility: hidden !important; }
              .slip-print, .slip-print * { visibility: visible !important; }
              .slip-print {
                position: fixed !important; top: 0; left: 0; width: 100% !important;
                max-width: none !important; margin: 0 !important; padding: 0 !important;
                border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
                background: #fff !important; color: #000 !important;
              }
              .no-print { display: none !important; }
            }
          `}</style>
          <Card
            className="slip-print w-full max-w-sm flex flex-col gap-4 bg-white text-ink p-5 shadow-[var(--shadow-float)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Slip Gaji</h2>
              <Badge tone="muted">{period}</Badge>
            </div>
            <p className="text-sm text-muted">{printSlip.name} · {(printSlip.role ?? "").toUpperCase()}</p>
            <div className="border-y border-line py-3">
              <div className="flex justify-between gap-3"><span className="text-muted">Gaji pokok</span><span className="tabular-nums">{rupiah(printSlip.pokok)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted">Tunjangan</span><span className="tabular-nums">{rupiah(printSlip.adj.tunjangan)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted">Lembur</span><span className="tabular-nums">{rupiah(printSlip.adj.lembur)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted">Potongan</span><span className="tabular-nums">−{rupiah(printSlip.adj.potongan)}</span></div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 font-bold"><span>Gaji bersih</span><span className="text-brand tabular-nums">{rupiah(printSlip.net)}</span></div>
            </div>
            <p className="text-xs text-center text-muted">Dicetak {formatTanggal(new Date())} · {finalized ? "Final" : "Draft"}</p>
            <div className="no-print flex gap-2">
              <Button fullWidth variant="secondary" onClick={() => setPrintSlip(null)}>Tutup</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}