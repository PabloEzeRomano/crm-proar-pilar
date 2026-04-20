/**
 * app/(auth)/_layout.tsx — Authentication group layout
 *
 * Simple Stack with no header. All auth screens (login, etc.) are rendered
 * here without any navigation chrome so they can occupy the full screen.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
