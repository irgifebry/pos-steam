import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { AbsensiScreen } from '../screens/AbsensiScreen';
import { TampilanSettingsScreen } from '../screens/settings/TampilanSettingsScreen';
import { PaketSettingsScreen } from '../screens/settings/PaketSettingsScreen';
import { AddonSettingsScreen } from '../screens/settings/AddonSettingsScreen';
import { BankSettingsScreen } from '../screens/settings/BankSettingsScreen';
import { PenggunaSettingsScreen } from '../screens/settings/PenggunaSettingsScreen';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';
import { BottomTabNavigator } from './BottomTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AbsensiRoute({ route }: NativeStackScreenProps<RootStackParamList, 'Absensi'>) {
  return <AbsensiScreen users={route.params.users} />;
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { mode, colors } = useTheme();
  const styles = useStyles(buildStyles);
  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }
  if (!isAuthenticated) return <LoginScreen />;

  return (
    <NavigationContainer
      theme={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          primary: colors.brand,
          background: colors.bg,
          card: colors.headerBg,
          text: colors.ink,
          border: colors.line,
          notification: colors.brand,
        },
      }}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={BottomTabNavigator} />
        <Stack.Screen
          name="Absensi"
          component={AbsensiRoute}
          options={{
            headerShown: true,
            title: 'Absensi Harian',
            headerBackTitle: 'Kembali',
          }}
        />
        <Stack.Screen name="Tampilan" component={TampilanSettingsScreen} options={{ headerShown: true, title: 'Tampilan' }} />
        <Stack.Screen name="Paket" component={PaketSettingsScreen} options={{ headerShown: true, title: 'Paket Layanan' }} />
        <Stack.Screen name="Addon" component={AddonSettingsScreen} options={{ headerShown: true, title: 'Add-on' }} />
        <Stack.Screen name="Bank" component={BankSettingsScreen} options={{ headerShown: true, title: 'Rekening Bank' }} />
        <Stack.Screen name="Pengguna" component={PenggunaSettingsScreen} options={{ headerShown: true, title: 'Pengguna' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
    },
  });
}
