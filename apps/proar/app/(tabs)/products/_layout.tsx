import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { colors, fontSize, spacing } from '@/constants/theme';

export default function ProductsStackLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleAlign: 'center' as const,
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontSize: fontSize.lg,
          fontWeight: '600' as const,
          color: colors.textPrimary,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Productos',
          headerLeft: () => (
            <Pressable
              onPress={() => router.push('/(tabs)/team')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ paddingHorizontal: spacing[3], minHeight: 48, justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="new" options={{ title: 'Nuevo producto' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle de producto' }} />
    </Stack>
  );
}
