import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useWhatsAppStore } from '@/stores/whatsappStore';
import { colors, fontSize, fontWeight, spacing, borderRadius } from '@/constants/theme';

const WA_GREEN = '#25D366';

export default function WhatsAppConnectScreen() {
  const router = useRouter();
  const checkConnection = useWhatsAppStore((s) => s.checkConnection);
  const connection = useWhatsAppStore((s) => s.connection);
  const checking = useWhatsAppStore((s) => s.checkingConnection);
  const [polling, setPolling] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const result = await checkConnection();
    if (result.state === 'open') {
      setPolling(false);
      router.back();
    }
  }, [checkConnection, router]);

  useFocusEffect(
    useCallback(() => {
      poll();
      intervalRef.current = setInterval(poll, 5000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [poll])
  );

  const qrBase64 = connection?.qr?.base64;
  const state = connection?.state ?? 'unknown';

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="whatsapp" size={48} color={WA_GREEN} />
        <Text style={styles.title}>Conectar WhatsApp</Text>
        <Text style={styles.subtitle}>
          {state === 'close'
            ? 'La sesión está desconectada. Escaneá el QR para reconectar.'
            : state === 'connecting'
            ? 'Conectando... Escaneá el QR si aparece.'
            : state === 'not_configured'
            ? 'WhatsApp no configurado para esta empresa.'
            : 'Verificando estado de conexión...'}
        </Text>

        {checking && !qrBase64 && (
          <ActivityIndicator color={WA_GREEN} size="large" style={{ marginTop: spacing[4] }} />
        )}

        {qrBase64 && (
          <View style={styles.qrContainer}>
            <Image
              source={{ uri: qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}` }}
              style={styles.qrImage}
              resizeMode="contain"
            />
            <Text style={styles.qrHint}>
              Abrí WhatsApp → Dispositivos vinculados → Vincular dispositivo
            </Text>
          </View>
        )}

        {!checking && !qrBase64 && state !== 'open' && state !== 'not_configured' && (
          <Pressable style={styles.retryBtn} onPress={poll}>
            <MaterialCommunityIcons name="refresh" size={18} color={WA_GREEN} />
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </Pressable>
        )}

        {polling && (
          <View style={styles.pollingRow}>
            <ActivityIndicator color={colors.textSecondary} size="small" />
            <Text style={styles.pollingText}>Verificando cada 5 segundos...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    gap: spacing[3],
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  qrImage: {
    width: 260,
    height: 260,
    borderRadius: borderRadius.md,
  },
  qrHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: WA_GREEN,
    marginTop: spacing[2],
  },
  retryBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: WA_GREEN,
  },
  pollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  pollingText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
