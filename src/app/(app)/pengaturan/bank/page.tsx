"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Landmark } from "lucide-react";
import { useAppSession } from "@/components/SessionProvider";
import { apiFetch } from "@/lib/api-client";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const { toast, showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  const { role, isLoading } = useAppSession();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Bank[] }>("/api/banks");
      setItems(res.data ?? []);
    } catch (e) {
      setItems([]);
      showToast(e instanceof Error ? e.message : "Gagal memuat bank");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isLoading || role !== "admin") return;
    load();
  }, [isLoading, role, load]);

  useEffect(() => {
    if (modalOpen) modalRef.current?.focus();
  }, [modalOpen]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Spinner className="text-brand" />
      </div>
    );
  }
  if (role !== "admin") {
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
      showToast(editing ? "Bank diperbarui" : "Bank ditambahkan");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan bank");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item: Bank) {
    if (!confirm(`Nonaktifkan bank "${item.name}"?`)) return;
    try {
      await apiFetch(`/api/banks/${item.id}`, { method: "DELETE" });
      showToast("Bank dinonaktifkan");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menonaktifkan bank");
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
      {!loading && items.length === 0 && (
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
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {it.active && (
                <button
                  onClick={() => handleDeactivate(it)}
                  className="h-10 w-10 rounded-xl border border-line flex items-center justify-center text-danger hover:bg-danger-soft"
                  aria-label="Nonaktifkan"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

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
          <Field label="Nama Bank">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="BCA"
            />
          </Field>
          <Field label="Nomor Rekening">
            <Input
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
            />
          </Field>
          <Field label="Nama Pemilik">
            <Input
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <label className="flex items-center gap-2 h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface">
              <input
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

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <Toast message={toast.message} variant={toast.variant} />
        </div>
      )}
    </div>
  );
}
