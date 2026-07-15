import { Stack } from 'expo-router';
import { colors, fontSize } from '@/constants/theme';

export default function ImportLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontSize: fontSize.lg,
          fontWeight: '600',
          color: colors.textPrimary,
        },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Importar prospectos' }} />
    </Stack>
  );
}
