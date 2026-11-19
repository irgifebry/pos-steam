import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pencil, Plus, X, KeyRound, UserX, UserCheck, Ban, CircleCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Addon, Bank, Outlet, ServicePackage, User } from '../types';
import { colors } from '../theme/colors';

const rupiah = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount)}`;
const roleName = (role: string) => (role === 'admin' ? 'Admin' : 'Operator');
const vehicleLabel = (vehicleType: string) => (vehicleType === 'mobil' ? 'Mobil' : 'Motor');

// ─── Modal generik ────────────────────────────────────────────────────────────

function CrudModal({
  visible,
  title,
  onClose,
  onSave,
  saving,
  error,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <X size={16} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
            {children}
            {!!error && <Text style={styles.formError}>{error}</Text>}
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onSave}
              style={[styles.saveBtn, saving && styles.disabled]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Paket Layanan ────────────────────────────────────────────────────────────

const emptyPaket = { name: '', vehicleType: 'motor' as 'motor' | 'mobil', price: '', durationMin: '', description: '', sortOrder: '0', active: true };

function PaketSection() {
  const [items, setItems] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [form, setForm] = useState(emptyPaket);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.packages.list({ active: false });
      setItems(rows);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyPaket);
    setFormError('');
    setModalVisible(true);
  }

  function openEdit(item: ServicePackage) {
    setEditing(item);
    setForm({
      name: item.name,
      vehicleType: item.vehicleType,
      price: String(item.price),
      durationMin: String(item.durationMin),
      description: item.description ?? '',
      sortOrder: String(item.sortOrder ?? 0),
      active: item.active,
    });
    setFormError('');
    setModalVisible(true);
  }

  async function handleSave() {
    setFormError('');
    const price = Number(form.price);
    const dur = Number(form.durationMin);
    const sort = Number(form.sortOrder);
    if (!form.name.trim()) { setFormError('Nama paket wajib diisi'); return; }
    if (!Number.isInteger(price) || price <= 0) { setFormError('Harga harus angka bulat lebih dari 0'); return; }
    if (!Number.isInteger(dur) || dur <= 0) { setFormError('Durasi harus angka bulat lebih dari 0'); return; }
    const body = { name: form.name.trim(), vehicleType: form.vehicleType, price, durationMin: dur, description: form.description.trim(), sortOrder: sort, active: form.active };
    setSaving(true);
    try {
      if (editing) await api.packages.update(editing.id, body);
      else await api.packages.create(body);
      setModalVisible(false);
      await load();
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  async function toggleActive(item: ServicePackage) {
    Alert.alert(item.active ? 'Nonaktifkan paket?' : 'Aktifkan paket?', item.name, [
      { text: 'Batal', style: 'cancel' },
      {
        text: item.active ? 'Nonaktifkan' : 'Aktifkan',
        style: item.active ? 'destructive' : 'default',
        onPress: async () => {
          try {
            if (item.active) await api.packages.delete(item.id);
            else await api.packages.update(item.id, { active: true });
            await load();
          } catch (e) { Alert.alert('Gagal', e instanceof Error ? e.message : 'Silakan coba lagi.'); }
        },
      },
    ]);
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Paket Layanan <Text style={styles.count}>({items.length})</Text></Text>
        <Pressable onPress={openAdd} style={styles.addBtn}>
          <Plus size={13} color="#fff" />
          <Text style={styles.addBtnText}>Tambah</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 8 }} /> : items.length === 0 ? (
        <Text style={styles.muted}>Belum ada paket layanan.</Text>
      ) : items.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <View style={styles.rowDetails}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <View style={styles.badgeGroup}>
              <View style={[styles.badge, item.active ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={[styles.badgeText, item.active ? styles.activeText : styles.inactiveText]}>{item.active ? 'Aktif' : 'Nonaktif'}</Text>
              </View>
              <View style={styles.vehicleBadge}>
                <Text style={styles.vehicleBadgeText}>{vehicleLabel(item.vehicleType)}</Text>
              </View>
            </View>
            <Text style={styles.price}>{rupiah(item.price)} · {item.durationMin} menit</Text>
          </View>
          <View style={styles.rowActions}>
            <Pressable onPress={() => openEdit(item)} style={styles.iconBtn}>
              <Pencil size={16} color={colors.brandDark} />
            </Pressable>
            <Pressable onPress={() => void toggleActive(item)} style={[styles.iconBtn, item.active ? styles.iconBtnDanger : styles.iconBtnSuccess]}>
              {item.active ? <Ban size={16} color={colors.danger} /> : <CircleCheck size={16} color={colors.successDark} />}
            </Pressable>
          </View>
        </View>
      ))}
      <CrudModal visible={modalVisible} title={editing ? 'Edit Paket' : 'Tambah Paket'} onClose={() => setModalVisible(false)} onSave={() => void handleSave()} saving={saving} error={formError}>
        <Field label="Nama Paket">
          <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={styles.input} placeholder="Cuci Motor Reguler" />
        </Field>
        <Field label="Tipe Kendaraan">
          <View style={styles.segmentRow}>
            {(['motor', 'mobil'] as const).map((v) => (
              <Pressable key={v} onPress={() => setForm({ ...form, vehicleType: v })} style={[styles.segment, form.vehicleType === v && styles.segmentActive]}>
                <Text style={[styles.segmentText, form.vehicleType === v && styles.segmentTextActive]}>{v === 'motor' ? 'Motor' : 'Mobil'}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Field label="Harga (Rp)">
              <TextInput value={form.price} onChangeText={(v) => setForm({ ...form, price: v.replace(/\D/g, '') })} style={styles.input} keyboardType="number-pad" placeholder="25000" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Durasi (menit)">
              <TextInput value={form.durationMin} onChangeText={(v) => setForm({ ...form, durationMin: v.replace(/\D/g, '') })} style={styles.input} keyboardType="number-pad" placeholder="20" />
            </Field>
          </View>
        </View>
        <Field label="Deskripsi (opsional)">
          <TextInput value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} style={styles.input} placeholder="Opsional" />
        </Field>
        <Field label="Status">
          <View style={styles.switchRow}>
            <Text style={styles.label}>{form.active ? 'Aktif' : 'Nonaktif'}</Text>
            <Switch value={form.active} onValueChange={(v) => setForm({ ...form, active: v })} trackColor={{ true: colors.brand }} />
          </View>
        </Field>
      </CrudModal>
    </View>
  );
}

// ─── Add-on ───────────────────────────────────────────────────────────────────

const emptyAddon = { name: '', price: '', unitLabel: 'pcs', vehicleTypes: ['motor', 'mobil'] as ('motor' | 'mobil')[], active: true };

function AddonSection() {
  const [items, setItems] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Addon | null>(null);
  const [form, setForm] = useState(emptyAddon);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.addons.list({ includeInactive: true })); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyAddon);
    setFormError('');
    setModalVisible(true);
  }

  function openEdit(item: Addon) {
    setEditing(item);
    setForm({ name: item.name, price: String(item.price), unitLabel: item.unitLabel ?? 'pcs', vehicleTypes: Array.isArray(item.vehicleTypes) ? item.vehicleTypes : [], active: item.active });
    setFormError('');
    setModalVisible(true);
  }

  function toggleVehicle(v: 'motor' | 'mobil') {
    setForm((f) => ({ ...f, vehicleTypes: f.vehicleTypes.includes(v) ? f.vehicleTypes.filter((x) => x !== v) : [...f.vehicleTypes, v] }));
  }

  async function handleSave() {
    setFormError('');
    const price = Number(form.price);
    if (!form.name.trim()) { setFormError('Nama add-on wajib diisi'); return; }
    if (!Number.isInteger(price) || price <= 0) { setFormError('Harga harus angka bulat lebih dari 0'); return; }
    if (form.vehicleTypes.length === 0) { setFormError('Pilih minimal satu tipe kendaraan'); return; }
    const body = { name: form.name.trim(), price, unitLabel: form.unitLabel.trim() || 'pcs', vehicleTypes: form.vehicleTypes, active: form.active };
    setSaving(true);
    try {
      if (editing) await api.addons.update(editing.id, body);
      else await api.addons.create(body);
      setModalVisible(false);
      await load();
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  async function toggleActive(item: Addon) {
    Alert.alert(item.active ? 'Nonaktifkan add-on?' : 'Aktifkan add-on?', item.name, [
      { text: 'Batal', style: 'cancel' },
      {
        text: item.active ? 'Nonaktifkan' : 'Aktifkan',
        style: item.active ? 'destructive' : 'default',
        onPress: async () => {
          try {
            if (item.active) await api.addons.delete(item.id);
            else await api.addons.update(item.id, { active: true });
            await load();
          } catch (e) { Alert.alert('Gagal', e instanceof Error ? e.message : 'Silakan coba lagi.'); }
        },
      },
    ]);
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Add-on <Text style={styles.count}>({items.length})</Text></Text>
        <Pressable onPress={openAdd} style={styles.addBtn}>
          <Plus size={13} color="#fff" />
          <Text style={styles.addBtnText}>Tambah</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 8 }} /> : items.length === 0 ? (
        <Text style={styles.muted}>Belum ada add-on.</Text>
      ) : items.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <View style={styles.rowDetails}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <View style={styles.badgeGroup}>
              <View style={[styles.badge, item.active ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={[styles.badgeText, item.active ? styles.activeText : styles.inactiveText]}>{item.active ? 'Aktif' : 'Nonaktif'}</Text>
              </View>
              {(item.vehicleTypes ?? []).map((vt) => (
                <View key={vt} style={styles.vehicleBadge}>
                  <Text style={styles.vehicleBadgeText}>{vehicleLabel(vt)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.price}>{rupiah(item.price)}{item.unitLabel ? ` / ${item.unitLabel}` : ''}</Text>
          </View>
          <View style={styles.rowActions}>
            <Pressable onPress={() => openEdit(item)} style={styles.iconBtn}>
              <Pencil size={16} color={colors.brandDark} />
            </Pressable>
            <Pressable onPress={() => void toggleActive(item)} style={[styles.iconBtn, item.active ? styles.iconBtnDanger : styles.iconBtnSuccess]}>
              {item.active ? <Ban size={16} color={colors.danger} /> : <CircleCheck size={16} color={colors.successDark} />}
            </Pressable>
          </View>
        </View>
      ))}
      <CrudModal visible={modalVisible} title={editing ? 'Edit Add-on' : 'Tambah Add-on'} onClose={() => setModalVisible(false)} onSave={() => void handleSave()} saving={saving} error={formError}>
        <Field label="Nama Add-on">
          <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={styles.input} placeholder="Wax Premium" />
        </Field>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Field label="Harga (Rp)">
              <TextInput value={form.price} onChangeText={(v) => setForm({ ...form, price: v.replace(/\D/g, '') })} style={styles.input} keyboardType="number-pad" placeholder="15000" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Satuan">
              <TextInput value={form.unitLabel} onChangeText={(v) => setForm({ ...form, unitLabel: v })} style={styles.input} placeholder="pcs" />
            </Field>
          </View>
        </View>
        <Field label="Tipe Kendaraan">
          <View style={styles.segmentRow}>
            {(['motor', 'mobil'] as const).map((v) => (
              <Pressable key={v} onPress={() => toggleVehicle(v)} style={[styles.segment, form.vehicleTypes.includes(v) && styles.segmentActive]}>
                <Text style={[styles.segmentText, form.vehicleTypes.includes(v) && styles.segmentTextActive]}>{v === 'motor' ? 'Motor' : 'Mobil'}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
        <Field label="Status">
          <View style={styles.switchRow}>
            <Text style={styles.label}>{form.active ? 'Aktif' : 'Nonaktif'}</Text>
            <Switch value={form.active} onValueChange={(v) => setForm({ ...form, active: v })} trackColor={{ true: colors.brand }} />
          </View>
        </Field>
      </CrudModal>
    </View>
  );
}

// ─── Rekening Bank ────────────────────────────────────────────────────────────

const emptyBank = { name: '', accountNumber: '', accountName: '', active: true };

function BankSection() {
  const [items, setItems] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [form, setForm] = useState(emptyBank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.banks.list(true)); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyBank);
    setFormError('');
    setModalVisible(true);
  }

  function openEdit(item: Bank) {
    setEditing(item);
    setForm({ name: item.name, accountNumber: item.accountNumber, accountName: item.accountName, active: item.active });
    setFormError('');
    setModalVisible(true);
  }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim()) { setFormError('Nama bank wajib diisi'); return; }
    if (!form.accountNumber.trim()) { setFormError('Nomor rekening wajib diisi'); return; }
    if (!form.accountName.trim()) { setFormError('Nama pemilik wajib diisi'); return; }
    const body = { name: form.name.trim(), accountNumber: form.accountNumber.trim(), accountName: form.accountName.trim(), active: form.active };
    setSaving(true);
    try {
      if (editing) await api.banks.update(editing.id, body);
      else await api.banks.create(body);
      setModalVisible(false);
      await load();
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  async function toggleActive(item: Bank) {
    Alert.alert(item.active ? 'Nonaktifkan rekening?' : 'Aktifkan rekening?', item.name, [
      { text: 'Batal', style: 'cancel' },
      {
        text: item.active ? 'Nonaktifkan' : 'Aktifkan',
        style: item.active ? 'destructive' : 'default',
        onPress: async () => {
          try {
            if (item.active) await api.banks.delete(item.id);
            else await api.banks.update(item.id, { active: true });
            await load();
          } catch (e) { Alert.alert('Gagal', e instanceof Error ? e.message : 'Silakan coba lagi.'); }
        },
      },
    ]);
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Rekening Transfer <Text style={styles.count}>({items.length})</Text></Text>
        <Pressable onPress={openAdd} style={styles.addBtn}>
          <Plus size={13} color="#fff" />
          <Text style={styles.addBtnText}>Tambah</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 8 }} /> : items.length === 0 ? (
        <Text style={styles.muted}>Belum ada rekening terdaftar.</Text>
      ) : items.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <View style={styles.rowDetails}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <View style={[styles.badge, item.active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.badgeText, item.active ? styles.activeText : styles.inactiveText]}>{item.active ? 'Aktif' : 'Nonaktif'}</Text>
            </View>
            <Text selectable style={styles.accountNumber}>{item.accountNumber}</Text>
            <Text style={styles.muted}>a.n. {item.accountName}</Text>
          </View>
          <View style={styles.rowActions}>
            <Pressable onPress={() => openEdit(item)} style={styles.iconBtn}>
              <Pencil size={16} color={colors.brandDark} />
            </Pressable>
            <Pressable onPress={() => void toggleActive(item)} style={[styles.iconBtn, item.active ? styles.iconBtnDanger : styles.iconBtnSuccess]}>
              {item.active ? <Ban size={16} color={colors.danger} /> : <CircleCheck size={16} color={colors.successDark} />}
            </Pressable>
          </View>
        </View>
      ))}
      <CrudModal visible={modalVisible} title={editing ? 'Edit Rekening' : 'Tambah Rekening'} onClose={() => setModalVisible(false)} onSave={() => void handleSave()} saving={saving} error={formError}>
        <Field label="Nama Bank">
          <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={styles.input} placeholder="BCA" />
        </Field>
        <Field label="Nomor Rekening">
          <TextInput value={form.accountNumber} onChangeText={(v) => setForm({ ...form, accountNumber: v })} style={styles.input} keyboardType="number-pad" />
        </Field>
        <Field label="Nama Pemilik (a.n.)">
          <TextInput value={form.accountName} onChangeText={(v) => setForm({ ...form, accountName: v })} style={styles.input} />
        </Field>
        <Field label="Status">
          <View style={styles.switchRow}>
            <Text style={styles.label}>{form.active ? 'Aktif' : 'Nonaktif'}</Text>
            <Switch value={form.active} onValueChange={(v) => setForm({ ...form, active: v })} trackColor={{ true: colors.brand }} />
          </View>
        </Field>
      </CrudModal>
    </View>
  );
}

// ─── Pengguna ─────────────────────────────────────────────────────────────────

const emptyUser = { name: '', email: '', role: 'admin' as 'admin' | 'operator', phone: '', dailyRate: '', password: '' };

function PenggunaSection() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyUser);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [pinTarget, setPinTarget] = useState<User | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.users.list()); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyUser);
    setFormError('');
    setModalVisible(true);
  }

  function openEdit(item: User) {
    setEditing(item);
    setForm({ name: item.name, email: item.email, role: (item.role as 'admin' | 'operator') ?? 'admin', phone: item.phone ?? '', dailyRate: String(item.dailyRate ?? 0), password: '' });
    setFormError('');
    setModalVisible(true);
  }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim()) { setFormError('Nama wajib diisi'); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setFormError('Email tidak valid'); return; }
    const dailyRate = Number(form.dailyRate);
    if (!Number.isFinite(dailyRate) || dailyRate < 0) { setFormError('Gaji harian tidak valid'); return; }
    if (!editing && form.password.length < 6) { setFormError('PIN minimal 6 karakter'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.users.update(editing.id, { name: form.name.trim(), email: form.email.trim(), role: form.role, phone: form.phone.trim(), dailyRate });
      } else {
        await api.users.create({ name: form.name.trim(), email: form.email.trim(), role: form.role, phone: form.phone.trim(), dailyRate, password: form.password, active: true });
      }
      setModalVisible(false);
      await load();
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  async function handleToggleActive(item: User) {
    Alert.alert(item.active ? 'Nonaktifkan pengguna?' : 'Aktifkan pengguna?', item.name, [
      { text: 'Batal', style: 'cancel' },
      {
        text: item.active ? 'Nonaktifkan' : 'Aktifkan',
        style: item.active ? 'destructive' : 'default',
        onPress: async () => {
          try { await api.users.setActive(item.id, !item.active); await load(); }
          catch (e) { Alert.alert('Gagal', e instanceof Error ? e.message : 'Silakan coba lagi.'); }
        },
      },
    ]);
  }

  async function handleResetPin() {
    if (!pinTarget) return;
    setPinError('');
    if (newPin.length < 6) { setPinError('PIN minimal 6 karakter'); return; }
    setPinSaving(true);
    try {
      await api.users.resetPin(pinTarget.id, newPin);
      setPinTarget(null);
      setNewPin('');
    } catch (e) { setPinError(e instanceof Error ? e.message : 'Gagal reset PIN'); }
    finally { setPinSaving(false); }
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pengguna <Text style={styles.count}>({items.length})</Text></Text>
        <Pressable onPress={openAdd} style={styles.addBtn}>
          <Plus size={13} color="#fff" />
          <Text style={styles.addBtnText}>Tambah</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 8 }} /> : items.length === 0 ? (
        <Text style={styles.muted}>Belum ada pengguna.</Text>
      ) : items.map((item) => (
        <View key={item.id} style={styles.listRow}>
          <View style={styles.rowDetails}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <View style={styles.badgeGroup}>
              <View style={[styles.badge, item.active ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={[styles.badgeText, item.active ? styles.activeText : styles.inactiveText]}>{item.active ? 'Aktif' : 'Nonaktif'}</Text>
              </View>
              <View style={styles.vehicleBadge}>
                <Text style={styles.vehicleBadgeText}>{roleName(item.role ?? '')}</Text>
              </View>
            </View>
            <Text selectable style={styles.muted}>{item.email}</Text>
            {!!item.phone && <Text style={styles.muted}>{item.phone}</Text>}
            <Text style={styles.muted}>Gaji harian: {rupiah(item.dailyRate ?? 0)}</Text>
          </View>
          <View style={styles.rowActions}>
            <Pressable onPress={() => openEdit(item)} style={styles.iconBtn}>
              <Pencil size={16} color={colors.brandDark} />
            </Pressable>
            <Pressable onPress={() => { setPinTarget(item); setNewPin(''); setPinError(''); }} style={styles.iconBtn}>
              <KeyRound size={16} color={colors.warning} />
            </Pressable>
            <Pressable onPress={() => void handleToggleActive(item)} style={[styles.iconBtn, item.active ? styles.iconBtnDanger : styles.iconBtnSuccess]}>
              {item.active ? <UserX size={16} color={colors.danger} /> : <UserCheck size={16} color={colors.successDark} />}
            </Pressable>
          </View>
        </View>
      ))}

      <CrudModal visible={modalVisible} title={editing ? 'Edit Pengguna' : 'Tambah Pengguna'} onClose={() => setModalVisible(false)} onSave={() => void handleSave()} saving={saving} error={formError}>
        <Field label="Nama">
          <TextInput value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={styles.input} />
        </Field>
        <Field label="Email">
          <TextInput value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
        </Field>
        <Field label="Role">
          <View style={styles.segmentRow}>
            {(['admin', 'operator'] as const).map((v) => (
              <Pressable key={v} onPress={() => setForm({ ...form, role: v })} style={[styles.segment, form.role === v && styles.segmentActive]}>
                <Text style={[styles.segmentText, form.role === v && styles.segmentTextActive]}>{v === 'admin' ? 'Admin' : 'Operator'}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
        <Field label="Telepon">
          <TextInput value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} style={styles.input} keyboardType="phone-pad" />
        </Field>
        <Field label="Gaji Harian (Rp)">
          <TextInput value={form.dailyRate} onChangeText={(v) => setForm({ ...form, dailyRate: v.replace(/\D/g, '') })} style={styles.input} keyboardType="number-pad" />
        </Field>
        {!editing && (
          <Field label="PIN (min. 6 karakter)">
            <TextInput value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} style={styles.input} secureTextEntry keyboardType="numeric" />
          </Field>
        )}
      </CrudModal>

      {/* Reset PIN modal */}
      <Modal visible={Boolean(pinTarget)} transparent animationType="slide" onRequestClose={() => setPinTarget(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset PIN</Text>
              <Pressable onPress={() => setPinTarget(null)} style={styles.modalClose}>
                <X size={16} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              {pinTarget && <Text style={styles.muted}>Reset PIN untuk <Text style={{ fontWeight: '800', color: colors.ink }}>{pinTarget.name}</Text></Text>}
              <Field label="PIN Baru (min. 6 karakter)">
                <TextInput value={newPin} onChangeText={setNewPin} style={styles.input} secureTextEntry keyboardType="numeric" />
              </Field>
              {!!pinError && <Text style={styles.formError}>{pinError}</Text>}
              <Pressable disabled={pinSaving} onPress={() => void handleResetPin()} style={[styles.saveBtn, pinSaving && styles.disabled]}>
                {pinSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan PIN</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Helper kecil ─────────────────────────────────────────────────────────────

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Screen utama ─────────────────────────────────────────────────────────────

export function PengaturanScreen() {
  const { user, activeOutlet, logout, updateActiveOutlet } = useAuth();
  const insets = useSafeAreaInsets();
  const [outlet, setOutlet] = useState<Outlet | null>(activeOutlet);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingOutlet, setSavingOutlet] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const settings = await api.settings.get();
        const configured = settings.outlet as Outlet | undefined;
        const resolvedOutlet = configured ?? activeOutlet;
        setOutlet(resolvedOutlet ?? null);
        if (resolvedOutlet && (resolvedOutlet.id !== activeOutlet?.id || resolvedOutlet.name !== activeOutlet.name || resolvedOutlet.taxPercent !== activeOutlet.taxPercent)) {
          updateActiveOutlet(resolvedOutlet);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Gagal memuat pengaturan.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeOutlet, updateActiveOutlet]
  );

  useEffect(() => { void load(); }, [load]);

  const updateOutletField = (field: 'name' | 'address' | 'phone' | 'taxPercent', value: string) => {
    setOutlet((current) => (current ? { ...current, [field]: field === 'taxPercent' ? Number(value) : value } : current));
  };

  async function saveOutlet() {
    if (!outlet || savingOutlet) return;
    if (!outlet.name.trim()) { setError('Nama outlet wajib diisi.'); return; }
    if (!Number.isFinite(outlet.taxPercent) || outlet.taxPercent < 0 || outlet.taxPercent > 100) { setError('Pajak harus 0–100%.'); return; }
    setSavingOutlet(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.outlets.update({ name: outlet.name.trim(), address: outlet.address.trim(), phone: outlet.phone.trim(), taxPercent: outlet.taxPercent });
      setOutlet(updated);
      updateActiveOutlet(updated);
      setMessage('Profil outlet berhasil disimpan.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan profil outlet.');
    } finally {
      setSavingOutlet(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Keluar dari akun?', 'Anda perlu masuk kembali untuk mengakses aplikasi.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => { void logout().catch((cause) => Alert.alert('Gagal keluar', cause instanceof Error ? cause.message : 'Silakan coba lagi.')); } },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.brand} />}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 18 }]}
      >
        <View>
          <Text style={styles.eyebrow}>PREFERENSI APLIKASI</Text>
          <Text style={styles.title}>Pengaturan</Text>
          <Text style={styles.subtitle}>Profil outlet, layanan, dan akun pengguna.</Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void load()}>
              <Text style={styles.retryText}>Coba lagi</Text>
            </Pressable>
          </View>
        )}
        {!!message && (
          <View style={styles.successBox}>
            <Text accessibilityRole="alert" style={styles.successText}>{message}</Text>
          </View>
        )}

        {/* Profil user */}
        {!loading && (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name.trim().charAt(0).toUpperCase() || 'U'}</Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{user?.name || 'Pengguna'}</Text>
              <Text selectable style={styles.profileEmail}>{user?.email || 'Email tidak tersedia'}</Text>
              <Text style={styles.profileMeta}>{roleName(user?.role ?? '')} · {activeOutlet?.name ?? outlet?.name ?? 'Outlet belum dipilih'}</Text>
            </View>
          </View>
        )}

        {/* Profil outlet */}
        {loading && !outlet ? (
          <ActivityIndicator style={styles.loading} size="large" color={colors.brand} />
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profil outlet aktif</Text>
            {outlet ? (
              <>
                <Field label="Nama outlet">
                  <TextInput accessibilityLabel="Nama outlet" value={outlet.name} onChangeText={(v) => updateOutletField('name', v)} style={styles.input} />
                </Field>
                <Field label="Alamat">
                  <TextInput accessibilityLabel="Alamat outlet" value={outlet.address ?? ''} onChangeText={(v) => updateOutletField('address', v)} style={styles.input} />
                </Field>
                <Field label="Telepon">
                  <TextInput accessibilityLabel="Telepon outlet" keyboardType="phone-pad" value={outlet.phone ?? ''} onChangeText={(v) => updateOutletField('phone', v)} style={styles.input} />
                </Field>
                <Field label="Pajak (%)">
                  <TextInput accessibilityLabel="Pajak outlet" keyboardType="decimal-pad" value={String(outlet.taxPercent ?? 0)} onChangeText={(v) => updateOutletField('taxPercent', v)} style={styles.input} />
                </Field>
                <Pressable accessibilityRole="button" disabled={savingOutlet} onPress={() => void saveOutlet()} style={[styles.saveBtn, savingOutlet && styles.disabled]}>
                  {savingOutlet ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan profil outlet</Text>}
                </Pressable>
              </>
            ) : (
              <Text style={styles.muted}>Profil outlet belum tersedia.</Text>
            )}
          </View>
        )}

        <PaketSection />
        <AddonSection />
        <BankSection />
        <PenggunaSection />

        <Pressable accessibilityRole="button" onPress={confirmLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Keluar dari akun</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 13, flexGrow: 1 },
  eyebrow: { color: colors.brandDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: -2 },
  loading: { marginTop: 38 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16 },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brandDark, fontSize: 19, fontWeight: '800' },
  profileDetails: { flex: 1, gap: 3 },
  profileName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  profileEmail: { color: colors.muted, fontSize: 12 },
  profileMeta: { color: colors.brandDark, fontSize: 11, fontWeight: '700' },
  section: { gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  count: { color: colors.muted, fontSize: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  field: { gap: 6 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, color: colors.ink, backgroundColor: colors.surface, fontSize: 14 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 9, borderTopWidth: 1, borderTopColor: colors.bg, paddingTop: 10 },
  rowDetails: { flex: 1, gap: 4 },
  rowActions: { gap: 6 },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  price: { color: colors.brandDark, fontSize: 12, fontWeight: '700' },
  accountNumber: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  badgeGroup: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadge: { backgroundColor: colors.successSoft },
  inactiveBadge: { backgroundColor: colors.bg },
  badgeText: { fontSize: 10, fontWeight: '800' },
  activeText: { color: colors.successDark },
  inactiveText: { color: colors.muted },
  vehicleBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.line },
  vehicleBadgeText: { color: colors.brandDark, fontSize: 10, fontWeight: '800' },
  iconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  iconBtnDanger: { borderColor: colors.dangerSoft },
  iconBtnSuccess: { borderColor: colors.successSoft },
  rowActions2: { flexDirection: 'row', gap: 6 },
  saveBtn: { minHeight: 46, backgroundColor: colors.brand, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  logoutButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: colors.dangerSoft, backgroundColor: colors.surface, paddingHorizontal: 14 },
  logoutText: { color: colors.danger, fontWeight: '800' },
  errorBox: { borderRadius: 10, padding: 11, backgroundColor: colors.dangerSoft },
  errorText: { color: colors.dangerDark, fontSize: 13 },
  successBox: { borderRadius: 10, padding: 11, backgroundColor: colors.successSoft },
  successText: { color: colors.successDark, fontSize: 13, fontWeight: '700' },
  retryText: { color: colors.brandDark, fontSize: 12, fontWeight: '800' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: 20, gap: 14 },
  formError: { color: colors.dangerDark, backgroundColor: colors.dangerSoft, padding: 10, borderRadius: 8, fontSize: 13 },
  // Segment control
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  segmentActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  segmentText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  segmentTextActive: { color: colors.brandDark },
  // Switch row
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 4 },
  // 2-col row
  row2: { flexDirection: 'row', gap: 10 },
  muted: { color: colors.muted, fontSize: 12 },
});
