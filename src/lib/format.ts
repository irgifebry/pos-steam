export function rupiah(value: number): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
  // Locale id-ID menghasilkan "Rp65.000" — rapikan jadi "Rp 65.000".
  return formatted.replace("Rp", "Rp ").replace(/\s+/g, " ").trim();
}

export function formatTanggal(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  let date: Date;
  if (typeof d === "string") {
    const trimmed = d.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    date = m
      ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      : new Date(trimmed);
  } else {
    date = d;
  }
  if (isNaN(date.getTime())) return typeof d === "string" ? d : "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatWaktu(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  if (typeof d === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(d.trim())) {
    return d.trim().slice(0, 5);
  }
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return typeof d === "string" ? d : "—";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatAngka(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}