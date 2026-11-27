import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { KyaneLogo } from '../components/KyaneLogo';
import { useNoticeDialog } from '../components/NoticeDialog';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';

type FieldName = 'email' | 'pin';

export function LoginScreen() {
  const { colors } = useTheme();
  const styles = useStyles(buildStyles);
  const { notify, dialog } = useNoticeDialog();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [focused, setFocused] = useState<FieldName | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailRef = useRef<TextInputInstance>(null);
  const pinRef = useRef<TextInputInstance>(null);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroShift = useRef(new Animated.Value(12)).current;
  const sheetShift = useRef(new Animated.Value(36)).current;

  useEffect(() => {
    let mounted = true;

    const settle = () => {
      heroOpacity.setValue(1);
      heroShift.setValue(0);
      sheetShift.setValue(0);
    };

    const reveal = () => {
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(heroShift, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetShift, {
          toValue: 0,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    };

    try {
      const query = AccessibilityInfo.isReduceMotionEnabled();
      if (query && typeof query.then === 'function') {
        query
          .then((reduced) => {
            if (!mounted) return;
            if (reduced) settle();
            else reveal();
          })
          .catch(() => {
            if (mounted) reveal();
          });
      } else {
        reveal();
      }
    } catch {
      reveal();
    }

    return () => {
      mounted = false;
    };
  }, [heroOpacity, heroShift, sheetShift]);

  async function submitLogin() {
    if (loading) return;
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Email wajib diisi.');
      emailRef.current?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Format email tidak valid.');
      emailRef.current?.focus();
      return;
    }
    if (!pin) {
      setError('PIN wajib diisi.');
      pinRef.current?.focus();
      return;
    }
    if (pin.length < 6) {
      setError('PIN minimal 6 angka.');
      pinRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await login(cleanEmail, pin);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      if (/network|fetch|abort|timeout/i.test(message)) {
        setError(
          'Gagal menghubungi server. Pastikan perangkat dan server berada di jaringan yang sama.',
        );
      } else {
        setError(message || 'Email atau PIN salah. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount() {
    setEmail('admin@pos.test');
    setPin('123456');
    setError('');
  }

  function showAccessHelp() {
    notify({
      title: 'Butuh akses?',
      message: 'Hubungi admin outlet untuk reset PIN atau membuat akun baru.',
    });
  }

  return (
    <View style={styles.root}>
      <AuthBackdrop />
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
            <Animated.View
              style={[
                styles.heroInner,
                { opacity: heroOpacity, transform: [{ translateY: heroShift }] },
              ]}
            >
              <KyaneLogo width={200} height={100} />
              <SectionDivider style={styles.brandDivider} />
              <Text accessibilityRole="header" style={styles.headline}>
                Masuk ke{'\n'}panel admin.
              </Text>
              <Text style={styles.heroSub}>
                Kasir, antrean, dan laporan outlet dalam satu tempat.
              </Text>
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.panel,
              {
                paddingBottom: Math.max(insets.bottom, 20) + 20,
                transform: [{ translateY: sheetShift }],
              },
            ]}
          >
            <SectionDivider style={styles.panelDivider} />
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              Masuk
            </Text>
            <Text style={styles.sheetSub}>
              Gunakan email dan PIN yang diberikan admin outlet.
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <View
                  style={[
                    styles.inputShell,
                    focused === 'email' && styles.inputShellFocused,
                  ]}
                >
                  <Mail
                    size={18}
                    color={focused === 'email' ? colors.brandDeep : colors.lightMuted}
                  />
                  <TextInput
                    ref={emailRef}
                    accessibilityLabel="Email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    editable={!loading}
                    keyboardType="email-address"
                    onBlur={() => setFocused(null)}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onSubmitEditing={() => pinRef.current?.focus()}
                    placeholder="nama@contoh.id"
                    placeholderTextColor={colors.lightMuted}
                    returnKeyType="next"
                    style={styles.input}
                    textContentType="emailAddress"
                    value={email}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>PIN</Text>
                  <Text style={styles.labelHint}>6–12 angka</Text>
                </View>
                <View
                  style={[
                    styles.inputShell,
                    focused === 'pin' && styles.inputShellFocused,
                  ]}
                >
                  <LockKeyhole
                    size={18}
                    color={focused === 'pin' ? colors.brandDeep : colors.lightMuted}
                  />
                  <TextInput
                    ref={pinRef}
                    accessibilityLabel="PIN"
                    accessibilityHint="Masukkan 6 sampai 12 angka"
                    autoComplete="off"
                    editable={!loading}
                    keyboardType="number-pad"
                    maxLength={12}
                    onBlur={() => setFocused(null)}
                    onChangeText={(value) => setPin(value.replace(/\D/g, ''))}
                    onFocus={() => setFocused('pin')}
                    onSubmitEditing={() => void submitLogin()}
                    placeholder="••••••"
                    placeholderTextColor={colors.lightMuted}
                    returnKeyType="go"
                    secureTextEntry={!showPin}
                    style={[styles.input, styles.pinInput]}
                    textContentType="password"
                    value={pin}
                  />
                  <Pressable
                    accessibilityLabel={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={() => setShowPin((current) => !current)}
                    style={styles.eyeButton}
                  >
                    {showPin ? (
                      <EyeOff size={18} color={colors.muted} />
                    ) : (
                      <Eye size={18} color={colors.muted} />
                    )}
                  </Pressable>
                </View>
              </View>

              {!!error && (
                <View
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                  style={styles.errorBox}
                >
                  <CircleAlert size={16} color={colors.dangerDark} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: loading, disabled: loading }}
                disabled={loading}
                onPress={() => void submitLogin()}
                style={({ pressed }) => [
                  styles.submit,
                  pressed && !loading && styles.submitPressed,
                  loading && styles.submitLoading,
                ]}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.submitText}>Memproses…</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.submitText}>Masuk</Text>
                    <ArrowRight size={18} color="#ffffff" strokeWidth={2.4} />
                  </>
                )}
              </Pressable>

              {__DEV__ && (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={fillDemoAccount}
                  style={styles.demoLink}
                >
                  <Text style={styles.demoText}>Isi akun demo</Text>
                </Pressable>
              )}

              <SectionDivider />

              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={showAccessHelp}
                style={styles.footer}
              >
                <Text style={styles.footerText}>
                  Butuh akses?{' '}
                  <Text style={styles.footerAction}>Hubungi admin outlet</Text>
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {dialog}
    </View>
  );
}

