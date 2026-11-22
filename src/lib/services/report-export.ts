import ExcelJS from "exceljs";
import type { CashShiftView } from "./cash-shifts";
import type { listReportTransactions } from "./reports";

type Transaction = Awaited<ReturnType<typeof listReportTransactions>>[number];

export type ReportExportType =
  | "transactions"
  | "paket"
  | "addon"
  | "payment-method"
  | "cash";

export type ReportExportInput = {
  type: ReportExportType;
  from: string;
  to: string;
  outletName: string;
  transactions: Transaction[];
  cash: CashShiftView[];
  exportedAt: Date;
};

type Column = {
  header: string;
  key: string;
  width: number;
  total?: boolean;
  money?: boolean;
  align?: "left" | "center" | "right";
};

const FONT = "Arial";
const COLOR = {
  navy: "FF0A3A61",
  brand: "FF0EA5E9",
  soft: "FFF0F9FF",
  stripe: "FFF8FCFF",
  ink: "FF0F172A",
  muted: "FF64748B",
  line: "FFBAE6FD",
  white: "FFFFFFFF",
  green: "FF16A34A",
};
const MONEY = '"Rp" #,##0;[Red]("Rp" #,##0);"Rp 0"';
const INTEGER = "#,##0";

function letter(index: number): string {
  let n = index;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function metropolitan(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function timestamp(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date) + " WIB";
}

function cover(ws: ExcelJS.Worksheet, columns: Column[], input: ReportExportInput, title: string) {
  const last = columns.length;
  const rows: Array<[string, string]> = [
    [title, "title"],
    [`Outlet: ${input.outletName || "-"}`, "meta"],
    [`Periode: ${metropolitan(input.from)} s/d ${metropolitan(input.to)}`, "meta"],
    [`Diekspor: ${timestamp(input.exportedAt)} · KYANE POS`, "meta"],
  ];

  rows.forEach(([value, kind], index) => {
    const row = index + 1;
    ws.mergeCells(row, 1, row, last);
    const cell = ws.getCell(row, 1);
    cell.value = value;
    cell.font = {
      name: FONT,
      size: kind === "title" ? 16 : 10,
      bold: kind === "title",
      italic: kind === "meta",
      color: { argb: kind === "title" ? COLOR.white : COLOR.muted },
    };
    cell.alignment = { vertical: "middle", horizontal: kind === "title" ? "left" : "left", indent: 1 };
    if (kind === "title") {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.navy } };
      ws.getRow(row).height = 36;
    } else {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.soft } };
      ws.getRow(row).height = 20;
    }
  });

  ws.getRow(5).height = 8;
  columns.forEach((column, index) => {
    ws.getColumn(index + 1).width = column.width;
  });
}

