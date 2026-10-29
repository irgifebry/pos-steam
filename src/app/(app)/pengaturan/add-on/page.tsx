"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Puzzle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type VehicleType = "motor" | "mobil";

interface Addon {
  id: string;
  name: string;
  price: number;
  unitLabel: string;
  vehicleTypes: VehicleType[];
  active: boolean;
}

const emptyForm = {
  name: "",
  price: "",
  unitLabel: "pcs",
  vehicleTypes: ["motor", "mobil"] as VehicleType[],
  active: true,
};

export default function AddonPage() {
  const [items, setItems] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Addon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ data: Addon[] }>("/api/addons?includeInactive=true");
      setItems(res.data);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Gagal memuat add-on");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: Addon) {
    setEditing(item);
    setForm({
      name: item.name,
      price: String(item.price),
      unitLabel: item.unitLabel,
      vehicleTypes: item.vehicleTypes,
      active: item.active,
    });
    setFormError("");
    setModalOpen(true);
  }

  function toggleVehicle(v: VehicleType) {
    setForm((f) => {
      const has = f.vehicleTypes.includes(v);
      const next = has
        ? f.vehicleTypes.filter((x) => x !== v)
        : [...f.vehicleTypes, v];
      return { ...f, vehicleTypes: next };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const price = Number(form.price);
    if (!form.name.trim()) {
      setFormError("Nama add-on wajib diisi");
      return;
    }
    if (!price || price <= 0) {
      setFormError("Harga harus lebih dari 0");
      return;
    }
    if (form.vehicleTypes.length === 0) {
      setFormError("Pilih minimal satu tipe kendaraan");
      return;
    }
    const body = {
      name: form.name.trim(),
      price,
      unitLabel: form.unitLabel.trim() || "pcs",
      vehicleTypes: form.vehicleTypes,
      active: form.active,
    };
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/addons/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/addons", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item: Addon) {
    if (!confirm(`Nonaktifkan add-on "${item.name}"?`)) return;
    try {
      await apiFetch(`/api/addons/${item.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menonaktifkan");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Add-on</h1>
          <p className="text-muted mt-1">Layanan tambahan</p>
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
      {error && <p className="text-danger text-center">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <Card className="text-center text-muted py-8">
          <Puzzle className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Belum ada add-on
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
              <p className="text-brand font-bold mt-1">{rupiah(it.price)}</p>
              <p className="text-sm text-muted">
                per {it.unitLabel} •{" "}
                {it.vehicleTypes.map((v) => (v === "motor" ? "Motor" : "Mobil")).join(", ")}
              </p>
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-surface rounded-[var(--radius-lg)] shadow-[var(--shadow-float)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="text-xl font-bold text-ink">
                {editing ? "Edit Add-on" : "Tambah Add-on"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="h-10 w-10 rounded-xl flex items-center justify-center text-muted hover:bg-bg"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4 p-5">
              <Field label="Nama Add-on">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Wax Premium"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Harga (Rp)">
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="15000"
                  />
                </Field>
                <Field label="Satuan">
                  <Input
                    value={form.unitLabel}
                    onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
                    placeholder="pcs"
                  />
                </Field>
              </div>
              <Field label="Tipe Kendaraan">
                <div className="flex gap-3">
                  {(["motor", "mobil"] as VehicleType[]).map((v) => (
                    <label
                      key={v}
                      className="flex items-center gap-2 h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface flex-1"
                    >
                      <input
                        type="checkbox"
                        checked={form.vehicleTypes.includes(v)}
                        onChange={() => toggleVehicle(v)}
                        className="h-5 w-5"
                      />
                      <span className="text-base">{v === "motor" ? "Motor" : "Mobil"}</span>
                    </label>
                  ))}
                </div>
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