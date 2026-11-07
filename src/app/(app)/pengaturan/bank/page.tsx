"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Landmark, UserCheck } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api-client";
import type { Bank } from "@/lib/services/banks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";

const emptyForm = {
  name: "",
  accountNumber: "",
  accountName: "",
  active: true,
};

export default function BankPage() {
  const [items, setItems] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const { toast, showToast, dismiss } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await apiFetch<{ data: Bank[] }>("/api/banks?includeInactive=true");
      setItems(res?.data ?? []);
    } catch (e) {
      setItems([]);
      setLoadError(true);
      showToast(e instanceof Error ? e.message : "Gagal memuat bank", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (modalOpen) modalRef.current?.focus();
  }, [modalOpen]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: Bank) {
    setEditing(item);
    setForm({
      name: item.name,
      accountNumber: item.accountNumber,
      accountName: item.accountName,
      active: item.active,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Nama bank wajib diisi");
      return;
    }
    if (!form.accountNumber.trim()) {
      setFormError("Nomor rekening wajib diisi");
      return;
    }
    if (!form.accountName.trim()) {
      setFormError("Nama pemilik wajib diisi");
      return;
    }
    const body = {
      name: form.name.trim(),
      accountNumber: form.accountNumber.trim(),
      accountName: form.accountName.trim(),
      active: form.active,
    };
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/banks/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/banks", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      showToast(editing ? "Bank diperbarui" : "Bank ditambahkan", "success");
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.code === "DUPLICATE") {
        showToast("Bank sudah terdaftar", "error");
      } else {
        showToast(e instanceof Error ? e.message : "Gagal menyimpan bank", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: Bank) {
    const action = item.active ? "nonaktifkan" : "aktifkan";
    if (!confirm(`${action} bank "${item.name}"?`)) return;
    try {
      if (item.active) {
        await apiFetch(`/api/banks/${item.id}`, { method: "DELETE" });
      } else {
        await apiFetch(`/api/banks/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: true }),
        });
      }
      showToast(`Bank ${action}`, "success");
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.code === "DUPLICATE") {
        showToast("Bank sudah terdaftar", "error");
      } else if (e instanceof ApiError && e.code === "NOT_FOUND") {
        showToast("Bank tidak ditemukan", "error");
      } else {
        showToast(e instanceof Error ? e.message : "Gagal mengubah status", "error");
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Bank</h1>
          <p className="text-muted mt-1">Rekening pembayaran</p>
        </div>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus className="h-5 w-5" /> Tambah
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner className="text-brand" />
        </div>
      )}
      {!loading && loadError && (
        <Card className="text-center text-muted py-8">
          <Landmark className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Gagal memuat data bank
        </Card>
      )}
      {!loading && !loadError && items.length === 0 && (
        <Card className="text-center text-muted py-8">
          <Landmark className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Belum ada bank
        </Card>
      )}

      <div className="flex flex-col gap-5">
        {items.map((it) => (
          <Card key={it.id} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display text-lg font-bold text-ink">{it.name}</p>
                <Badge tone={it.active ? "success" : "muted"}>
                  {it.active ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <p className="text-base text-ink mt-1">{it.accountNumber}</p>
              <p className="text-sm text-muted">a.n. {it.accountName}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => openEdit(it)}
                className="h-10 w-10 rounded-xl border border-line flex items-center justify-center text-brand hover:bg-brand-soft"
                aria-label={`Edit ${it.name}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleToggleActive(it)}
                className={`h-10 w-10 rounded-xl border border-line flex items-center justify-center ${
                  it.active
                    ? "text-danger hover:bg-danger-soft"
                    : "text-success hover:bg-success-soft"
                }`}
                aria-label={it.active ? `Nonaktifkan ${it.name}` : `Aktifkan ${it.name}`}
              >
                {it.active ? <Trash2 className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div ref={modalRef} tabIndex={-1} className="outline-none">
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? "Edit Bank" : "Tambah Bank"}
          footer={
            <Button variant="primary" type="submit" form="bank-form" fullWidth size="lg" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          }
        >
          <form id="bank-form" onSubmit={handleSave} className="flex flex-col gap-4">
            <Field label="Nama Bank" htmlFor="bank-name">
              <Input
                id="bank-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="BCA"
              />
            </Field>
            <Field label="Nomor Rekening" htmlFor="bank-account-number">
              <Input
                id="bank-account-number"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              />
            </Field>
            <Field label="Nama Pemilik" htmlFor="bank-account-name">
              <Input
                id="bank-account-name"
                value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              />
            </Field>
            <Field label="Status" htmlFor="bank-active">
              <label className="flex items-center gap-2 h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface">
                <input
                  id="bank-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-5 w-5"
                />
                <span className="text-base">Aktif</span>
              </label>
            </Field>
            {formError && <p className="text-sm text-danger">{formError}</p>}
          </form>
        </Modal>
      </div>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <Toast message={toast.message} variant={toast.variant} onDismiss={dismiss} />
        </div>
      )}
    </div>
  );
}