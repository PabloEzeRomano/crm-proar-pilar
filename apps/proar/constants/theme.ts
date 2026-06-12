/**
 * theme.ts — Design tokens
 *
 * Single source of truth for all visual values.
 * No hardcoded brand colors live here — they are imported from brand.ts.
 * Components must consume values from this file; never use magic numbers.
 */

import { brand } from './brand';

// ---------------------------------------------------------------------------
// Touch target
// ---------------------------------------------------------------------------

/** Minimum interactive touch target size (px) — WCAG 2.5.5 / Apple HIG */
export const MIN_TOUCH_TARGET = 48;

// ---------------------------------------------------------------------------
// Responsive breakpoints
// ---------------------------------------------------------------------------

/** Breakpoint for wide screens (web only) */
export const BREAKPOINT_WIDE = 768;

/** Max container width for web (mobile design on desktop) */
export const MAX_CONTAINER_WIDTH = 480;

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
  // Brand — sourced from brand.ts so this file stays white-label safe
  primary: brand.primaryColor,
  primaryDark: brand.primaryColorDark,
  primaryLight: brand.primaryColorLight,

  // Backgrounds
  background: '#F7F8FA', // page background
  surface: '#FFFFFF', // card / sheet surface

  // Borders
  border: '#E2E8F0',
  borderStrong: '#9CA3AF',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textDisabled: '#CBD5E1',
  textOnPrimary: '#FFFFFF', // text placed on top of primary color

  // Semantic
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',

  // Visit status
  statusPending: '#F59E0B', // same hue as warning
  statusPendingLight: '#FEF3C7',
  statusCompleted: '#16A34A', // same hue as success
  statusCompletedLight: '#DCFCE7',
  statusCanceled: '#94A3B8',
  statusCanceledLight: '#F1F5F9',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ---------------------------------------------------------------------------
// Visit type colors
// ---------------------------------------------------------------------------

export const visitTypeColors = {
  customer_service: brand.primaryColor,
  customer_serviceLight: brand.primaryColorLight,
  sales_orders: '#0D9488',
  sales_ordersLight: '#CCFBF1',
  new_projects: '#2563EB',
  new_projectsLight: '#DBEAFE',
  payments: '#D97706',
  paymentsLight: '#FEF3C7',
  technical_service: '#9333EA',
  technical_serviceLight: '#F3E8FF',
  other: '#64748B',
  otherLight: '#F1F5F9',
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

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
  tight: 1.25, // headings
  normal: 1.5, // body copy
  relaxed: 1.75, // readable small text
} as const;

export const typography = {
  fontSize,
  fontWeight,
  fontFamily,
  lineHeight,
} as const;

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

/**
 * 4-point base grid.
 * Key = token number, value = pixels.
 */
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
  20: 80
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xl2: 18,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

/**
 * Shadow tokens expressed as React Native shadow props so they can be spread
 * directly onto a StyleSheet object.
 */
export const shadows = {
  /** Subtle elevation for cards and surfaces */
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2, // Android
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// ---------------------------------------------------------------------------
// Convenience re-export
// ---------------------------------------------------------------------------

export const theme = {
  colors,
  visitTypeColors,
  typography,
  fontSize,
  fontWeight,
  fontFamily,
  lineHeight,
  spacing,
  borderRadius,
  shadows,
  MIN_TOUCH_TARGET,
} as const;
