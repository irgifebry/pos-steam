import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor: accentColorProp,
  onPress,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accentColor?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles(buildStyles);
  const accentColor = accentColorProp ?? colors.brand;
  const content = (
    <>
      <View style={[styles.iconBox, { backgroundColor: `${accentColor}18` }]}>
        <Icon color={accentColor} size={19} strokeWidth={2.3} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
        {value}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. Ketuk untuk ganti periode`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.card}>{content}</View>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 145,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  cardPressed: { opacity: 0.75 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  value: { color: colors.ink, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  subtitle: { color: colors.lightMuted, fontSize: 11, fontWeight: '600' },
  });
}
