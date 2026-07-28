import { useCallback, useRef } from 'react';
import { Stack } from 'expo-router';
import { useFocusEffect, useRouter } from 'expo-router';

import { useWhatsAppStore } from '@/stores/whatsappStore';
import { colors, fontSize } from '@/constants/theme';

export default function WhatsAppLayout() {
  const router = useRouter();
  const checkConnection = useWhatsAppStore((s) => s.checkConnection);
  const checkedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (checkedOnce.current) return;
      checkedOnce.current = true;
      checkConnection().then((result) => {
        if (result.state !== 'open') {
          router.push('/(tabs)/whatsapp/connect' as any);
        }
      });
      return () => { checkedOnce.current = false; };
    }, [checkConnection, router])
  );

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
      <Stack.Screen name="index" options={{ title: 'WhatsApp enviados' }} />
      <Stack.Screen name="compose" options={{ title: 'Enviar por WhatsApp' }} />
      <Stack.Screen name="connect" options={{ title: 'Conectar WhatsApp' }} />
    </Stack>
  );
}
