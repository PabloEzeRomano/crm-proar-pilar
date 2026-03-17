import * as Notifications from 'expo-notifications'
import { SchedulableTriggerInputTypes } from 'expo-notifications'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import dayjs from './dayjs'
import type { Visit } from '../types'
import type { DateTriggerInput } from 'expo-notifications'

/**
 * Schedule a reminder notification for a visit.
 *
 * The notification fires at: scheduled_at + gapMinutes - 10 minutes
 * This gives the salesperson ~10 minutes advance notice before the gap time.
 *
 * Only supported on mobile (iOS/Android). Web returns null.
 * If the computed fire time is in the past, returns null (no scheduling).
 * If visit reminders are disabled in settings, returns null (no scheduling).
 *
 * @param visit - The visit to schedule a reminder for
 * @param clientName - Client name for the notification title
 * @param gapMinutes - The "gap minutes" (usually 30, 45, 60). Fire time = scheduled_at + gapMinutes - 10
 * @returns The notification ID if scheduled, null if in the past, on web platform, or if notifications are disabled
 */
export async function scheduleVisitReminder(
  visit: Visit,
  clientName: string,
  gapMinutes: number,
): Promise<string | null> {
  // No notification support on web
  if (Platform.OS === 'web') {
    return null
  }

  // Check if notifications are enabled in settings (default: true)
  try {
    const notificationsEnabled = await AsyncStorage.getItem('notifications-enabled')
    if (notificationsEnabled === 'false') {
      return null
    }
  } catch (error) {
    console.error('Failed to check notifications setting:', error)
    // Default to allowing notifications if we can't read the setting
  }

  // Compute fire time: scheduled_at + gap - 10 minutes
  const fireTime = dayjs(visit.scheduled_at).add(gapMinutes - 10, 'minutes')

  // If fire time is in the past, don't schedule
  if (fireTime.isBefore(dayjs())) {
    return null
  }

  try {
    const trigger: DateTriggerInput = {
      type: SchedulableTriggerInputTypes.DATE,
      date: fireTime.toDate(),
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Visita con ${clientName}`,
        body: 'Quedan ~10 min. ¿Agendás la próxima visita?',
        data: { visitId: visit.id },
      },
      trigger,
    })

    return notificationId
  } catch (error) {
    console.error('Failed to schedule visit reminder:', error)
    return null
  }
}

/**
 * Cancel a scheduled reminder notification.
 *
 * Only supported on mobile (iOS/Android). Web is a no-op.
 *
 * @param notificationId - The notification ID to cancel
 */
export async function cancelVisitReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
  } catch (error) {
    console.error('Failed to cancel visit reminder:', error)
  }
}
