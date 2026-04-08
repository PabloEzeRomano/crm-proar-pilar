/**
 * components/ui/WebDatePicker.tsx — Calendar UI for web (EP-045.1)
 *
 * Rendered ONLY on web (Platform.OS === 'web').
 * Built entirely with React Native primitives — no external libraries.
 *
 * Layout:
 *   - Header: ‹  Month Year  ›
 *   - Row of day abbreviations (L M X J V S D — Monday-first)
 *   - Grid of day cells for the current month
 */

import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import dayjs from '@/lib/dayjs'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebDatePickerProps {
  value: Date
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Cell size — enough to show the number; touch handled via hitSlop
const CELL_SIZE = 40
const HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert JS day (0=Sun) → Monday-first index (0=Mon, 6=Sun) */
function toMondayFirst(jsDay: number): number {
  return (jsDay + 6) % 7
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WebDatePicker({ value, onChange, minDate, maxDate }: WebDatePickerProps) {
  const selected = dayjs(value)
  const today = dayjs()

  // The month currently shown in the calendar (may differ from selected)
  const [viewMonth, setViewMonth] = useState(() => selected.startOf('month'))

  const daysInMonth = viewMonth.daysInMonth()
  // Offset: how many empty cells before the 1st of the month (Monday-first)
  const firstDayOffset = toMondayFirst(viewMonth.day())

  // Build array: null for empty cells, day number for real cells
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Pad to complete the last week row
  while (cells.length % 7 !== 0) cells.push(null)

  function handlePrevMonth() {
    setViewMonth((m) => m.subtract(1, 'month'))
  }

  function handleNextMonth() {
    setViewMonth((m) => m.add(1, 'month'))
  }

  function handleDayPress(day: number) {
    const newDate = viewMonth.date(day).toDate()
    if (minDate && dayjs(newDate).isBefore(dayjs(minDate), 'day')) return
    if (maxDate && dayjs(newDate).isAfter(dayjs(maxDate), 'day')) return
    onChange(newDate)
  }

  function isDaySelected(day: number): boolean {
    return viewMonth.date(day).isSame(selected, 'day')
  }

  function isDayToday(day: number): boolean {
    return viewMonth.date(day).isSame(today, 'day')
  }

  function isDayDisabled(day: number): boolean {
    const d = viewMonth.date(day)
    if (minDate && d.isBefore(dayjs(minDate), 'day')) return true
    if (maxDate && d.isAfter(dayjs(maxDate), 'day')) return true
    return false
  }

  // Capitalize month name
  const monthLabel = viewMonth.format('MMMM YYYY')
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  return (
    <View style={styles.container}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
          onPress={handlePrevMonth}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          hitSlop={HIT_SLOP}
        >
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>

        <Text style={styles.monthLabel}>{capitalizedMonth}</Text>

        <Pressable
          style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
          onPress={handleNextMonth}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          hitSlop={HIT_SLOP}
        >
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* ── Day names row ───────────────────────────────────────────── */}
      <View style={styles.dayNamesRow}>
        {DAY_NAMES.map((name) => (
          <View key={name} style={styles.dayNameCell}>
            <Text style={styles.dayNameText}>{name}</Text>
          </View>
        ))}
      </View>

      {/* ── Day cells grid ──────────────────────────────────────────── */}
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />
          }

          const selected_ = isDaySelected(day)
          const today_ = isDayToday(day)
          const disabled = isDayDisabled(day)

          return (
            <Pressable
              key={`day-${day}`}
              style={({ pressed }) => [
                styles.dayCell,
                styles.dayCellPressable,
                today_ && !selected_ && styles.dayCellToday,
                selected_ && styles.dayCellSelected,
                pressed && !selected_ && styles.dayCellPressed,
                disabled && styles.dayCellDisabled,
              ]}
              onPress={() => !disabled && handleDayPress(day)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`${day} de ${viewMonth.format('MMMM')}`}
              accessibilityState={{ selected: selected_ }}
              hitSlop={HIT_SLOP}
            >
              <Text
                style={[
                  styles.dayText,
                  today_ && !selected_ && styles.dayTextToday,
                  selected_ && styles.dayTextSelected,
                  disabled && styles.dayTextDisabled,
                ]}
              >
                {day}
              </Text>
            </Pressable>
          )
        })}
      </View>

    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    paddingHorizontal: spacing[2],
  },
  navButton: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonPressed: {
    backgroundColor: colors.background,
  },
  navArrow: {
    fontSize: 24,
    fontWeight: fontWeight.bold as '700',
    color: colors.primary,
    lineHeight: 28,
  },
  monthLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },

  // Day names
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  dayNameText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
  },

  // Day cells
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%` as `${number}%`,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellPressable: {
    borderRadius: borderRadius.md,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  dayCellPressed: {
    backgroundColor: colors.primaryLight,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },

  // Day text
  dayText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular as '400',
    color: colors.textPrimary,
  },
  dayTextToday: {
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },
  dayTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold as '600',
  },
  dayTextDisabled: {
    color: colors.textDisabled,
  },
})
