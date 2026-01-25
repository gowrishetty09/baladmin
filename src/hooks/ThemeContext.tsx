import React, { createContext, useContext, useMemo, useState } from 'react';
import { DarkTheme as RNDarkTheme, DefaultTheme as RNDefaultTheme, Theme } from '@react-navigation/native';
import { Colors as DarkColors, LightColors } from '../constants/colors';

type ThemeContextValue = {
  isDark: boolean;
  colors: typeof DarkColors;
  navTheme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  const value = useMemo<ThemeContextValue>(() => {
    const baseNav = isDark ? RNDarkTheme : RNDefaultTheme;
    const palette = isDark ? DarkColors : LightColors;

    const navTheme: Theme = {
      ...baseNav,
      colors: {
        ...baseNav.colors,
        primary: '#22C55E',
        background: isDark ? '#1A1A1A' : palette.background,
        card: isDark ? '#1A1A1A' : palette.cardBackground,
        text: isDark ? '#F5F5F5' : palette.text,
        border: isDark ? 'rgba(245, 245, 245, 0.14)' : palette.border,
        notification: '#22C55E',
      },
    };

    return {
      isDark,
      colors: palette as typeof DarkColors,
      navTheme,
      toggleTheme: () => setIsDark((v) => !v),
    };
  }, [isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
