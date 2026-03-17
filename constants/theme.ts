/**
 * theme.ts — Design tokens
 *
 * Single source of truth for all visual values.
 * No hardcoded brand colors live here — they are imported from brand.ts.
 * Components must consume values from this file; never use magic numbers.
 */

import { brand } from './brand'

// ---------------------------------------------------------------------------
// Touch target
// ---------------------------------------------------------------------------

/** Minimum interactive touch target size (px) — WCAG 2.5.5 / Apple HIG */
export const MIN_TOUCH_TARGET = 48

// ---------------------------------------------------------------------------
// Responsive breakpoints
// ---------------------------------------------------------------------------

/** Breakpoint for wide screens (web only) */
export const BREAKPOINT_WIDE = 768

/** Max container width for web (mobile design on desktop) */
export const MAX_CONTAINER_WIDTH = 480

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
  // Brand — sourced from brand.ts so this file stays white-label safe
  primary: brand.primaryColor,
  primaryDark: brand.primaryColorDark,
  primaryLight: brand.primaryColorLight,

  // Backgrounds
  background: '#F9FAFB',   // page background
  surface: '#FFFFFF',      // card / sheet surface

  // Borders
  border: '#E5E7EB',
  borderStrong: '#9CA3AF',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textDisabled: '#D1D5DB',
  textOnPrimary: '#FFFFFF',  // text placed on top of primary color

  // Semantic
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',

  // Visit status
  statusPending: '#D97706',      // same hue as warning
  statusPendingLight: '#FEF3C7',
  statusCompleted: '#16A34A',    // same hue as success
  statusCompletedLight: '#DCFCE7',
  statusCanceled: '#6B7280',     // neutral gray
  statusCanceledLight: '#F3F4F6',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const

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
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const lineHeight = {
  tight: 1.25,   // headings
  normal: 1.5,   // body copy
  relaxed: 1.75, // readable small text
} as const

export const typography = {
  fontSize,
  fontWeight,
  lineHeight,
} as const

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
} as const

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const

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
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,           // Android
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const

// ---------------------------------------------------------------------------
// Convenience re-export
// ---------------------------------------------------------------------------

export const theme = {
  colors,
  typography,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  borderRadius,
  shadows,
  MIN_TOUCH_TARGET,
} as const
