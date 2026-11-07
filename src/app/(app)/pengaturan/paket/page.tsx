"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Package, UserCheck } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api-client";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import type { ServicePackage } from "@/lib/services/service-packages";
import type { VehicleType } from "@/lib/types";

const emptyForm = {
  name: "",
  vehicleType: "motor" as VehicleType,
  price: "",
  durationMin: "",
  description: "",
  sortOrder: "0",
  active: true,
};

export default function PaketPage() {
  const [items, setItems] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | VehicleType>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const { toast, showToast, dismiss } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched: ServicePackage[] = [];
      if (filter === "all") {
        const [motorRes, mobilRes] = await Promise.all([
          apiFetch<{ data: ServicePackage[] }>("/api/packages?vehicleType=motor&includeInactive=true"),
          apiFetch<{ data: ServicePackage[] }>("/api/packages?vehicleType=mobil&includeInactive=true"),
        ]);
        const seen = new Set<string>();
        for (const it of [...(motorRes?.data ?? []), ...(mobilRes?.data ?? [])]) {
          if (seen.has(it.id)) continue;
          seen.add(it.id);
          fetched.push(it);
        }
      } else {
        const res = await apiFetch<{ data: ServicePackage[] }>(
          `/api/packages?vehicleType=${filter}&includeInactive=true`,
        );
        fetched.push(...(res?.data ?? []));
      }
      fetched.sort((a, b) => a.sortOrder - b.sortOrder);
      setItems(fetched);
    } catch (e) {
      setItems([]);
      showToast(e instanceof Error ? e.message : "Gagal memuat paket", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: ServicePackage) {
    setEditing(item);
    setForm({
      name: item.name,
      vehicleType: item.vehicleType,
      price: String(item.price),
      durationMin: String(item.durationMin),
      description: item.description,
      sortOrder: String(item.sortOrder),
      active: item.active,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError("");
    const price = Number(form.price);
    if (!form.name.trim()) {
      setFormError("Nama paket wajib diisi");
      return;
    }
    if (!Number.isInteger(price) || price <= 0 || price > 100_000_000) {
      setFormError("Harga harus angka bulat 1-100.000.000");
      return;
    }
    const dur = Number(form.durationMin);
    if (!Number.isInteger(dur) || dur <= 0) {
      setFormError("Durasi harus angka bulat lebih dari 0");
      return;
    }
    const sortOrder = Number(form.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
      setFormError("Urutan harus angka bulat 0-9999");
      return;
    }
    const body = {
      name: form.name.trim(),
      vehicleType: form.vehicleType,
      price,
      durationMin: dur,
      description: form.description.trim(),
      sortOrder,
      active: form.active,
    };
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/packages/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/packages", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      showToast(editing ? "Paket diperbarui" : "Paket ditambahkan");
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.code === "DUPLICATE") {
        showToast("Paket dengan nama itu sudah ada", "error");
      } else {
        showToast(e instanceof Error ? e.message : "Gagal menyimpan paket");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: ServicePackage) {
    const action = item.active ? "nonaktifkan" : "aktifkan";
    if (!confirm(`${action} paket "${item.name}"?`)) return;
    try {
      if (item.active) {
        await apiFetch(`/api/packages/${item.id}`, { method: "DELETE" });
      } else {
        await apiFetch(`/api/packages/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: true }),
        });
      }
      showToast(`Paket ${action}`);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal mengubah status");
    }
  }

  const filtered = (items ?? []).filter((it) =>
    filter === "all" ? true : it.vehicleType === filter,
  );

  const VehicleLabel = (vt: VehicleType) => (vt === "motor" ? "Motor" : "Mobil");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Paket Layanan</h1>
          <p className="text-muted mt-1">Atur paket cuci motor & mobil</p>
        </div>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus className="h-5 w-5" /> Tambah
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "motor", "mobil"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            aria-pressed={filter === v}
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
      {!loading && filtered.length === 0 && (
        <Card className="text-center text-muted py-8">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Belum ada paket
        </Card>
      )}

      <div className="flex flex-col gap-5">
        {filtered.map((it) => (
          <Card key={it.id} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display text-lg font-bold text-ink">{it.name}</p>
                <Badge tone={it.active ? "success" : "muted"}>
                  {it.active ? "Aktif" : "Nonaktif"}
                </Badge>
                <Badge tone="info">{VehicleLabel(it.vehicleType)}</Badge>
              </div>
              <p className="text-brand font-bold mt-1">{rupiah(it.price)}</p>
              <p className="text-sm text-muted">
                Durasi ± {it.durationMin} menit
                {it.description ? ` • ${it.description}` : ""}
              </p>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Paket" : "Tambah Paket"}
        footer={
          <Button variant="primary" type="submit" form="paket-form" fullWidth size="lg" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        }
      >
        <form id="paket-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label="Nama Paket" htmlFor="paket-name">
            <Input
              id="paket-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Cuci Motor Reguler"
            />
          </Field>
          <Field label="Tipe Kendaraan" htmlFor="paket-vehicle">
            <select
              id="paket-vehicle"
              value={form.vehicleType}
              onChange={(e) =>
                setForm({ ...form, vehicleType: e.target.value as VehicleType })
              }
              className="w-full h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface text-base text-ink"
            >
              <option value="motor">Motor</option>
              <option value="mobil">Mobil</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Harga (Rp)" htmlFor="paket-price">
              <Input
                id="paket-price"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="25000"
              />
            </Field>
            <Field label="Durasi (menit)" htmlFor="paket-duration">
              <Input
                id="paket-duration"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                placeholder="20"
              />
            </Field>
          </div>
          <Field label="Deskripsi" htmlFor="paket-desc">
            <Input
              id="paket-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Opsional"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Urutan" htmlFor="paket-sort">
              <Input
                id="paket-sort"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </Field>
            <Field label="Status" htmlFor="paket-active">
              <label className="flex items-center gap-2 h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface">
                <input
                  id="paket-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-5 w-5"
                />
                <span className="text-base">Aktif</span>
              </label>
            </Field>
          </div>
          {formError && <p className="text-sm text-danger">{formError}</p>}
        </form>
      </Modal>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <Toast message={toast.message} variant={toast.variant} onDismiss={dismiss} />
        </div>
      )}
    </div>
  );
}