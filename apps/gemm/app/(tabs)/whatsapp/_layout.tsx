import { Stack } from 'expo-router';
import { colors, fontSize } from '@/constants/theme';

export default function WhatsAppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'WhatsApp' }} />
      <Stack.Screen name="compose" options={{ title: 'Enviar por WhatsApp' }} />
    </Stack>
  );
}
