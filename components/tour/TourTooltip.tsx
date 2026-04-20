/**
 * components/tour/TourTooltip.tsx
 *
 * Pure presentational component for the tour tooltip card.
 * No chapter logic, no navigation — all callbacks are passed in from TourOverlay.
 * All touch targets are ≥ 48px.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';

interface TourTooltipProps {
  text: string;
  currentIndex: number; // 0-based
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
}

export default function TourTooltip({
  text,
  currentIndex,
  total,
  onNext,
  onPrev,
  onStop,
}: TourTooltipProps) {
  const isLast = currentIndex === total - 1;

  return (
    <View style={styles.container}>
      {/* Step text */}
      <Text style={styles.stepText}>{text}</Text>

      {/* Dot progress indicators */}
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Skip + Back + Next/Finish row */}
      <View style={styles.nav}>
        <Pressable
          style={styles.skipBtn}
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="Saltar tour"
        >
          <Text style={styles.skipText}>Saltar</Text>
        </Pressable>

        {currentIndex > 0 && (
          <Pressable
            style={styles.prevBtn}
            onPress={onPrev}
            accessibilityRole="button"
            accessibilityLabel="Paso anterior"
          >
            <Text style={styles.prevText}>← Ant.</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.nextBtn}
          onPress={isLast ? onStop : onNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Finalizar tour' : 'Siguiente paso'}
        >
          <Text style={styles.nextText}>
            {isLast ? 'Finalizar' : 'Siguiente →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  stepText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  dots: {
    flexDirection: 'row',
    gap: spacing[1],
    marginBottom: spacing[3],
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 14,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  skipBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    minHeight: 48,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  prevBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  prevText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
});
