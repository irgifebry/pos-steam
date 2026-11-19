import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { KyaneLogo } from './KyaneLogo';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { user, activeOutlet, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Keluar dari Akun', 'Apakah Anda yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => {
          void logout().catch((err) =>
            Alert.alert('Gagal Keluar', err instanceof Error ? err.message : 'Silakan coba lagi.')
          );
        },
      },
    ]);
  }

  return (
    <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.content}>
        {/* Logo SVG KYANE di sisi kiri */}
        <KyaneLogo width={100} height={36} style={styles.logo} />

        {/* Informasi Outlet & Operator */}
        <View style={styles.outletInfo}>
          <Text numberOfLines={1} style={styles.brandTitle}>
            {activeOutlet?.name || 'Kyane Protect & Shine'}
          </Text>
          <Text numberOfLines={1} style={styles.userMeta}>
            {user?.name || 'Operator'} · {user?.role === 'admin' ? 'Admin' : 'Operator'}
          </Text>
        </View>

        {/* Tombol Logout Cepat */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keluar akun"
          onPress={handleLogout}
          hitSlop={8}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        >
          <LogOut size={18} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  logo: {
    marginRight: 2,
  },
  outletInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  userMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnPressed: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
});
