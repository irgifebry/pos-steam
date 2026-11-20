import { useMemo } from 'react';
import { useTheme } from './ThemeContext';
import type { Palette } from './palettes';

/**
 * Bangun StyleSheet dari palette aktif. Style dibuat ulang hanya saat mode
 * tema berubah, jadi semua layar ikut berganti tanpa perlu reload aplikasi.
 */
export function useStyles<T>(build: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => build(colors), [colors]);
}
