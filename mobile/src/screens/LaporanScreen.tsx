import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banknote, CarFront, Clock3, CreditCard, Motorbike, ReceiptText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api';
import type { Order } from '../types';

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
const statusStyle: Record<string, { label: string; color: string; background: string }> = {
  menunggu: { label: 'Menunggu', color: '#92400e', background: '#fef3c7' },
  proses: { label: 'Proses', color: '#1d4ed8', background: '#dbeafe' },
  selesai: { label: 'Selesai', color: '#166534', background: '#dcfce7' },
  paid: { label: 'Lunas', color: '#166534', background: '#dcfce7' },
  dibatalkan: { label: 'Dibatalkan', color: '#b91c1c', background: '#fee2e2' },
};

export function LaporanScreen() {
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [omzet, setOmzet] = useState<OmzetSummary | null>(null);
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const today = useMemo(() => dateKey(new Date()), []);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [todayReport, omzetReport, orders] = await Promise.all([
        api.reports.today(),
        api.reports.omzet(today, today),
        api.orders.list({ date: today, includePaid: true }),
      ]);
      setDashboard(todayReport as Dashboard);
      setOmzet(omzetReport as OmzetSummary);
      setTransactions(orders);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat laporan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useEffect(() => { void load(); }, [load]);

  const paidTransactions = useMemo(() => transactions.filter((order) => order.paid), [transactions]);
  const packageBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    paidTransactions.forEach((order) => counts.set(order.packageName || 'Paket lain', (counts.get(order.packageName || 'Paket lain') ?? 0) + 1));
    const rows = Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return rows.slice(0, 5).map((row) => ({ ...row, percent: paidTransactions.length ? Math.round(row.count / paidTransactions.length * 100) : 0 }));
  }, [paidTransactions]);
  const revenue = dashboard?.totalRevenue ?? omzet?.totalRevenue ?? 0;
  const transactionCount = dashboard?.totalTransactions ?? omzet?.totalTransactions ?? 0;
  const cash = dashboard?.cashRevenue ?? omzet?.items?.reduce((sum, item) => sum + item.cash, 0) ?? 0;
  const transfer = dashboard?.transferRevenue ?? omzet?.items?.reduce((sum, item) => sum + item.transfer, 0) ?? 0;
  const paymentTotal = cash + transfer;
  const formatTime = (createdAt: string) => new Date(createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return <View style={styles.screen}>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 18 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#087e8b" />}
    >
      <View style={styles.heading}>
        <View><Text style={styles.eyebrow}>RINGKASAN BISNIS</Text><Text style={styles.title}>Laporan Omzet</Text></View>
        <View style={styles.todayPill}><Clock3 size={14} color="#087e8b" /><Text style={styles.todayText}>Hari ini</Text></View>
      </View>
      <Text style={styles.dateText}>{new Date(`${today}T12:00:00+07:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}</Text>
      {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Coba lagi</Text></Pressable></View> : null}
      {loading && !dashboard && !omzet ? <ActivityIndicator style={styles.loading} size="large" color="#087e8b" /> : <>
        <View style={styles.metricGrid}>
          <StatCard title="Total Omzet Hari Ini" value={rupiah(revenue)} subtitle="Transaksi lunas" icon={Banknote} accentColor="#087e8b" />
          <StatCard title="Jumlah Transaksi" value={transactionCount} subtitle="Transaksi lunas" icon={ReceiptText} accentColor="#2563eb" />
          <StatCard title="Total Motor" value={dashboard?.motorCount ?? transactions.filter((item) => item.vehicleType === 'motor').length} subtitle="Kendaraan hari ini" icon={Motorbike} accentColor="#7c3aed" />
          <StatCard title="Total Mobil" value={dashboard?.mobilCount ?? transactions.filter((item) => item.vehicleType === 'mobil').length} subtitle="Kendaraan hari ini" icon={CarFront} accentColor="#ea580c" />
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Metode Pembayaran</Text><CreditCard size={18} color="#087e8b" /></View>
          {[{ label: 'Tunai', amount: cash, icon: Banknote, color: '#087e8b' }, { label: 'Transfer', amount: transfer, icon: CreditCard, color: '#2563eb' }].map(({ label, amount, icon: Icon, color }) => {
            const percent = paymentTotal ? Math.round(amount / paymentTotal * 100) : 0;
            return <View key={label} style={styles.paymentRow}>
              <View style={styles.paymentMeta}><View style={[styles.paymentIcon, { backgroundColor: `${color}18` }]}><Icon size={17} color={color} /></View><View style={styles.flex}><Text style={styles.paymentName}>{label}</Text><Text style={styles.muted}>{percent}% dari omzet</Text></View><Text style={styles.paymentAmount}>{rupiah(amount)}</Text></View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} /></View>
            </View>;
          })}
          {!paymentTotal && !loading ? <Text style={styles.muted}>Belum ada pembayaran hari ini.</Text> : null}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paket Terlaris</Text>
          {packageBreakdown.length ? packageBreakdown.map((row, index) => <View key={row.name} style={styles.packageRow}>
            <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.flex}><View style={styles.packageMeta}><Text numberOfLines={1} style={styles.packageName}>{row.name}</Text><Text style={styles.packageCount}>{row.count} transaksi</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, styles.packageFill, { width: `${row.percent}%` }]} /></View></View><Text style={styles.percent}>{row.percent}%</Text>
          </View>) : <Text style={styles.muted}>Belum ada paket terjual hari ini.</Text>}
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Transaksi Hari Ini</Text><Text style={styles.muted}>{transactions.length} transaksi</Text></View>
          {transactions.length ? transactions.map((order) => {
            const status = statusStyle[order.status] ?? statusStyle.menunggu;
            return <View key={order.id} style={styles.transactionRow}>
              <View style={styles.transactionTop}><Text style={styles.invoice}>{order.invoiceNo}</Text><View style={[styles.status, { backgroundColor: status.background }]}><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View></View>
              <View style={styles.transactionDetails}><Text style={styles.plate}>{order.plate || 'Tanpa plat'}</Text><Text style={styles.muted}>{order.vehicleType === 'mobil' ? 'Mobil' : 'Motor'} · {formatTime(order.createdAt)}</Text></View>
              <View style={styles.transactionBottom}><Text numberOfLines={1} style={styles.packageName}>{order.packageName}</Text><Text style={styles.transactionTotal}>{rupiah(order.grandTotal)}</Text></View>
            </View>;
          }) : <Text style={styles.muted}>{loading ? 'Memuat transaksi…' : 'Belum ada transaksi hari ini.'}</Text>}
        </View>
      </>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 14, flexGrow: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#087e8b', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#0f172a', fontSize: 25, fontWeight: '800' },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ccfbf1', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  todayText: { color: '#0f766e', fontSize: 12, fontWeight: '800' },
  dateText: { color: '#64748b', fontSize: 13, fontWeight: '600', marginTop: -9 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 11, gap: 5 },
  errorText: { color: '#b91c1c', fontSize: 13 }, retry: { color: '#1d4ed8', fontWeight: '800' },
  loading: { marginTop: 45 }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 15, padding: 15, gap: 13 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  paymentRow: { gap: 8 }, paymentMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 }, paymentName: { color: '#334155', fontSize: 13, fontWeight: '800' }, muted: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  paymentAmount: { color: '#0f172a', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 6, borderRadius: 8, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8 }, packageFill: { backgroundColor: '#087e8b' },
  packageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, rank: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  packageMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  packageName: { flex: 1, color: '#334155', fontSize: 12, fontWeight: '700' }, packageCount: { color: '#94a3b8', fontSize: 11 }, percent: { width: 33, textAlign: 'right', color: '#475569', fontSize: 11, fontWeight: '800' },
  transactionRow: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, gap: 7 }, transactionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invoice: { color: '#0f172a', fontSize: 13, fontWeight: '800' }, status: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 }, statusText: { fontSize: 10, fontWeight: '800' },
  transactionDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, plate: { color: '#334155', fontSize: 12, fontWeight: '800' },
  transactionBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, transactionTotal: { color: '#0f766e', fontSize: 13, fontWeight: '800' },
});
