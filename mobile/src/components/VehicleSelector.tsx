import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VehicleType } from '../types';

type Props = { value: VehicleType; onChange: (value: VehicleType) => void };

export function VehicleSelector({ value, onChange }: Props) {
  return <View accessibilityRole="radiogroup" style={styles.row}>
    {(['motor', 'mobil'] as const).map((vehicle) => <Pressable key={vehicle} accessibilityRole="radio" accessibilityState={{ selected: value === vehicle }} onPress={() => onChange(vehicle)} style={[styles.option, value === vehicle && styles.selected]}>
      <Text style={[styles.label, value === vehicle && styles.selectedLabel]}>{vehicle === 'motor' ? 'Motor' : 'Mobil'}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 }, option: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center' }, selected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' }, label: { color: '#475569', fontSize: 15, fontWeight: '700' }, selectedLabel: { color: '#1d4ed8' },
});
