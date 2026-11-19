import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getBaseUrl, setBaseUrl } from '../lib/storage';
import type { Addon, Bank, Outlet, ServicePackage } from '../types';

const rupiah = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount)}`;
const roleName = (role: string) => role === 'admin' ? 'Admin' : 'Operator';
const vehicleLabel = (vehicleType: string) => vehicleType === 'mobil' ? 'Mobil' : 'Motor';

export function PengaturanScreen() {
  const { user, activeOutlet, logout, updateActiveOutlet } = useAuth();
  const insets = useSafeAreaInsets();
  const [outlet, setOutlet] = useState<Outlet | null>(activeOutlet);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingOutlet, setSavingOutlet] = useState(false);
  const [savingServer, setSavingServer] = useState(false);
  const [testingServer, setTestingServer] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [settings, packageRows, addonRows, bankRows, baseUrl] = await Promise.all([
        api.settings.get(), api.packages.list({ active: false }), api.addons.list({ includeInactive: true }), api.banks(true), getBaseUrl(),
      ]);
      const configured = settings.outlet as Outlet | undefined;
      const resolvedOutlet = configured ?? activeOutlet;
      setOutlet(resolvedOutlet ?? null);
      if (resolvedOutlet && (resolvedOutlet.id !== activeOutlet?.id || resolvedOutlet.name !== activeOutlet.name || resolvedOutlet.taxPercent !== activeOutlet.taxPercent)) updateActiveOutlet(resolvedOutlet);
      setPackages(packageRows);
      setAddons(addonRows);
      setBanks(bankRows);
      setServerUrl(baseUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat pengaturan.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [activeOutlet, updateActiveOutlet]);

  useEffect(() => { void load(); }, [load]);

  const updateOutletField = (field: 'name' | 'address' | 'phone' | 'taxPercent', value: string) => {
    setOutlet((current) => current ? { ...current, [field]: field === 'taxPercent' ? Number(value) : value } : current);
  };

  async function saveOutlet() {
    if (!outlet || savingOutlet) return;
    if (!outlet.name.trim()) { setError('Nama outlet wajib diisi.'); return; }
    if (!Number.isFinite(outlet.taxPercent) || outlet.taxPercent < 0 || outlet.taxPercent > 100) { setError('Pajak harus berada di antara 0 dan 100%.'); return; }
    setSavingOutlet(true); setError(''); setMessage('');
    try {
      const updated = await api.outlets.update({ name: outlet.name.trim(), address: outlet.address.trim(), phone: outlet.phone.trim(), taxPercent: outlet.taxPercent });
      setOutlet(updated);
      updateActiveOutlet(updated);
      setMessage('Profil outlet berhasil disimpan.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menyimpan profil outlet.'); }
    finally { setSavingOutlet(false); }
  }

  async function testConnection() {
    if (testingServer) return;
    setTestingServer(true); setError(''); setMessage('');
    try {
      const normalized = (await import('../lib/storage')).normalizeBaseUrl(serverUrl.trim());
      const response = await fetch(`${normalized}/api/health`);
      if (!response.ok) throw new Error(`Server merespons dengan status ${response.status}.`);
      setMessage('Koneksi server berhasil.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tidak dapat terhubung ke server.'); }
    finally { setTestingServer(false); }
  }

  async function saveServer() {
    if (savingServer) return;
    setSavingServer(true); setError(''); setMessage('');
    try {
      await setBaseUrl(serverUrl);
      const updated = await getBaseUrl();
      setServerUrl(updated);
      setMessage(`URL server berhasil disimpan: ${updated}`);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'URL server tidak valid.'); }
    finally { setSavingServer(false); }
  }

  function confirmLogout() {
    Alert.alert('Keluar dari akun?', 'Anda perlu masuk kembali untuk mengakses aplikasi.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => { void logout().catch((cause) => Alert.alert('Gagal keluar', cause instanceof Error ? cause.message : 'Silakan coba lagi.')); } },
    ]);
  }

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#2563eb" />} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 18 }]}>
      <View><Text style={styles.eyebrow}>PREFERENSI APLIKASI</Text><Text style={styles.title}>Pengaturan</Text><Text style={styles.subtitle}>Profil outlet, layanan, dan koneksi server.</Text></View>
      {!!error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retryText}>Coba lagi</Text></Pressable></View>}
      {!!message && <View style={styles.successBox}><Text accessibilityRole="alert" style={styles.successText}>{message}</Text></View>}
      {loading && !outlet ? <ActivityIndicator style={styles.loading} size="large" color="#2563eb" /> : <>
        <View style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>{user?.name.trim().charAt(0).toUpperCase() || 'U'}</Text></View><View style={styles.profileDetails}><Text style={styles.profileName}>{user?.name || 'Pengguna'}</Text><Text selectable style={styles.profileEmail}>{user?.email || 'Email tidak tersedia'}</Text><Text style={styles.profileMeta}>{roleName(user?.role ?? '')} · {activeOutlet?.name ?? outlet?.name ?? 'Outlet belum dipilih'}</Text></View></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Profil outlet aktif</Text>{outlet ? <>
          <Field label="Nama outlet"><TextInput accessibilityLabel="Nama outlet" value={outlet.name} onChangeText={(value) => updateOutletField('name', value)} style={styles.input} /></Field>
          <Field label="Alamat"><TextInput accessibilityLabel="Alamat outlet" value={outlet.address ?? ''} onChangeText={(value) => updateOutletField('address', value)} style={styles.input} /></Field>
          <Field label="Telepon"><TextInput accessibilityLabel="Telepon outlet" keyboardType="phone-pad" value={outlet.phone ?? ''} onChangeText={(value) => updateOutletField('phone', value)} style={styles.input} /></Field>
          <Field label="Pajak (%)"><TextInput accessibilityLabel="Pajak outlet" keyboardType="decimal-pad" value={String(outlet.taxPercent ?? 0)} onChangeText={(value) => updateOutletField('taxPercent', value)} style={styles.input} /></Field>
          <PrimaryButton label={savingOutlet ? 'Menyimpan…' : 'Simpan profil outlet'} onPress={() => void saveOutlet()} disabled={savingOutlet} />
        </> : <Text style={styles.muted}>Profil outlet belum tersedia.</Text>}</View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Paket layanan <Text style={styles.count}>({packages.length})</Text></Text>
          {packages.length ? packages.map((item) => <View key={item.id} style={styles.listRow}><View style={styles.rowDetails}><Text style={styles.rowTitle}>{item.name}</Text><View style={[styles.badge, item.active ? styles.activeBadge : styles.inactiveBadge]}><Text style={[styles.badgeText, item.active ? styles.activeText : styles.inactiveText]}>{vehicleLabel(item.vehicleType)} · {item.active ? 'Aktif' : 'Nonaktif'}</Text></View></View><Text style={styles.price}>{rupiah(item.price)}</Text></View>) : <Text style={styles.muted}>Belum ada paket layanan.</Text>}
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Add-on <Text style={styles.count}>({addons.length})</Text></Text>
          {addons.length ? addons.map((item) => <View key={item.id} style={styles.listRow}><View style={styles.rowDetails}><Text style={styles.rowTitle}>{item.name}</Text><View style={styles.badgeGroup}>{item.vehicleTypes.map((type) => <View key={type} style={styles.vehicleBadge}><Text style={styles.vehicleBadgeText}>{vehicleLabel(type)}</Text></View>)}<View style={[styles.badge, item.active ? styles.activeBadge : styles.inactiveBadge]}><Text style={[styles.badgeText, item.active ? styles.activeText : styles.inactiveText]}>{item.active ? 'Aktif' : 'Nonaktif'}</Text></View></View></View><Text style={styles.price}>{rupiah(item.price)}{item.unitLabel ? ` / ${item.unitLabel}` : ''}</Text></View>) : <Text style={styles.muted}>Belum ada add-on.</Text>}
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Rekening transfer <Text style={styles.count}>({banks.length})</Text></Text>
          {banks.length ? banks.map((bank) => <View key={bank.id} style={styles.bankRow}><View style={styles.rowDetails}><Text style={styles.rowTitle}>{bank.name}</Text><Text selectable style={styles.accountNumber}>{bank.accountNumber}</Text><Text style={styles.muted}>a.n. {bank.accountName}</Text></View><View style={[styles.badge, bank.active ? styles.activeBadge : styles.inactiveBadge]}><Text style={[styles.badgeText, bank.active ? styles.activeText : styles.inactiveText]}>{bank.active ? 'Aktif' : 'Nonaktif'}</Text></View></View>) : <Text style={styles.muted}>Belum ada rekening transfer terdaftar.</Text>}
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Koneksi server</Text><Field label="URL server"><TextInput accessibilityLabel="URL server" autoCapitalize="none" autoCorrect={false} keyboardType="url" value={serverUrl} onChangeText={setServerUrl} placeholder="https://pos.contoh.id" style={styles.input} /></Field><View style={styles.buttonRow}><Pressable accessibilityRole="button" disabled={testingServer} onPress={() => void testConnection()} style={[styles.secondaryButton, testingServer && styles.disabled]}><Text style={styles.secondaryButtonText}>{testingServer ? 'Menguji…' : 'Tes koneksi'}</Text></Pressable><Pressable accessibilityRole="button" disabled={savingServer} onPress={() => void saveServer()} style={[styles.primaryButton, savingServer && styles.disabled]}><Text style={styles.primaryButtonText}>{savingServer ? 'Menyimpan…' : 'Simpan URL'}</Text></Pressable></View></View>
        <Pressable accessibilityRole="button" onPress={confirmLogout} style={styles.logoutButton}><Text style={styles.logoutText}>Keluar dari akun</Text></Pressable>
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>;
}
function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.disabled]}><Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' }, content: { padding: 16, gap: 13, flexGrow: 1 }, eyebrow: { color: '#2563eb', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, title: { color: '#0f172a', fontSize: 25, fontWeight: '800' }, subtitle: { color: '#64748b', fontSize: 12, marginTop: 2 }, loading: { marginTop: 38 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 15 }, avatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#1d4ed8', fontSize: 18, fontWeight: '800' }, profileDetails: { flex: 1, gap: 3 }, profileName: { color: '#0f172a', fontSize: 15, fontWeight: '800' }, profileEmail: { color: '#475569', fontSize: 12 }, profileMeta: { color: '#1d4ed8', fontSize: 11, fontWeight: '700' },
  section: { gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 15, padding: 15 }, sectionTitle: { color: '#0f172a', fontSize: 15, fontWeight: '800' }, count: { color: '#94a3b8', fontSize: 12 }, field: { gap: 6 }, label: { color: '#475569', fontSize: 12, fontWeight: '700' }, input: { minHeight: 43, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 11, color: '#0f172a', backgroundColor: '#fff' },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }, rowDetails: { flex: 1, gap: 4 }, rowTitle: { color: '#334155', fontSize: 13, fontWeight: '800' }, price: { color: '#0f172a', fontSize: 12, fontWeight: '800', textAlign: 'right' }, badgeGroup: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }, badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }, activeBadge: { backgroundColor: '#dcfce7' }, inactiveBadge: { backgroundColor: '#f1f5f9' }, badgeText: { fontSize: 10, fontWeight: '800' }, activeText: { color: '#166534' }, inactiveText: { color: '#64748b' }, vehicleBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#dbeafe' }, vehicleBadgeText: { color: '#1d4ed8', fontSize: 10, fontWeight: '800' }, bankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }, accountNumber: { color: '#475569', fontSize: 12 }, muted: { color: '#94a3b8', fontSize: 12 },
  retryText: { color: '#1d4ed8', fontSize: 12, fontWeight: '800' }, buttonRow: { flexDirection: 'row', gap: 8 }, primaryButton: { minHeight: 44, flex: 1, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' }, primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center' }, secondaryButton: { minHeight: 44, flex: 1, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' }, secondaryButtonText: { color: '#1d4ed8', fontSize: 12, fontWeight: '800' }, disabled: { opacity: 0.55 }, logoutButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff', paddingHorizontal: 14 }, logoutText: { color: '#b91c1c', fontWeight: '800' }, errorBox: { borderRadius: 10, padding: 11, backgroundColor: '#fef2f2' }, errorText: { color: '#b91c1c', fontSize: 13 }, successBox: { borderRadius: 10, padding: 11, backgroundColor: '#dcfce7' }, successText: { color: '#166534', fontSize: 13, fontWeight: '700' },
});
