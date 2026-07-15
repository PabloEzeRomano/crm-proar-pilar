import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '@/constants/theme';

export default function PipelineLayout() {
  const router = useRouter();

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
      <Stack.Screen
        name="index"
        options={{
          title: 'Pipeline',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(tabs)/settings' as any)}
              style={{ paddingHorizontal: spacing[3], paddingVertical: spacing[2] }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Configuración"
            >
              <MaterialCommunityIcons name="cog-outline" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
