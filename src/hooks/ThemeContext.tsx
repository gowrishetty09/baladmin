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
        primary: isDark ? '#bd9250' : baseNav.colors.primary,
        background: isDark ? '#151e2d' : palette.background,
        card: isDark ? '#151e2d' : palette.cardBackground,
        text: isDark ? '#f6f2ea' : palette.text,
        border: isDark ? 'rgba(246, 242, 234, 0.14)' : palette.border,
        notification: isDark ? '#bd9250' : baseNav.colors.notification,
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
