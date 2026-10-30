"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, ReceiptText, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { rupiah } from "@/lib/format";

type ReceiptData = {
  order: {
    invoiceNo: string;
    queueNo: string;
    businessDate: string;
    customerName: string;
    plate: string;
    vehicleType: string;
    status: string;
    grandTotal: number;
    tax: number;
    packageName: string;
    packagePrice: number;
    addons?: { id: string; name: string; qty: number; price: number; subtotal: number }[];
    payment: {
      method: string;
      amount: number;
      tender: number | null;
      changeAmount: number | null;
      bank: string | null;
      referenceNo: string | null;
    } | null;
    paid: boolean;
    createdByName: string;
  };
  outlet: {
    name: string;
    address: string;
    phone: string;
    receiptFooter: string;
  };
  cashierName: string;
};

export default function ReceiptPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReceipt = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ data: ReceiptData }>(`/api/receipts/${encodeURIComponent(token)}`);
      setData(res.data);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Struk tidak ditemukan");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReceipt();
  }, [loadReceipt]);

  if (loading) {
    return (
      <main className="min-h-screen bg-bg px-5 py-12 text-ink">
        <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-3 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-brand" />
          <p className="text-muted">Memuat struk...</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-bg px-5 py-12 text-ink">
        <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center text-center">
          <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-brand-soft text-brand">
            <ReceiptText aria-hidden="true" className="size-9" />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            Bukti transaksi
          </p>
          <h1 id="receipt-title" className="font-display text-3xl font-bold tracking-tight">
            Struk tidak ditemukan
          </h1>
          <p role="alert" className="mt-4 max-w-sm text-muted">
            {error || "Tautan struk tidak valid atau sudah tidak tersedia."}
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={loadReceipt}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface px-4 text-sm font-semibold text-ink"
            >
              <RefreshCw className="h-4 w-4" /> Coba lagi
            </button>
            <Link
              href="/kasir"
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-ink px-4 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Ke kasir
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { order, outlet } = data;

  return (
    <main className="min-h-screen bg-bg px-5 py-8 text-ink">
      <style>{`@page { size: 58mm auto; margin: 3mm; } @media print { html, body { width: 52mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; } body * { visibility: hidden !important; } .receipt-print, .receipt-print * { visibility: visible !important; } .receipt-print { position: fixed !important; inset: 0 auto auto 0 !important; width: 52mm !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important; color: #000 !important; } .no-print { display: none !important; } }`}</style>
      <section className="receipt-print mx-auto max-w-sm rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
        <div className="text-center">
          <h1 className="font-display text-xl font-bold">{outlet.name}</h1>
          {outlet.address && <p className="mt-1 text-xs text-muted">{outlet.address}</p>}
          {outlet.phone && <p className="text-xs text-muted">{outlet.phone}</p>}
        </div>

        <div className="mt-4 border-y border-line py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted">Invoice</span>
            <span className="font-semibold">{order.invoiceNo}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Antrean</span>
            <span className="font-semibold">{order.queueNo}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Tanggal</span>
            <span>{order.businessDate}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Kasir</span>
            <span>{data.cashierName}</span>
          </div>
        </div>

        <div className="py-3 text-sm">
          <p className="font-semibold">{order.customerName}</p>
          {order.plate && <p className="text-muted">Plat: {order.plate}</p>}
          <p className="text-muted">{order.vehicleType === "mobil" ? "Mobil" : "Motor"}</p>
        </div>

        <div className="border-y border-line py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span>{order.packageName}</span>
            <span>{rupiah(order.packagePrice)}</span>
          </div>
          {(order.addons ?? []).map((addon) => (
            <div key={addon.id} className="mt-1 flex justify-between gap-3">
              <span className="text-muted">{addon.name} × {addon.qty}</span>
              <span>{rupiah(addon.subtotal)}</span>
            </div>
          ))}
          {order.tax > 0 && (
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-muted">Pajak</span>
              <span>{rupiah(order.tax)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between gap-3 border-t border-line pt-2 text-base font-bold">
            <span>Total</span>
            <span>{rupiah(order.grandTotal)}</span>
          </div>
        </div>

        <div className="py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted">Pembayaran</span>
            <span className="font-semibold">
              {order.payment ? (order.payment.method === "transfer" ? "Transfer" : "Tunai") : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Status</span>
            <span className={order.paid ? "font-semibold text-success" : "font-semibold text-amber-700"}>
              {order.paid ? "Lunas" : "Belum dibayar"}
            </span>
          </div>
          {order.payment?.bank && <p className="mt-1 text-muted">Bank: {order.payment.bank}</p>}
          {order.payment?.referenceNo && <p className="text-muted">Ref: {order.payment.referenceNo}</p>}
          {order.payment?.tender !== null && order.payment?.tender !== undefined && (
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-muted">Diterima</span>
              <span>{rupiah(order.payment.tender)}</span>
            </div>
          )}
          {order.payment?.changeAmount !== null && order.payment?.changeAmount !== undefined && (
            <div className="flex justify-between gap-3">
              <span className="text-muted">Kembali</span>
              <span>{rupiah(order.payment.changeAmount)}</span>
            </div>
          )}
        </div>

        <p className="mt-2 text-center text-xs text-muted">
          {outlet.receiptFooter || "Terima kasih atas kunjungan Anda"}
        </p>
      </section>

      <div className="no-print mx-auto mt-4 flex max-w-sm gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-ink text-sm font-semibold text-white"
        >
          <Printer className="h-4 w-4" /> Cetak
        </button>
        <Link
          href="/kasir"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface text-sm font-semibold text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Ke kasir
        </Link>
      </div>
    </main>
  );
}