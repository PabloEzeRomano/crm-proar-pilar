import { brand } from './brand';

export const MIN_TOUCH_TARGET = 48;

export const BREAKPOINT_WIDE = 768;
export const MAX_CONTAINER_WIDTH = 960;

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

  statusPending: '#F59E0B',
  statusPendingLight: '#FEF3C7',
  statusCompleted: '#16A34A',
  statusCompletedLight: '#DCFCE7',
  statusCanceled: '#94A3B8',
  statusCanceledLight: '#F1F5F9',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const gestionResultColors = {
  contacted: '#0F766E',
  contactedLight: '#F0FDFA',
  not_contacted: '#94A3B8',
  not_contactedLight: '#F1F5F9',
  interested: '#16A34A',
  interestedLight: '#DCFCE7',
  not_interested: '#DC2626',
  not_interestedLight: '#FEE2E2',
  follow_up: '#F59E0B',
  follow_upLight: '#FEF3C7',
  sale: '#7C3AED',
  saleLight: '#EDE9FE',
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

export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
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
  20: 80,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xl2: 18,
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
