"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X, Landmark } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { dummyBanks } from "@/lib/dummy-data";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

interface Bank {
  id: string;
  name: string;
  accountNumber: string;
  accountName: string;
  active: boolean;
}

const emptyForm = {
  name: "",
  accountNumber: "",
  accountName: "",
  active: true,
};

export default function BankPage() {
  const [items, setItems] = useState<Bank[]>(dummyBanks as unknown as Bank[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ data: Bank[] }>("/api/banks");
      setItems(res.data);
    } catch {
      setItems(dummyBanks as unknown as Bank[]);
      setError("Mode demo: data contoh ditampilkan (backend tidak tersedia)");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
    setSaving(true);
    try {
      await apiFetch("/api/banks", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          accountNumber: form.accountNumber.trim(),
          accountName: form.accountName.trim(),
          active: form.active,
        }),
      });
      setModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Bank</h1>
          <p className="text-muted mt-1">Rekening pembayaran</p>
        </div>
        <Button size="sm" onClick={() => { setForm(emptyForm); setFormError(""); setModalOpen(true); }}>
          <Plus className="h-5 w-5" /> Tambah
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner className="text-brand" />
        </div>
      )}
      {error && <p className="text-danger text-center">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <Card className="text-center text-muted py-8">
          <Landmark className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Belum ada bank
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
              </div>
              <p className="text-base text-ink mt-1">{it.accountNumber}</p>
              <p className="text-sm text-muted">a.n. {it.accountName}</p>
            </div>
          </Card>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-surface rounded-[var(--radius-lg)] shadow-[var(--shadow-float)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="text-xl font-bold text-ink">Tambah Bank</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="h-10 w-10 rounded-xl flex items-center justify-center text-muted hover:bg-bg"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4 p-5">
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
              <Button type="submit" fullWidth size="lg" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}