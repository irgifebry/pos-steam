import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useStyles } from '../../theme/useStyles';
import type { Palette } from '../../theme/palettes';
import { SettingsScreenShell } from './SettingsScreenShell';

export function TampilanSettingsScreen() {
  const { mode, setMode, colors: theme } = useTheme();
  const styles = useStyles(buildStyles);
  return (
    <SettingsScreenShell>
      <View style={styles.section}>
        <Text style={styles.title}>Tema aplikasi</Text>
        <Text style={styles.subtitle}>Pilih tampilan yang nyaman dipakai di outlet.</Text>
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('light')}
            style={[styles.option, mode === 'light' && styles.optionActive]}
          >
            <Sun size={18} color={mode === 'light' ? theme.brandDark : theme.muted} />
            <Text style={[styles.optionText, mode === 'light' && styles.optionTextActive]}>Terang</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('dark')}
            style={[styles.option, mode === 'dark' && styles.optionActive]}
          >
            <Moon size={18} color={mode === 'dark' ? theme.brandDark : theme.muted} />
            <Text style={[styles.optionText, mode === 'dark' && styles.optionTextActive]}>Gelap</Text>
          </Pressable>
        </View>
      </View>
    </SettingsScreenShell>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
    section: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    title: { color: colors.ink, fontSize: 16, fontWeight: '800' },
    subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18 },
    row: { flexDirection: 'row', gap: 10, marginTop: 8 },
    option: {
      flex: 1,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    optionActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
    optionText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
    optionTextActive: { color: colors.brandDark },
  });
}