function addTable(
  ws: ExcelJS.Worksheet,
  columns: Column[],
  rows: Array<Record<string, string | number | null>>,
  input: ReportExportInput,
  title: string,
) {
  cover(ws, columns, input, title);
  const headerRow = 6;
  const firstDataRow = headerRow + 1;

  columns.forEach((column, index) => {
    const cell = ws.getCell(headerRow, index + 1);
    cell.value = column.header;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.brand } };
    cell.alignment = {
      vertical: "middle",
      horizontal: column.align ?? (column.money || column.total ? "right" : "left"),
    };
    cell.border = {
      top: { style: "thin", color: { argb: COLOR.line } },
      bottom: { style: "medium", color: { argb: COLOR.navy } },
      left: { style: "thin", color: { argb: COLOR.white } },
      right: { style: "thin", color: { argb: COLOR.white } },
    };
  });
  ws.getRow(headerRow).height = 28;

  rows.forEach((row, rowIndex) => {
    const excelRow = firstDataRow + rowIndex;
    columns.forEach((column, columnIndex) => {
      const cell = ws.getCell(excelRow, columnIndex + 1);
      const value = row[column.key];
      cell.value = value ?? "";
      cell.font = { name: FONT, size: 10, color: { argb: COLOR.ink } };
      cell.alignment = {
        vertical: "middle",
        horizontal: column.align ?? (column.money || column.total ? "right" : "left"),
        wrapText: false,
      };
      cell.border = {
        bottom: { style: "hair", color: { argb: COLOR.line } },
      };
      if (rowIndex % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.stripe } };
      }
      if (column.money) cell.numFmt = MONEY;
      else if (typeof value === "number") cell.numFmt = INTEGER;
    });
  });

  const lastDataRow = firstDataRow + rows.length - 1;
  const totalRow = lastDataRow + 1;

  ws.getCell(totalRow, 1).value = "TOTAL";
  ws.getCell(totalRow, 1).font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.navy } };
  ws.getCell(totalRow, 1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  columns.forEach((column, index) => {
    const cell = ws.getCell(totalRow, index + 1);
    if (index === 0) return;
    if (column.total) {
      if (rows.length > 0) {
        cell.value = { formula: `SUM(${letter(index + 1)}${firstDataRow}:${letter(index + 1)}${lastDataRow})` };
        cell.note = "Dihitung otomatis dari kolom di atas. Jangan diisi manual.";
      } else {
        cell.value = 0;
        cell.note = "Tidak ada data pada rentang ini, sehingga total bernilai 0.";
      }
    }
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.navy } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.soft } };
    cell.alignment = { vertical: "middle", horizontal: "right" };
    cell.numFmt = column.money ? MONEY : INTEGER;
    cell.border = { top: { style: "medium", color: { argb: COLOR.navy } } };
  });
  ws.getRow(totalRow).height = 24;

  const noteRow = totalRow + 2;
  ws.mergeCells(noteRow, 1, noteRow, columns.length);
  const note = ws.getCell(noteRow, 1);
  note.value =
    "Catatan: nilai dihitung dari data transaksi lunas pada rentang tanggal di atas. Total pada baris TOTAL adalah formula Excel, bukan nilai statis.";
  note.font = { name: FONT, size: 9, italic: true, color: { argb: COLOR.muted } };
  note.alignment = { vertical: "middle", wrapText: true };
  ws.getRow(noteRow).height = 26;

  if (rows.length > 0) {
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: lastDataRow, column: columns.length },
    };
  }
  ws.views = [{ state: "frozen", ySplit: headerRow, activeCell: `A${firstDataRow}` }];
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  ws.headerFooter.oddFooter = "&L&\"Arial,Regular\" KYANE POS&R&\"Arial,Regular\" Halaman &P dari &N";
  ws.properties.defaultRowHeight = 20;
}

