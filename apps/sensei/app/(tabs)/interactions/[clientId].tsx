import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { colors } from '@/constants/theme';
import ClientDetailView from '@/components/ClientDetailView';

export default function InteractionClientDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cliente',
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/clients/edit?id=${clientId}`)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Editar cliente"
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ClientDetailView clientId={clientId ?? ''} />
    </>
  );
}
