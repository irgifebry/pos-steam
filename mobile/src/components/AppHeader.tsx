import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';
import { KyaneLogo } from './KyaneLogo';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { mode, colors } = useTheme();
  const styles = useStyles(buildStyles);
  const { user, activeOutlet } = useAuth();

  return (
    <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.content}>
        {/* Logo SVG KYANE di sisi kiri */}
        <View style={styles.logoWrap}>
          {mode === 'dark' ? (
            <KyaneLogo variant="mono" width={84} height={42} />
          ) : (
            <KyaneLogo width={92} height={46} />
          )}
        </View>

        <View style={styles.rule} />

        {/* Informasi Outlet & Operator */}
        <View style={styles.outletInfo}>
          <Text numberOfLines={1} style={styles.brandTitle}>
            {activeOutlet?.name || 'Kyane Protect & Shine'}
          </Text>
          <Text numberOfLines={1} style={styles.userMeta}>
            {user?.name || 'Operator'} · {user?.role === 'admin' ? 'Admin' : 'Operator'}
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
  outletInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },
  brandTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  userMeta: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.muted,
  },
  });
}
