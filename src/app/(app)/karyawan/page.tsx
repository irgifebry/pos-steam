"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  Clock,
  KeyRound,
  Plus,
  Save,
  UserCog,
  X,
} from "lucide-react";
import { useAppSession } from "@/components/SessionProvider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { rupiah } from "@/lib/format";
import type { AppUser } from "@/lib/services/users";

import type { AttendanceStatus } from "@/lib/types";

type Employee = {
  id: string;
  name: string;
  email?: string;
  role: string;
  phone?: string;
  dailyRate: number;
  active: boolean;
};

type AttendanceRecord = {
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
};

type AttendanceMap = Record<string, AttendanceRecord>;

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

type PayrollResponse = {
  period: string;
  status: "draft" | "final";
  finalizedAt: string | null;
  items: PayrollItem[];
  totals: { gross: number; net: number };
};

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "hadir", label: "Hadir", color: "bg-success-soft text-success border-success" },
  { value: "izin", label: "Izin", color: "bg-info-soft text-info border-info" },
  { value: "sakit", label: "Sakit", color: "bg-accent-soft text-amber-800 border-accent" },
  { value: "alpha", label: "Alpha", color: "bg-danger-soft text-danger border-danger" },
  { value: "cuti", label: "Cuti", color: "bg-stone-100 text-muted border-line" },
];

