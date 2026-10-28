"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Car,
  CheckCircle2,
  CreditCard,
  Minus,
  Bike,
  Plus,
  Printer,
  Receipt,
  ShoppingCart,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api-client";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/cn";

type VehicleType = "motor" | "mobil";

type Package = {
  id: string;
  name: string;
  price: number;
  vehicleType: VehicleType;
  description?: string;
};

type Addon = {
  id: string;
  name: string;
  price: number;
  unitLabel: string;
  vehicleTypes: VehicleType[];
};

type Bank = {
  id: string;
  name: string;
  accountNumber: string;
  accountName: string;
};

type RecentTx = {
  id: string;
  queueNumber: string;
  customer: string;
  vehicleType: VehicleType;
  total: number;
  paymentMethod: "tunai" | "transfer";
  time: string;
};

type SuccessInfo = {
  queueNumber: string;
  customer: string;
  total: number;
};

const DEMO_PACKAGES: Record<VehicleType, Package[]> = {
  motor: [
    { id: "mp1", name: "Cuci Motor Biasa", price: 25000, vehicleType: "motor", description: "Cuci body + bilas" },
    { id: "mp2", name: "Cuci Motor + Wax", price: 35000, vehicleType: "motor", description: "Cuci + wax body" },
    { id: "mp3", name: "Cuci Motor Premium", price: 50000, vehicleType: "motor", description: "Cuci lengkap + semir" },
  ],
  mobil: [
    { id: "cp1", name: "Cuci Mobil Biasa", price: 50000, vehicleType: "mobil", description: "Cuci body + bilas" },
    { id: "cp2", name: "Cuci Mobil + Wax", price: 70000, vehicleType: "mobil", description: "Cuci + wax body" },
    { id: "cp3", name: "Cuci Mobil Premium", price: 100000, vehicleType: "mobil", description: "Cuci lengkap + interior" },
  ],
};

const DEMO_ADDONS: Addon[] = [
  { id: "a1", name: "Vacuum Interior", price: 10000, unitLabel: "kali", vehicleTypes: ["motor", "mobil"] },
  { id: "a2", name: "Semir Ban", price: 5000, unitLabel: "kali", vehicleTypes: ["motor", "mobil"] },
  { id: "a3", name: "Parfum Mobil", price: 8000, unitLabel: "pcs", vehicleTypes: ["mobil"] },
  { id: "a4", name: "Fogging Disinfektan", price: 15000, unitLabel: "kali", vehicleTypes: ["mobil"] },
];

const DEMO_BANKS: Bank[] = [
  { id: "b1", name: "BCA", accountNumber: "1234567890", accountName: "POS Cuci Steam" },
  { id: "b2", name: "BRI", accountNumber: "0987654321", accountName: "POS Cuci Steam" },
  { id: "b3", name: "Mandiri", accountNumber: "1122334455", accountName: "POS Cuci Steam" },
  { id: "b4", name: "BNI", accountNumber: "5566778899", accountName: "POS Cuci Steam" },
];

const seedRecent: RecentTx[] = [
  { id: "r1", queueNumber: "M-001", customer: "Budi Santoso", vehicleType: "motor", total: 35000, paymentMethod: "tunai", time: "09:12" },
  { id: "r2", queueNumber: "M-002", customer: "Siti Aminah", vehicleType: "mobil", total: 70000, paymentMethod: "transfer", time: "09:45" },
  { id: "r3", queueNumber: "M-003", customer: "Andi Wijaya", vehicleType: "motor", total: 25000, paymentMethod: "tunai", time: "10:02" },
];

