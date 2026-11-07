"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Puzzle, UserCheck } from "lucide-react";
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
import type { Addon } from "@/lib/services/addons";
import type { VehicleType } from "@/lib/types";

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
  const { toast, showToast, dismiss } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (modalOpen) modalRef.current?.focus();
  }, [modalOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched: Addon[] = [];
      if (filter === "all") {
        const [motorRes, mobilRes] = await Promise.all([
          apiFetch<{ data: Addon[] }>("/api/addons?vehicleType=motor&includeInactive=true"),
          apiFetch<{ data: Addon[] }>("/api/addons?vehicleType=mobil&includeInactive=true"),
        ]);
        const seen = new Set<string>();
        for (const it of [...(motorRes?.data ?? []), ...(mobilRes?.data ?? [])]) {
          if (seen.has(it.id)) continue;
          seen.add(it.id);
          fetched.push({ ...it, vehicleTypes: Array.isArray(it.vehicleTypes) ? it.vehicleTypes : [] });
        }
      } else {
        const res = await apiFetch<{ data: Addon[] }>(
          `/api/addons?vehicleType=${filter}&includeInactive=true`,
        );
        fetched.push(...(res?.data ?? []).map((it) => ({
          ...it,
          vehicleTypes: Array.isArray(it.vehicleTypes) ? it.vehicleTypes : [],
        })));
      }
      setItems(fetched);
    } catch (e) {
      setItems([]);
      showToast(e instanceof Error ? e.message : "Gagal memuat add-on", "error");
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

  function openEdit(item: Addon) {
    setEditing(item);
    setForm({
      name: item.name,
      price: String(item.price),
      unitLabel: item.unitLabel,
      vehicleTypes: Array.isArray(item.vehicleTypes) ? item.vehicleTypes : [],
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
    if (saving) return;
    setFormError("");
    const price = Number(form.price);
    if (!form.name.trim()) {
      setFormError("Nama add-on wajib diisi");
      return;
    }
    if (!Number.isInteger(price) || price <= 0 || price > 100_000_000) {
      setFormError("Harga harus angka bulat 1-100.000.000");
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
      if (e instanceof ApiError && e.code === "DUPLICATE") {
        showToast("Add-on dengan nama itu sudah ada", "error");
      } else {
        showToast(e instanceof Error ? e.message : "Gagal menyimpan add-on");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: Addon) {
    const action = item.active ? "nonaktifkan" : "aktifkan";
    if (!confirm(`${action} add-on "${item.name}"?`)) return;
    try {
      if (item.active) {
        await apiFetch(`/api/addons/${item.id}`, { method: "DELETE" });
      } else {
        await apiFetch(`/api/addons/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: true }),
        });
      }
      showToast(`Add-on ${action}`);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal mengubah status");
    }
  }

  const filtered = (items ?? []).filter((it) =>
    filter === "all" ? true : Array.isArray(it.vehicleTypes) && it.vehicleTypes.includes(filter),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Add-on</h1>
          <p className="text-muted mt-1">Layanan tambahan</p>
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
          <Puzzle className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Belum ada add-on
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
                {(it.vehicleTypes ?? []).map((vt) => (
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
        title={editing ? "Edit Add-on" : "Tambah Add-on"}
        footer={
          <Button variant="primary" type="submit" form="addon-form" fullWidth size="lg" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        }
      >
        <form id="addon-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label="Nama Add-on" htmlFor="addon-name">
            <Input
              id="addon-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Wax Premium"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Harga (Rp)" htmlFor="addon-price">
              <Input
                id="addon-price"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="15000"
              />
            </Field>
            <Field label="Satuan" htmlFor="addon-unit">
              <Input
                id="addon-unit"
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
          <Field label="Status" htmlFor="addon-active">
            <label className="flex items-center gap-2 h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface">
              <input
                id="addon-active"
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