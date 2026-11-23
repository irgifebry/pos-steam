import { Platform } from 'react-native';
import { getBaseUrl, getSession } from './storage';

export type ReportExportType = 'transactions' | 'paket' | 'addon' | 'payment-method' | 'cash';

export type ExportResult = {
  fileName: string;
  /** Uri lokal hanya tersedia di native. */
  uri?: string;
  /** Blob hasil unduhan di Expo Web, dipakai untuk membuka/berbagi. */
  blob?: Blob;
  /** Keterangan lokasi file untuk ditampilkan ke pengguna. */
  location: string;
};

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function fileNameFor(type: ReportExportType, from: string, to: string): string {
  const suffix = to !== from ? `_${to}` : '';
  return `laporan-${type}-${from}${suffix}.xlsx`;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json() as { message?: string; error?: string | { message?: string } };
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (data.error && typeof data.error.message === 'string') return data.error.message;
  } catch {
    // Response bukan JSON; pakai pesan default.
  }
  return 'Gagal mengunduh laporan Excel';
}

/** Mengunduh laporan Excel dari backend dan mengembalikan info file hasil unduhan. */
export async function downloadReportExcel(type: ReportExportType, from: string, to: string): Promise<ExportResult> {
  const baseUrl = (await getBaseUrl()).replace(/\/$/, '');
  const params = new URLSearchParams({ type, from, to });
  const headers = new Headers();
  headers.set('Accept', EXCEL_MIME);
  headers.set('Origin', baseUrl);
  const session = await getSession();
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
  if (session?.cookie) headers.set('Cookie', session.cookie);

  const response = await fetch(`${baseUrl}/api/reports/export.xlsx?${params.toString()}`, {
    headers,
    credentials: 'include',
  });
  if (!response.ok) throw new Error(await errorMessage(response));

  const fileName = fileNameFor(type, from, to);

  if (Platform.OS === 'web') {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { fileName, blob, location: 'Folder Unduhan' };
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, fileName);
  await file.write(bytes);
  return { fileName, uri: file.uri, location: file.uri };
}

function webFile(result: ExportResult): File {
  if (!result.blob) throw new Error('File hasil unduhan tidak tersedia.');
  return new globalThis.File([result.blob], result.fileName, { type: EXCEL_MIME });
}

/** Membuka file Excel hasil export dengan aplikasi bawaan perangkat. */
export async function openExportedFile(result: ExportResult): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(result.blob!);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (!opened) throw new Error('Browser memblokir pembukaan file. Izinkan pop-up untuk situs ini.');
    return;
  }
  if (!result.uri) throw new Error('File hasil unduhan tidak tersedia.');
  const { File } = await import('expo-file-system');
  const file = new File(result.uri);
  if (!(await File.canPreview(file, { mimeType: EXCEL_MIME }))) {
    throw new Error('Tidak ada aplikasi yang bisa membuka file ini.');
  }
  await File.preview(file, { mimeType: EXCEL_MIME });
}

/** Membagi file Excel hasil export lewat share sheet (native) atau Web Share API. */
export async function shareExportedFile(result: ExportResult): Promise<void> {
  if (Platform.OS === 'web') {
    const file = webFile(result);
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || !navigator.canShare?.({ files: [file] })) {
      throw new Error('Browser ini tidak mendukung berbagi file.');
    }
    await navigator.share({ files: [file], title: result.fileName });
    return;
  }
  if (!result.uri) throw new Error('File hasil unduhan tidak tersedia.');
  const Sharing = await import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Berbagi file tidak tersedia di perangkat ini.');
  }
  await Sharing.shareAsync(result.uri, { mimeType: EXCEL_MIME, dialogTitle: result.fileName });
}
