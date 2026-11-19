import { Delete, DeleteIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type PinPadProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  length?: number;
};

export function PinPad({ value, onChange, onSubmit, disabled = false, length = 6 }: PinPadProps) {
  const pressDigit = (digit: string) => {
    if (disabled || value.length >= length) return;
    const next = `${value}${digit}`;
    onChange(next);
    if (next.length === length) onSubmit?.(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.indicators} accessibilityLabel={`PIN ${value.length} dari ${length} digit`}>
        {Array.from({ length }, (_, index) => (
          <View key={index} style={[styles.dot, index < value.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.grid}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={key === 'clear' ? 'Hapus PIN' : key === 'backspace' ? 'Hapus digit terakhir' : key}
            disabled={disabled}
            onPress={() => {
              if (key === 'clear') onChange('');
              else if (key === 'backspace') onChange(value.slice(0, -1));
              else pressDigit(key);
            }}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed, disabled && styles.keyDisabled]}
          >
            {key === 'clear' ? <Delete color="#64748b" size={21} /> : key === 'backspace' ? <DeleteIcon color="#334155" size={22} /> : <Text style={styles.digit}>{key}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', gap: 20 },
  indicators: { flexDirection: 'row', gap: 14, paddingVertical: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: '#94a3b8', backgroundColor: '#fff' },
  dotFilled: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  grid: { width: '100%', maxWidth: 300, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  key: { width: '30%', minWidth: 76, maxWidth: 88, height: 54, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  keyPressed: { backgroundColor: '#dbeafe' },
  keyDisabled: { opacity: 0.5 },
  digit: { color: '#0f172a', fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
