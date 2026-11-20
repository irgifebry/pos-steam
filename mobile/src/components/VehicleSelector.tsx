import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VehicleType } from '../types';
import { useStyles } from '../theme/useStyles';
import type { Palette } from '../theme/palettes';

type Props = { value: VehicleType; onChange: (value: VehicleType) => void };

export function VehicleSelector({ value, onChange }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {(['motor', 'mobil'] as const).map((vehicle) => (
        <Pressable
          key={vehicle}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === vehicle }}
          onPress={() => onChange(vehicle)}
          style={[styles.option, value === vehicle && styles.selected]}
        >
          <Text style={[styles.label, value === vehicle && styles.selectedLabel]}>
            {vehicle === 'motor' ? 'Motor' : 'Mobil'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function buildStyles(colors: Palette) {
  return StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  selected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  label: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  selectedLabel: {
    color: colors.brandDark,
  },
  });
}
