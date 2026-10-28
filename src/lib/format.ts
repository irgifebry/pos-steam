export function rupiah(value: number): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
  // Locale id-ID menghasilkan "Rp65.000" — rapikan jadi "Rp 65.000".
  return formatted.replace("Rp", "Rp ").replace(/\s+/g, " ").trim();
}

export function formatTanggal(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatWaktu(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAngka(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}