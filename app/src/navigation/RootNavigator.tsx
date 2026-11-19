import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { BottomTabNavigator } from './BottomTabNavigator';

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (!isAuthenticated) return <LoginScreen />;
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <BottomTabNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
});
