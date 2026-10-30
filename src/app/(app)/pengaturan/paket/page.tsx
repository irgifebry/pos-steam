"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Package } from "lucide-react";
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

interface ServicePackage {
  id: string;
  name: string;
  vehicleType: VehicleType;
  price: number;
  durationMin: number;
  description: string;
  sortOrder: number;
  active: boolean;
}

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
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (modalOpen) modalRef.current?.focus();
  }, [modalOpen]);
  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched: ServicePackage[] = [];
      if (filter === "all") {
        const [motorRes, mobilRes] = await Promise.all([
          apiFetch<{ data: ServicePackage[] }>("/api/packages?vehicleType=motor"),
          apiFetch<{ data: ServicePackage[] }>("/api/packages?vehicleType=mobil"),
        ]);
        fetched.push(...(motorRes.data ?? []), ...(mobilRes.data ?? []));
      } else {
        const res = await apiFetch<{ data: ServicePackage[] }>(
          `/api/packages?vehicleType=${filter}`,
        );
        fetched.push(...(res.data ?? []));
      }
      fetched.sort((a, b) => a.sortOrder - b.sortOrder);
      setItems(fetched);
    } catch (e) {
      setItems([]);
      showToast(e instanceof Error ? e.message : "Gagal memuat paket");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  const { role, isLoading: sessionLoading } = useAppSession();

  useEffect(() => {
    if (sessionLoading || role !== "admin") return;
    load();
  }, [sessionLoading, role, load]);

  if (sessionLoading) {
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
    setFormError("");
    const price = Number(form.price);
    if (!form.name.trim()) {
      setFormError("Nama paket wajib diisi");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Harga harus lebih dari 0");
      return;
    }
    const dur = Number(form.durationMin);
    if (!Number.isFinite(dur) || dur <= 0) {
      setFormError("Durasi harus lebih dari 0");
      return;
    }
    const body = {
      name: form.name.trim(),
      vehicleType: form.vehicleType,
      price,
      durationMin: dur,
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder) || 0,
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
      showToast(e instanceof Error ? e.message : "Gagal menyimpan paket");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item: ServicePackage) {
    if (!confirm(`Nonaktifkan paket "${item.name}"?`)) return;
    try {
      await apiFetch(`/api/packages/${item.id}`, { method: "DELETE" });
      showToast("Paket dinonaktifkan");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal menonaktifkan paket");
    }
  }

  const filtered = items.filter((it) =>
    filter === "all" ? true : it.vehicleType === filter,
  );

  const VehicleLabel = (vt: VehicleType) => (vt === "motor" ? "Motor" : "Mobil");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Paket Layanan</h1>
          <p className="text-muted mt-1">Atur paket cuci motor & mobil</p>
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

      <div className="flex flex-col gap-3">
        {filtered.map((it) => (
          <Card key={it.id} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-lg font-bold text-ink">{it.name}</p>
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
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="paket-modal-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setModalOpen(false);
          }}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-lg bg-surface rounded-[var(--radius-lg)] shadow-[var(--shadow-float)] max-h-[90vh] overflow-y-auto outline-none"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 id="paket-modal-title" className="text-xl font-bold text-ink">
                {editing ? "Edit Paket" : "Tambah Paket"}
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
              <Field label="Nama Paket">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Cuci Motor Reguler"
                />
              </Field>
              <Field label="Tipe Kendaraan">
                <select
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
                <Field label="Harga (Rp)">
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="25000"
                  />
                </Field>
                <Field label="Durasi (menit)">
                  <Input
                    type="number"
                    value={form.durationMin}
                    onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                    placeholder="20"
                  />
                </Field>
              </div>
              <Field label="Deskripsi">
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Opsional"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Urutan">
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
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
              </div>
              {formError && <p className="text-sm text-danger">{formError}</p>}
              <Button type="submit" fullWidth size="lg" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-4 py-2 rounded-full shadow-[var(--shadow-float)] text-sm font-semibold"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
