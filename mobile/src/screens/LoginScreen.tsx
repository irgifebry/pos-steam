import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { KyaneLogo } from '../components/KyaneLogo';
import { colors } from '../theme/colors';

export function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('admin@pos.test');
  const [pin, setPin] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      if (/network|fetch|abort|timeout/i.test(msg)) {
        setError('Gagal menghubungi server. Pastikan HP dan server backend terhubung di jaringan yang sama.');
      } else {
        setError(msg || 'Email atau PIN salah. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 20) + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Brand Header with Center Logo */}
          <View style={styles.header}>
            <View style={styles.logoCenter}>
              <KyaneLogo width={200} height={60} />
            </View>
            <Text style={styles.title}>Masuk ke panel admin</Text>
            <Text style={styles.subtitle}>KYANE Protect &amp; Shine — POS outlet cuci steam motor &amp; mobil.</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            {/* Quick Demo Fill Button */}
            <Pressable
              onPress={() => {
                setEmail('admin@pos.test');
                setPin('123456');
                setError('');
              }}
              style={styles.demoBox}
            >
              <ShieldCheck size={18} color={colors.brandDark} />
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
                placeholderTextColor={colors.lightMuted}
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
                placeholderTextColor={colors.lightMuted}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    gap: 18,
  },
  header: {
    gap: 8,
    alignItems: 'center',
  },
  logoCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  demoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  demoSub: {
    fontSize: 11,
    color: colors.brandDark,
    fontWeight: '600',
  },
  demoAction: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandDark,
    backgroundColor: colors.brandSoft,
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
    color: colors.ink,
  },
  labelHint: {
    fontSize: 12,
    color: colors.muted,
  },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.ink,
  },
  pinInput: {
    letterSpacing: 4,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.dangerDark,
    lineHeight: 18,
    fontWeight: '600',
  },
  submitBtn: {
    height: 48,
    backgroundColor: colors.brand,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnPressed: {
    backgroundColor: colors.brandDark,
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
    color: colors.muted,
    marginTop: 2,
  },
});
