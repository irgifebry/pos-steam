import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useStyles } from '../../theme/useStyles';
import type { Palette } from '../../theme/palettes';

export function SettingsScreenShell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
    >
      {children}
    </ScrollView>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
    content: { flexGrow: 1, backgroundColor: colors.bg, padding: 16 },
  });
}
