import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeBottomTabIcon } from '@react-navigation/bottom-tabs/unstable';
import { Platform } from 'react-native';
import {
  BarChart3,
  ListChecks,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react-native';
import { AntreanScreen } from '../screens/AntreanScreen';
import { KasirScreen } from '../screens/KasirScreen';
import { KaryawanScreen } from '../screens/KaryawanScreen';
import { LaporanScreen } from '../screens/LaporanScreen';
import { PengaturanScreen } from '../screens/PengaturanScreen';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/ThemeContext';

type TabName = 'Kasir' | 'Antrean' | 'Laporan' | 'Karyawan' | 'Pengaturan';

type NativeTabsModule = typeof import('@react-navigation/bottom-tabs/unstable');

// Modul /unstable melempar error saat dievaluasi di web. Require bersyarat
// memastikan bundle web tidak pernah menjalankannya.
const NativeTab =
  Platform.OS === 'web'
    ? null
    : (require('@react-navigation/bottom-tabs/unstable') as NativeTabsModule)
        .createNativeBottomTabNavigator();
const WebTab = createBottomTabNavigator();

const tabIcons = {
  Kasir: {
    lucide: ShoppingCart,
    sf: { type: 'sfSymbol', name: 'cart' },
    image: require('../../assets/tab-icons/tab-kasir.png'),
  },
  Antrean: {
    lucide: ListChecks,
    sf: { type: 'sfSymbol', name: 'list.bullet' },
    image: require('../../assets/tab-icons/tab-antrean.png'),
  },
  Laporan: {
    lucide: BarChart3,
    sf: { type: 'sfSymbol', name: 'chart.bar' },
    image: require('../../assets/tab-icons/tab-laporan.png'),
  },
  Karyawan: {
    lucide: Users,
    sf: { type: 'sfSymbol', name: 'person.2' },
    image: require('../../assets/tab-icons/tab-karyawan.png'),
  },
  Pengaturan: {
    lucide: Settings,
    sf: { type: 'sfSymbol', name: 'gear' },
    image: require('../../assets/tab-icons/tab-pengaturan.png'),
  },
} as const;

function NativeBottomTabs() {
  const { colors } = useTheme();
  const Tab = NativeTab!;
  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={({ route }) => {
        const name = route.name as TabName;
        const icon = tabIcons[name];
        return {
          header: () => <AppHeader />,
          title: name,
          tabBarLabel: name,
          tabBarIcon: Platform.select<NativeBottomTabIcon>({
            ios: icon.sf,
            android: { type: 'image', source: icon.image, tinted: true },
            default: icon.sf,
          }),
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.lightMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
          tabBarStyle: { backgroundColor: colors.tabBarBg },
          tabBarActiveIndicatorColor: colors.brandSoft,
          tabBarLabelVisibilityMode: 'labeled',
        };
      }}
    >
      <Tab.Screen name="Kasir" component={KasirScreen} />
      <Tab.Screen name="Antrean" component={AntreanScreen} />
      <Tab.Screen name="Laporan" component={LaporanScreen} />
      <Tab.Screen name="Karyawan" component={KaryawanScreen} />
      <Tab.Screen name="Pengaturan" component={PengaturanScreen} />
    </Tab.Navigator>
  );
}

// Native Bottom Tabs belum mendukung web — pakai navigator biasa untuk preview/browser.
function WebBottomTabs() {
  const { colors } = useTheme();
  return (
    <WebTab.Navigator
      screenOptions={({ route }) => {
        const name = route.name as TabName;
        const Icon = tabIcons[name].lucide;
        return {
          header: () => <AppHeader />,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.lightMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: -2 },
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
      <WebTab.Screen name="Kasir" component={KasirScreen} options={{ title: 'Kasir' }} />
      <WebTab.Screen name="Antrean" component={AntreanScreen} options={{ title: 'Antrean' }} />
      <WebTab.Screen name="Laporan" component={LaporanScreen} options={{ title: 'Laporan' }} />
      <WebTab.Screen name="Karyawan" component={KaryawanScreen} options={{ title: 'Karyawan' }} />
      <WebTab.Screen name="Pengaturan" component={PengaturanScreen} options={{ title: 'Pengaturan' }} />
    </WebTab.Navigator>
  );
}

export function BottomTabNavigator() {
  return Platform.OS === 'web' ? <WebBottomTabs /> : <NativeBottomTabs />;
}
