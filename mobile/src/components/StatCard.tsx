import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = '#087e8b',
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
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 145, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 15, padding: 14, gap: 7 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  title: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  value: { color: '#0f172a', fontSize: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  subtitle: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
});