export default function KasirPage() {
  const [vehicleType, setVehicleType] = useState<VehicleType>("motor");

  const [packages, setPackages] = useState<Package[]>(DEMO_PACKAGES.motor);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [addons, setAddons] = useState<Addon[]>(DEMO_ADDONS);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>(DEMO_BANKS);
  const [taxPercent, setTaxPercent] = useState<number>(0);

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});

  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custPlate, setCustPlate] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"tunai" | "transfer">("tunai");
  const [cashReceived, setCashReceived] = useState("");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [refNumber, setRefNumber] = useState("");

  const [recent, setRecent] = useState<RecentTx[]>(seedRecent);
  const [queueCounter, setQueueCounter] = useState(4);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch packages + addons when vehicle type changes
  const loadCatalog = useCallback(async (vt: VehicleType) => {
    setPackagesLoading(true);
    setAddonsLoading(true);
    try {
      const pkgRes = await apiFetch<{ data: Package[] }>(`/api/packages?vehicleType=${vt}`);
      setPackages(pkgRes?.data?.length ? pkgRes.data : DEMO_PACKAGES[vt]);
    } catch {
      setPackages(DEMO_PACKAGES[vt]);
    } finally {
      setPackagesLoading(false);
    }
    try {
      const addonRes = await apiFetch<{ data: Addon[] }>(`/api/addons?vehicleType=${vt}`);
      const filtered = (addonRes?.data ?? []).filter((a) =>
        a.vehicleTypes ? a.vehicleTypes.includes(vt) : true,
      );
      setAddons(filtered.length ? filtered : DEMO_ADDONS.filter((a) => a.vehicleTypes.includes(vt)));
    } catch {
      setAddons(DEMO_ADDONS.filter((a) => a.vehicleTypes.includes(vt)));
    } finally {
      setAddonsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog(vehicleType);
  }, [vehicleType, loadCatalog]);

  // Fetch banks + settings once
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ data: Bank[] }>("/api/banks");
        if (res?.data?.length) setBanks(res.data);
      } catch {
        /* keep demo */
      }
      try {
        const res = await apiFetch<{ data: { outlet: { taxPercent: number } } }>("/api/settings");
        if (res?.data?.outlet) setTaxPercent(Number(res.data.outlet.taxPercent) || 0);
      } catch {
        /* keep default 0 */
      }
    })();
  }, []);

  // Reset selection when vehicle type changes
  useEffect(() => {
    setSelectedPackageId(null);
    setAddonQty({});
  }, [vehicleType]);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );

  const addonLines = useMemo(() => {
    return addons
      .filter((a) => (addonQty[a.id] ?? 0) > 0)
      .map((a) => ({ addon: a, qty: addonQty[a.id] }));
  }, [addons, addonQty]);

  const subtotal = useMemo(() => {
    const pkg = selectedPackage ? selectedPackage.price : 0;
    const ad = addonLines.reduce((s, l) => s + l.addon.price * l.qty, 0);
    return pkg + ad;
  }, [selectedPackage, addonLines]);

  const taxAmount = useMemo(() => Math.round((subtotal * taxPercent) / 100), [subtotal, taxPercent]);
  const total = subtotal + taxAmount;

  const cashNum = Number(cashReceived.replace(/\D/g, "")) || 0;
  const change = paymentMethod === "tunai" ? cashNum - total : 0;

  const stats = useMemo(() => {
    const count = recent.length;
    const omzet = recent.reduce((s, t) => s + t.total, 0);
    const cash = recent.filter((t) => t.paymentMethod === "tunai").reduce((s, t) => s + t.total, 0);
    const transfer = recent.filter((t) => t.paymentMethod === "transfer").reduce((s, t) => s + t.total, 0);
    const avg = count ? Math.round(omzet / count) : 0;
    return { count, omzet, cash, transfer, avg };
  }, [recent]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function toggleAddon(id: string) {
    setAddonQty((prev) => {
      const cur = prev[id] ?? 0;
      return { ...prev, [id]: cur > 0 ? 0 : 1 };
    });
  }

  function setQty(id: string, delta: number) {
    setAddonQty((prev) => {
      const cur = prev[id] ?? 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  }

  async function handleSubmit() {
    if (!selectedPackage) {
      showToast("Pilih paket dulu ya");
      return;
    }
    if (paymentMethod === "tunai" && cashNum < total) {
      showToast("Uang diterima kurang");
      return;
    }
    if (paymentMethod === "transfer" && !selectedBankId) {
      showToast("Pilih bank dulu ya");
      return;
    }

    setSubmitting(true);
    const queueNumber = `M-${String(queueCounter).padStart(3, "0")}`;
    const order = {
      queueNumber,
      customer: custName.trim() || "Pelanggan",
      vehicleType,
      package: selectedPackage,
      addons: addonLines,
      total,
      paymentMethod,
      cashReceived: paymentMethod === "tunai" ? cashNum : undefined,
      change: paymentMethod === "tunai" ? change : undefined,
      bankId: paymentMethod === "transfer" ? selectedBankId : undefined,
      refNumber: paymentMethod === "transfer" ? refNumber : undefined,
      plate: custPlate.trim(),
      phone: custPhone.trim(),
    };

    // Attempt backend (ignore errors)
    try {
      await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(order),
      });
    } catch {
      /* demo: ignore */
    }

    // Local order record
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setRecent((prev) => [
      {
        id: `r${Date.now()}`,
        queueNumber,
        customer: order.customer,
        vehicleType,
        total,
        paymentMethod,
        time,
      },
      ...prev,
    ]);
    setQueueCounter((c) => c + 1);

    setSuccess({ queueNumber, customer: order.customer, total });

    // Reset form
    setSelectedPackageId(null);
    setAddonQty({});
    setCustName("");
    setCustPhone("");
    setCustPlate("");
    setCashReceived("");
    setRefNumber("");
    setSelectedBankId(banks[0]?.id ?? "");
    setPaymentMethod("tunai");

    setSubmitting(false);
  }

  // default selected bank
  useEffect(() => {
    if (!selectedBankId && banks.length) setSelectedBankId(banks[0].id);
  }, [banks, selectedBankId]);

  const VehicleIcon = vehicleType === "motor" ? Bike : Car;

  return (
    <div className="flex flex-col gap-4 pb-36">
      {/* Dashboard hari ini */}
      <Card className="flex flex-col gap-4 border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-muted">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted leading-none">Ringkasan hari ini</p>
              <h2 className="font-display text-base font-semibold text-ink">Kas masuk</h2>
            </div>
          </div>
          <span className="text-sm text-muted">Hari ini</span>
        </div>
        <div className="border-y border-line py-3">
          <p className="text-sm font-medium text-muted">Omzet</p>
          <p className="font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">{rupiah(stats.omzet)}</p>
          <p className="mt-1 text-sm text-muted">{stats.count} transaksi tercatat</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-sm text-muted">Rata-rata</p><p className="font-semibold tabular-nums">{rupiah(stats.avg)}</p></div>
          <div><p className="text-sm text-muted">Tunai / transfer</p><p className="font-semibold tabular-nums">{rupiah(stats.cash)} / {rupiah(stats.transfer)}</p></div>
        </div>
      </Card>

      {/* Vehicle toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setVehicleType("motor")}
          className={cn(
            "h-16 rounded-[var(--radius-md)] border-2 flex items-center justify-center gap-3 text-lg font-extrabold transition active:scale-[0.98]",
            vehicleType === "motor"
              ? "bg-ink text-white border-ink"
              : "bg-surface text-ink border-line hover:bg-brand-soft",
          )}
        >
          <Bike className="h-7 w-7" />
          Motor
        </button>
        <button
          type="button"
          onClick={() => setVehicleType("mobil")}
          className={cn(
            "h-16 rounded-[var(--radius-md)] border-2 flex items-center justify-center gap-3 text-lg font-extrabold transition active:scale-[0.98]",
            vehicleType === "mobil"
              ? "bg-ink text-white border-ink"
              : "bg-surface text-ink border-line hover:bg-brand-soft",
          )}
        >
          <Car className="h-7 w-7" />
          Mobil
        </button>
      </div>

      {/* Packages */}
      <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-ink">Pilih paket</h3>
          {packagesLoading && <Spinner className="text-brand" />}
        </div>
        <div className="flex flex-col gap-3">
          {packages.map((p) => {
            const active = selectedPackageId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPackageId(p.id)}
                className={cn(
                  "w-full text-left rounded-[var(--radius-md)] border p-4 flex items-center justify-between gap-3 transition active:scale-[0.99]",
                  active
                    ? "bg-brand-soft border-brand"
                    : "bg-surface border-line hover:border-brand/40",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
                      active ? "bg-brand text-white" : "bg-brand-soft text-brand",
                    )}
                  >
                    <VehicleIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-ink truncate">{p.name}</p>
                    {p.description && <p className="text-sm text-muted truncate">{p.description}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">{rupiah(p.price)}</p>
                </div>
              </button>
            );
          })}
          {!packagesLoading && packages.length === 0 && (
            <p className="text-sm text-muted text-center py-4">Belum ada paket</p>
          )}
        </div>
      </section>

      {/* Addons */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Add-on</h3>
          {addonsLoading && <Spinner className="text-brand" />}
        </div>
        <Card className="flex flex-col gap-2 p-3">
          {addons.length === 0 && !addonsLoading && (
            <p className="text-sm text-muted text-center py-2">Tidak ada add-on</p>
          )}
          {addons.map((a) => {
            const qty = addonQty[a.id] ?? 0;
            const checked = qty > 0;
            return (
              <div
                key={a.id}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 transition",
                  checked ? "bg-brand-soft/50" : "",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleAddon(a.id)}
                  className={cn(
                    "h-7 w-7 rounded-md border-2 flex items-center justify-center shrink-0 transition",
                    checked ? "bg-brand border-brand text-white" : "border-line bg-surface",
                  )}
                  aria-label={checked ? "Hapus add-on" : "Tambah add-on"}
                >
                  {checked && <CheckCircle2 className="h-4 w-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{a.name}</p>
                  <p className="text-sm text-muted">{rupiah(a.price)} / {a.unitLabel}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQty(a.id, -1)}
                    className="h-9 w-9 rounded-lg border border-line bg-surface flex items-center justify-center text-ink active:scale-95 disabled:opacity-40"
                    disabled={qty <= 0}
                    aria-label="Kurangi"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-ink">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(a.id, 1)}
                    className="h-9 w-9 rounded-lg border border-line bg-surface flex items-center justify-center text-ink active:scale-95"
                    aria-label="Tambah"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      </section>

      {/* Customer form */}
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-bold text-ink flex items-center gap-2">
          <User className="h-5 w-5 text-brand" />
          Data Pelanggan
        </h3>
        <Card className="flex flex-col gap-3">
          <Field label="Nama pelanggan">
            <Input
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="Budi Santoso (opsional)"
              className="h-12 text-base"
            />
          </Field>
          <Field label="No. WhatsApp">
            <Input
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              placeholder="0812xxxx (opsional)"
              inputMode="tel"
              className="h-12 text-base"
            />
          </Field>
          <Field label="Plat nomor">
            <Input
              value={custPlate}
              onChange={(e) => setCustPlate(e.target.value.toUpperCase())}
              placeholder="B 1234 ABC (opsional)"
              className="h-12 text-base"
            />
          </Field>
        </Card>
      </section>

      {/* Cart summary */}
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-bold text-ink flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-brand" />
          Rincian
        </h3>
        <Card className="flex flex-col gap-2">
          {selectedPackage ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink">{selectedPackage.name}</span>
              <span className="font-semibold text-ink">{rupiah(selectedPackage.price)}</span>
            </div>
          ) : (
            <p className="text-sm text-muted">Belum pilih paket</p>
          )}
          {addonLines.map((l) => (
            <div key={l.addon.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink">
                {l.addon.name} x{l.qty}
              </span>
              <span className="font-semibold text-ink">{rupiah(l.addon.price * l.qty)}</span>
            </div>
          ))}
          <div className="h-px bg-line my-1" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold text-ink">{rupiah(subtotal)}</span>
          </div>
          {taxPercent > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Pajak {taxPercent}%</span>
              <span className="font-semibold text-ink">{rupiah(taxAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-ink">Total</span>
            <span className="text-xl font-extrabold text-brand">{rupiah(total)}</span>
          </div>
        </Card>
      </section>

      {/* Payment */}
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-bold text-ink flex items-center gap-2">
          <Banknote className="h-5 w-5 text-brand" />
          Pembayaran
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("tunai")}
            className={cn(
              "h-14 rounded-[var(--radius-md)] border-2 flex items-center justify-center gap-2 font-bold transition active:scale-[0.98]",
              paymentMethod === "tunai"
                ? "bg-accent text-ink border-accent shadow-sm"
                : "bg-surface text-ink border-line hover:bg-accent-soft",
            )}
          >
            <Banknote className="h-5 w-5" />
            Tunai
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("transfer")}
            className={cn(
              "h-14 rounded-[var(--radius-md)] border-2 flex items-center justify-center gap-2 font-bold transition active:scale-[0.98]",
              paymentMethod === "transfer"
                ? "bg-accent text-ink border-accent shadow-sm"
                : "bg-surface text-ink border-line hover:bg-accent-soft",
            )}
          >
            <CreditCard className="h-5 w-5" />
            Transfer
          </button>
        </div>

        {paymentMethod === "tunai" ? (
          <Card className="flex flex-col gap-3">
            <Field label="Uang diterima">
              <Input
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0"
                inputMode="numeric"
                className="h-12 text-base"
              />
            </Field>
            <div className="flex items-center justify-between">
              <span className="text-muted">Kembalian</span>
              <span className={cn("text-lg font-extrabold", change < 0 ? "text-danger" : "text-success")}>
                {rupiah(Math.max(0, change))}
              </span>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col gap-3">
            <Field label="Pilih bank">
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface text-base text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
              >
                <option value="">-- Pilih bank --</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} - {b.accountNumber}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="No. referensi">
              <Input
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="Nomor referensi transfer"
                className="h-12 text-base"
              />
            </Field>
          </Card>
        )}
      </section>

      {/* Recent transactions */}
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-bold text-ink">Transaksi Terakhir Hari Ini</h3>
        <Card className="flex flex-col gap-2 p-3">
          {recent.length === 0 && <p className="text-sm text-muted text-center py-2">Belum ada transaksi</p>}
          {recent.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-2 border-b border-line last:border-0">
              <div className="min-w-0">
                <p className="font-semibold text-ink truncate">{t.queueNumber} • {t.customer}</p>
                <p className="text-xs text-muted">
                  {t.vehicleType === "motor" ? "Motor" : "Mobil"} • {t.time} • {t.paymentMethod === "tunai" ? "Tunai" : "Transfer"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-brand">{rupiah(t.total)}</span>
                <button
                  type="button"
                  onClick={() => showToast("Struk dicetak (demo)")}
                  className="h-9 w-9 rounded-lg border border-line bg-surface flex items-center justify-center text-muted hover:text-brand"
                  aria-label="Cetak ulang"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      </section>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-16 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line">
        <div className="mx-auto max-w-lg px-4 py-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={submitting || !selectedPackage}
          >
            {submitting ? (
              <>
                <Spinner className="text-white" />
                Menyimpan...
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                Simpan & masuk antrean
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-4 py-2 rounded-full shadow-[var(--shadow-float)] text-sm font-semibold">
          {toast}
        </div>
      )}

      {/* Success modal */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <Card className="w-full max-w-sm flex flex-col items-center gap-3 text-center">
            <div className="h-16 w-16 rounded-full bg-success-soft text-success flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-extrabold text-ink">Transaksi tersimpan</h2>
            <p className="text-sm text-muted">Nomor antrean</p>
            <p className="text-4xl font-extrabold text-brand">{success.queueNumber}</p>
            <p className="text-sm text-muted">
              {success.customer} • {rupiah(success.total)}
            </p>
            <Button fullWidth size="lg" onClick={() => setSuccess(null)}>
              Selesai
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  small,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-bg p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className={cn("font-extrabold text-ink leading-tight", small ? "text-sm" : "text-lg")}>{value}</p>
    </div>
  );
}
