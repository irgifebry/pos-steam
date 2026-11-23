import { Platform } from 'react-native';
import { getBaseUrl, getSession } from './storage';

export type ReportExportType = 'transactions' | 'paket' | 'addon' | 'payment-method' | 'cash';

export type ExportResult = {
  fileName: string;
  /** Uri lokal hanya tersedia di native. */
  uri?: string;
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
    return { fileName, location: 'Folder Unduhan browser' };
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, fileName);
  await file.write(bytes);
  return { fileName, uri: file.uri, location: file.uri };
}

/** Membuka file Excel hasil export dengan aplikasi bawaan perangkat. */
export async function openExportedFile(uri: string): Promise<void> {
  const { File } = await import('expo-file-system');
  const file = new File(uri);
  if (!(await File.canPreview(file, { mimeType: EXCEL_MIME }))) {
    throw new Error('Tidak ada aplikasi yang bisa membuka file ini.');
  }
  await File.preview(file, { mimeType: EXCEL_MIME });
}

/** Membagi file Excel hasil export lewat share sheet. */
export async function shareExportedFile(uri: string, fileName: string): Promise<void> {
  const Sharing = await import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Berbagi file tidak tersedia di perangkat ini.');
  }
  await Sharing.shareAsync(uri, { mimeType: EXCEL_MIME, dialogTitle: fileName });
}
