import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart3, ListChecks, Settings, ShoppingCart } from 'lucide-react-native';
import { AntreanScreen } from '../screens/AntreanScreen';
import { KasirScreen } from '../screens/KasirScreen';
import { LaporanScreen } from '../screens/LaporanScreen';
import { PengaturanScreen } from '../screens/PengaturanScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();

const tabIcons = {
  Kasir: ShoppingCart,
  Antrean: ListChecks,
  Laporan: BarChart3,
  Pengaturan: Settings,
} as const;

export function BottomTabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const Icon = tabIcons[route.name as keyof typeof tabIcons];
        return {
          header: () => <AppHeader />,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.lightMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: -2,
          },
          tabBarStyle: {
            height: 62,
            paddingTop: 6,
            paddingBottom: 8,
            backgroundColor: colors.tabBarBg,
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
      <Tab.Screen name="Pengaturan" component={PengaturanScreen} options={{ title: 'Pengaturan' }} />
    </Tab.Navigator>
  );
}
