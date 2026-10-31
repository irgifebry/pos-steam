"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  KeyRound,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useAppSession } from "@/components/SessionProvider";
import { apiFetch } from "@/lib/api-client";
import { rupiah } from "@/lib/format";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  dailyRate: number;
  active: boolean;
}

const emptyForm = {
  name: "",
  email: "",
  role: "kasir" as Role,
  phone: "",
  dailyRate: "0",
  password: "",
};

export default function PenggunaPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pinModal, setPinModal] = useState<User | null>(null);
  const [newPin, setNewPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState("");
  const { toast, showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: User[] }>("/api/users");
      setItems(res.data ?? []);
    } catch (e) {
      setItems([]);
      showToast(e instanceof Error ? e.message : "Gagal memuat pengguna");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const { role: currentRole, isLoading: sessionLoading } = useAppSession();
  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Spinner className="text-brand" />
      </div>
    );
  }
  const isAdmin = currentRole === "admin";
  if (!isAdmin) {
    return (
      <Card className="text-center text-muted py-10">
        <p>Hanya admin yang dapat mengakses halaman ini.</p>
      </Card>
    );
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: User) {
    setEditing(item);
    setForm({
      name: item.name,
      email: item.email,
      role: item.role,
      phone: item.phone,
      dailyRate: String(item.dailyRate),
      password: "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Nama wajib diisi");
      return;
    }
    if (!form.email.trim()) {
      setFormError("Email wajib diisi");
      return;
    }
    const dailyRate = Number(form.dailyRate);
    if (
      !Number.isFinite(dailyRate) ||
      !Number.isSafeInteger(dailyRate) ||
      dailyRate < 0
    ) {
      setFormError("Gaji harian tidak boleh negatif");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/users/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            phone: form.phone.trim(),
            dailyRate,
          }),
        });
      } else {
        if (form.password.length < 6) {
          setFormError("PIN minimal 6 karakter");
          setSaving(false);
          return;
        }
        await apiFetch("/api/users", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            phone: form.phone.trim(),
            dailyRate,
            password: form.password,
            active: true,
          }),
        });
      }
      setModalOpen(false);
      showToast(editing ? "Pengguna diperbarui" : "Pengguna ditambahkan");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan pengguna");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: User) {
    const action = item.active ? "nonaktifkan" : "aktifkan";
    if (!confirm(`${action} pengguna "${item.name}"?`)) return;
    try {
      await apiFetch(`/api/users/${item.id}/active`, {
        method: "POST",
        body: JSON.stringify({ active: !item.active }),
      });
      showToast(`Pengguna ${action}`);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal mengubah status");
    }
  }

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinModal) return;
    setPinError("");
    if (newPin.length < 6) {
      setPinError("PIN minimal 6 karakter");
      return;
    }
    setPinSaving(true);
    try {
      await apiFetch(`/api/users/${pinModal.id}/pin`, {
        method: "POST",
        body: JSON.stringify({ password: newPin }),
      });
      setPinModal(null);
      setNewPin("");
      setPinError("");
      showToast("PIN berhasil di-reset");
    } catch (e) {
      setPinError(e instanceof Error ? e.message : "Gagal reset PIN");
    } finally {
      setPinSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Pengguna</h1>
          <p className="text-muted mt-1">Akun pengguna outlet</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-5 w-5" /> Tambah
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner className="text-brand" />
        </div>
      )}
      {!loading && items.length === 0 && (
        <Card className="text-center text-muted py-8">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Belum ada pengguna
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {items.map((it) => (
          <Card key={it.id} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-lg font-bold text-ink">{it.name}</p>
                <Badge tone={it.active ? "success" : "muted"}>
                  {it.active ? "Aktif" : "Nonaktif"}
                </Badge>
                <Badge tone="info">{it.role}</Badge>
              </div>
              <p className="text-sm text-muted mt-1">{it.email}</p>
              {it.phone && <p className="text-sm text-muted">{it.phone}</p>}
              <p className="text-sm text-muted">
                Gaji harian: {rupiah(it.dailyRate)}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => openEdit(it)}
                className="h-10 w-10 rounded-xl border border-line flex items-center justify-center text-brand hover:bg-brand-soft"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setPinModal(it);
                  setNewPin("");
                  setPinError("");
                }}
                className="h-10 w-10 rounded-xl border border-line flex items-center justify-center text-amber-700 hover:bg-accent-soft"
                aria-label="Reset PIN"
              >
                <KeyRound className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleToggleActive(it)}
                className={`h-10 w-10 rounded-xl border border-line flex items-center justify-center ${
                  it.active
                    ? "text-danger hover:bg-danger-soft"
                    : "text-success hover:bg-success-soft"
                }`}
                aria-label={it.active ? "Nonaktifkan" : "Aktifkan"}
              >
                {it.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Pengguna" : "Tambah Pengguna"}
        footer={
          <Button type="submit" form="pengguna-form" fullWidth size="lg" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        }
      >
        <form id="pengguna-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label="Nama">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Role">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="w-full h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface text-base text-ink"
            >
              <option value="admin">Admin</option>
              <option value="kasir">Kasir</option>
              <option value="operator">Operator</option>
            </select>
          </Field>
          <Field label="Telepon">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Gaji Harian (Rp)">
            <Input
              type="number"
              value={form.dailyRate}
              onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
            />
          </Field>
          {!editing && (
            <Field label="PIN (min 6)">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
          )}
          {formError && <p className="text-sm text-danger">{formError}</p>}
        </form>
      </Modal>

      <Modal
        open={!!pinModal}
        onClose={() => {
          setPinModal(null);
          setNewPin("");
          setPinError("");
        }}
        title="Reset PIN"
      >
        {pinModal && (
          <form id="pin-form" onSubmit={handleResetPin} className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Reset PIN untuk <b>{pinModal.name}</b>
            </p>
            <Field label="PIN Baru">
              <Input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
            </Field>
            {pinError && <p className="text-sm text-danger">{pinError}</p>}
            <Button type="submit" form="pin-form" fullWidth size="lg" disabled={pinSaving}>
              {pinSaving ? "Menyimpan..." : "Simpan PIN"}
            </Button>
          </form>
        )}
      </Modal>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <Toast message={toast.message} variant={toast.variant} />
        </div>
      )}
    </div>
  );
}