function groupBy(
  transactions: Transaction[],
  keyOf: (tx: Transaction) => string,
): Array<{ name: string; count: number; total: number }> {
  const map = new Map<string, { count: number; total: number }>();
  for (const tx of transactions) {
    const key = keyOf(tx) || "Lainnya";
    const current = map.get(key) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += tx.total;
    map.set(key, current);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export async function buildReportWorkbook(input: ReportExportInput): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KYANE POS";
  workbook.lastModifiedBy = "KYANE POS";
  workbook.created = input.exportedAt;
  workbook.modified = input.exportedAt;
  workbook.company = "KYANE POS";
  workbook.title = `Laporan ${metropolitan(input.from)} - ${metropolitan(input.to)}`;

  const summary = workbook.addWorksheet("Ringkasan", {
    properties: { tabColor: { argb: COLOR.navy } },
  });
  cover(summary, [
    { header: "Metrik", key: "metric", width: 30 },
    { header: "Nilai", key: "value", width: 24 },
  ], input, "LAPORAN POS CUCU STEAM — RINGKASAN");
  summary.getColumn(1).width = 32;
  summary.getColumn(2).width = 26;

  const headerRow = 6;
  [["Metrik", "Nilai"]].forEach((values) => {
    values.forEach((value, index) => {
      const cell = summary.getCell(headerRow, index + 1);
      cell.value = value;
      cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.brand } };
      cell.alignment = { vertical: "middle", horizontal: index === 0 ? "left" : "right" };
    });
  });
  summary.getRow(headerRow).height = 28;

  const sheets: Array<{ name: string; active: boolean }> = [];

  const transactionsSheet = workbook.addWorksheet("Transaksi", {
    properties: { tabColor: { argb: COLOR.brand } },
  });
  const txColumns: Column[] = [
    { header: "Invoice", key: "invoiceNo", width: 22 },
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Antrean", key: "queueNo", width: 12 },
    { header: "Jenis", key: "vehicleType", width: 10 },
    { header: "Metode", key: "paymentMethod", width: 12 },
    { header: "Paket", key: "packageName", width: 26 },
    { header: "Add-on", key: "addons", width: 30 },
    { header: "Total (Rp)", key: "total", width: 18, total: true, money: true },
    { header: "Pelanggan", key: "customerName", width: 22 },
    { header: "Plat", key: "plate", width: 14 },
  ];
  addTable(
    transactionsSheet,
    txColumns,
    input.transactions.map((tx) => ({
      invoiceNo: tx.invoiceNo,
      date: metropolitan(tx.date),
      queueNo: tx.queueNo,
      vehicleType: tx.vehicleType === "mobil" ? "Mobil" : "Motor",
      paymentMethod: tx.paymentMethod,
      packageName: tx.packageName,
      addons: tx.addons.map((a) => `${a.name} x${a.qty}`).join(", ") || "-",
      total: tx.total,
      customerName: tx.customerName || "-",
      plate: tx.plate || "-",
    })),
    input,
    "TRANSAKSI",
  );
  sheets.push({ name: "Transaksi", active: input.type === "transactions" });

  const paketRows = groupBy(input.transactions, (tx) => tx.packageName);
  const paketSheet = workbook.addWorksheet("Paket", { properties: { tabColor: { argb: COLOR.brand } } });
  addTable(
    paketSheet,
    [
      { header: "Paket", key: "name", width: 32 },
      { header: "Jumlah Transaksi", key: "count", width: 18, total: true },
      { header: "Omzet (Rp)", key: "total", width: 20, total: true, money: true },
    ],
    paketRows.map((row) => ({ name: row.name, count: row.count, total: row.total })),
    input,
    "REKAP PAKET",
  );
  sheets.push({ name: "Paket", active: input.type === "paket" });

  const addonMap = new Map<string, { qty: number; count: number; total: number }>();
  for (const tx of input.transactions) {
    for (const addon of tx.addons) {
      const current = addonMap.get(addon.name) ?? { qty: 0, count: 0, total: 0 };
      current.qty += addon.qty;
      current.count += 1;
      current.total += addon.subtotal;
      addonMap.set(addon.name, current);
    }
  }
  const addonSheet = workbook.addWorksheet("Add-on", { properties: { tabColor: { argb: COLOR.brand } } });
  addTable(
    addonSheet,
    [
      { header: "Add-on", key: "name", width: 30 },
      { header: "Qty", key: "qty", width: 12, total: true },
      { header: "Jumlah Transaksi", key: "count", width: 18, total: true },
      { header: "Omzet (Rp)", key: "total", width: 20, total: true, money: true },
    ],
    [...addonMap.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.total - a.total),
    input,
    "REKAP ADD-ON",
  );
  sheets.push({ name: "Add-on", active: input.type === "addon" });

  const paymentSheet = workbook.addWorksheet("Metode Pembayaran", {
    properties: { tabColor: { argb: COLOR.brand } },
  });
  addTable(
    paymentSheet,
    [
      { header: "Metode", key: "name", width: 26 },
      { header: "Jumlah Transaksi", key: "count", width: 18, total: true },
      { header: "Omzet (Rp)", key: "total", width: 20, total: true, money: true },
    ],
    groupBy(input.transactions, (tx) => tx.paymentMethod),
    input,
    "METODE PEMBAYARAN",
  );
  sheets.push({ name: "Metode Pembayaran", active: input.type === "payment-method" });

  const cashSheet = workbook.addWorksheet("Kas", { properties: { tabColor: { argb: COLOR.brand } } });
  const cashRows = input.cash
    .filter((shift) => shift.date >= input.from && shift.date <= input.to)
    .sort((a, b) => b.date.localeCompare(a.date));
  addTable(
    cashSheet,
    [
      { header: "Tanggal", key: "date", width: 14 },
      { header: "Operator", key: "openedByName", width: 22 },
      { header: "Kas Awal (Rp)", key: "openingCash", width: 18, money: true },
      { header: "Kas Akhir (Rp)", key: "closingCash", width: 18, money: true },
      { header: "Diharapkan (Rp)", key: "expectedCash", width: 18, money: true },
      { header: "Selisih (Rp)", key: "difference", width: 16, money: true },
      { header: "Status", key: "status", width: 14 },
      { header: "Catatan", key: "note", width: 28 },
    ],
    cashRows.map((shift) => ({
      date: metropolitan(shift.date),
      openedByName: shift.openedByName || "-",
      openingCash: shift.openingCash,
      closingCash: shift.closingCash ?? 0,
      expectedCash: shift.expectedCash ?? 0,
      difference: shift.difference ?? 0,
      status: shift.closedAt ? "Ditutup" : "Berjalan",
      note: shift.note || "-",
    })),
    input,
    "REKAP KAS HARIAN",
  );
  sheets.push({ name: "Kas", active: input.type === "cash" });

  // Ringkasan memakai formula lintas sheet agar tetap hidup saat diedit.
  const txLast = 7 + input.transactions.length - 1;
  const addonLast = 7 + addonMap.size - 1;
  const metrics: Array<{ label: string; value: string | number; money?: boolean; note?: string }> = [
    {
      label: "Total Transaksi",
      value:
        input.transactions.length > 0
          ? { formula: `COUNT(Transaksi!A7:A${txLast})` } as unknown as string
          : 0,
      note: "Jumlah invoice pada sheet Transaksi.",
    },
    {
      label: "Total Omzet",
      value:
        input.transactions.length > 0
          ? { formula: `SUM(Transaksi!H7:H${txLast})` } as unknown as string
          : 0,
      money: true,
      note: "Dari kolom Total (Rp) pada sheet Transaksi.",
    },
    {
      label: "Rata-rata per Transaksi",
      value:
        input.transactions.length > 0
          ? { formula: `IF(B7=0,0,B8/B7)` } as unknown as string
          : 0,
      money: true,
      note: "Total Omzet dibagi Total Transaksi.",
    },
    {
      label: "Total Qty Add-on",
      value:
        addonMap.size > 0
          ? { formula: `SUM('Add-on'!B7:B${addonLast})` } as unknown as string
          : 0,
      note: "Dari kolom Qty pada sheet Add-on.",
    },
    {
      label: "Jumlah Hari Periode",
      value:
        Math.round(
          (new Date(`${input.to}T00:00:00Z`).getTime() - new Date(`${input.from}T00:00:00Z`).getTime()) /
            86_400_000,
        ) + 1,
      note: "Dihitung dari tanggal awal sampai tanggal akhir (inklusif).",
    },
  ];

  metrics.forEach((metric, index) => {
    const row = headerRow + 1 + index;
    const label = summary.getCell(row, 1);
    label.value = metric.label;
    label.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.navy } };
    label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLOR.stripe : COLOR.soft } };
    label.alignment = { vertical: "middle", indent: 1 };

    const value = summary.getCell(row, 2);
    value.value = metric.value as unknown as ExcelJS.CellValue;
    value.font = { name: FONT, size: 11, bold: true, color: { argb: COLOR.navy } };
    value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLOR.stripe : COLOR.soft } };
    value.alignment = { vertical: "middle", horizontal: "right" };
    value.numFmt = metric.money ? MONEY : INTEGER;
    if (metric.note) value.note = metric.note;
    summary.getRow(row).height = 24;
  });

  const summaryNoteRow = headerRow + metrics.length + 2;
  summary.mergeCells(summaryNoteRow, 1, summaryNoteRow, 2);
  const summaryNote = summary.getCell(summaryNoteRow, 1);
  summaryNote.value =
    "Seluruh angka pada Ringkasan adalah formula yang merujuk ke sheet detail. Ubah data di sheet detail untuk memperbarui ringkasan.";
  summaryNote.font = { name: FONT, size: 9, italic: true, color: { argb: COLOR.muted } };
  summaryNote.alignment = { vertical: "middle", wrapText: true };
  summary.getRow(summaryNoteRow).height = 28;

  summary.views = [{ state: "frozen", ySplit: headerRow, activeCell: "A7" }];
  summary.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
  summary.headerFooter.oddFooter = "&L&\"Arial,Regular\" KYANE POS&R&\"Arial,Regular\" Halaman &P dari &N";

  const active = sheets.find((sheet) => sheet.active)?.name ?? "Ringkasan";
  const activeTab = Math.max(0, workbook.worksheets.findIndex((ws) => ws.name === active));
  workbook.views = [
    {
      activeTab,
      firstSheet: 0,
      visibility: "visible",
      x: 0,
      y: 0,
      width: 24_000,
      height: 13_000,
    },
  ];

  return workbook.xlsx.writeBuffer() as Promise<ExcelJS.Buffer>;
}
