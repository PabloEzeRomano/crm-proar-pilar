/**
 * app/auth/callback.tsx — Invite session setup (web only)
 *
 * EP-048b
 *
 * This screen is the landing point for web users who click "Usar versión web"
 * from the invite.html page after setting their password.
 *
 * The invite.html page redirects here with the session tokens in the URL fragment:
 *   https://[web-app-url]/auth/callback#access_token=...&refresh_token=...&type=invite
 *
 * This screen:
 *  1. Sets isInviteSetup=true immediately to prevent the auth guard from
 *     bouncing the user to /login before the session is established.
 *  2. Reads access_token + refresh_token from window.location.hash (web only).
 *  3. Calls supabase.auth.setSession() to establish the session.
 *  4. On success: clears isInviteSetup, auth guard routes to /(tabs)/agenda.
 *  5. On error: shows an error message with a link to login.
 *
 * On native, this route is never hit directly — the deep link
 * crm-proar://auth/callback#... is handled by useDeepLinkHandler in _layout.tsx.
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import { brand } from '@/constants/brand';

// ---------------------------------------------------------------------------
// Fragment parser (mirrors parseFragmentParams in _layout.tsx)
// ---------------------------------------------------------------------------

function parseFragment(hash: string): Record<string, string> {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  const params: Record<string, string> = {};
  fragment.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key) params[key] = value ? decodeURIComponent(value) : '';
  });
  return params;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ScreenState = 'loading' | 'error' | 'done';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const setInviteSetup = useAuthStore((s) => s.setInviteSetup);
  const [state, setState] = useState<ScreenState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Only relevant on web — native deep links are handled by useDeepLinkHandler.
    if (Platform.OS !== 'web') {
      setInviteSetup(false);
      return;
    }

    // Prevent the auth guard from redirecting while we establish the session.
    setInviteSetup(true);

    async function setupSession() {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const params = parseFragment(hash);

      const accessToken = params['access_token'];
      const refreshToken = params['refresh_token'];

      if (!accessToken || !refreshToken) {
        setInviteSetup(false);
        setErrorMessage(
          'No se encontraron los tokens de sesión en el enlace. Volvé al email de invitación y hacé clic en "Usar versión web".'
        );
        setState('error');
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setInviteSetup(false);
        setErrorMessage(`No se pudo establecer la sesión: ${error.message}`);
        setState('error');
        return;
      }

      // Session established — clear the invite setup flag.
      // onAuthStateChange fires SIGNED_IN, authStore sets userId,
      // and useAuthGuard (now unblocked) routes to /(tabs)/agenda.
      setState('done');
      setInviteSetup(false);
    }

    setupSession();
  }, []);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (state === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{brand.appName}</Text>
          </View>
          <View style={styles.body}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Iniciando sesión…</Text>
          </View>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Done (briefly shown before guard redirects to home)
  // ---------------------------------------------------------------------------

  if (state === 'done') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{brand.appName}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Sesión iniciada</Text>
            <Text style={styles.successSub}>Redirigiendo…</Text>
          </View>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{brand.appName}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>No se pudo iniciar sesión</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.replace('/(auth)/login')}
            accessibilityRole="button"
          >
            <Text style={styles.buttonLabel}>Ir al inicio de sesión</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[6],
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as '700',
    color: colors.textOnPrimary,
  },
  body: {
    padding: spacing[8],
    alignItems: 'center',
    gap: spacing[4],
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  successSub: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  errorIcon: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  buttonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
});