const ROLE_OPTIONS = ["admin", "kasir", "operator"];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function KaryawanPage() {
  const { role: currentRole } = useAppSession();
  const isAdmin = currentRole === "admin";

  const [tab, setTab] = useState<"daftar" | "absensi" | "rekap">("daftar");

  // Daftar state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [empError, setEmpError] = useState("");

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    role: "operator",
    phone: "",
    dailyRate: 0,
    password: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Employee>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Reset PIN modal
  const [pinTarget, setPinTarget] = useState<Employee | null>(null);
  const [newPin, setNewPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");

  // Absensi state
  const [attDate, setAttDate] = useState(todayISO());
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [attSavedMsg, setAttSavedMsg] = useState("");

  // Rekap state
  const [rekapMonth, setRekapMonth] = useState(currentMonthISO());
  const [adjustments, setAdjustments] = useState<Record<string, { tunjangan: number; lembur: number; potongan: number }>>({});
  const [payroll, setPayroll] = useState<PayrollResponse | null>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollError, setPayrollError] = useState("");
  const [payrollMsg, setPayrollMsg] = useState("");
  const finalized = payroll?.status === "final";

  async function loadEmployees() {
    setLoadingEmps(true);
    setForbidden(false);
    setEmpError("");
    try {
      if (isAdmin) {
        const res = await apiFetch<{ data: AppUser[] }>("/api/users");
        const mapped = (res.data || []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          dailyRate: u.dailyRate,
          active: u.active,
        }));
        setEmployees(mapped);
      } else {
        const res = await apiFetch<{ data: { id: string; name: string; role: string }[] }>("/api/users?light=1");
        const mapped = (res.data || []).map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          dailyRate: 0,
          active: true,
        }));
        setEmployees(mapped);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setForbidden(true);
      }
      setEmployees([]);
      if (!(e instanceof ApiError && e.status === 403)) {
        setEmpError(e instanceof Error ? e.message : "Gagal memuat data");
      }
    } finally {
      setLoadingEmps(false);
    }
  }

  async function loadAttendance(date: string) {
    setAttSavedMsg("");
    try {
      const res = await apiFetch<{ data: { userId: string; status: AttendanceStatus; checkIn: string | null; checkOut: string | null }[] }>(
        `/api/attendance?date=${encodeURIComponent(date)}`,
      );
      const map: AttendanceMap = {};
      for (const row of res.data) {
        map[row.userId] = {
          status: row.status,
          checkIn: row.checkIn ?? undefined,
          checkOut: row.checkOut ?? undefined,
        };
      }
      setAttendance(map);
    } catch (e) {
      setAttendance({});
      setAttSavedMsg(e instanceof Error ? e.message : "Gagal memuat absensi");
    }
  }

  async function loadPayroll(month: string) {
    setPayrollLoading(true);
    setPayrollError("");
    try {
      const res = await apiFetch<{ data: PayrollResponse }>(
        `/api/payroll?period=${encodeURIComponent(month)}`,
      );
      setPayroll(res.data);
      setAdjustments(
        Object.fromEntries(
          res.data.items.map((item) => [
            item.userId,
            {
              tunjangan: item.allowance,
              lembur: item.overtimePay,
              potongan: item.deductions,
            },
          ]),
        ),
      );
    } catch (e) {
      setPayroll(null);
      setPayrollError(e instanceof Error ? e.message : "Gagal memuat payroll");
    } finally {
      setPayrollLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    void loadAttendance(attDate);
  }, [attDate]);

  useEffect(() => {
    void loadPayroll(rekapMonth);
  }, [rekapMonth]);

  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);

  function setAttendanceStatus(empId: string, status: AttendanceStatus) {
    setAttendance((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], status },
    }));
  }

  function setAttendanceTime(empId: string, field: "checkIn" | "checkOut", value: string) {
    setAttendance((prev) => ({
      ...prev,
      [empId]: { ...(prev[empId] || { status: "hadir" }), [field]: value },
    }));
  }

  async function saveAttendance() {
    setAttSavedMsg("");
    try {
      await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ date: attDate, records: attendance }),
      });
      await loadAttendance(attDate);
      if (rekapMonth === attDate.slice(0, 7)) {
        await loadPayroll(rekapMonth);
      }
      setAttSavedMsg("Absensi tersimpan.");
      setTimeout(() => setAttSavedMsg(""), 2500);
    } catch (e) {
      setAttSavedMsg(e instanceof Error ? e.message : "Gagal menyimpan absensi");
    }
  }

  async function handleAdd() {
    setAddError("");
    if (!addForm.name.trim()) {
      setAddError("Nama wajib diisi");
      return;
    }
    if (!addForm.email.trim()) {
      setAddError("Email wajib diisi");
      return;
    }
    if (addForm.password.length < 6) {
      setAddError("PIN minimal 6 karakter");
      return;
    }
    setAddLoading(true);
    try {
      const res = await apiFetch<{ data: AppUser }>("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          role: addForm.role,
          phone: addForm.phone.trim(),
          dailyRate: Number(addForm.dailyRate) || 0,
          password: addForm.password,
          active: true,
        }),
      });
      const u = res.data;
      setEmployees((prev) => [
        ...prev,
        {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          dailyRate: u.dailyRate,
          active: u.active,
        },
      ]);
      setAddOpen(false);
      setAddForm({ name: "", email: "", role: "operator", phone: "", dailyRate: 0, password: "" });
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Gagal menambah karyawan");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditDraft({
      name: emp.name,
      email: emp.email,
      role: emp.role,
      phone: emp.phone,
      dailyRate: emp.dailyRate,
    });
  }

  async function saveEdit(emp: Employee) {
    setEditLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (editDraft.name !== undefined) body.name = editDraft.name;
      if (editDraft.email !== undefined) body.email = editDraft.email;
      if (editDraft.role !== undefined) body.role = editDraft.role;
      if (editDraft.phone !== undefined) body.phone = editDraft.phone;
      if (editDraft.dailyRate !== undefined) body.dailyRate = Number(editDraft.dailyRate) || 0;
      const res = await apiFetch<{ data: AppUser }>(`/api/users/${emp.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const u = res.data;
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id
            ? {
                ...e,
                name: u.name,
                email: u.email,
                role: u.role,
                phone: u.phone,
                dailyRate: u.dailyRate,
                active: u.active,
              }
            : e,
        ),
      );
      setEditingId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setEditLoading(false);
    }
  }

  async function resetPinSubmit() {
    if (!pinTarget) return;
    setPinError("");
    if (newPin.length < 6) {
      setPinError("PIN minimal 6 karakter");
      return;
    }
    setPinLoading(true);
    try {
      await apiFetch(`/api/users/${pinTarget.id}/pin`, {
        method: "POST",
        body: JSON.stringify({ password: newPin }),
      });
      setPinTarget(null);
      setNewPin("");
    } catch (e) {
      setPinError(e instanceof Error ? e.message : "Gagal reset PIN");
    } finally {
      setPinLoading(false);
    }
  }

  async function toggleActive(emp: Employee) {
    try {
      await apiFetch(`/api/users/${emp.id}/active`, {
        method: "POST",
        body: JSON.stringify({ active: !emp.active }),
      });
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, active: !emp.active } : e)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal mengubah status");
    }
  }

  function adjust(empId: string, field: "tunjangan" | "lembur" | "potongan", value: number) {
    setAdjustments((prev) => ({
      ...prev,
      [empId]: {
        tunjangan: prev[empId]?.tunjangan ?? 0,
        lembur: prev[empId]?.lembur ?? 0,
        potongan: prev[empId]?.potongan ?? 0,
        [field]: value,
      },
    }));
  }

  async function persistPayroll(finalize: boolean) {
    if (!isAdmin) return;
    setPayrollLoading(true);
    setPayrollMsg("");
    setPayrollError("");
    try {
      const res = await apiFetch<{ data: PayrollResponse }>("/api/payroll", {
        method: "POST",
        body: JSON.stringify({
          period: rekapMonth,
          adjustments,
          finalize,
        }),
      });
      setPayroll(res.data);
      setPayrollMsg(finalize ? "Payroll berhasil difinalisasi." : "Draft payroll tersimpan.");
      setTimeout(() => setPayrollMsg(""), 2500);
    } catch (e) {
      setPayrollError(e instanceof Error ? e.message : "Gagal menyimpan payroll");
    } finally {
      setPayrollLoading(false);
    }
  }

  function finalizePayroll() {
    if (!isAdmin || finalized) return;
    if (!window.confirm("Finalisasi payroll bulan ini? Perubahan absensi setelah final tidak akan mengubah nominal.")) {
      return;
    }
    void persistPayroll(true);
  }

  // Rekap data
  const rekapData = useMemo(() => {
    return (payroll?.items ?? []).map((item) => {
      const adj = adjustments[item.userId] || {
        tunjangan: item.allowance,
        lembur: item.overtimePay,
        potongan: item.deductions,
      };
      const gaji =
        item.daysPresent * item.dailyRate + adj.tunjangan + adj.lembur - adj.potongan;
      return {
        emp: {
          id: item.userId,
          name: item.name,
          email: "",
          role: item.role,
          phone: "",
          dailyRate: item.dailyRate,
          active: true,
        } as Employee,
        hadir: item.hadir,
        izin: item.izin,
        sakit: item.sakit,
        alpha: item.alpha,
        cuti: item.cuti,
        totalJam: item.totalHours,
        hariTercatat: item.daysPresent,
        gaji,
        adj,
      };
    });
  }, [payroll, adjustments]);

  const rekapSummary = useMemo(() => rekapData.reduce(
    (summary, row) => ({
      hadir: summary.hadir + row.hadir,
      izin: summary.izin + row.izin,
      sakit: summary.sakit + row.sakit,
      alpha: summary.alpha + row.alpha,
      cuti: summary.cuti + row.cuti,
      tercatat: summary.tercatat + row.hariTercatat,
      totalJam: summary.totalJam + row.totalJam,
      estimasiGaji: summary.estimasiGaji + row.gaji,
    }),
    { hadir: 0, izin: 0, sakit: 0, alpha: 0, cuti: 0, tercatat: 0, totalJam: 0, estimasiGaji: 0 },
  ), [rekapData]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Karyawan</h1>
        <p className="text-sm text-muted">Kelola karyawan, absensi, dan gaji.</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-md)] bg-stone-100 p-1">
        {[
          { key: "daftar", label: "Daftar Karyawan" },
          { key: "absensi", label: "Absensi Harian" },
          { key: "rekap", label: "Rekap & Gaji" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "daftar" | "absensi" | "rekap")}
            className={`tap-target rounded-[var(--radius-sm)] px-2 py-2 text-xs sm:text-sm font-semibold transition ${
              tab === t.key ? "bg-ink text-white" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "daftar" && (
        <div className="flex flex-col gap-3">
          {loadingEmps && (
            <div className="flex items-center gap-2 text-muted">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              Memuat...
            </div>
          )}

          {forbidden && (
            <Card>
              <p className="text-sm text-muted">
                Hanya admin yang bisa melihat daftar lengkap karyawan. Hubungi admin outlet.
              </p>
            </Card>
          )}

          {empError && <p className="text-sm text-danger">{empError}</p>}

          {isAdmin && !forbidden && (
            <Button onClick={() => setAddOpen(true)} fullWidth size="lg">
              <Plus className="h-5 w-5" /> Tambah Karyawan
            </Button>
          )}

          <div className="flex flex-col gap-3">
            {employees.map((emp) => (
              <Card key={emp.id} className="flex flex-col gap-3">
                {editingId === emp.id ? (
                  <>
                    <Field label="Nama">
                      <Input
                        value={editDraft.name ?? ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={editDraft.email ?? ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                      />
                    </Field>
                    <Field label="Peran">
                      <select
                        className="w-full h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface text-base text-ink"
                        value={editDraft.role ?? "operator"}
                        onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value }))}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Telepon">
                      <Input
                        value={editDraft.phone ?? ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
                      />
                    </Field>
                    {isAdmin && (
                      <Field label="Gaji Harian (Rp)">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={editDraft.dailyRate ?? 0}
                          onChange={(e) => setEditDraft((d) => ({ ...d, dailyRate: Number(e.target.value) }))}
                        />
                      </Field>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(emp)} disabled={editLoading} fullWidth>
                        {editLoading ? "Menyimpan..." : "Simpan"}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)} fullWidth>
                        Batal
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold text-lg shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-ink truncate">{emp.name}</p>
                          <p className="text-xs text-muted truncate">{emp.email || emp.role}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge tone={emp.active ? "success" : "danger"}>{emp.active ? "Aktif" : "Nonaktif"}</Badge>
                            <Badge tone="muted">{emp.role}</Badge>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted">Gaji/hari</p>
                          <p className="font-bold text-brand">{rupiah(emp.dailyRate)}</p>
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => startEdit(emp)}>
                          <UserCog className="h-4 w-4" /> Edit
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => { setPinTarget(emp); setNewPin(""); setPinError(""); }}>
                          <KeyRound className="h-4 w-4" /> Reset PIN
                        </Button>
                        <Button
                          variant={emp.active ? "danger" : "primary"}
                          size="sm"
                          onClick={() => toggleActive(emp)}
                        >
                          {emp.active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            ))}
            {employees.length === 0 && !loadingEmps && (
              <p className="text-sm text-muted text-center py-6">Belum ada karyawan.</p>
            )}
          </div>
        </div>
      )}

      {tab === "absensi" && (
        <div className="flex flex-col gap-3">
          <Card>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-brand shrink-0" />
              <Field label="Tanggal">
                <Input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
              </Field>
            </div>
          </Card>

          {activeEmployees.map((emp) => {
            const rec = attendance[emp.id] || {};
            const status = rec.status;
            return (
              <Card key={emp.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-bold text-ink">{emp.name}</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setAttendanceStatus(emp.id, s.value)}
                      className={`tap-target rounded-[var(--radius-sm)] border text-xs font-semibold py-2 transition ${
                        status === s.value ? s.color + " ring-2 ring-brand/30" : "bg-surface text-muted border-line"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {status === "hadir" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Jam masuk">
                      <Input
                        type="time"
                        value={rec.checkIn ?? ""}
                        onChange={(e) => setAttendanceTime(emp.id, "checkIn", e.target.value)}
                      />
                    </Field>
                    <Field label="Jam keluar">
                      <Input
                        type="time"
                        value={rec.checkOut ?? ""}
                        onChange={(e) => setAttendanceTime(emp.id, "checkOut", e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </Card>
            );
          })}

          {activeEmployees.length === 0 && (
            <p className="text-sm text-muted text-center py-6">Tidak ada karyawan aktif.</p>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={saveAttendance} fullWidth size="lg">
              <Save className="h-5 w-5" /> Simpan Absensi
            </Button>
          </div>
          {attSavedMsg && (
            <p className="text-sm text-success text-center">{attSavedMsg}</p>
          )}
        </div>
      )}

      {tab === "rekap" && (
        <div className="flex flex-col gap-3">
          <Card>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-brand shrink-0" />
              <Field label="Bulan">
                <Input type="month" value={rekapMonth} onChange={(e) => setRekapMonth(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={finalized ? "success" : "muted"}>{finalized ? "Payroll final" : "Draft · belum final"}</Badge>
              {payrollLoading && <span className="text-xs text-muted">Memuat...</span>}
            </div>
            {payrollError && <p className="mt-2 text-sm text-danger">{payrollError}</p>}
            {payrollMsg && <p className="mt-2 text-sm text-success">{payrollMsg}</p>}
          </Card>

          <Card>
            <h2 className="text-base font-bold text-ink">Ringkasan bulanan</h2>
            <p className="mt-1 text-sm text-muted">{rekapSummary.tercatat} hari hadir tercatat di server · {rekapSummary.hadir} hari hadir</p>
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
              {[...[['Hadir', rekapSummary.hadir], ['Izin', rekapSummary.izin], ['Sakit', rekapSummary.sakit], ['Alpha', rekapSummary.alpha], ['Cuti', rekapSummary.cuti]]].map(([label, count]) => (
                <div key={label} className="rounded-[var(--radius-sm)] bg-stone-100 p-2">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="font-bold text-ink">{count}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Total gaji</p>
                <p className="text-2xl font-bold tabular-nums text-ink">{rupiah(rekapSummary.estimasiGaji)}</p>
              </div>
              <p className="max-w-48 text-right text-xs text-muted">{rekapSummary.totalJam.toFixed(1)} jam tercatat · dihitung dari absensi server, gaji harian, dan penyesuaian.</p>
            </div>
            <p className="mt-3 text-xs text-muted">Angka mengikuti absensi yang tersimpan. Finalisasi mengunci payroll periode ini.</p>
          </Card>

          {rekapData.map(({ emp, hadir, izin, sakit, alpha, cuti, totalJam, hariTercatat, gaji, adj }) => (
            <Card key={emp.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-ink truncate">{emp.name}</p>
                    <p className="text-xs text-muted">{rupiah(emp.dailyRate)}/hari</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted">Gaji</p>
                  <p className="font-extrabold text-brand">{rupiah(gaji)}</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="rounded-[var(--radius-sm)] bg-success-soft p-2">
                  <p className="text-xs text-muted">Hadir</p>
                  <p className="font-bold text-success">{hadir}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-info-soft p-2">
                  <p className="text-xs text-muted">Izin</p>
                  <p className="font-bold text-info">{izin}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-accent-soft p-2">
                  <p className="text-xs text-muted">Sakit</p>
                  <p className="font-bold text-amber-800">{sakit}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-danger-soft p-2">
                  <p className="text-xs text-muted">Alpha</p>
                  <p className="font-bold text-danger">{alpha}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-stone-100 p-2">
                  <p className="text-xs text-muted">Cuti</p>
                  <p className="font-bold text-muted">{cuti}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted">
                <Clock className="h-4 w-4" /> Total jam: <span className="font-semibold text-ink">{totalJam.toFixed(1)} jam</span>
              </div>
              <p className="text-xs text-muted">{hariTercatat} tanggal hadir tercatat.</p>

              <div className="grid grid-cols-3 gap-2">
                <Field label="Tunjangan">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={adj.tunjangan}
                    onChange={(e) => adjust(emp.id, "tunjangan", Number(e.target.value) || 0)}
                    onBlur={() => void persistPayroll(false)}
                    disabled={!isAdmin || finalized}
                  />
                </Field>
                <Field label="Lembur">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={adj.lembur}
                    onChange={(e) => adjust(emp.id, "lembur", Number(e.target.value) || 0)}
                    onBlur={() => void persistPayroll(false)}
                    disabled={!isAdmin || finalized}
                  />
                </Field>
                <Field label="Potongan">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={adj.potongan}
                    onChange={(e) => adjust(emp.id, "potongan", Number(e.target.value) || 0)}
                    onBlur={() => void persistPayroll(false)}
                    disabled={!isAdmin || finalized}
                  />
                </Field>
              </div>
              <details className="rounded-[var(--radius-sm)] border border-line p-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">Lihat slip gaji</summary>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-muted">Gaji pokok ({hadir} hari × {rupiah(emp.dailyRate)})</span><span className="font-medium text-ink">{rupiah(hadir * emp.dailyRate)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted">Tunjangan</span><span className="font-medium text-ink">{rupiah(adj.tunjangan)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted">Lembur</span><span className="font-medium text-ink">{rupiah(adj.lembur)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted">Potongan</span><span className="font-medium text-ink">−{rupiah(adj.potongan)}</span></div>
                  <div className="flex justify-between gap-3 border-t border-line pt-2 font-bold"><span>Total</span><span>{rupiah(gaji)}</span></div>
                  <p className="text-xs text-muted">{finalized ? "Payroll final; nominal terkunci." : "Draft payroll. Penyesuaian tersimpan ke server saat kolom ditinggalkan atau saat finalisasi."}</p>
                </div>
              </details>
            </Card>
          ))}

          {activeEmployees.length === 0 && (
            <p className="text-sm text-muted text-center py-6">Tidak ada karyawan aktif.</p>
          )}

          {isAdmin && (
            <Button onClick={finalizePayroll} disabled={finalized || payrollLoading} fullWidth size="lg" variant={finalized ? "secondary" : "primary"}>
              <Check className="h-5 w-5" /> {finalized ? "Sudah Difinalisasi" : payrollLoading ? "Menyimpan..." : "Finalisasi Gaji Bulan Ini"}
            </Button>
          )}
        </div>
      )}

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-float)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Tambah Karyawan</h2>
              <button onClick={() => setAddOpen(false)} className="h-10 w-10 rounded-xl border border-line flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Nama">
                <Input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Email">
                <Input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Peran">
                <select
                  className="w-full h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface text-base text-ink"
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Telepon">
                <Input value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Gaji Harian (Rp)">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={addForm.dailyRate}
                  onChange={(e) => setAddForm((f) => ({ ...f, dailyRate: Number(e.target.value) }))}
                />
              </Field>
              <Field label="PIN (min 6)">
                <Input
                  type="password"
                  inputMode="numeric"
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                />
              </Field>
              {addError && <p className="text-sm text-danger">{addError}</p>}
              <Button onClick={handleAdd} disabled={addLoading} fullWidth size="lg">
                {addLoading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN modal */}
      {pinTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-float)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Reset PIN</h2>
              <button onClick={() => setPinTarget(null)} className="h-10 w-10 rounded-xl border border-line flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted mb-3">{pinTarget.name}</p>
            <Field label="PIN baru (min 6)">
              <Input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
            </Field>
            {pinError && <p className="text-sm text-danger mt-2">{pinError}</p>}
            <div className="mt-4">
              <Button onClick={resetPinSubmit} disabled={pinLoading} fullWidth size="lg">
                {pinLoading ? "Menyimpan..." : "Reset PIN"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
