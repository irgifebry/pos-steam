"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  invoiceNo: string;
  queueNumber: string;
  customer: string;
  vehicleType: VehicleType;
  total: number;
  paymentMethod: "tunai" | "transfer";
  time: string;
  status: string;
  paid: boolean;
  packageName?: string;
  addons?: { name: string; qty: number; price: number }[];
  plate?: string;
};

type ApiOrder = {
  id: string;
  invoiceNo: string;
  queueNo: string;
  vehicleType: VehicleType;
  status: string;
  customerName: string;
  plate: string;
  grandTotal: number;
  createdAt: string;
  packageName: string;
  paid: boolean;
  payment: { method: "tunai" | "transfer" } | null;
  addons: { name: string; qty: number; price: number; subtotal: number }[];
};

type SuccessInfo = {
  queueNumber: string;
  customer: string;
  total: number;
};

export default function KasirPage() {
  const [vehicleType, setVehicleType] = useState<VehicleType>("motor");

  const [packages, setPackages] = useState<Package[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [catalogError, setCatalogError] = useState("");
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

  const [recent, setRecent] = useState<RecentTx[]>([]);
  const [ordersError, setOrdersError] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [receipt, setReceipt] = useState<RecentTx | null>(null);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  const ordersLoadedRef = useRef(false);
  const loadOrders = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiFetch<{ data: ApiOrder[] }>("/api/orders?includePaid=true", { signal });
      const timeFormatter = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
      });
      setRecent(
        res.data.map((order) => ({
          id: order.id,
          invoiceNo: order.invoiceNo,
          queueNumber: order.queueNo,
          customer: order.customerName,
          vehicleType: order.vehicleType,
          total: order.grandTotal,
          paymentMethod: order.payment?.method ?? "tunai",
          time: timeFormatter.format(new Date(order.createdAt)),
          status: order.status,
          paid: order.paid,
          packageName: order.packageName,
          addons: order.addons.map((addon) => ({
            name: addon.name,
            qty: addon.qty,
            price: addon.price,
          })),
          plate: order.plate,
        })),
      );
      setOrdersError("");
      ordersLoadedRef.current = true;
    } catch (error) {
      if (signal?.aborted) return;
      setOrdersError(error instanceof Error ? error.message : "Gagal memuat transaksi hari ini.");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadOrders(controller.signal);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOrders();
    }, 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadOrders();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadOrders]);

  // Fetch packages + addons when vehicle type changes
  const loadCatalog = useCallback(async (vt: VehicleType, signal?: AbortSignal) => {
    setPackagesLoading(true);
    setAddonsLoading(true);
    setCatalogError("");
    try {
      const pkgRes = await apiFetch<{ data: Package[] }>(`/api/packages?vehicleType=${vt}`, { signal });
      if (signal?.aborted) return;
      setPackages(pkgRes?.data ?? []);
    } catch (error) {
      if (signal?.aborted) return;
      setPackages([]);
      setCatalogError(error instanceof Error ? error.message : "Gagal memuat paket.");
    } finally {
      if (!signal?.aborted) setPackagesLoading(false);
    }
    try {
      const addonRes = await apiFetch<{ data: Addon[] }>(`/api/addons?vehicleType=${vt}`, { signal });
      const filtered = (addonRes?.data ?? []).filter((a) =>
        a.vehicleTypes ? a.vehicleTypes.includes(vt) : true,
      );
      if (signal?.aborted) return;
      setAddons(filtered);
    } catch (error) {
      if (signal?.aborted) return;
      setAddons([]);
      setCatalogError(error instanceof Error ? error.message : "Gagal memuat add-on.");
    } finally {
      if (!signal?.aborted) setAddonsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(vehicleType, controller.signal);
    return () => controller.abort();
  }, [vehicleType, loadCatalog]);

  // Fetch banks + settings once
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await apiFetch<{ data: Bank[] }>("/api/banks", { signal: controller.signal });
        setBanks(res?.data ?? []);
      } catch {
        if (!controller.signal.aborted) setBanks([]);
      }
      try {
        const res = await apiFetch<{ data: { outlet: { taxPercent: number } } }>("/api/settings", { signal: controller.signal });
        if (res?.data?.outlet) setTaxPercent(Number(res.data.outlet.taxPercent) || 0);
      } catch {
        /* keep default 0 */
      }
    })();
    return () => controller.abort();
  }, []);

  // Reset selection when vehicle type changes
  useEffect(() => {
    setSelectedPackageId(null);
    setAddonQty({});
  }, [vehicleType]);

  // Clear stale selected package
  useEffect(() => {
    if (selectedPackageId && !packages.some((p) => p.id === selectedPackageId)) {
      setSelectedPackageId(null);
    }
  }, [packages, selectedPackageId]);

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
    const paid = recent.filter((t) => t.paid);
    const count = paid.length;
    const omzet = paid.reduce((s, t) => s + t.total, 0);
    const cash = paid.filter((t) => t.paymentMethod === "tunai").reduce((s, t) => s + t.total, 0);
    const transfer = paid.filter((t) => t.paymentMethod === "transfer").reduce((s, t) => s + t.total, 0);
    const avg = count ? Math.round(omzet / count) : 0;
    return { count, omzet, cash, transfer, avg };
  }, [recent]);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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
    if (!online) {
      showToast("Transaksi memerlukan koneksi internet");
      return;
    }
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
    if (paymentMethod === "transfer" && banks.length === 0) {
      showToast("Daftar bank belum tersedia. Transaksi transfer tidak dapat disimpan.");
      return;
    }
    if (paymentMethod === "transfer" && !refNumber.trim()) {
      showToast("Nomor referensi transfer wajib diisi");
      return;
    }

    setSubmitting(true);

    const body = {
      clientId: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      vehicleType,
      packageId: selectedPackage.id,
      addons: addonLines.map(({ addon, qty }) => ({ addonId: addon.id, qty })),
      customerName: custName.trim(),
      customerPhone: custPhone.trim(),
      plate: custPlate.trim(),
      payment: {
        method: paymentMethod,
        cashReceived: paymentMethod === "tunai" ? cashNum : undefined,
        bankId: paymentMethod === "transfer" ? selectedBankId : undefined,
        referenceNo: paymentMethod === "transfer" ? refNumber.trim() : undefined,
      },
    };

    // Keep form intact unless backend confirms order creation.
    let created: ApiOrder;
    try {
      const res = await apiFetch<{ data: ApiOrder }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(body),
      });
      created = res.data;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal menyimpan transaksi. Coba lagi.");
      setSubmitting(false);
      return;
    }

    setSuccess({
      queueNumber: created.queueNo,
      customer: created.customerName,
      total: created.grandTotal,
    });

    await loadOrders();

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

  useEffect(() => {
    if (!success) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSuccess(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [success]);

  useEffect(() => {
    if (!receipt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReceipt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [receipt]);

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
          <span className={cn("text-sm font-semibold", online ? "text-success" : "text-danger")}>
            {online ? "Online" : "Offline · transaksi perlu koneksi"}
          </span>
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
          aria-pressed={vehicleType === "motor"}
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
          aria-pressed={vehicleType === "mobil"}
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
        {catalogError && <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{catalogError} Periksa koneksi lalu muat ulang halaman.</p>}
        <div className="flex flex-col gap-3">
          {packages.map((p) => {
            const active = selectedPackageId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPackageId(p.id)}
                  aria-pressed={active}
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
            <p className="text-sm text-muted text-center py-4">Paket belum tersedia. Transaksi tidak dapat dilanjutkan sampai katalog berhasil dimuat.</p>
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
                    role="switch"
                    aria-checked={checked}
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
              id="cust-name"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="Budi Santoso (opsional)"
              className="h-12 text-base"
              aria-label="Nama pelanggan"
            />
          </Field>
          <Field label="No. WhatsApp">
            <Input
              id="cust-phone"
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              placeholder="0812xxxx (opsional)"
              inputMode="tel"
              className="h-12 text-base"
              aria-label="No. WhatsApp"
            />
          </Field>
          <Field label="Plat nomor">
            <Input
              id="cust-plate"
              value={custPlate}
              onChange={(e) => setCustPlate(e.target.value.toUpperCase())}
              placeholder="B 1234 ABC (opsional)"
              className="h-12 text-base"
              aria-label="Plat nomor"
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
            aria-pressed={paymentMethod === "tunai"}
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
            aria-pressed={paymentMethod === "transfer"}
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
                id="cash-received"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                inputMode="numeric"
                className="h-12 text-base"
                aria-invalid={cashReceived !== "" && cashNum < total}
                aria-label="Uang diterima"
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
                id="bank-select"
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full h-12 px-4 rounded-[var(--radius-sm)] border border-line bg-surface text-base text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                aria-label="Pilih bank"
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
                id="ref-number"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                placeholder="Nomor referensi transfer"
                className="h-12 text-base"
                aria-label="No. referensi"
              />
            </Field>
          </Card>
        )}
      </section>

      {/* Recent transactions */}
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-bold text-ink">Transaksi Terakhir Hari Ini</h3>
        {ordersError && <p className="text-sm text-danger">{ordersError}</p>}
        <Card className="flex flex-col gap-2 p-3">
          {ordersLoading && <p className="text-sm text-muted text-center py-2">Memuat transaksi...</p>}
          {!ordersLoading && recent.length === 0 && <p className="text-sm text-muted text-center py-2">Belum ada transaksi</p>}
          {recent.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-2 border-b border-line last:border-0">
              <div className="min-w-0">
                <p className="font-semibold text-ink truncate">{t.queueNumber} • {t.customer}</p>
                <p className="text-xs text-muted">
                  {t.vehicleType === "motor" ? "Motor" : "Mobil"} • {t.time} • {t.paymentMethod === "tunai" ? "Tunai" : "Transfer"} • {t.paid ? "Lunas" : "Belum bayar"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-brand">{rupiah(t.total)}</span>
                <button
                  type="button"
                  onClick={() => setReceipt(t)}
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
        <div role="status" aria-live="polite" className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-4 py-2 rounded-full shadow-[var(--shadow-float)] text-sm font-semibold">
          {toast}
        </div>
      )}

      {/* Success modal */}
      {success && (
        <div role="dialog" aria-modal="true" aria-labelledby="success-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={() => setSuccess(null)}>
          <Card className="w-full max-w-sm flex flex-col items-center gap-3 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="h-16 w-16 rounded-full bg-success-soft text-success flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 id="success-modal-title" className="text-xl font-extrabold text-ink">Transaksi tersimpan</h2>
            <p className="text-sm text-muted">Nomor antrean</p>
            <p className="text-4xl font-extrabold text-brand">{success.queueNumber}</p>
            <p className="text-sm text-muted">
              {(success.customer?.trim() ? success.customer : "—")} • {rupiah(success.total)}
            </p>
            <Button fullWidth size="lg" onClick={() => setSuccess(null)}>
              Selesai
            </Button>
          </Card>
        </div>
      )}
      {receipt && (
        <div role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={() => setReceipt(null)}>
          <style>{`@page { size: 58mm auto; margin: 3mm; } @media print { html, body { width: 52mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; } body * { visibility: hidden !important; } .receipt-print, .receipt-print * { visibility: visible !important; } .receipt-print { position: fixed !important; inset: 0 auto auto 0 !important; width: 52mm !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important; color: #000 !important; } .no-print { display: none !important; } }`}</style>
          <Card className="receipt-print w-full max-w-sm flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h2 id="receipt-modal-title" className="text-center text-xl font-bold">Struk transaksi</h2>
            <p className="text-center text-sm text-muted">{receipt.invoiceNo}</p>
            <div className="border-y border-line py-3 text-sm">
              <p>{receipt.queueNumber} • {receipt.time}</p>
              <p>{receipt.customer} • {receipt.vehicleType === "motor" ? "Motor" : "Mobil"}</p>
              {receipt.plate && <p>Plat: {receipt.plate}</p>}
              {receipt.packageName ? <p>{receipt.packageName}</p> : <p>Rincian paket tidak tersedia.</p>}
              {receipt.addons?.map((addon) => <p key={addon.name}>{addon.name} x{addon.qty} • {rupiah(addon.price * addon.qty)}</p>)}
              <p className="mt-2 font-bold">Total: {rupiah(receipt.total)}</p>
              <p>Pembayaran: {receipt.paymentMethod === "tunai" ? "Tunai" : "Transfer"}</p>
              <p>Status: {receipt.paid ? "Lunas" : "Belum dibayar"}</p>
            </div>
            <div className="no-print flex gap-2">
              <Button fullWidth onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak</Button>
              <Button fullWidth variant="secondary" onClick={() => setReceipt(null)}>Tutup</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

