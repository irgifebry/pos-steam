import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';
import { KyaneLogo } from './KyaneLogo';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const styles = useStyles(buildStyles);
  const { user } = useAuth();

  const roleLabel = user?.role === 'admin' ? 'Admin' : 'Operator';
  const displayName = user?.name?.trim() || roleLabel;

  return (
    <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.content}>
        {/* Logo SVG KYANE di sisi kiri */}
        <View style={styles.logoWrap}>
          <KyaneLogo width={92} height={46} />
        </View>

        <View style={styles.rule} />

        {/* Sapaan dan status login di pojok kanan */}
        <View style={styles.statusInfo}>
          <Text numberOfLines={1} style={styles.greeting}>
            {getGreeting()}, {displayName}
          </Text>
          <Text numberOfLines={1} style={styles.loginStatus}>
            Masuk sebagai {roleLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
  headerWrapper: {
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  content: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  logoWrap: {
    width: 92,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: {
    width: 1,
    height: 28,
    backgroundColor: colors.line,
  },
  statusInfo: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  greeting: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  loginStatus: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.muted,
    textAlign: 'right',
  },
  });
}
