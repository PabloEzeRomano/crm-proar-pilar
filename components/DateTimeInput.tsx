/**
 * components/DateTimeInput.tsx — Native date/time input
 *
 * Uses @react-native-community/datetimepicker for iOS and Android.
 */

import React from 'react'
import { Platform, ViewStyle } from 'react-native'
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'

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
}: DateTimeInputProps) {
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
