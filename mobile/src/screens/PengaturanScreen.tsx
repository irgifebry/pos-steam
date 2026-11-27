import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bike, ChevronRight, Crown, Package, Users, Wallet, Wrench } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';
import type { RootStackParamList } from '../navigation/types';

export function PengaturanScreen() {
  const { user, activeOutlet, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { confirm, dialog } = useConfirmDialog();

  function confirmLogout() {
    confirm({
      title: 'Keluar dari akun?',
      message: 'Anda perlu masuk kembali untuk mengakses aplikasi.',
      confirmLabel: 'Keluar',
      cancelLabel: 'Batal',
      destructive: true,
      onConfirm: () => logout(),
    });
  }

  const menu = [
    { label: 'Paket Layanan', hint: 'Harga dan durasi cuci', icon: Package, route: 'Paket' },
    { label: 'ROYALTY', hint: 'Harga khusus pelanggan ROYALTY', icon: Crown, route: 'Royalty' },
    { label: 'OJOL', hint: 'Harga khusus pengemudi ojol', icon: Bike, route: 'Ojol' },
    { label: 'Add-on', hint: 'Layanan tambahan', icon: Wrench, route: 'Addon' },
    { label: 'Rekening Bank', hint: 'Tujuan transfer', icon: Wallet, route: 'Bank' },
    { label: 'Pengguna', hint: 'Kelola akun dan akses', icon: Users, route: 'Pengguna' },
  ] as const;

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 24 }]}
      >
      <Text style={styles.eyebrow}>PREFERENSI APLIKASI</Text>
      <Text style={styles.title}>Pengaturan</Text>
      <Text style={styles.subtitle}>Kelola layanan, rekening, dan akun aplikasi.</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name.trim().charAt(0).toUpperCase() || 'U'}</Text>
        </View>
        <View style={styles.profileDetails}>
          <Text style={styles.profileName}>{user?.name || 'Pengguna'}</Text>
          <Text selectable style={styles.profileEmail}>{user?.email || 'Email tidak tersedia'}</Text>
          <Text style={styles.profileMeta}>
            {user?.role === 'admin' ? 'Admin' : 'Operator'} · {activeOutlet?.name ?? 'Outlet belum dipilih'}
          </Text>
        </View>
      </View>

      <View style={styles.menu}>
        {menu.map(({ label, hint, icon: Icon, route }) => (
          <Pressable
            key={route}
            accessibilityRole="button"
            onPress={() => navigation.navigate(route)}
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
          >
            <View style={styles.menuIcon}>
              <Icon size={18} color={colors.brandDark} />
            </View>
            <View style={styles.menuCopy}>
              <Text style={styles.menuLabel}>{label}</Text>
              <Text style={styles.menuHint}>{hint}</Text>
            </View>
            <ChevronRight size={18} color={colors.lightMuted} />
          </Pressable>
        ))}
      </View>

        <Pressable accessibilityRole="button" onPress={confirmLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Keluar dari akun</Text>
        </Pressable>
      </ScrollView>
      {dialog}
    </>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
    content: { padding: 16, gap: 12, backgroundColor: colors.bg },
    eyebrow: { color: colors.brandDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
    title: { color: colors.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
    subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: -6 },

    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 16,
      padding: 14,
      marginTop: 4,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.brandDark, fontSize: 18, fontWeight: '800' },
    profileDetails: { flex: 1, minWidth: 0, gap: 2 },
    profileName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
    profileEmail: { color: colors.muted, fontSize: 12 },
    profileMeta: { color: colors.brandDark, fontSize: 11.5, fontWeight: '700' },

    menu: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 16,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    menuRowPressed: { backgroundColor: colors.brandSoft },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuCopy: { flex: 1, gap: 2 },
    menuLabel: { color: colors.ink, fontSize: 14, fontWeight: '700' },
    menuHint: { color: colors.muted, fontSize: 11.5 },

    logoutButton: {
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.dangerSoft,
      backgroundColor: colors.surface,
      marginTop: 4,
    },
    logoutText: { color: colors.danger, fontWeight: '800' },
  });
}
