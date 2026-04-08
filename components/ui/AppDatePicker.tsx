/**
 * components/ui/AppDatePicker.tsx — Unified date/time picker (EP-045.2)
 *
 * Single component used everywhere in the app for date/time selection.
 *
 * - Web + mode="date":  shows WebDatePicker inside a modal popover
 * - Web + mode="time":  shows HTML <input type="time"> (same as before)
 * - Mobile (any mode):  delegates to DateTimeInput — no behavior change
 *
 * Props are a superset of DateTimeInputProps so it is a drop-in replacement.
 */

import React, { useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native'
import DateTimeInput from '@/components/DateTimeInput'
import WebDatePicker from '@/components/ui/WebDatePicker'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'
import dayjs from '@/lib/dayjs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppDatePickerProps {
  value: Date
  onChange: (date: Date) => void
  mode?: 'date' | 'time'
  label?: string
  minDate?: Date
  maxDate?: Date
  // Pass-through props for mobile (DateTimeInput compatibility)
  display?: 'calendar' | 'spinner' | 'clock' | 'inline'
  accentColor?: string
  locale?: string
  isAndroidModal?: boolean
  containerStyle?: ViewStyle
  onDismiss?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AppDatePicker({
  value,
  onChange,
  mode = 'date',
  label,
  minDate,
  maxDate,
  display,
  accentColor,
  locale,
  isAndroidModal,
  containerStyle,
  onDismiss,
}: AppDatePickerProps) {
  const [calendarVisible, setCalendarVisible] = useState(false)

  // ── Mobile: delegate entirely to DateTimeInput ──────────────────────────

  if (Platform.OS !== 'web') {
    return (
      <DateTimeInput
        value={value}
        onChange={onChange}
        mode={mode}
        display={display}
        accentColor={accentColor}
        locale={locale}
        isAndroidModal={isAndroidModal}
        containerStyle={containerStyle}
        onDismiss={onDismiss}
      />
    )
  }

  // ── Web + time mode: keep the HTML input approach ───────────────────────

  if (mode === 'time') {
    return (
      <DateTimeInput
        value={value}
        onChange={onChange}
        mode="time"
        containerStyle={containerStyle}
      />
    )
  }

  // ── Web + date mode: trigger button + WebDatePicker modal ───────────────

  const formattedDate = dayjs(value).format('DD/MM/YYYY')

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          containerStyle,
          pressed && styles.triggerPressed,
        ]}
        onPress={() => setCalendarVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${formattedDate}` : formattedDate}
      >
        <Text style={styles.triggerText}>{formattedDate}</Text>
        <Text style={styles.triggerIcon}>📅</Text>
      </Pressable>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setCalendarVisible(false)}
        />
        <View style={styles.popover}>
          <View style={styles.popoverHeader}>
            <Text style={styles.popoverTitle}>
              {label ?? 'Seleccionar fecha'}
            </Text>
            <Pressable
              onPress={() => setCalendarVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Cerrar calendario"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>
          <WebDatePicker
            value={value}
            onChange={(date) => {
              onChange(date)
              setCalendarVisible(false)
            }}
            minDate={minDate}
            maxDate={maxDate}
          />
        </View>
      </Modal>
    </>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  trigger: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  triggerPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  triggerText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  triggerIcon: {
    fontSize: fontSize.base,
  },

  // Modal
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  popover: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -160 }, { translateY: -200 }],
    width: 320,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  popoverTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  closeIcon: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
})
