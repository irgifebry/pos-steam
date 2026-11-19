import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart3, ListChecks, Settings, ShoppingCart, Users } from 'lucide-react-native';
import { AntreanScreen } from '../screens/AntreanScreen';
import { KasirScreen } from '../screens/KasirScreen';
import { KaryawanScreen } from '../screens/KaryawanScreen';
import { LaporanScreen } from '../screens/LaporanScreen';
import { PengaturanScreen } from '../screens/PengaturanScreen';

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
          headerStyle: {
            backgroundColor: '#ffffff',
            borderBottomColor: '#bae6fd',
            borderBottomWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            color: '#0f172a', // --color-ink
            fontWeight: '800',
            fontSize: 18,
          },
          tabBarActiveTintColor: '#0ea5e9', // --color-brand
          tabBarInactiveTintColor: '#475569', // --color-muted
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: -2,
          },
          tabBarStyle: {
            height: 62,
            paddingTop: 6,
            paddingBottom: 8,
            backgroundColor: '#ffffff', // --color-surface
            borderTopColor: '#bae6fd', // --color-line
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
