import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { PackageList, formatIDR } from '../components/PackageList';
import { PaymentModal } from '../components/PaymentModal';
import { VehicleSelector } from '../components/VehicleSelector';
import { api } from '../lib/api';
import { getBaseUrl } from '../lib/storage';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';
import type { Addon, Bank, Order, OrderPaymentInput, ServicePackage, VehicleType } from '../types';

const newClientId = () => `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export function KasirScreen() {
  const { colors } = useTheme();
  const styles = useStyles(buildStyles);
  const { user, activeOutlet } = useAuth();
  const insets = useSafeAreaInsets();
  const [vehicleType, setVehicleType] = useState<VehicleType>('motor');
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [packageId, setPackageId] = useState('');
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [plate, setPlate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ order: Order; url: string } | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const loadMasterData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [packageData, addonData, bankData] = await Promise.all([api.packages.list(), api.addons.list(), api.banks.list()]);
      setPackages(packageData); setAddons(addonData); setBanks(bankData);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memuat paket dan add-on.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadMasterData(); }, [loadMasterData]);
  useEffect(() => {
    const available = packages.find((item) => item.active && item.vehicleType === vehicleType);
    setPackageId(available?.id ?? '');
    setAddonIds((current) => current.filter((id) => addons.some((addon) => addon.id === id && addon.active && addon.vehicleTypes.includes(vehicleType))));
  }, [vehicleType, packages, addons]);

  const selectedPackage = packages.find((item) => item.id === packageId);
  const subtotal = useMemo(() => (selectedPackage?.price ?? 0) + addons.filter((addon) => addonIds.includes(addon.id)).reduce((sum, addon) => sum + addon.price, 0), [selectedPackage, addons, addonIds]);
  const tax = useMemo(() => Math.round((subtotal * (activeOutlet?.taxPercent ?? 0)) / 100), [subtotal, activeOutlet?.taxPercent]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  const canSubmit = Boolean(selectedPackage && !loading && !submitting);

  async function completeOrder(payment: OrderPaymentInput) {
    if (!selectedPackage) { setError('Pilih paket cuci terlebih dahulu.'); return; }
    setSubmitting(true); setError('');
    try {
      const order = await api.orders.create({
        clientId: newClientId(), vehicleType, packageId: selectedPackage.id,
        addons: addonIds.map((addonId) => ({ addonId, qty: 1 })),
        customerName: customerName.trim() || undefined, plate: plate.trim().toUpperCase() || undefined,
        payment,
      });
      const baseUrl = (await getBaseUrl()).replace(/\/$/, '');
      setReceipt({ order, url: `${baseUrl}/r/${order.id}` });
      setPaymentOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Transaksi gagal disimpan. Silakan coba lagi.'); throw cause; }
    finally { setSubmitting(false); }
  }

  async function shareReceipt() {
    if (!receipt) return;
    setShareBusy(true);
    try { await Share.share({ message: `Struk ${receipt.order.invoiceNo} · ${formatIDR(receipt.order.grandTotal)}\n${receipt.url}`, url: receipt.url, title: 'Struk digital' }); }
    catch (cause) { Alert.alert('Gagal membagikan struk', cause instanceof Error ? cause.message : 'Silakan salin tautan struk.'); }
    finally { setShareBusy(false); }
  }

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: 14, paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>KASIR</Text><Text style={styles.title}>Transaksi baru</Text></View><View style={styles.operator}><Text style={styles.operatorName}>{user?.name ?? 'Operator'}</Text><Text style={styles.outlet}>{activeOutlet?.name ?? 'Outlet'}</Text></View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Jenis kendaraan</Text><VehicleSelector value={vehicleType} onChange={setVehicleType} /></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Data kendaraan & pelanggan</Text>
        <Text style={styles.label}>Plat Nomor</Text><TextInput accessibilityLabel="Plat Nomor" autoCapitalize="characters" autoCorrect={false} placeholder="B 1234 ABC" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} style={styles.input} />
        <Text style={styles.label}>Nama Pelanggan <Text style={styles.optional}>(opsional)</Text></Text><TextInput accessibilityLabel="Nama Pelanggan" placeholder="Nama pelanggan" value={customerName} onChangeText={setCustomerName} style={styles.input} />
        <Text style={styles.label}>Catatan</Text><TextInput accessibilityLabel="Catatan" multiline placeholder="Catatan untuk pesanan (opsional)" value={notes} onChangeText={setNotes} style={[styles.input, styles.notes]} />
      </View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Paket & add-on</Text>
        {loading ? <ActivityIndicator color={colors.brand} /> : error && !packages.length ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable onPress={() => void loadMasterData()} style={styles.retry}><Text style={styles.retryText}>Coba lagi</Text></Pressable></View> : <PackageList vehicleType={vehicleType} packages={packages} addons={addons} packageId={packageId} addonIds={addonIds} onPackageChange={setPackageId} onAddonToggle={(id) => setAddonIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])} />}
      </View>
      {!!error && packages.length > 0 && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.dividerSection} />
      <View style={styles.summary}>
        <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{formatIDR(subtotal)}</Text></View>
        {tax > 0 && <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Pajak ({activeOutlet?.taxPercent ?? 0}%)</Text><Text style={styles.summaryValue}>{formatIDR(tax)}</Text></View>}
        <View style={[styles.summaryLine, styles.totalLine]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{formatIDR(total)}</Text></View>
        <Pressable accessibilityRole="button" disabled={!canSubmit} onPress={() => { setError(''); setPaymentOpen(true); }} style={[styles.submit, !canSubmit && styles.disabled]}>{submitting ? <ActivityIndicator color={colors.night} /> : <Text style={styles.submitText}>Simpan & bayar</Text>}</Pressable>
      </View>
    </ScrollView>
    <PaymentModal visible={paymentOpen} total={total} banks={banks} onClose={() => { if (!submitting) setPaymentOpen(false); }} onSubmit={completeOrder} />
    <Modal visible={Boolean(receipt)} transparent animationType="fade" onRequestClose={() => setReceipt(null)}>
      <View style={styles.modalBackdrop}><View style={styles.receiptCard}><Text style={styles.success}>Transaksi berhasil</Text><Text style={styles.receiptTitle}>{receipt?.order.invoiceNo}</Text><Text style={styles.queue}>Antrean {receipt?.order.queueNo} · {receipt?.order.vehicleType === 'motor' ? 'Motor' : 'Mobil'}</Text><View style={styles.divider} /><Text style={styles.receiptLine}>Paket · {receipt?.order.packageName}</Text><Text style={styles.receiptLine}>Plat · {receipt?.order.plate || '—'}</Text><Text style={styles.receiptTotal}>{formatIDR(receipt?.order.grandTotal ?? 0)}</Text><Text selectable style={styles.receiptUrl}>{receipt?.url}</Text>
        <Pressable accessibilityRole="button" disabled={shareBusy} onPress={() => void shareReceipt()} style={styles.submit}>{shareBusy ? <ActivityIndicator color={colors.night} /> : <Text style={styles.submitText}>Bagikan struk via WhatsApp</Text>}</Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setReceipt(null); setVehicleType('motor'); setPlate(''); setCustomerName(''); setNotes(''); setAddonIds([]); }} style={styles.done}><Text style={styles.doneText}>Transaksi baru</Text></Pressable>
      </View></View>
    </Modal>
  </KeyboardAvoidingView>;
}
function buildStyles(colors: Palette) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  eyebrow: { color: colors.brand, fontWeight: '800', fontSize: 11, letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  operator: { alignItems: 'flex-end', maxWidth: '45%' },
  operatorName: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  outlet: { color: colors.muted, fontSize: 12 },
  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  optional: { color: colors.lightMuted, fontWeight: '400' },
  input: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, height: 46, paddingHorizontal: 12, color: colors.ink, backgroundColor: colors.surface, fontSize: 15 },
  notes: { minHeight: 68, textAlignVertical: 'top', paddingTop: 11 },
  summary: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: colors.muted, fontSize: 14 },
  summaryValue: { color: colors.ink, fontWeight: '700' },
  totalLine: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 12 },
  totalLabel: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  totalValue: { color: colors.brand, fontSize: 20, fontWeight: '800' },
  dividerSection: { height: 1, backgroundColor: colors.line },
  submit: { minHeight: 48, borderRadius: 10, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  submitText: { color: colors.night, fontWeight: '800', fontSize: 15, textAlign: 'center' },
  disabled: { opacity: 0.55 },
  notice: { gap: 10 },
  error: { color: colors.dangerDark, backgroundColor: colors.dangerSoft, padding: 10, borderRadius: 9, fontSize: 13 },
  retry: { padding: 10, backgroundColor: colors.brandSoft, alignItems: 'center', borderRadius: 9 },
  retryText: { color: colors.brand, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  receiptCard: { backgroundColor: colors.nightMid, borderRadius: 20, padding: 22, gap: 12, borderWidth: 1, borderColor: colors.line },
  success: { color: colors.successDark, fontWeight: '800', textAlign: 'center', fontSize: 15 },
  receiptTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  queue: { color: colors.muted, textAlign: 'center' },
  divider: { borderTopWidth: 1, borderColor: colors.line, marginVertical: 3 },
  receiptLine: { color: colors.ink, fontSize: 14 },
  receiptTotal: { color: colors.brand, fontWeight: '800', fontSize: 22, textAlign: 'right' },
  receiptUrl: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  done: { alignItems: 'center', padding: 12 },
  doneText: { color: colors.brand, fontWeight: '700' }
  });
}
