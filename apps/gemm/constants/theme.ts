import type { Theme } from '@crm/core';
import { brand } from './brand';

export const MIN_TOUCH_TARGET = 48;
export const BREAKPOINT_WIDE = 768;
export const MAX_CONTAINER_WIDTH = 520;

export const colors = {
  primary: brand.primaryColor,
  primaryDark: brand.primaryColorDark,
  primaryLight: brand.primaryColorLight,

  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#9CA3AF',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textDisabled: '#CBD5E1',
  textOnPrimary: '#FFFFFF',

  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Stage colors
export const stageColors = {
  lead: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  contacted: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  proposal: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  negotiation: { bg: '#F3E8FF', text: '#7C3AED', border: '#DDD6FE' },
  won: { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
  lost: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
} as const;

// Product colors
export const productColors = {
  crm: { bg: '#EFF6FF', text: '#1D4ED8' },
  miturno: { bg: '#FEF3C7', text: '#D97706' },
  qrtify: { bg: '#F3E8FF', text: '#7C3AED' },
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const shadows = {
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

export const coreTheme: Theme = {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
};
