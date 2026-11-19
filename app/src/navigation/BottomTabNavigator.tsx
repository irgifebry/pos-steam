import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChartNoAxesCombined, Clock3, CreditCard, Settings, UserRoundCheck } from 'lucide-react-native';
import { AntreanScreen } from '../screens/AntreanScreen';
import { KasirScreen } from '../screens/KasirScreen';
import { KaryawanScreen } from '../screens/KaryawanScreen';
import { LaporanScreen } from '../screens/LaporanScreen';
import { PengaturanScreen } from '../screens/PengaturanScreen';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Kasir: CreditCard,
  Antrean: Clock3,
  Laporan: ChartNoAxesCombined,
  Karyawan: UserRoundCheck,
  Pengaturan: Settings,
} as const;

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const Icon = tabIcons[route.name as keyof typeof tabIcons];
        return {
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { color: '#0f172a', fontWeight: '700' },
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#78888b',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 8, borderTopColor: '#e2e8f0' },
          tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
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
