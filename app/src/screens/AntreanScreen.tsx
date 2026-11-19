import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QueueCard } from '../components/QueueCard';
import { api } from '../lib/api';
import type { Order, OrderStatus, VehicleType } from '../types';

const tabs: Array<{ label: string; status?: OrderStatus }> = [
  { label: 'Semua' }, { label: 'Menunggu', status: 'menunggu' }, { label: 'Proses', status: 'proses' }, { label: 'Selesai', status: 'selesai' }, { label: 'Dibatalkan', status: 'dibatalkan' },
];
const vehicles: Array<{ label: string; type?: VehicleType }> = [{ label: 'Semua Kendaraan' }, { label: 'Motor', type: 'motor' }, { label: 'Mobil', type: 'mobil' }];

export function AntreanScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState({ menunggu: 0, proses: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeStatus, setActiveStatus] = useState<OrderStatus | undefined>();
  const [vehicleType, setVehicleType] = useState<VehicleType | undefined>();
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOrders = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const board = await api.board();
      setOrders(board.orders);
      setCounts({ menunggu: board.summary.menunggu, proses: board.summary.proses });
    } catch (cause) {
      try {
        const list = await api.orders.list({ date: new Date().toISOString().slice(0, 10) });
        setOrders(list);
        setCounts({ menunggu: list.filter((order) => order.status === 'menunggu').length, proses: list.filter((order) => order.status === 'proses').length });
      } catch (fallbackCause) {
        setError(fallbackCause instanceof Error ? fallbackCause.message : cause instanceof Error ? cause.message : 'Gagal memuat antrean.');
      }
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    void loadOrders();
    const timer = setInterval(() => void loadOrders(true), 30_000);
    return () => clearInterval(timer);
  }, [loadOrders]);

  const filtered = useMemo(() => orders.filter((order) => (!activeStatus || order.status === activeStatus || (activeStatus === 'selesai' && order.status === 'paid')) && (!vehicleType || order.vehicleType === vehicleType)), [orders, activeStatus, vehicleType]);
  const runStatus = async (order: Order, status: Extract<OrderStatus, 'proses' | 'selesai'>) => {
    try { await api.orders.setStatus(order.id, status); await loadOrders(true); }
    catch (cause) { Alert.alert('Gagal memperbarui antrean', cause instanceof Error ? cause.message : 'Silakan coba lagi.'); }
  };
  const cancelOrder = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setSaving(true);
    try { await api.orders.cancel(cancelTarget.id, { reason: cancelReason.trim() }); setCancelTarget(null); setCancelReason(''); await loadOrders(true); }
    catch (cause) { Alert.alert('Gagal membatalkan pesanan', cause instanceof Error ? cause.message : 'Silakan coba lagi.'); }
    finally { setSaving(false); }
  };

  return <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 10) }]}>
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={filtered}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <QueueCard order={item} onStart={(order) => void runStatus(order, 'proses')} onFinish={(order) => void runStatus(order, 'selesai')} onCancel={(order) => { setCancelTarget(order); setCancelReason(''); }} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.heading}><View><Text style={styles.eyebrow}>PEMANTAUAN</Text><Text style={styles.title}>Papan Antrean</Text></View><Pressable accessibilityRole="button" onPress={() => void loadOrders(true)} style={styles.refresh}><Text style={styles.refreshText}>Muat ulang</Text></Pressable></View>
        <View style={styles.summary}><Text style={styles.summaryValue}>{counts.menunggu + counts.proses}</Text><Text style={styles.summaryLabel}>Kendaraan aktif</Text><View style={styles.dot} /><Text style={styles.summaryLabel}>{counts.menunggu} menunggu · {counts.proses} proses</Text></View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={tabs} keyExtractor={(item) => item.label} contentContainerStyle={styles.tabRow} renderItem={({ item }) => <Pressable onPress={() => setActiveStatus(item.status)} style={[styles.tab, activeStatus === item.status && styles.tabActive]}><Text style={[styles.tabText, activeStatus === item.status && styles.tabTextActive]}>{item.label}</Text></Pressable>} />
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={vehicles} keyExtractor={(item) => item.label} contentContainerStyle={styles.vehicleRow} renderItem={({ item }) => <Pressable onPress={() => setVehicleType(item.type)} style={[styles.vehicleTab, vehicleType === item.type && styles.vehicleActive]}><Text style={[styles.vehicleText, vehicleType === item.type && styles.vehicleTextActive]}>{item.label}</Text></Pressable>} />
        {!!error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><Pressable onPress={() => void loadOrders()}><Text style={styles.retry}>Coba lagi</Text></Pressable></View>}
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator style={styles.loading} color="#087e8b" /> : <View style={styles.empty}><Text style={styles.emptyTitle}>{error ? 'Antrean belum dapat dimuat' : 'Tidak ada antrean'}</Text><Text style={styles.emptyText}>{error ? 'Periksa koneksi lalu coba lagi.' : 'Belum ada pesanan yang sesuai filter.'}</Text></View>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} tintColor="#087e8b" />}
      contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
    />
    <Modal visible={Boolean(cancelTarget)} transparent animationType="fade" onRequestClose={() => { if (!saving) setCancelTarget(null); }}>
      <View style={styles.backdrop}><View style={styles.modalCard}>
        <Text style={styles.modalTitle}>Batalkan pesanan?</Text><Text style={styles.modalDescription}>Masukkan alasan pembatalan untuk antrean {cancelTarget?.queueNo}.</Text>
        <TextInput accessibilityLabel="Alasan pembatalan" autoFocus multiline value={cancelReason} onChangeText={setCancelReason} placeholder="Alasan pembatalan" style={styles.reasonInput} />
        <View style={styles.modalActions}><Pressable disabled={saving} onPress={() => setCancelTarget(null)} style={styles.modalSecondary}><Text style={styles.modalSecondaryText}>Kembali</Text></Pressable><Pressable accessibilityRole="button" disabled={saving || !cancelReason.trim()} onPress={() => void cancelOrder()} style={[styles.modalPrimary, (saving || !cancelReason.trim()) && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Batalkan pesanan</Text>}</Pressable></View>
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' }, listContent: { padding: 16, gap: 12, flexGrow: 1 }, header: { gap: 13, paddingBottom: 3 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: '#087e8b', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, title: { color: '#0f172a', fontSize: 25, fontWeight: '800' }, refresh: { backgroundColor: '#e0f2f1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, refreshText: { color: '#087e8b', fontWeight: '800', fontSize: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 13, padding: 12 }, summaryValue: { color: '#0f172a', fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] }, summaryLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' }, dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#94a3b8' },
  tabRow: { gap: 7 }, tab: { borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 }, tabActive: { backgroundColor: '#087e8b', borderColor: '#087e8b' }, tabText: { color: '#475569', fontSize: 12, fontWeight: '700' }, tabTextActive: { color: '#fff' }, vehicleRow: { gap: 7 }, vehicleTab: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#e2e8f0' }, vehicleActive: { backgroundColor: '#ccfbf1' }, vehicleText: { color: '#475569', fontSize: 12, fontWeight: '700' }, vehicleTextActive: { color: '#0f766e' }, errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 11, gap: 5 }, errorText: { color: '#b91c1c', fontSize: 13 }, retry: { color: '#1d4ed8', fontWeight: '800' }, loading: { marginTop: 35 }, empty: { alignItems: 'center', padding: 28, gap: 6 }, emptyTitle: { color: '#334155', fontWeight: '800', fontSize: 16 }, emptyText: { color: '#64748b', textAlign: 'center', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.52)', justifyContent: 'center', padding: 20 }, modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, gap: 13 }, modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: '800' }, modalDescription: { color: '#64748b', lineHeight: 20 }, reasonInput: { minHeight: 88, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 11, padding: 12, textAlignVertical: 'top', color: '#0f172a' }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9 }, modalSecondary: { justifyContent: 'center', paddingHorizontal: 13, minHeight: 44 }, modalSecondaryText: { color: '#475569', fontWeight: '700' }, modalPrimary: { minHeight: 44, backgroundColor: '#b91c1c', borderRadius: 10, paddingHorizontal: 13, justifyContent: 'center', alignItems: 'center' }, modalPrimaryText: { color: '#fff', fontWeight: '800' }, disabled: { opacity: 0.55 },
});
