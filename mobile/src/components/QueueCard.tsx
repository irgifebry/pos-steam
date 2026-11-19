import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Order } from '../types';
import { colors } from '../theme/colors';

const statusInfo: Record<Order['status'], { label: string; color: string; background: string }> = {
  menunggu: { label: 'Menunggu', color: colors.warningDark, background: colors.warningSoft },
  proses: { label: 'Proses', color: colors.brandDark, background: colors.brandSoft },
  selesai: { label: 'Selesai', color: colors.successDark, background: colors.successSoft },
  paid: { label: 'Selesai', color: colors.successDark, background: colors.successSoft },
  dibatalkan: { label: 'Dibatalkan', color: colors.dangerDark, background: colors.dangerSoft },
};

function elapsedSince(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} menit`;
  return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
}

export function QueueCard({
  order,
  onStart,
  onFinish,
  onCancel,
  onPay,
}: {
  order: Order;
  onStart: (order: Order) => void;
  onFinish: (order: Order) => void;
  onCancel: (order: Order) => void;
  onPay?: (order: Order) => void;
}) {
  const [elapsed, setElapsed] = useState(() => elapsedSince(order.startedAt ?? order.createdAt));

  useEffect(() => {
    setElapsed(elapsedSince(order.startedAt ?? order.createdAt));
    const timer = setInterval(() => setElapsed(elapsedSince(order.startedAt ?? order.createdAt)), 60_000);
    return () => clearInterval(timer);
  }, [order.startedAt, order.createdAt]);

  const status = statusInfo[order.status];

  return (
    <View style={styles.card}>
      <View style={styles.topLine}>
        <Text selectable style={styles.queue}>
          {order.queueNo || `${order.queuePrefix}-${String(order.queueSeq).padStart(3, '0')}`}
        </Text>
        <View style={[styles.badge, { backgroundColor: status.background }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.details}>
        <Text selectable style={styles.plate}>
          {order.plate || 'Tanpa plat'}
        </Text>
        <View style={[styles.vehicle, order.vehicleType === 'mobil' ? styles.car : styles.motor]}>
          <Text style={styles.vehicleText}>{order.vehicleType === 'mobil' ? 'Mobil' : 'Motor'}</Text>
        </View>
      </View>
      <Text style={styles.package}>{order.packageName}</Text>
      <Text style={styles.time}>
        {order.status === 'proses'
          ? `Berjalan ${elapsed}`
          : `Masuk ${new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
      </Text>
      {order.status === 'menunggu' && (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => onStart(order)} style={[styles.action, styles.primary]}>
            <Text style={styles.primaryText}>Mulai Cuci</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onCancel(order)} style={[styles.action, styles.cancel]}>
            <Text style={styles.cancelText}>Batal</Text>
          </Pressable>
        </View>
      )}
      {order.status === 'proses' && (
        <Pressable accessibilityRole="button" onPress={() => onFinish(order)} style={[styles.action, styles.primary]}>
          <Text style={styles.primaryText}>Selesai Cuci</Text>
        </Pressable>
      )}
      {(order.status === 'selesai' || order.status === 'paid') && (
        order.paid
          ? <Text style={styles.completed}>Lunas</Text>
          : onPay
            ? <Pressable accessibilityRole="button" onPress={() => onPay(order)} style={[styles.action, styles.primary]}>
                <Text style={styles.primaryText}>Bayar</Text>
              </Pressable>
            : <Text style={styles.completed}>Selesai</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16,
    gap: 9,
  },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queue: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  details: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plate: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  vehicle: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  motor: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  car: { backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.line },
  vehicleText: { color: colors.muted, fontWeight: '700', fontSize: 11 },
  package: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  time: { color: colors.lightMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 4 },
  action: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 12 },
  primary: { backgroundColor: colors.brand },
  primaryText: { color: '#fff', fontWeight: '800' },
  cancel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.dangerSoft },
  cancelText: { color: colors.danger, fontWeight: '800' },
  completed: { color: colors.successDark, fontWeight: '800', marginTop: 3 },
});
