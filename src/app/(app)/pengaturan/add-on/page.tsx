"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Puzzle } from "lucide-react";
import { useAppSession } from "@/components/SessionProvider";
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
  const [filter, setFilter] = useState<"all" | VehicleType>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Addon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched: Addon[] = [];
      if (filter === "all") {
        const [motorRes, mobilRes] = await Promise.all([
          apiFetch<{ data: Addon[] }>("/api/addons?vehicleType=motor"),
          apiFetch<{ data: Addon[] }>("/api/addons?vehicleType=mobil"),
        ]);
        fetched.push(...(motorRes.data ?? []), ...(mobilRes.data ?? []));
      } else {
        const res = await apiFetch<{ data: Addon[] }>(
          `/api/addons?vehicleType=${filter}`,
        );
        fetched.push(...(res.data ?? []));
      }
      setItems(fetched);
    } catch (e) {
      setItems([]);
      showToast(e instanceof Error ? e.message : "Gagal memuat add-on");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const { role, isLoading } = useAppSession();
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
      const next = has ? f.vehicleTypes.filter((x) => x !== v) : [...f.vehicleTypes, v];
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
      showToast(editing ? "Add-on diperbarui" : "Add-on ditambahkan");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menyimpan add-on");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item: Addon) {
    if (!confirm(`Nonaktifkan add-on "${item.name}"?`)) return;
    try {
      await apiFetch(`/api/addons/${item.id}`, { method: "DELETE" });
      showToast("Add-on dinonaktifkan");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menonaktifkan add-on");
    }
  }

  const filtered = (items ?? []).filter((it) =>
    filter === "all" ? true : it.vehicleTypes.includes(filter),
  );

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

      <div className="flex gap-2">
        {(["all", "motor", "mobil"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
              filter === v
                ? "bg-brand text-white border-brand"
                : "bg-surface text-ink border-line"
            }`}
          >
            {v === "all" ? "Semua" : v === "motor" ? "Motor" : "Mobil"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner className="text-brand" />
        </div>
      )}
      {!loading && items.length === 0 && (
        <Card className="text-center text-muted py-8">
          <Puzzle className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Belum ada add-on
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((it) => (
          <Card key={it.id} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-lg font-bold text-ink">{it.name}</p>
                <Badge tone={it.active ? "success" : "muted"}>
                  {it.active ? "Aktif" : "Nonaktif"}
                </Badge>
                {it.vehicleTypes.map((vt) => (
                  <Badge key={vt} tone="info">{vt === "motor" ? "Motor" : "Mobil"}</Badge>
                ))}
              </div>
              <p className="text-brand font-bold mt-1">{rupiah(it.price)}</p>
              <p className="text-sm text-muted">per {it.unitLabel}</p>
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

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-4 py-2 rounded-full shadow-[var(--shadow-float)] text-sm font-semibold">
          {toast}
        </div>
      )}
    </div>
  );
}
