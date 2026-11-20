import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';
import { BottomTabNavigator } from './BottomTabNavigator';

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
      <BottomTabNavigator />
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
