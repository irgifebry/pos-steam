import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '../theme/colors';

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = colors.brand,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accentColor?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${accentColor}18` }]}>
        <Icon color={accentColor} size={19} strokeWidth={2.3} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
        {value}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
