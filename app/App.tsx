import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ChartNoAxesCombined, ClipboardList, Droplets, Settings, Users } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { AntreanScreen } from './src/screens/AntreanScreen';
import { KasirScreen } from './src/screens/KasirScreen';

const Tab = createBottomTabNavigator();

const screens = [
  { name: 'Kasir', title: 'Kasir', icon: Droplets, description: 'Buat transaksi cuci baru.' },
  { name: 'Antrean', title: 'Antrean', icon: ClipboardList, description: 'Pantau status antrean cucian.' },
  { name: 'Laporan', title: 'Laporan', icon: ChartNoAxesCombined, description: 'Ringkasan transaksi dan omzet.' },
  { name: 'Karyawan', title: 'Karyawan', icon: Users, description: 'Kelola karyawan dan absensi.' },
  { name: 'Pengaturan', title: 'Pengaturan', icon: Settings, description: 'Atur aplikasi dan koneksi server.' },
] as const;

function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.screen}>
      <View style={styles.iconCircle}><Droplets color="#087e8b" size={30} /></View>
      <Text style={styles.eyebrow}>KYANE POS</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (!isAuthenticated) return <LoginScreen />;
  return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#ffffff' },
            headerTitleStyle: { color: '#16343a', fontWeight: '700' },
            tabBarActiveTintColor: '#087e8b',
            tabBarInactiveTintColor: '#78888b',
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 8 },
          }}
        >
          {screens.map(({ name, title, icon: Icon, description }) => (
            <Tab.Screen
              key={name}
              name={name}
              options={{ title, tabBarIcon: ({ color, size }) => <Icon color={color} size={size} /> }}
            >
              {() => name === 'Antrean' ? <AntreanScreen /> : name === 'Kasir' ? <KasirScreen /> : <PlaceholderScreen title={title} description={description} />}
            </Tab.Screen>
          ))}
        </Tab.Navigator>
      </NavigationContainer>
  );
}

export default function App() {
  return <SafeAreaProvider><AuthProvider><AuthenticatedApp /></AuthProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f8f8', padding: 24 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#d9f0f0', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  eyebrow: { color: '#087e8b', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: '#16343a', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  description: { color: '#64777b', fontSize: 16, textAlign: 'center' },
});
