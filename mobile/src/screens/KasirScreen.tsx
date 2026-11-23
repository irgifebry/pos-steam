import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { PackageList, formatIDR } from '../components/PackageList';
import { VehicleSelector } from '../components/VehicleSelector';
import { api } from '../lib/api';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';
import type { Addon, Order, ServicePackage, VehicleType } from '../types';

const newClientId = () => `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export function KasirScreen() {
  const { colors } = useTheme();
  const styles = useStyles(buildStyles);
  const { user, activeOutlet } = useAuth();
  const insets = useSafeAreaInsets();
  const [vehicleType, setVehicleType] = useState<VehicleType>('motor');
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [packageId, setPackageId] = useState('');
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [plate, setPlate] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [notes, setNotes] = useState('');
  const [royalty, setRoyalty] = useState(false);
  const [ojol, setOjol] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ order: Order } | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const loadMasterData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [packageData, addonData] = await Promise.all([api.packages.list(), api.addons.list()]);
      setPackages(packageData); setAddons(addonData);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memuat paket dan add-on.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void loadMasterData();
    }, [loadMasterData]),
  );
  useEffect(() => {
    const available = packages.find((item) => item.active && item.vehicleType === vehicleType);
    setPackageId(available?.id ?? '');
    setAddonIds((current) => current.filter((id) => addons.some((addon) => addon.id === id && addon.active && addon.vehicleTypes.includes(vehicleType))));
  }, [vehicleType, packages, addons]);

  const selectedPackage = packages.find((item) => item.id === packageId);
  const addonTotal = useMemo(
    () => addons.filter((addon) => addonIds.includes(addon.id)).reduce((sum, addon) => sum + addon.price, 0),
    [addons, addonIds],
  );
  // ROYALTY menang jika kedua toggle aktif. OJOL pakai ojolPrice bila ada, jika kosong pakai harga normal.
  // Add-on tetap bayar penuh.
  const basePackagePrice = selectedPackage?.price ?? 0;
  const isReguler = /reguler/i.test(selectedPackage?.name ?? '');
  const packagePrice = royalty
    ? isReguler
      ? 0
      : (selectedPackage?.royaltyPrice ?? basePackagePrice)
    : ojol
      ? (selectedPackage?.ojolPrice ?? basePackagePrice)
      : basePackagePrice;
  const discount = royalty || ojol ? basePackagePrice - packagePrice : 0;
  const discountLabel = royalty ? 'Diskon ROYALTY' : ojol ? 'Diskon OJOL' : '';
  const subtotal = packagePrice + addonTotal;
  const tax = Math.round((subtotal * (activeOutlet?.taxPercent ?? 0)) / 100);
  const total = subtotal + tax;
  const canSubmit = Boolean(selectedPackage && !loading && !submitting);

  // Kedua toggle saling meniadakan agar harga yang dipakai tidak ambigu.
  function handleRoyaltyChange(value: boolean) {
    setRoyalty(value);
    if (value) setOjol(false);
  }

  function handleOjolChange(value: boolean) {
    setOjol(value);
    if (value) setRoyalty(false);
  }

  async function completeOrder() {
    if (!selectedPackage) { setError('Pilih paket cuci terlebih dahulu.'); return; }
    setSubmitting(true); setError('');
    try {
      const order = await api.orders.create({
        clientId: newClientId(), vehicleType, packageId: selectedPackage.id,
        addons: addonIds.map((addonId) => ({ addonId, qty: 1 })),
        vehicleName: vehicleName.trim() || undefined,
        plate: plate.trim().toUpperCase() || undefined,
        royalty: royalty || undefined,
        ojol: ojol || undefined,
      });
      setReceipt({ order });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Antrean gagal dibuat. Silakan coba lagi.'); }
    finally { setSubmitting(false); }
  }

  async function shareReceipt() {
    if (!receipt) return;
    setShareBusy(true);
    const message = [
      `Struk ${receipt.order.invoiceNo}`,
      `Antrean ${receipt.order.queueNo}`,
      `Paket ${receipt.order.packageName}`,
      `Plat ${receipt.order.plate || '-'}`,
      `Total ${formatIDR(receipt.order.grandTotal ?? 0)}`,
      `Terima kasih telah mencuci di ${activeOutlet?.name ?? 'KYANE POS'}.`,
    ].join('\n');
    try { await Share.share({ message, title: 'Struk digital' }); }
    catch (cause) { Alert.alert('Gagal membagikan struk', cause instanceof Error ? cause.message : 'Silakan coba lagi.'); }
    finally { setShareBusy(false); }
  }

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.screen}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: 14, paddingBottom: 24 }]}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>KASIR</Text><Text style={styles.title}>Transaksi baru</Text></View><View style={styles.operator}><Text style={styles.operatorName}>{user?.name ?? 'Operator'}</Text><Text style={styles.outlet}>{activeOutlet?.name ?? 'Outlet'}</Text></View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Jenis kendaraan</Text><VehicleSelector value={vehicleType} onChange={setVehicleType} /></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Data kendaraan</Text>
        <Text style={styles.label}>Plat Nomor</Text><TextInput accessibilityLabel="Plat Nomor" autoCapitalize="characters" autoCorrect={false} placeholder="B 1234 ABC" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} style={styles.input} />
        <Text style={styles.label}>Nama Kendaraan <Text style={styles.optional}>(opsional)</Text></Text><TextInput accessibilityLabel="Nama Kendaraan" placeholder="Contoh: Avanza, Fortuner" value={vehicleName} onChangeText={setVehicleName} style={styles.input} />
        <Text style={styles.label}>Catatan</Text><TextInput accessibilityLabel="Catatan" multiline placeholder="Catatan untuk pesanan (opsional)" value={notes} onChangeText={setNotes} style={[styles.input, styles.notes]} />
        <View style={styles.royaltyRow}>
          <View style={styles.royaltyCopy}>
            <Text style={styles.royaltyLabel}>Pelanggan ROYALTY</Text>
            <Text style={styles.royaltyHint}>Reguler gratis · paket lain sesuai harga ROYALTY · add-on tetap bayar</Text>
          </View>
          <Switch value={royalty} onValueChange={handleRoyaltyChange} trackColor={{ false: colors.lineMuted, true: colors.brand }} thumbColor={colors.surface} />
        </View>
        <View style={styles.royaltyRow}>
          <View style={styles.royaltyCopy}>
            <Text style={styles.royaltyLabel}>Pelanggan OJOL</Text>
            <Text style={styles.royaltyHint}>Harga khusus ojol per paket · add-on tetap bayar</Text>
          </View>
          <Switch value={ojol} onValueChange={handleOjolChange} trackColor={{ false: colors.lineMuted, true: colors.brand }} thumbColor={colors.surface} />
        </View>
      </View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Paket & add-on</Text>
        {loading ? <ActivityIndicator color={colors.brand} /> : error && !packages.length ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable onPress={() => void loadMasterData()} style={styles.retry}><Text style={styles.retryText}>Coba lagi</Text></Pressable></View> : <PackageList vehicleType={vehicleType} packages={packages} addons={addons} packageId={packageId} addonIds={addonIds} onPackageChange={setPackageId} onAddonToggle={(id) => setAddonIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])} />}
      </View>
      {!!error && packages.length > 0 && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>

    <View style={[styles.floatBar, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
      <View style={styles.floatTotals}>
        {(tax > 0 || royalty || ojol) && (
          <>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatIDR(subtotal)}</Text>
            </View>
            {tax > 0 && (
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Pajak ({activeOutlet?.taxPercent ?? 0}%)</Text>
                <Text style={styles.summaryValue}>{formatIDR(tax)}</Text>
              </View>
            )}
            {(royalty || ojol) && (
              <View style={styles.summaryLine}>
                <Text style={[styles.summaryLabel, styles.discountLabel]}>{discountLabel}</Text>
                <Text style={[styles.summaryValue, styles.discountLabel]}>−{formatIDR(discount)}</Text>
              </View>
            )}
          </>
        )}
        <View style={[styles.summaryLine, (tax > 0 || royalty || ojol) && styles.totalLine]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatIDR(total)}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" disabled={!canSubmit} onPress={() => void completeOrder()} style={[styles.submit, !canSubmit && styles.disabled]}>{submitting ? <ActivityIndicator color={colors.night} /> : <Text style={styles.submitText}>Buat antrean</Text>}</Pressable>
    </View>
    </View>
    <Modal visible={Boolean(receipt)} transparent animationType="fade" onRequestClose={() => setReceipt(null)}>
      <View style={styles.modalBackdrop}><View style={styles.receiptCard}><Text style={styles.success}>Antrean berhasil dibuat</Text><Text style={styles.receiptTitle}>{receipt?.order.invoiceNo}</Text><Text style={styles.queue}>Antrean {receipt?.order.queueNo} · {receipt?.order.vehicleType === 'motor' ? 'Motor' : 'Mobil'}</Text><View style={styles.divider} /><Text style={styles.receiptLine}>Paket · {receipt?.order.packageName}</Text><Text style={styles.receiptLine}>Plat · {receipt?.order.plate || '—'}</Text><Text style={styles.receiptTotal}>{formatIDR(receipt?.order.grandTotal ?? 0)}</Text><Text style={styles.receiptNote}>Tunjukkan nomor antrean ini ke pelanggan.</Text>
        <Pressable accessibilityRole="button" disabled={shareBusy} onPress={() => void shareReceipt()} style={styles.submit}>{shareBusy ? <ActivityIndicator color={colors.night} /> : <Text style={styles.submitText}>Bagikan struk via WhatsApp</Text>}</Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setReceipt(null); setVehicleType('motor'); setPlate(''); setVehicleName(''); setNotes(''); setRoyalty(false); setOjol(false); setAddonIds([]); }} style={styles.done}><Text style={styles.doneText}>Transaksi baru</Text></Pressable>
      </View></View>
    </Modal>
  </KeyboardAvoidingView>;
}
function buildStyles(colors: Palette) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
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
  royaltyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderColor: colors.line, paddingTop: 12, marginTop: 2 },
  royaltyCopy: { flex: 1, gap: 2 },
  royaltyLabel: { color: colors.ink, fontSize: 12.5, fontWeight: '800' },
  royaltyHint: { color: colors.muted, fontSize: 11 },
  discountLabel: { color: colors.successDark },
  floatBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    shadowColor: colors.night,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
  },
  floatTotals: { gap: 6 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: colors.muted, fontSize: 14 },
  summaryValue: { color: colors.ink, fontWeight: '700' },
  totalLine: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 12 },
  totalLabel: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  totalValue: { color: colors.brand, fontSize: 20, fontWeight: '800' },
  submit: { minHeight: 48, borderRadius: 10, backgroundColor: colors.brand, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  submitText: { color: '#ffffff', fontWeight: '800', fontSize: 15, textAlign: 'center' },
  disabled: { opacity: 0.55 },
  notice: { gap: 10 },
  error: { color: colors.dangerDark, backgroundColor: colors.dangerSoft, padding: 10, borderRadius: 9, fontSize: 13 },
  retry: { padding: 10, backgroundColor: colors.brandSoft, alignItems: 'center', borderRadius: 9 },
  retryText: { color: colors.brand, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  receiptCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: colors.night,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  success: { color: colors.successDark, fontWeight: '800', textAlign: 'center', fontSize: 15 },
  receiptTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  queue: { color: colors.muted, textAlign: 'center' },
  divider: { borderTopWidth: 1, borderColor: colors.line, marginVertical: 3 },
  receiptLine: { color: colors.ink, fontSize: 14 },
  receiptTotal: { color: colors.brand, fontWeight: '800', fontSize: 22, textAlign: 'right' },
  receiptNote: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  done: { alignItems: 'center', padding: 12 },
  doneText: { color: colors.brand, fontWeight: '700' }
  });
}
