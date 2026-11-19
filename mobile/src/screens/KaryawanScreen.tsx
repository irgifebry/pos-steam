import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AbsensiScreen } from './AbsensiScreen';
import { api } from '../lib/api';
import type { Attendance, User } from '../types';

const dateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const roleName = (role: string) => role === 'admin' ? 'Admin' : 'Operator';
const attendanceName = (status?: string) => ({ hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpha: 'Alpa', cuti: 'Cuti' }[status ?? ''] ?? 'Belum dicatat');

export function KaryawanScreen() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showAttendance, setShowAttendance] = useState(false);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [people, records] = await Promise.all([api.users(), api.attendance.list(dateKey(new Date()))]);
      setUsers(people);
      setAttendance(records);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memuat karyawan.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (showAttendance) return <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 8) }}><View style={styles.backRow}><Pressable accessibilityRole="button" onPress={() => { setShowAttendance(false); void load(true); }} style={styles.backButton}><Text style={styles.backText}>‹ Karyawan</Text></Pressable></View><AbsensiScreen users={users.filter((user) => user.active)} /></View>;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#087e8b" />} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
    <View style={styles.heading}><View><Text style={styles.eyebrow}>MANAJEMEN TIM</Text><Text style={styles.title}>Karyawan</Text></View><Pressable accessibilityRole="button" onPress={() => setShowAttendance(true)} style={styles.action}><Text style={styles.actionText}>Catat absensi</Text></Pressable></View>
    <Text style={styles.subtitle}>Daftar pengguna dan status kehadiran hari ini.</Text>
    {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>Coba lagi</Text></Pressable></View> : null}
    {loading && !users.length ? <ActivityIndicator style={styles.loading} size="large" color="#087e8b" /> : users.length ? users.map((user) => {
      const record = attendance.find((row) => row.userId === user.id);
      return <View key={user.id} style={styles.card}><View style={styles.avatar}><Text style={styles.avatarText}>{user.name.trim().charAt(0).toUpperCase() || '?'}</Text></View><View style={styles.details}><View style={styles.nameRow}><Text numberOfLines={1} style={styles.name}>{user.name || 'Tanpa nama'}</Text><View style={[styles.badge, user.active ? styles.activeBadge : styles.inactiveBadge]}><Text style={[styles.badgeText, user.active ? styles.activeText : styles.inactiveText]}>{user.active ? 'Aktif' : 'Nonaktif'}</Text></View></View><Text selectable style={styles.email}>{user.email || user.phone || 'Username tidak tersedia'}</Text><View style={styles.meta}><Text style={styles.role}>{roleName(user.role)}</Text><Text style={styles.dot}>·</Text><Text style={[styles.attendance, record ? styles.recorded : null]}>{attendanceName(record?.status)}</Text></View></View></View>;
    }) : <View style={styles.empty}><Text style={styles.emptyTitle}>Belum ada karyawan</Text><Text style={styles.subtitle}>Tidak ada pengguna untuk ditampilkan.</Text></View>}
    <Pressable accessibilityRole="button" onPress={() => setShowAttendance(true)} style={styles.fullAction}><Text style={styles.actionText}>Buka absensi dan rekap gaji</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 16, gap: 12, flexGrow: 1, backgroundColor: '#f8fafc' }, heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, eyebrow: { color: '#087e8b', fontSize: 11, fontWeight: '800', letterSpacing: 1.3 }, title: { color: '#0f172a', fontSize: 25, fontWeight: '800' }, subtitle: { color: '#64748b', fontSize: 12 }, action: { backgroundColor: '#087e8b', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }, actionText: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center' }, card: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 13, padding: 13 }, avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#0f766e', fontSize: 17, fontWeight: '800' }, details: { flex: 1, gap: 4 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, name: { flex: 1, color: '#0f172a', fontSize: 14, fontWeight: '800' }, badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }, activeBadge: { backgroundColor: '#dcfce7' }, inactiveBadge: { backgroundColor: '#f1f5f9' }, badgeText: { fontSize: 10, fontWeight: '800' }, activeText: { color: '#166534' }, inactiveText: { color: '#64748b' }, email: { color: '#64748b', fontSize: 11 }, meta: { flexDirection: 'row', alignItems: 'center', gap: 6 }, role: { color: '#334155', fontSize: 11, fontWeight: '700' }, dot: { color: '#94a3b8' }, attendance: { color: '#94a3b8', fontSize: 11, fontWeight: '700' }, recorded: { color: '#087e8b' }, errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 11, gap: 5 }, errorText: { color: '#b91c1c', fontSize: 13 }, retry: { color: '#1d4ed8', fontWeight: '800' }, loading: { marginTop: 35 }, empty: { alignItems: 'center', padding: 24, backgroundColor: '#fff', borderRadius: 12, gap: 6 }, emptyTitle: { color: '#334155', fontWeight: '800', fontSize: 16 }, fullAction: { backgroundColor: '#0f766e', borderRadius: 11, padding: 13, marginTop: 3 }, backRow: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f8fafc' }, backButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 8 }, backText: { color: '#087e8b', fontWeight: '800' } });