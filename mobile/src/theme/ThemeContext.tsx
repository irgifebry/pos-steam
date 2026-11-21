import { createContext, useContext } from 'react';
import { palette, type Palette } from './palettes';

type ThemeValue = {
  colors: Palette;
};

const ThemeContext = createContext<ThemeValue>({ colors: palette });

// Aplikasi memakai satu tema terang. Provider tetap ada supaya komponen
// memakai satu sumber token warna yang sama.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={{ colors: palette }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
