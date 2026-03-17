/**
 * components/DateTimeInput.tsx — Cross-platform date/time input
 *
 * Provides platform-specific implementations:
 * - Native (iOS/Android): @react-native-community/datetimepicker
 * - Web: HTML <input type="date"> and <input type="time">
 */

import React, { useMemo } from 'react'
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native'
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'

import dayjs from '@/lib/dayjs'
import {
  borderRadius,
  colors,
  fontSize,
  spacing,
} from '@/constants/theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateTimeInputProps {
  /** The current date value */
  value: Date
  /** Called when date changes */
  onChange: (date: Date) => void
  /** "date" or "time" */
  mode: 'date' | 'time'
  /** For date mode: 'calendar' (Android) or 'inline' (iOS). For time mode: 'spinner' or 'clock' */
  display?: 'calendar' | 'spinner' | 'clock' | 'inline'
  /** Accent color for native picker */
  accentColor?: string
  /** Locale code */
  locale?: string
  /** Whether this is an Android modal picker (affects UI on native) */
  isAndroidModal?: boolean
  /** Optional style for container */
  containerStyle?: ViewStyle
  /** Called when Android modal closes (only for Android) */
  onDismiss?: () => void
}

// ---------------------------------------------------------------------------
// Web input component (for web platform only)
// ---------------------------------------------------------------------------

function WebDateTimeInput({
  mode,
  value,
  onChange,
}: {
  mode: 'date' | 'time'
  value: Date
  onChange: (date: Date) => void
}) {
  const dateString = useMemo(
    () => dayjs(value).format('YYYY-MM-DD'),
    [value],
  )

  const timeString = useMemo(
    () => dayjs(value).format('HH:mm'),
    [value],
  )

  function handleWebDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dateValue = e.target.value
    if (!dateValue) return
    const newDate = dayjs(dateValue)
      .hour(dayjs(value).hour())
      .minute(dayjs(value).minute())
      .second(0)
      .toDate()
    onChange(newDate)
  }

  function handleWebTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const timeValue = e.target.value
    if (!timeValue) return
    const [hours, minutes] = timeValue.split(':').map(Number)
    const newDate = dayjs(value)
      .hour(hours)
      .minute(minutes)
      .second(0)
      .toDate()
    onChange(newDate)
  }

  const inputStyle: React.CSSProperties = {
    height: 48,
    paddingLeft: spacing[3],
    paddingRight: spacing[3],
    fontSize: fontSize.base,
    borderWidth: 1.5,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    boxSizing: 'border-box',
  }

  if (mode === 'date') {
    return (
      <input
        type="date"
        value={dateString}
        onChange={handleWebDateChange}
        style={inputStyle}
      />
    )
  }

  return (
    <input
      type="time"
      value={timeString}
      onChange={handleWebTimeChange}
      style={inputStyle}
    />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DateTimeInput({
  value,
  onChange,
  mode,
  display,
  accentColor,
  locale = 'es',
  isAndroidModal = false,
  containerStyle,
  onDismiss,
}: DateTimeInputProps) {
  // Native implementation
  if (Platform.OS !== 'web') {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display={display || (mode === 'date' ? (Platform.OS === 'android' ? 'calendar' : 'inline') : 'spinner')}
        onChange={(event: DateTimePickerEvent, date?: Date) => {
          if (date) {
            onChange(date)
          }
          if (onDismiss && isAndroidModal) {
            onDismiss()
          }
        }}
        locale={locale}
        accentColor={accentColor}
      />
    )
  }

  // Web implementation
  return (
    <View style={[styles.webContainer, containerStyle]}>
      <WebDateTimeInput mode={mode} value={value} onChange={onChange} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  webContainer: {
    gap: spacing[2],
  },
})
