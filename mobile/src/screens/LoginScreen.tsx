import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Droplets, Globe2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl, setBaseUrl } from '../lib/storage';
import { PinPad } from '../components/PinPad';

type Mode = 'email' | 'pin';

export function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverOpen, setServerOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [serverError, setServerError] = useState('');

  async function submitLogin(secret = mode === 'email' ? password : pin) {
    setError('');
    if (!email.trim()) { setError('Email wajib diisi.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Format email tidak valid.'); return; }
    if (mode === 'pin' && !/^\d{6}$/.test(secret)) { setError('PIN harus terdiri dari 6 angka.'); return; }
    if (mode === 'email' && !secret) { setError('Kata sandi wajib diisi.'); return; }
    setLoading(true);
    try {
      await login(email, secret);
      setPin('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(message && !/failed|fetch|network|http_error/i.test(message) ? message : 'Email atau kata sandi/PIN salah. Periksa koneksi server dan coba lagi.');
    } finally { setLoading(false); }
  }

  async function openServerSettings() {
    setServerError('');
    setServerUrl(await getBaseUrl());
    setServerOpen(true);
  }

  async function saveServer() {
    try {
      await setBaseUrl(serverUrl);
      setServerOpen(false);
      setError('Alamat server berhasil disimpan. Silakan masuk kembali.');
    } catch (cause) {
      setServerError(cause instanceof Error ? cause.message : 'Alamat server tidak valid.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 24) + 20, paddingBottom: Math.max(insets.bottom, 20) + 20 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.brandIcon}><Droplets color="#fff" size={28} /></View>
          <Text style={styles.eyebrow}>KYANE POS</Text>
          <Text style={styles.title}>Selamat datang</Text>
          <Text style={styles.subtitle}>Masuk untuk mengelola operasional outlet cuci steam.</Text>

          <View style={styles.card}>
            <View style={styles.switcher}>
              <Pressable onPress={() => { setMode('email'); setError(''); }} style={[styles.switchOption, mode === 'email' && styles.switchSelected]}>
                <Text style={[styles.switchText, mode === 'email' && styles.switchTextSelected]}>Email</Text>
              </Pressable>
              <Pressable onPress={() => { setMode('pin'); setError(''); }} style={[styles.switchOption, mode === 'pin' && styles.switchSelected]}>
                <Text style={[styles.switchText, mode === 'pin' && styles.switchTextSelected]}>PIN Operator</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="nama@contoh.id" placeholderTextColor="#94a3b8" editable={!loading} onChangeText={setEmail} style={styles.input} value={email} />

            {mode === 'email' ? <>
              <Text style={styles.label}>Kata sandi</Text>
              <TextInput accessibilityLabel="Kata sandi" autoComplete="current-password" placeholder="Masukkan kata sandi" placeholderTextColor="#94a3b8" secureTextEntry editable={!loading} onChangeText={setPassword} onSubmitEditing={() => void submitLogin()} returnKeyType="go" style={styles.input} value={password} />
            </> : <>
              <Text style={styles.pinTitle}>Masukkan PIN operator</Text>
              <Text style={styles.pinHint}>Gunakan 6 angka PIN yang diberikan admin</Text>
              <PinPad value={pin} onChange={(value) => { setPin(value); setError(''); }} onSubmit={(value) => void submitLogin(value)} disabled={loading} />
            </>}

            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {mode === 'email' && <Pressable accessibilityRole="button" disabled={loading} onPress={() => void submitLogin()} style={({ pressed }) => [styles.submit, pressed && styles.submitPressed, loading && styles.dim]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Masuk</Text>}
            </Pressable>}
            <Text style={styles.helpText}>Lupa akses? Hubungi administrator outlet.</Text>
          </View>

          <Pressable accessibilityRole="button" onPress={() => void openServerSettings()} style={styles.serverButton}>
            <Globe2 size={16} color="#64748b" /><Text style={styles.serverButtonText}>Pengaturan server</Text><ChevronDown size={15} color="#64748b" />
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={serverOpen} transparent animationType="fade" onRequestClose={() => setServerOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Alamat server</Text>
          <Text style={styles.modalHint}>Masukkan URL backend, termasuk http:// atau https://.</Text>
          <TextInput accessibilityLabel="URL server" autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://pos.contoh.id" placeholderTextColor="#94a3b8" onChangeText={setServerUrl} style={styles.input} value={serverUrl} />
          {!!serverError && <Text accessibilityRole="alert" style={styles.error}>{serverError}</Text>}
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={() => setServerOpen(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => void saveServer()} style={styles.modalSave}><Text style={styles.submitText}>Simpan</Text></Pressable>
          </View>
        </View></View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f1f5f9' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22 },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 10 },
  brandIcon: { alignSelf: 'center', width: 58, height: 58, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 20, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  switcher: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 6 },
  switchOption: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  switchSelected: { backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.12)' },
  switchText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  switchTextSelected: { color: '#1d4ed8' },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 4 },
  input: { height: 48, borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, color: '#0f172a', fontSize: 15, backgroundColor: '#fff' },
  pinTitle: { textAlign: 'center', color: '#0f172a', fontWeight: '700', fontSize: 15, marginTop: 7 },
  pinHint: { textAlign: 'center', color: '#64748b', fontSize: 12, marginBottom: 8 },
  error: { color: '#b91c1c', backgroundColor: '#fef2f2', padding: 11, borderRadius: 9, fontSize: 13, lineHeight: 19 },
  submit: { minHeight: 48, borderRadius: 11, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  submitPressed: { backgroundColor: '#1d4ed8' },
  dim: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  helpText: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 6 },
  serverButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, padding: 12 },
  serverButtonText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.48)', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, gap: 12 },
  modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  modalHint: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelButton: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9' },
  cancelText: { color: '#334155', fontWeight: '700' },
  modalSave: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563eb' },
});
