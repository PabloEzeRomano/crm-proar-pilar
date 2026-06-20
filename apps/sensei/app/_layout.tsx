import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as Linking from 'expo-linking';

import { colors, coreTheme } from '@/constants/theme';
import {
  CoreThemeProvider,
  supabase,
  useAuthStore,
  useLookupsStore,
} from '@crm/core';

function useDeepLinkHandler(): void {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && window.location.pathname !== '/auth/callback') {
        handleWebFragment(hash);
      }
      return;
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  function parseFragmentParams(url: string): Record<string, string> {
    const fragmentIndex = url.indexOf('#');
    if (fragmentIndex === -1) return {};
    const fragment = url.substring(fragmentIndex + 1);
    const params: Record<string, string> = {};
    fragment.split('&').forEach((param) => {
      const [key, value] = param.split('=');
      if (key) params[key] = value ? decodeURIComponent(value) : '';
    });
    return params;
  }

  async function handleWebFragment(hash: string) {
    const params = parseFragmentParams(hash);
    if (params.error) {
      useAuthStore
        .getState()
        .setError(params.error_description || params.error);
      return;
    }
    if (params.access_token && params.refresh_token) {
      useAuthStore.getState().setInviteSetup(true);
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      useAuthStore
        .getState()
        .completeInviteFlow(!error && params.type === 'invite');
      if (error) useAuthStore.getState().setError(error.message);
    }
  }

  async function handleUrl(url: string) {
    const parsed = Linking.parse(url);
    if (parsed.hostname !== 'auth') return;

    const fragmentIndex = url.indexOf('#');
    let params: Record<string, string> = {};
    if (fragmentIndex !== -1) {
      params = parseFragmentParams(url);
    }
    if (Object.keys(params).length === 0 && parsed.queryParams) {
      params = parsed.queryParams as Record<string, string>;
    }

    if (params.error) {
      const errDesc = params.error_description || params.error;
      useAuthStore.getState().setError(errDesc);
      return;
    }

    if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) useAuthStore.getState().setError(error.message);
      else if (params.type === 'invite')
        useAuthStore.getState().setInviteUser(true);
      return;
    }

    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) useAuthStore.getState().setError(error.message);
    }
  }
}

function useAuthGuard(): void {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const loading = useAuthStore((s) => s.loading);
  const isPasswordRecovery = useAuthStore((s) => s.isPasswordRecovery);
  const isInviteSetup = useAuthStore((s) => s.isInviteSetup);
  const isInviteUser = useAuthStore((s) => s.isInviteUser);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (isPasswordRecovery) {
      router.replace('/(auth)/reset-password');
      return;
    }
    if (isInviteSetup) return;
    if (isInviteUser) {
      router.replace('/(auth)/set-invite-password');
      return;
    }
    if (!userId) router.replace('/(auth)/login');
    else router.replace('/(tabs)/dashboard');
  }, [userId, loading, isPasswordRecovery, isInviteSetup, isInviteUser]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const initialize = useAuthStore((s) => s.initialize);
  const loading = useAuthStore((s) => s.loading);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const fetchLookups = useLookupsStore((s) => s.fetchLookups);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchLookups();
  }, [userId]);

  useDeepLinkHandler();
  useAuthGuard();

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <CoreThemeProvider theme={coreTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </CoreThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
