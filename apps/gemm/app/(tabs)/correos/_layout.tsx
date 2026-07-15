import { Stack } from 'expo-router';
import { colors, fontSize } from '@/constants/theme';

export default function CorreosLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Correos enviados' }} />
      <Stack.Screen name="compose" options={{ title: 'Nuevo correo' }} />
      <Stack.Screen name="templates/index" options={{ title: 'Plantillas' }} />
      <Stack.Screen name="templates/form" options={{ title: 'Plantilla' }} />
    </Stack>
  );
}