function SectionDivider({ style }: { style?: object }) {
  const styles = useStyles(buildStyles);
  return <View style={[styles.divider, style]} />;
}

function AuthBackdrop() {
  const { colors } = useTheme();
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <LinearGradient id="authGround" x1="0" y1="0" x2="0.45" y2="1">
          <Stop offset="0" stopColor="#f0f9ff" />
          <Stop offset="0.52" stopColor="#dbeafe" />
          <Stop offset="1" stopColor="#bae6fd" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="390" height="844" fill="url(#authGround)" />
      {[118, 168, 226, 292].map((radius, index) => (
        <Circle
          key={radius}
          cx="113"
          cy="118"
          r={radius}
          stroke={colors.brandDark}
          strokeOpacity={0.1 - index * 0.016}
          strokeWidth={1}
          fill="none"
        />
      ))}
    </Svg>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  heroInner: {
    alignItems: 'flex-start',
  },
  headline: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -1.1,
    color: colors.ink,
  },
  heroSub: {
    marginTop: 8,
    maxWidth: 310,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
    color: colors.muted,
  },
  panel: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  brandDivider: {
    marginTop: 20,
    marginBottom: 22,
  },
  panelDivider: {
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: colors.ink,
  },
  sheetSub: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.muted,
  },
  form: {
    marginTop: 22,
    gap: 14,
  },
  field: {
    gap: 7,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  labelHint: {
    fontSize: 11.5,
    color: colors.lightMuted,
  },
  inputShell: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
  },
  inputShellFocused: {
    borderColor: colors.brand,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
    color: colors.ink,
    includeFontPadding: false,
  },
  pinInput: {
    letterSpacing: 2,
    fontWeight: '600',
  },
  eyeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.dangerDark,
  },
  submit: {
    marginTop: 6,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  submitPressed: {
    backgroundColor: colors.brandDark,
    transform: [{ scale: 0.985 }],
  },
  submitLoading: {
    opacity: 0.72,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: '#ffffff',
  },
  demoLink: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  demoText: {
    fontSize: 12.5,
    color: colors.muted,
    textDecorationLine: 'underline',
    textDecorationColor: colors.line,
  },
  footer: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.muted,
  },
  footerAction: {
    fontWeight: '700',
    color: colors.accent,
  },
  });
}
