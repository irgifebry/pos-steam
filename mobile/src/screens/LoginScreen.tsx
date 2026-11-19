import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, ChevronRight, Globe2, ShieldCheck, Sparkles, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl, setBaseUrl } from '../lib/storage';

export function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('admin@pos.test');
  const [pin, setPin] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverUrl, setServerUrlState] = useState('');
  const [serverOpen, setServerOpen] = useState(false);
  const [serverInput, setServerInput] = useState('');
  const [testingServer, setTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<'connected' | 'checking' | 'error'>('checking');

  useEffect(() => {
    let active = true;
    async function initServer() {
      const current = await getBaseUrl();
      if (!active) return;
      setServerUrlState(current);
      setServerInput(current);
      checkConnection(current);
    }
    void initServer();
    return () => {
      active = false;
    };
  }, []);

  async function checkConnection(url: string) {
    setServerStatus('checking');
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setServerStatus('connected');
      } else {
        setServerStatus('error');
      }
    } catch {
      setServerStatus('error');
    }
  }

  async function submitLogin() {
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Email wajib diisi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Format email tidak valid.');
      return;
    }
    if (!pin) {
      setError('PIN wajib diisi.');
      return;
    }
    if (pin.length < 6) {
      setError('PIN minimal 6 angka.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanEmail, pin);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : '';
      if (/network|fetch|abort|timeout/i.test(msg) || serverStatus === 'error') {
        setError(`Gagal menghubungi server (${serverUrl}). Pastikan HP dan laptop di WiFi yang sama, atau sesuaikan IP server.`);
      } else {
        setError(msg || 'Email atau PIN salah. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveServer() {
    setTestingServer(true);
    try {
      await setBaseUrl(serverInput);
      const updated = await getBaseUrl();
      setServerUrlState(updated);
      await checkConnection(updated);
      setServerOpen(false);
    } catch (err) {
      Alert.alert('Gagal Menyimpan', err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setTestingServer(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 20) + 12,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Server Indicator Pill */}
          <Pressable
            onPress={() => {
              setServerInput(serverUrl);
              setServerOpen(true);
            }}
            style={styles.serverPill}
          >
            <View
              style={[
                styles.statusDot,
                serverStatus === 'connected' && styles.dotGreen,
                serverStatus === 'checking' && styles.dotYellow,
                serverStatus === 'error' && styles.dotRed,
              ]}
            />
            <Text style={styles.serverPillText} numberOfLines={1}>
              Server: {serverUrl || 'Memuat...'}
            </Text>
            <ChevronRight size={14} color="#64748b" />
          </Pressable>

          {/* Brand Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/kyane-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>Masuk ke panel admin</Text>
            <Text style={styles.subtitle}>KYANE Protect &amp; Shine — POS outlet cuci steam motor &amp; mobil.</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            {/* Quick Demo Fill Pill */}
            <Pressable
              onPress={() => {
                setEmail('admin@pos.test');
                setPin('123456');
                setError('');
              }}
              style={styles.demoBox}
            >
              <ShieldCheck size={16} color="#0284c7" />
              <View style={{ flex: 1 }}>
                <Text style={styles.demoTitle}>Akun Default Terpasang</Text>
                <Text style={styles.demoSub}>admin@pos.test · PIN: 123456</Text>
              </View>
              <Text style={styles.demoAction}>Pakai</Text>
            </Pressable>

            {/* Email Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="nama@contoh.id"
                placeholderTextColor="#94a3b8"
                editable={!loading}
                onChangeText={setEmail}
                style={styles.input}
                value={email}
              />
            </View>

            {/* PIN Field */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PIN</Text>
                <Text style={styles.labelHint}>PIN yang diberikan admin</Text>
              </View>
              <TextInput
                accessibilityLabel="PIN"
                keyboardType="numeric"
                secureTextEntry
                maxLength={12}
                placeholder="••••••"
                placeholderTextColor="#94a3b8"
                editable={!loading}
                onChangeText={(val) => setPin(val.replace(/\D/g, ''))}
                onSubmitEditing={() => void submitLogin()}
                returnKeyType="go"
                style={[styles.input, styles.pinInput]}
                value={pin}
              />
            </View>

            {/* Error Message */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => void submitLogin()}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
                loading && styles.dimmed,
              ]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.submitBtnText}>Memproses...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>Masuk</Text>
              )}
            </Pressable>

            <Text style={styles.footerNote}>Lupa PIN? Hubungi admin outlet untuk reset.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal Setting Server */}
      <Modal visible={serverOpen} transparent animationType="fade" onRequestClose={() => setServerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Globe2 size={18} color="#0284c7" />
                <Text style={styles.modalTitle}>Konfigurasi Server API</Text>
              </View>
              <Pressable onPress={() => setServerOpen(false)} hitSlop={10}>
                <X size={20} color="#64748b" />
              </Pressable>
            </View>
            <Text style={styles.modalDescription}>
              Masukkan IP laptop dan port tempat Next.js berjalan (misal: http://192.168.101.4:3000) agar HP dapat terhubung.
            </Text>

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://192.168.1.x:3000"
              placeholderTextColor="#94a3b8"
              onChangeText={setServerInput}
              style={[styles.input, { marginBottom: 16 }]}
              value={serverInput}
            />

            <View style={styles.modalButtons}>
              <Pressable onPress={() => setServerOpen(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSaveServer()}
                disabled={testingServer}
                style={[styles.modalSaveBtn, testingServer && styles.dimmed]}
              >
                {testingServer ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Simpan &amp; Uji</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff', // matches web --color-bg
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: 16,
  },
  serverPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: { backgroundColor: '#16a34a' },
  dotYellow: { backgroundColor: '#eab308' },
  dotRed: { backgroundColor: '#ef4444' },
  serverPillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    maxWidth: 240,
  },
  header: {
    gap: 8,
  },
  logoImage: {
    width: 160,
    height: 48,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a', // --color-ink
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569', // --color-muted
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  demoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  demoSub: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
  },
  demoAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  labelHint: {
    fontSize: 12,
    color: '#64748b',
  },
  input: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  pinInput: {
    letterSpacing: 4,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
    lineHeight: 18,
    fontWeight: '500',
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#0ea5e9', // --color-brand
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnPressed: {
    backgroundColor: '#0284c7',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dimmed: {
    opacity: 0.65,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#0ea5e9',
    minWidth: 100,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
