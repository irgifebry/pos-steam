import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatIDR } from './PackageList';
import type { Bank, OrderPaymentInput } from '../types';

type Props = { visible: boolean; total: number; banks: Bank[]; onClose: () => void; onSubmit: (payment: OrderPaymentInput) => Promise<void> };
type Method = 'cash' | 'transfer';
const nominalButtons = [{ label: 'Pas', value: 0 }, { label: '20rb', value: 20000 }, { label: '50rb', value: 50000 }, { label: '100rb', value: 100000 }];

export function PaymentModal({ visible, total, banks, onClose, onSubmit }: Props) {
  const [method, setMethod] = useState<Method>('cash');
  const [cash, setCash] = useState(String(total));
  const [bankId, setBankId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (visible) { setCash(String(total)); setMethod('cash'); setBankId(''); setReferenceNo(''); setError(''); } }, [visible, total]);
  const amount = Number(cash.replace(/[^\d]/g, '')) || 0;
  const change = amount - total;
  async function submit() {
    setError('');
    if (method === 'cash' && amount < total) { setError('Uang diterima kurang dari total.'); return; }
    if (method === 'transfer' && !bankId) { setError('Pilih bank tujuan transfer.'); return; }
    if (method === 'transfer' && !referenceNo.trim()) { setError('Nomor referensi wajib diisi.'); return; }
    setSaving(true);
    try { await onSubmit(method === 'cash' ? { method: 'tunai', cashReceived: amount } : { method: 'transfer', bankId, referenceNo: referenceNo.trim() }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Pembayaran gagal. Silakan coba lagi.'); }
    finally { setSaving(false); }
  }
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.card}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pembayaran</Text><Text style={styles.total}>{formatIDR(total)}</Text>
      <View style={styles.row}>{(['cash', 'transfer'] as const).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: method === item }} onPress={() => { setMethod(item); setError(''); }} style={[styles.method, method === item && styles.active]}><Text style={[styles.methodText, method === item && styles.activeText]}>{item === 'cash' ? 'Tunai' : 'Transfer Bank'}</Text></Pressable>)}</View>
      {method === 'cash' ? <>
        <Text style={styles.label}>Nominal diterima</Text><View style={styles.row}>{nominalButtons.map(({ label, value }) => <Pressable key={label} onPress={() => setCash(String(value === 0 ? total : value))} style={styles.quick}><Text style={styles.quickText}>{label}</Text></Pressable>)}</View>
        <TextInput accessibilityLabel="Uang diterima" keyboardType="number-pad" value={cash} onChangeText={(value) => setCash(value.replace(/\D/g, ''))} style={styles.input} />
        <View style={styles.change}><Text style={styles.label}>Kembalian</Text><Text style={styles.changeValue}>{formatIDR(Math.max(0, change))}</Text></View>
      </> : <>
        <Text style={styles.label}>Pilih bank tujuan</Text>{banks.filter((bank) => bank.active).map((bank) => <Pressable key={bank.id} accessibilityRole="radio" accessibilityState={{ selected: bankId === bank.id }} onPress={() => setBankId(bank.id)} style={[styles.bank, bankId === bank.id && styles.active]}><Text style={[styles.name, bankId === bank.id && styles.activeText]}>{bank.name} · {bank.accountNumber}</Text><Text style={styles.bankSub}>{bank.accountName}</Text></Pressable>)}
        {!banks.some((bank) => bank.active) && <Text style={styles.hint}>Belum ada bank aktif. Tambahkan bank melalui Pengaturan.</Text>}
        <Text style={styles.label}>Nomor referensi</Text><TextInput accessibilityLabel="Nomor referensi transfer" autoCapitalize="characters" value={referenceNo} onChangeText={setReferenceNo} style={styles.input} placeholder="Contoh: TRX123456" />
      </>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.row}><Pressable disabled={saving} onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Batal</Text></Pressable><Pressable disabled={saving} onPress={() => void submit()} style={[styles.confirm, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Konfirmasi pembayaran</Text>}</Pressable></View>
    </ScrollView></View></View>
  </Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.48)', justifyContent: 'flex-end' }, card: { maxHeight: '90%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }, content: { padding: 22, gap: 13 }, title: { color: '#0f172a', fontSize: 22, fontWeight: '800' }, total: { color: '#1d4ed8', fontSize: 23, fontWeight: '800' }, row: { flexDirection: 'row', gap: 8 }, method: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 11, padding: 12, alignItems: 'center' }, active: { borderColor: '#2563eb', backgroundColor: '#eff6ff' }, methodText: { color: '#475569', fontWeight: '700' }, activeText: { color: '#1d4ed8' }, label: { color: '#334155', fontSize: 13, fontWeight: '700' }, quick: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 9, paddingVertical: 10, alignItems: 'center' }, quickText: { color: '#334155', fontWeight: '700' }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 11, height: 48, paddingHorizontal: 12, color: '#0f172a' }, change: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, changeValue: { color: '#15803d', fontSize: 18, fontWeight: '800' }, bank: { borderWidth: 1, borderColor: '#e2e8f0', padding: 11, borderRadius: 10, gap: 3 }, name: { color: '#0f172a', fontWeight: '700' }, bankSub: { color: '#64748b', fontSize: 12 }, hint: { color: '#b45309', fontSize: 13 }, error: { color: '#b91c1c', backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, fontSize: 13 }, cancel: { padding: 13, borderRadius: 10, backgroundColor: '#f1f5f9' }, cancelText: { color: '#334155', fontWeight: '700' }, confirm: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 13, borderRadius: 10, backgroundColor: '#2563eb' }, confirmText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, disabled: { opacity: 0.65 } });
