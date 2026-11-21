import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QueueCard } from '../components/QueueCard';
import { PaymentModal } from '../components/PaymentModal';
import { api } from '../lib/api';
import type { Bank, Order, OrderPaymentInput, OrderStatus, VehicleType } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';

const tabs: { label: string; status?: OrderStatus }[] = [
  { label: 'Semua' },
  { label: 'Menunggu', status: 'menunggu' },
  { label: 'Proses', status: 'proses' },
  { label: 'Selesai', status: 'selesai' },
  { label: 'Dibatalkan', status: 'dibatalkan' },
];

const vehicles: { label: string; type?: VehicleType }[] = [
  { label: 'Semua Kendaraan' },
  { label: 'Motor', type: 'motor' },
  { label: 'Mobil', type: 'mobil' },
];

export function AntreanScreen() {
  const { colors } = useTheme();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState({ menunggu: 0, proses: 0, selesai: 0, total: 0 });
  const [activeStatus, setActiveStatus] = useState<OrderStatus | undefined>(undefined);
  const [vehicleType, setVehicleType] = useState<VehicleType | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [payTarget, setPayTarget] = useState<Order | null>(null);
  const [startAfterPay, setStartAfterPay] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);

  const loadOrders = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const board = await api.board();
      setOrders(board.orders);
      setCounts({
        menunggu: board.summary.menunggu,
        proses: board.summary.proses,
        selesai: board.summary.selesai,
        total: board.summary.total,
      });
    } catch (cause) {
      try {
        const list = await api.orders.list({ date: new Date().toISOString().slice(0, 10) });
        setOrders(list);
        setCounts({
          menunggu: list.filter((order) => order.status === 'menunggu').length,
          proses: list.filter((order) => order.status === 'proses').length,
          selesai: list.filter((order) => order.status === 'selesai' || order.status === 'paid').length,
          total: list.length,
        });
      } catch (fallbackCause) {
        setError(fallbackCause instanceof Error ? fallbackCause.message : cause instanceof Error ? cause.message : 'Gagal memuat antrean.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const timer = setInterval(() => void loadOrders(true), 5_000);
    return () => clearInterval(timer);
  }, [loadOrders]);

  useEffect(() => {
    api.banks.list().then(setBanks).catch(() => setBanks([]));
  }, []);

  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          (!activeStatus || order.status === activeStatus || (activeStatus === 'selesai' && order.status === 'paid')) &&
          (!vehicleType || order.vehicleType === vehicleType)
      ),
    [orders, activeStatus, vehicleType]
  );

  const runStatus = async (order: Order, status: Extract<OrderStatus, 'proses' | 'selesai'>) => {
    try {
      await api.orders.setStatus(order.id, status);
      await loadOrders(true);
    } catch (cause) {
      Alert.alert('Gagal memperbarui antrean', cause instanceof Error ? cause.message : 'Silakan coba lagi.');
    }
  };

  const cancelOrder = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setSaving(true);
    try {
      await api.orders.cancel(cancelTarget.id, { reason: cancelReason.trim() });
      setCancelTarget(null);
      setCancelReason('');
      await loadOrders(true);
    } catch (cause) {
      Alert.alert('Gagal membatalkan pesanan', cause instanceof Error ? cause.message : 'Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleStart = (order: Order) => {
    if (order.grandTotal <= 0) {
      void runStatus(order, 'proses');
      return;
    }
    setStartAfterPay(true);
    setPayTarget(order);
  };

  const payOrder = async (payment: OrderPaymentInput) => {
    if (!payTarget) return;
    try {
      await api.orders.pay(payTarget.id, payment);
      if (startAfterPay) await api.orders.setStatus(payTarget.id, 'proses');
      setPayTarget(null);
      setStartAfterPay(false);
      await loadOrders(true);
    } catch (cause) {
      Alert.alert('Pembayaran gagal', cause instanceof Error ? cause.message : 'Silakan coba lagi.');
    }
  };

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QueueCard
            order={item}
            onStart={handleStart}
            onFinish={(order) => void runStatus(order, 'selesai')}
            onCancel={(order) => {
              setCancelTarget(order);
              setCancelReason('');
            }}
            onPay={(order) => setPayTarget(order)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.heading}>
              <View>
                <Text style={styles.eyebrow}>PEMANTAUAN</Text>
                <Text style={styles.title}>Papan Antrean</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void loadOrders(true)} style={styles.refresh}>
                <Text style={styles.refreshText}>Muat ulang</Text>
              </Pressable>
            </View>
            <View style={styles.summary}>
              <View style={styles.stat}>
                <Text style={[styles.summaryValue, styles.waitingValue]}>{counts.menunggu}</Text>
                <Text style={styles.summaryLabel}>Menunggu</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.summaryValue, styles.processValue]}>{counts.proses}</Text>
                <Text style={styles.summaryLabel}>Diproses</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.summaryValue, styles.doneValue]}>{counts.selesai}</Text>
                <Text style={styles.summaryLabel}>Selesai</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.summaryValue}>{counts.total}</Text>
                <Text style={styles.summaryLabel}>Total antrean</Text>
              </View>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={tabs}
              keyExtractor={(item) => item.label}
              contentContainerStyle={styles.tabRow}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setActiveStatus(item.status)}
                  style={[styles.tab, activeStatus === item.status && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeStatus === item.status && styles.tabTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={vehicles}
              keyExtractor={(item) => item.label}
              contentContainerStyle={styles.vehicleRow}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setVehicleType(item.type)}
                  style={[styles.vehicleTab, vehicleType === item.type && styles.vehicleActive]}
                >
                  <Text style={[styles.vehicleText, vehicleType === item.type && styles.vehicleTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
            {!!error && (
              <View style={styles.errorBox}>
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {error}
                </Text>
                <Pressable onPress={() => void loadOrders()}>
                  <Text style={styles.retry}>Coba lagi</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loading} color={colors.brand} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{error ? 'Antrean belum dapat dimuat' : 'Tidak ada antrean'}</Text>
              <Text style={styles.emptyText}>{error ? 'Periksa koneksi lalu coba lagi.' : 'Belum ada pesanan yang sesuai filter.'}</Text>
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} tintColor={colors.brand} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}
      />
      <Modal visible={Boolean(cancelTarget)} transparent animationType="fade" onRequestClose={() => { if (!saving) setCancelTarget(null); }}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Batalkan pesanan?</Text>
            <Text style={styles.modalDescription}>Masukkan alasan pembatalan untuk antrean {cancelTarget?.queueNo}.</Text>
            <TextInput
              accessibilityLabel="Alasan pembatalan"
              autoFocus
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Alasan pembatalan"
              style={styles.reasonInput}
            />
            <View style={styles.modalActions}>
              <Pressable disabled={saving} onPress={() => setCancelTarget(null)} style={styles.modalSecondary}>
                <Text style={styles.modalSecondaryText}>Kembali</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving || !cancelReason.trim()}
                onPress={() => void cancelOrder()}
                style={[styles.modalPrimary, (saving || !cancelReason.trim()) && styles.disabled]}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Batalkan pesanan</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <PaymentModal
        visible={Boolean(payTarget)}
        total={payTarget ? (payTarget.grandTotal ?? payTarget.total ?? 0) : 0}
        banks={banks}
        onClose={() => { setPayTarget(null); setStartAfterPay(false); }}
        onSubmit={payOrder}
      />
    </View>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    listContent: { padding: 16, gap: 12, flexGrow: 1 },
    header: { gap: 12, paddingBottom: 4 },
    heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    eyebrow: { color: colors.brandDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
    title: { color: colors.ink, fontSize: 24, fontWeight: '800' },
    refresh: { backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    refreshText: { color: colors.brandDark, fontWeight: '800', fontSize: 12 },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 13,
      paddingVertical: 14,
    },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: colors.line },
    summaryValue: { color: colors.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
    waitingValue: { color: colors.warningDark },
    processValue: { color: colors.brandDark },
    doneValue: { color: colors.successDark },
    summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'center' },
    tabRow: { gap: 7 },
    tab: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 13,
      paddingVertical: 7,
    },
    tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    tabText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    tabTextActive: { color: '#fff' },
    vehicleRow: { gap: 7 },
    vehicleTab: {
      borderRadius: 9,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    vehicleActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
    vehicleText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    vehicleTextActive: { color: colors.brandDark },
    errorBox: { backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 11, gap: 5 },
    errorText: { color: colors.dangerDark, fontSize: 13 },
    retry: { color: colors.brandDark, fontWeight: '800' },
    loading: { marginTop: 35 },
    empty: { alignItems: 'center', padding: 28, gap: 6 },
    emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 },
    emptyText: { color: colors.muted, textAlign: 'center', fontSize: 13 },
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.52)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 13, borderWidth: 1, borderColor: colors.line },
    modalTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
    modalDescription: { color: colors.muted, lineHeight: 20 },
    reasonInput: { minHeight: 88, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 11, padding: 12, textAlignVertical: 'top', color: colors.ink },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9 },
    modalSecondary: { justifyContent: 'center', paddingHorizontal: 13, minHeight: 44 },
    modalSecondaryText: { color: colors.muted, fontWeight: '700' },
    modalPrimary: { minHeight: 44, backgroundColor: colors.danger, borderRadius: 10, paddingHorizontal: 13, justifyContent: 'center', alignItems: 'center' },
    modalPrimaryText: { color: '#fff', fontWeight: '800' },
    disabled: { opacity: 0.55 },
  });
}
