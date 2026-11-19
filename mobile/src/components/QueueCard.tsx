import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Order } from '../types';

const statusInfo: Record<Order['status'], { label: string; color: string; background: string }> = {
  menunggu: { label: 'Menunggu', color: '#92400e', background: '#fef3c7' },
  proses: { label: 'Proses', color: '#1d4ed8', background: '#dbeafe' },
  selesai: { label: 'Selesai', color: '#166534', background: '#dcfce7' },
  paid: { label: 'Selesai', color: '#166534', background: '#dcfce7' },
  dibatalkan: { label: 'Dibatalkan', color: '#b91c1c', background: '#fee2e2' },
};

function elapsedSince(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} menit`;
  return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
}

export function QueueCard({ order, onStart, onFinish, onCancel }: {
  order: Order;
  onStart: (order: Order) => void;
  onFinish: (order: Order) => void;
  onCancel: (order: Order) => void;
}) {
  const [elapsed, setElapsed] = useState(() => elapsedSince(order.startedAt ?? order.createdAt));
  useEffect(() => {
    const timer = setInterval(() => setElapsed(elapsedSince(order.startedAt ?? order.createdAt)), 60_000);
    return () => clearInterval(timer);
  }, [order.startedAt, order.createdAt]);
  const status = statusInfo[order.status];

  return <View style={styles.card}>
    <View style={styles.topLine}>
      <Text selectable style={styles.queue}>{order.queueNo || `${order.queuePrefix}-${String(order.queueSeq).padStart(3, '0')}`}</Text>
      <View style={[styles.badge, { backgroundColor: status.background }]}><Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text></View>
    </View>
    <View style={styles.details}>
      <Text selectable style={styles.plate}>{order.plate || 'Tanpa plat'}</Text>
      <View style={[styles.vehicle, order.vehicleType === 'mobil' ? styles.car : styles.motor]}><Text style={styles.vehicleText}>{order.vehicleType === 'mobil' ? 'Mobil' : 'Motor'}</Text></View>
    </View>
    <Text style={styles.package}>{order.packageName}</Text>
    <Text style={styles.time}>{order.status === 'proses' ? `Berjalan ${elapsed}` : `Masuk ${new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}</Text>
    {order.status === 'menunggu' && <View style={styles.actions}>
      <Pressable accessibilityRole="button" onPress={() => onStart(order)} style={[styles.action, styles.primary]}><Text style={styles.primaryText}>Mulai Cuci</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => onCancel(order)} style={[styles.action, styles.cancel]}><Text style={styles.cancelText}>Batal</Text></Pressable>
    </View>}
    {order.status === 'proses' && <Pressable accessibilityRole="button" onPress={() => onFinish(order)} style={[styles.action, styles.primary]}><Text style={styles.primaryText}>Selesai Cuci</Text></Pressable>}
    {(order.status === 'selesai' || order.status === 'paid') && <Text style={styles.completed}>{order.paid ? 'Lunas' : 'Selesai'}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 15, gap: 9 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queue: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }, badgeText: { fontSize: 12, fontWeight: '800' },
  details: { flexDirection: 'row', alignItems: 'center', gap: 8 }, plate: { color: '#334155', fontSize: 16, fontWeight: '800' },
  vehicle: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 }, motor: { backgroundColor: '#f1f5f9' }, car: { backgroundColor: '#e0f2fe' }, vehicleText: { color: '#334155', fontWeight: '700', fontSize: 11 },
  package: { color: '#475569', fontSize: 14, fontWeight: '600' }, time: { color: '#64748b', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 3 }, action: { minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 12 }, primary: { backgroundColor: '#087e8b' }, primaryText: { color: '#fff', fontWeight: '800' }, cancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca' }, cancelText: { color: '#b91c1c', fontWeight: '800' }, completed: { color: '#166534', fontWeight: '800', marginTop: 3 },
});
