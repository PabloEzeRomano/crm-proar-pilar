/**
 * theme.tsx — Shared theme context for @crm/core UI components.
 *
 * Design tokens live in each app (constants/theme.ts) because brand colors
 * differ per app. Shared components must not import an app's theme directly,
 * so each app provides its tokens through <CoreThemeProvider>, and components
 * read them via useTheme().
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { TextStyle } from 'react-native';

export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    background: string;
    surface: string;
    border: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    textOnPrimary: string;
    success: string;
    error: string;
    white: string;
  };
  spacing: Record<number, number>;
  fontSize: { xs: number; sm: number; base: number; lg: number; xl: number };
  fontWeight: {
    regular: TextStyle['fontWeight'];
    medium: TextStyle['fontWeight'];
    semibold: TextStyle['fontWeight'];
    bold: TextStyle['fontWeight'];
  };
  borderRadius: { sm: number; md: number; lg: number; xl: number; full: number };
}

const ThemeContext = createContext<Theme | null>(null);

export function CoreThemeProvider({
  theme,
  children,
}: {
  theme: Theme;
  children: ReactNode;
}) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a CoreThemeProvider');
  }
  return theme;
}
