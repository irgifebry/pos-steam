import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart3, ListChecks, Settings, ShoppingCart, Users } from 'lucide-react-native';
import { AntreanScreen } from '../screens/AntreanScreen';
import { KasirScreen } from '../screens/KasirScreen';
import { KaryawanScreen } from '../screens/KaryawanScreen';
import { LaporanScreen } from '../screens/LaporanScreen';
import { PengaturanScreen } from '../screens/PengaturanScreen';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Kasir: ShoppingCart,
  Antrean: ListChecks,
  Laporan: BarChart3,
  Karyawan: Users,
  Pengaturan: Settings,
} as const;

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const Icon = tabIcons[route.name as keyof typeof tabIcons];
        return {
          header: () => <AppHeader />,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: -2,
          },
          tabBarStyle: {
            height: 62,
            paddingTop: 6,
            paddingBottom: 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
            borderTopWidth: 1,
          },
          tabBarIcon: ({ color, size }) => <Icon color={color} size={size || 22} />,
        };
      }}
    >
      <Tab.Screen name="Kasir" component={KasirScreen} options={{ title: 'Kasir' }} />
      <Tab.Screen name="Antrean" component={AntreanScreen} options={{ title: 'Antrean' }} />
      <Tab.Screen name="Laporan" component={LaporanScreen} options={{ title: 'Laporan' }} />
      <Tab.Screen name="Karyawan" component={KaryawanScreen} options={{ title: 'Karyawan' }} />
      <Tab.Screen name="Pengaturan" component={PengaturanScreen} options={{ title: 'Pengaturan' }} />
    </Tab.Navigator>
  );
}
