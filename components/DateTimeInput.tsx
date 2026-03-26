/**
 * components/DateTimeInput.tsx — Date/time input (native + web)
 *
 * - Native (iOS/Android): @react-native-community/datetimepicker
 * - Web: HTML <input type="date"> / <input type="time"> via TextInput
 */

import React from 'react'
import { Platform, TextInput, ViewStyle } from 'react-native'
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import dayjs from '@/lib/dayjs'
import { colors, borderRadius, spacing, fontSize } from '@/constants/theme'

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
  onDismiss,
  containerStyle,
}: DateTimeInputProps) {
  // Web: use HTML input elements
  if (Platform.OS === 'web') {
    const webValue =
      mode === 'date'
        ? dayjs(value).format('YYYY-MM-DD')
        : dayjs(value).format('HH:mm')

    const webStyles = {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      fontSize: fontSize.base,
      color: colors.textPrimary,
      height: 44, // Match touch target minimum
    }

    return (
      <TextInput
        style={[webStyles, containerStyle]}
        defaultValue={webValue}
        {...({ type: mode, step: mode === 'time' ? '60' : undefined } as any)}
        onChange={(e: any) => {
          const raw = e.target.value
          if (!raw) return

          let parsed: Date
          if (mode === 'date') {
            parsed = dayjs(raw).toDate()
          } else {
            // Parse time as HH:mm → create a date with that time
            parsed = dayjs(`1970-01-01T${raw}`).toDate()
          }

          // Only update if valid date
          if (!isNaN(parsed.getTime())) {
            onChange(parsed)
          }
        }}
      />
    )
  }

  // Native: use DateTimePicker
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display={
        display || (mode === 'date' ? (Platform.OS === 'android' ? 'calendar' : 'inline') : 'spinner')
      }
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
