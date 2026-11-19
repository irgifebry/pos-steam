import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../lib/api';
import type { AttendanceStatus, AttendanceSave, User } from '../types';
import { colors } from '../theme/colors';

const statusOptions: Array<{ value: AttendanceStatus; label: string; color: string }> = [
  { value: 'hadir', label: 'Hadir', color: colors.successDark },
  { value: 'izin', label: 'Izin', color: colors.brandDark },
  { value: 'sakit', label: 'Sakit', color: colors.warningDark },
  { value: 'alpha', label: 'Alpa', color: colors.dangerDark },
];
const dateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const rupiah = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount)}`;

type Draft = { status: AttendanceStatus; note: string };
type Summary = Awaited<ReturnType<typeof api.attendance.summary>>;

export function AbsensiScreen({ users }: { users: User[] }) {
  const [date, setDate] = useState(() => dateKey(new Date()));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [todayAttendance, setTodayAttendance] = useState<Awaited<ReturnType<typeof api.attendance.list>>>([]);
  const [summary, setSummary] = useState<Summary>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [records, monthly] = await Promise.all([api.attendance.list(date), api.attendance.summary(date.slice(0, 7))]);
      setTodayAttendance(records);
      setSummary(monthly);
      setDrafts((current) => {
        const next: Record<string, Draft> = {};
        for (const user of users) {
          const row = records.find((item) => item.userId === user.id);
          next[user.id] = current[user.id] ?? { status: row?.status ?? 'hadir', note: row?.note ?? '' };
        }
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat data absensi.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [date, users]);

  useEffect(() => { void load(); }, [load]);
  const dailyByUser = useMemo(() => new Map(todayAttendance.map((item) => [item.userId, item])), [todayAttendance]);

  const save = async () => {
    if (!users.length) return;
    setSaving(true); setError(''); setSaved(false);
    const body: AttendanceSave = { date, records: Object.fromEntries(users.map((user) => [user.id, { status: drafts[user.id]?.status ?? 'hadir', note: drafts[user.id]?.note.trim() || undefined }])) };
    try {
      await api.attendance.save(body);
      await load(true);
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menyimpan absensi.'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}
      contentContainerStyle={styles.content}
    >
      <View style={styles.heading}>
        <View>
          <Text style={styles.eyebrow}>KEHADIRAN TIM</Text>
          <Text style={styles.title}>Absensi Harian</Text>
        </View>
        <TextInput
          accessibilityLabel="Tanggal absensi"
          value={date}
          onChangeText={(value) => { setDate(value); setSaved(false); }}
          placeholder="YYYY-MM-DD"
          style={styles.dateInput}
        />
      </View>
      <View style={styles.monthCard}>
        <Text style={styles.sectionTitle}>Rekap {date.slice(0, 7)}</Text>
        <View style={styles.metrics}>
          {statusOptions.map(({ value, label, color }) => (
            <View key={value} style={styles.metric}>
              <Text style={[styles.metricNumber, { color }]}>
                {summary.reduce((total, row) => total + (value === 'alpha' ? row.alpha : row[value]), 0)}
              </Text>
              <Text style={styles.metricLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      {error ? (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()}><Text style={styles.retry}>Coba lagi</Text></Pressable>
        </View>
      ) : null}
      {loading && !todayAttendance.length ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.brand} />
      ) : users.length ? (
        users.map((user) => {
          const draft = drafts[user.id] ?? { status: 'hadir' as AttendanceStatus, note: '' };
          const persisted = dailyByUser.get(user.id);
          return (
            <View key={user.id} style={styles.employeeCard}>
              <View style={styles.employeeHead}>
                <View style={styles.flex}>
                  <Text style={styles.employeeName}>{user.name}</Text>
                  <Text style={styles.muted}>
                    {persisted ? `Tercatat hari ini · ${persisted.status === 'alpha' ? 'Alpa' : statusOptions.find((item) => item.value === persisted.status)?.label ?? persisted.status}` : 'Belum tercatat hari ini'}
                  </Text>
                </View>
                <Text style={styles.rate}>{rupiah(user.dailyRate)}/hari</Text>
              </View>
              <View style={styles.statusRow}>
                {statusOptions.map(({ value, label, color }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.status === value }}
                    key={value}
                    onPress={() => {
                      setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, status: value } }));
                      setSaved(false);
                    }}
                    style={[styles.statusButton, draft.status === value && { borderColor: color, backgroundColor: `${color}15` }]}
                  >
                    <Text style={[styles.statusText, draft.status === value && { color }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel={`Catatan absensi ${user.name}`}
                value={draft.note}
                onChangeText={(note) => {
                  setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, note } }));
                  setSaved(false);
                }}
                placeholder="Catatan opsional"
                placeholderTextColor={colors.lightMuted}
                style={styles.noteInput}
              />
            </View>
          );
        })
      ) : (
        <View style={styles.empty}>
          <Text style={styles.sectionTitle}>Belum ada karyawan aktif</Text>
          <Text style={styles.muted}>Daftar karyawan aktif akan tampil di sini.</Text>
        </View>
      )}
      {saved ? <Text style={styles.success}>Absensi berhasil disimpan.</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={saving || !users.length}
        onPress={() => void save()}
        style={[styles.saveButton, (saving || !users.length) && styles.disabled]}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Simpan absensi</Text>}
      </Pressable>
      <View style={styles.payrollCard}>
        <Text style={styles.sectionTitle}>Estimasi gaji bulan ini</Text>
        <Text style={styles.muted}>Perkiraan gaji pokok berdasarkan jumlah hadir × tarif harian.</Text>
        {summary.length ? (
          summary.map((row) => (
            <View key={row.userId} style={styles.payrollRow}>
              <View style={styles.flex}>
                <Text style={styles.employeeName}>{row.name}</Text>
                <Text style={styles.muted}>{row.hadir} hari hadir × {rupiah(row.dailyRate)}</Text>
              </View>
              <Text style={styles.rate}>{rupiah(row.hadir * row.dailyRate)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>{loading ? 'Memuat rekap…' : 'Belum ada data rekap bulan ini.'}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, backgroundColor: colors.bg, flexGrow: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { color: colors.brandDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  dateInput: { width: 124, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 9, color: colors.ink, fontSize: 13 },
  monthCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', gap: 2 },
  metricNumber: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  employeeCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 13, gap: 11 },
  employeeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  employeeName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 11 },
  rate: { color: colors.brandDark, fontWeight: '800', fontSize: 13 },
  statusRow: { flexDirection: 'row', gap: 6 },
  statusButton: { flex: 1, alignItems: 'center', borderRadius: 9, borderWidth: 1, borderColor: colors.line, paddingVertical: 8, backgroundColor: colors.surface },
  statusText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  noteInput: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, color: colors.ink, fontSize: 12, backgroundColor: colors.surface },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 11, gap: 5 },
  errorText: { color: colors.dangerDark, fontSize: 13 },
  retry: { color: colors.brandDark, fontWeight: '800' },
  loading: { marginTop: 30 },
  empty: { backgroundColor: colors.surface, borderRadius: 12, padding: 18, gap: 5, borderWidth: 1, borderColor: colors.line },
  success: { color: colors.successDark, fontWeight: '700', textAlign: 'center' },
  saveButton: { minHeight: 48, backgroundColor: colors.brand, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.55 },
  payrollCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, gap: 11 },
  payrollRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.bg, paddingTop: 10 },
});
