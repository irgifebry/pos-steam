"use client";

import { useEffect, useState } from "react";
import { Save, Store } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

interface Outlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  receiptFooter: string;
  taxPercent: number;
}

const emptyForm = {
  name: "",
  address: "",
  phone: "",
  receiptFooter: "",
  taxPercent: "0",
};

export default function OutletPage() {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch<{ data: Outlet[] }>("/api/outlets");
        const first = res.data[0] ?? null;
        setOutlet(first);
        if (first) {
          setForm({
            name: first.name,
            address: first.address,
            phone: first.phone,
            receiptFooter: first.receiptFooter,
            taxPercent: String(first.taxPercent),
          });
        }
      } catch (e) {
        setOutlet(null);
        setError(e instanceof Error ? e.message : "Gagal memuat outlet");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.name.trim()) {
      setError("Nama outlet wajib diisi");
      return;
    }
    const tax = Number(form.taxPercent);
    if (Number.isNaN(tax) || tax < 0 || tax > 100) {
      setError("Pajak harus 0-100");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ data: Outlet }>("/api/outlets", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          receiptFooter: form.receiptFooter.trim(),
          taxPercent: tax,
        }),
      });
      setOutlet(res.data);
      setSuccess("Data outlet tersimpan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="text-brand" />
      </div>
    );
  }

  if (!outlet) {
    return (
      <Card className="text-center text-muted py-8">
        <Store className="h-10 w-10 mx-auto mb-2 opacity-40" />
        Outlet belum tersedia
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Data Outlet</h1>
        <p className="text-muted mt-1">Informasi outlet & struk</p>
      </div>

      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label="Nama Outlet">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Alamat">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <Field label="Telepon">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Footer Struk">
            <Input
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
              placeholder="Terima kasih sudah datang"
            />
          </Field>
          <Field label="Pajak (%)">
            <Input
              type="number"
              value={form.taxPercent}
              onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          {success && <p className="text-sm text-success">{success}</p>}
          <Button type="submit" fullWidth size="lg" disabled={saving}>
            <Save className="h-5 w-5" />
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </Card>
    </div>
  );
}