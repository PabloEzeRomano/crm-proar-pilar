import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import { CoreThemeProvider } from '@crm/core';

import { colors, coreTheme } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProspectsStore } from '@/stores/prospectsStore';

function useAuthGuard(): void {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      router.replace('/(auth)/login');
    } else if (pathname === '/' || pathname === '/login') {
      router.replace('/(tabs)/pipeline');
    }
  }, [userId, loading, pathname]);
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
  const fetchProspects = useProspectsStore((s) => s.fetchProspects);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchProspects();
  }, [userId]);

  useAuthGuard();

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loading}>
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
