import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banknote, CarFront, Clock3, CreditCard, FileSpreadsheet, FolderOpen, Motorbike, ReceiptText, Share2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNoticeDialog } from '../components/NoticeDialog';
import type { MainTabParamList } from '../navigation/types';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api';
import { downloadReportExcel, openExportedFile, shareExportedFile, type ExportResult } from '../lib/report-export';
import type { Order } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';

type Dashboard = {
  date?: string;
  totalRevenue?: number;
  totalTransactions?: number;
  cashRevenue?: number;
  transferRevenue?: number;
  motorCount?: number;
  mobilCount?: number;
};
type OmzetSummary = {
  totalRevenue?: number;
  totalTransactions?: number;
  items?: Array<{ period: string; revenue: number; count: number; cash: number; transfer: number }>;
};
const rupiah = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount)}`;
const dateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
function buildExportRanges(today: string) {
  const [year, month, day] = today.split('-').map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  const daysAgo = (count: number) => {
    const copy = new Date(base);
    copy.setUTCDate(copy.getUTCDate() - count);
    return isoDay(copy);
  };
  const weekStart = daysAgo((base.getUTCDay() + 6) % 7);
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  return [
    { key: 'today', label: 'Hari ini', hint: today, from: today, to: today },
    { key: '7days', label: '7 hari terakhir', hint: `${daysAgo(6)} – ${today}`, from: daysAgo(6), to: today },
    { key: 'week', label: 'Minggu ini', hint: `${weekStart} – ${today}`, from: weekStart, to: today },
    { key: 'month', label: 'Bulan ini', hint: `${monthStart} – ${today}`, from: monthStart, to: today },
  ];
}
const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const displayDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
});
const monthName = (date: Date) => new Intl.DateTimeFormat('id-ID', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
}).format(date);
function calendarCells(month: Date): Array<string | null> {
  const year = month.getUTCFullYear();
  const index = month.getUTCMonth();
  const cells: Array<string | null> = Array(new Date(Date.UTC(year, index, 1)).getUTCDay()).fill(null);
  const total = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  for (let day = 1; day <= total; day += 1) {
    cells.push(isoDay(new Date(Date.UTC(year, index, day))));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function shiftMonth(month: Date, delta: number): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + delta, 1));
}
export function LaporanScreen() {
  const { colors } = useTheme();
  const styles = useStyles(buildStyles);
  const statusStyle: Record<string, { label: string; color: string; background: string }> = {
    menunggu: { label: 'Menunggu', color: colors.warningDark, background: colors.warningSoft },
    proses: { label: 'Proses', color: colors.brandDark, background: colors.brandSoft },
    selesai: { label: 'Selesai', color: colors.successDark, background: colors.successSoft },
    paid: { label: 'Lunas', color: colors.successDark, background: colors.successSoft },
    dibatalkan: { label: 'Dibatalkan', color: colors.dangerDark, background: colors.dangerSoft },
  };
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { notify, dialog } = useNoticeDialog();
  const [periodIndex, setPeriodIndex] = useState(0);
  const [omzet, setOmzet] = useState<OmzetSummary | null>(null);
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rangeModal, setRangeModal] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState('');
  const today = useMemo(() => dateKey(new Date()), []);
  const exportRanges = useMemo(() => buildExportRanges(today), [today]);
  const periodKeys = ['today', 'week', 'month'] as const;
  const periodRange = exportRanges.find((range) => range.key === periodKeys[periodIndex]) ?? exportRanges[0];
  const periodLabel = ['Hari ini', 'Minggu ini', 'Bulan ini'][periodIndex];
  const periodTitle = ['Hari Ini', 'Minggu Ini', 'Bulan Ini'][periodIndex];
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [calendarTarget, setCalendarTarget] = useState<'from' | 'to' | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const [year, month] = today.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1));
  });
  const cells = useMemo(() => calendarCells(viewMonth), [viewMonth]);
  const [slideDirection, setSlideDirection] = useState(1);
  const calendarFade = useRef(new Animated.Value(0)).current;
  const calendarSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!calendarTarget) return;
    calendarFade.setValue(0);
    Animated.timing(calendarFade, { toValue: 1, duration: 160, useNativeDriver: false }).start();
  }, [calendarTarget, calendarFade]);

  useEffect(() => {
    calendarSlide.setValue(slideDirection * 28);
    Animated.timing(calendarSlide, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  }, [viewMonth, slideDirection, calendarSlide]);

  function changeMonth(delta: number) {
    setSlideDirection(delta);
    setViewMonth((current) => shiftMonth(current, delta));
  }

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [omzetReport, orders] = await Promise.all([
        api.reports.omzet(periodRange.from, periodRange.to),
        api.orders.list({ from: periodRange.from, to: periodRange.to, includePaid: true }),
      ]);
      setOmzet(omzetReport as OmzetSummary);
      setTransactions(orders);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat laporan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodRange.from, periodRange.to]);

  useEffect(() => { void load(); }, [load]);

  function cyclePeriod() {
    setPeriodIndex((index) => (index + 1) % 3);
  }

  async function handleExport(from: string, to: string) {
    if (to < from) {
      notify({ title: 'Periode tidak valid', message: 'Tanggal akhir harus sama atau setelah tanggal awal.' });
      return;
    }
    setRangeModal(false);
    setExporting(true);
    try {
      setExportResult(await downloadReportExcel('transactions', from, to));
      setResultModal(true);
    } catch (cause) {
      notify({ title: 'Gagal mengekspor', message: cause instanceof Error ? cause.message : 'Silakan coba lagi.' });
    } finally {
      setExporting(false);
    }
  }

  function pickDate(iso: string) {
    if (calendarTarget === 'from') {
      setCustomFrom(iso);
      setCustomTo(iso);
      setCalendarTarget('to');
    } else if (calendarTarget === 'to') {
      if (iso < customFrom) {
        setCustomFrom(iso);
        setCustomTo(iso);
      } else {
        setCustomTo(iso);
      }
      setCalendarTarget(null);
    }
  }

  async function handleOpenFile() {
    if (!exportResult) return;
    try {
      await openExportedFile(exportResult);
    } catch (cause) {
      notify({ title: 'Gagal membuka file', message: cause instanceof Error ? cause.message : 'Silakan coba lagi.' });
    }
  }

  async function handleShareFile() {
    if (!exportResult) return;
    try {
      await shareExportedFile(exportResult);
    } catch (cause) {
      notify({ title: 'Gagal membagikan', message: cause instanceof Error ? cause.message : 'Silakan coba lagi.' });
    }
  }

  const paidTransactions = useMemo(() => transactions.filter((order) => order.paid), [transactions]);
  const packageBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    paidTransactions.forEach((order) => counts.set(order.packageName || 'Paket lain', (counts.get(order.packageName || 'Paket lain') ?? 0) + 1));
    const rows = Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return rows.slice(0, 5).map((row) => ({ ...row, percent: paidTransactions.length ? Math.round(row.count / paidTransactions.length * 100) : 0 }));
  }, [paidTransactions]);
  const revenue = omzet?.totalRevenue ?? 0;
  const transactionCount = omzet?.totalTransactions ?? 0;
  const cash = omzet?.items?.reduce((sum, item) => sum + item.cash, 0) ?? 0;
  const transfer = omzet?.items?.reduce((sum, item) => sum + item.transfer, 0) ?? 0;
  const paymentTotal = cash + transfer;
  const formatTime = (createdAt: string) => new Date(createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 18 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}
      >
        <View style={styles.heading}>
          <View>
            <Text style={styles.eyebrow}>RINGKASAN BISNIS</Text>
            <Text style={styles.title}>Laporan Omzet</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export laporan ke Excel"
            disabled={exporting}
            onPress={() => setRangeModal(true)}
            style={[styles.exportButton, exporting && styles.exportDisabled]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.night} />
            ) : (
              <FileSpreadsheet size={16} color={colors.night} />
            )}
            <Text style={styles.exportText}>{exporting ? 'Mengekspor…' : 'Export Excel'}</Text>
          </Pressable>
        </View>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {new Date(`${today}T12:00:00+07:00`).toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'Asia/Jakarta',
            })}
          </Text>
          <View style={styles.todayPill}>
            <Clock3 size={14} color={colors.brandDark} />
            <Text style={styles.todayText}>{periodLabel}</Text>
          </View>
        </View>
        {error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()}><Text style={styles.retry}>Coba lagi</Text></Pressable>
          </View>
        ) : null}
        {loading && !omzet ? (
          <ActivityIndicator style={styles.loading} size="large" color={colors.brand} />
        ) : (
          <>
            <View style={styles.metricGrid}>
              <StatCard title={`Total Omzet ${periodTitle}`} value={rupiah(revenue)} subtitle="Transaksi lunas · ketuk ganti periode" icon={Banknote} accentColor={colors.brandDark} onPress={cyclePeriod} />
              <StatCard title="Jumlah Transaksi" value={transactionCount} subtitle="Transaksi lunas" icon={ReceiptText} accentColor={colors.brand} />
              <StatCard title="Total Motor" value={transactions.filter((item) => item.vehicleType === 'motor').length} subtitle="Kendaraan periode ini" icon={Motorbike} accentColor={colors.brand} />
              <StatCard title="Total Mobil" value={transactions.filter((item) => item.vehicleType === 'mobil').length} subtitle="Kendaraan periode ini" icon={CarFront} accentColor={colors.brandDark} />
            </View>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
                <CreditCard size={18} color={colors.brandDark} />
              </View>
              {[
                { label: 'Tunai', amount: cash, icon: Banknote, color: colors.brandDark },
                { label: 'Transfer', amount: transfer, icon: CreditCard, color: colors.brand },
              ].map(({ label, amount, icon: Icon, color }) => {
                const percent = paymentTotal ? Math.round((amount / paymentTotal) * 100) : 0;
                return (
                  <View key={label} style={styles.paymentRow}>
                    <View style={styles.paymentMeta}>
                      <View style={[styles.paymentIcon, { backgroundColor: `${color}18` }]}>
                        <Icon size={17} color={color} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.paymentName}>{label}</Text>
                        <Text style={styles.muted}>{percent}% dari omzet</Text>
                      </View>
                      <Text style={styles.paymentAmount}>{rupiah(amount)}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
              {!paymentTotal && !loading ? <Text style={styles.muted}>Belum ada pembayaran hari ini.</Text> : null}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Paket Terlaris</Text>
              {packageBreakdown.length ? (
                packageBreakdown.map((row, index) => (
                  <View key={row.name} style={styles.packageRow}>
                    <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
                    <View style={styles.flex}>
                      <View style={styles.packageMeta}>
                        <Text numberOfLines={1} style={styles.packageName}>{row.name}</Text>
                        <Text style={styles.packageCount}>{row.count} transaksi</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, styles.packageFill, { width: `${row.percent}%` }]} />
                      </View>
                    </View>
                    <Text style={styles.percent}>{row.percent}%</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>Belum ada paket terjual hari ini.</Text>
              )}
            </View>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Transaksi {periodTitle}</Text>
                <Text style={styles.muted}>{transactions.length} transaksi</Text>
              </View>
              {transactions.length ? (
                transactions.map((order) => {
                  const status = statusStyle[order.status] ?? statusStyle.menunggu;
                  return (
                    <View key={order.id} style={styles.transactionRow}>
                      <View style={styles.transactionTop}>
                        <Text style={styles.invoice}>{order.invoiceNo}</Text>
                        <View style={[styles.status, { backgroundColor: status.background }]}>
                          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                        </View>
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.plate}>{order.plate || 'Tanpa plat'}</Text>
                        <Text style={styles.muted}>{order.vehicleType === 'mobil' ? 'Mobil' : 'Motor'} · {formatTime(order.createdAt)}</Text>
                      </View>
                      <View style={styles.transactionBottom}>
                        <Text numberOfLines={1} style={styles.packageName}>{order.packageName}</Text>
                        <Text style={styles.transactionTotal}>{rupiah(order.grandTotal)}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyBlock}>
                  <Text style={styles.muted}>{loading ? 'Memuat transaksi…' : `Belum ada transaksi ${periodLabel.toLowerCase()}.`}</Text>
                  <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Kasir')} style={styles.emptyCta}>
                    <Text style={styles.emptyCtaText}>Buat transaksi di Kasir</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={rangeModal} transparent animationType="fade" onRequestClose={() => setRangeModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRangeModal(false)}>
          <Pressable style={styles.rangeCard} onPress={(event) => event.stopPropagation()}>
            {calendarTarget ? (
              <Animated.View style={{ opacity: calendarFade, transform: [{ translateX: calendarSlide }] }}>
                <View style={styles.calendarHeader}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Bulan sebelumnya" onPress={() => changeMonth(-1)} style={styles.navButton}>
                    <Text style={styles.navText}>‹</Text>
                  </Pressable>
                  <Text style={styles.calendarTitle}>{monthName(viewMonth)}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Bulan berikutnya" onPress={() => changeMonth(1)} style={styles.navButton}>
                    <Text style={styles.navText}>›</Text>
                  </Pressable>
                </View>
                <Text style={styles.calendarHint}>Pilih tanggal {calendarTarget === 'from' ? 'awal' : 'akhir'}</Text>
                <View style={styles.weekRow}>
                  {WEEKDAYS.map((day) => <Text key={day} style={styles.weekDay}>{day}</Text>)}
                </View>
                <View style={styles.dayGrid}>
                  {cells.map((iso, index) => iso ? (
                    <Pressable
                      key={iso}
                      accessibilityRole="button"
                      accessibilityLabel={displayDate(iso)}
                      onPress={() => pickDate(iso)}
                      style={[styles.dayCell, (iso === customFrom || iso === customTo) && styles.daySelected]}
                    >
                      <Text style={[(iso === customFrom || iso === customTo) ? styles.daySelectedText : styles.dayText]}>{Number(iso.slice(8))}</Text>
                    </Pressable>
                  ) : (
                    <View key={`blank-${index}`} style={styles.dayBlank} />
                  ))}
                </View>
                <Pressable accessibilityRole="button" onPress={() => setCalendarTarget(null)} style={styles.calendarDone}>
                  <Text style={styles.calendarDoneText}>Selesai</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <>
                <Text style={styles.rangeTitle}>Pilih Jangka Waktu</Text>
                <Text style={styles.rangeSubtitle}>Tentukan tanggal awal dan akhir laporan.</Text>
                <View style={styles.modalDivider} />
                <Pressable accessibilityRole="button" onPress={() => setCalendarTarget('from')} style={styles.dateField}>
                  <Text style={styles.dateFieldLabel}>Dari tanggal</Text>
                  <Text style={styles.dateFieldValue}>{displayDate(customFrom)}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setCalendarTarget('to')} style={styles.dateField}>
                  <Text style={styles.dateFieldLabel}>Sampai tanggal</Text>
                  <Text style={styles.dateFieldValue}>{displayDate(customTo)}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={exporting} onPress={() => void handleExport(customFrom, customTo)} style={styles.rangePrimary}>
                  <Text style={styles.rangePrimaryText}>Export periode ini</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setRangeModal(false)} style={styles.rangeCancel}>
                  <Text style={styles.rangeCancelText}>Batal</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={resultModal} transparent animationType="fade" onRequestClose={() => setResultModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setResultModal(false)}>
          <Pressable style={styles.rangeCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.rangeTitle}>Excel siap</Text>
            <Text style={styles.rangeSubtitle}>{exportResult?.fileName} berhasil diunduh.</Text>
            <View style={styles.pathBox}>
              <Text style={styles.pathLabel}>Lokasi file</Text>
              <Text selectable style={styles.pathValue}>{exportResult?.location}</Text>
            </View>
            <View style={styles.resultActions}>
              <Pressable accessibilityRole="button" onPress={() => void handleOpenFile()} style={[styles.resultButton, styles.resultButtonPrimary]}>
                <FolderOpen size={16} color={colors.night} />
                <Text style={styles.resultButtonPrimaryText}>Buka file</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void handleShareFile()} style={[styles.resultButton, styles.resultButtonSecondary]}>
                <Share2 size={16} color={colors.brandDark} />
                <Text style={styles.resultButtonSecondaryText}>Bagikan file</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setResultModal(false)} style={styles.rangeCancel}>
              <Text style={styles.rangeCancelText}>Tutup</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      {dialog}
    </View>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, flexGrow: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.brandDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brandSoft, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: colors.line },
  todayText: { color: colors.brandDark, fontSize: 12, fontWeight: '800' },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: colors.brandDark },
  exportDisabled: { opacity: 0.6 },
  exportText: { color: colors.night, fontSize: 12, fontWeight: '800' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: -9 },
  dateText: { color: colors.muted, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  rangeCard: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.line },
  rangeTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  rangeSubtitle: { color: colors.muted, fontSize: 12, marginTop: -6 },
  rangeCancel: { alignItems: 'center', paddingVertical: 6 },
  rangeCancelText: { color: colors.brandDark, fontWeight: '800', fontSize: 13 },
  calendarHint: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 10 },
  calendarDone: { backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  calendarDoneText: { color: colors.night, fontSize: 13, fontWeight: '800' },
  resultActions: { flexDirection: 'row', gap: 10 },
  resultButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 12, borderWidth: 1 },
  resultButtonPrimary: { backgroundColor: colors.brand, borderColor: colors.brandDark },
  resultButtonSecondary: { backgroundColor: colors.surface, borderColor: colors.line },
  resultButtonPrimaryText: { color: colors.night, fontSize: 12, fontWeight: '800' },
  resultButtonSecondaryText: { color: colors.brandDark, fontSize: 12, fontWeight: '800' },
  modalDivider: { height: 1, backgroundColor: colors.line, marginVertical: 2 },
  dateField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bg },
  dateFieldLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  dateFieldValue: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  rangePrimary: { backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 2 },
  rangePrimaryText: { color: colors.night, fontSize: 13, fontWeight: '800' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  navButton: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  navText: { color: colors.brandDark, fontSize: 20, fontWeight: '800', lineHeight: 20 },
  weekRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  weekDay: { width: 40, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', paddingVertical: 6 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  dayCell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  daySelected: { backgroundColor: colors.brand, borderColor: colors.brandDark },
  dayBlank: { width: 40, height: 40 },
  dayText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  daySelectedText: { color: colors.night, fontSize: 13, fontWeight: '800' },
  pathBox: { backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 4 },
  pathLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  pathValue: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 11, gap: 5 },
  errorText: { color: colors.dangerDark, fontSize: 13 },
  retry: { color: colors.brandDark, fontWeight: '800' },
  loading: { marginTop: 45 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, gap: 13 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  paymentRow: { gap: 8 },
  paymentMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  paymentName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  emptyBlock: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  emptyCta: { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  emptyCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  paymentAmount: { color: colors.ink, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 6, borderRadius: 8, backgroundColor: colors.bg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  progressFill: { height: '100%', borderRadius: 8 },
  packageFill: { backgroundColor: colors.brand },
  packageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { color: colors.lightMuted, fontSize: 11, fontWeight: '800' },
  packageMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  packageName: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700' },
  packageCount: { color: colors.lightMuted, fontSize: 11 },
  percent: { width: 33, textAlign: 'right', color: colors.muted, fontSize: 11, fontWeight: '800' },
  transactionRow: { borderTopWidth: 1, borderTopColor: colors.bg, paddingTop: 12, gap: 7 },
  transactionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invoice: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  status: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  transactionDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  plate: { color: colors.brandDark, fontWeight: '700', fontSize: 13 },
  transactionBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transactionTotal: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  });
}
