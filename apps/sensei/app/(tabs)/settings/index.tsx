import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChangePasswordSheet } from '@crm/core';

import { brand } from '@/constants/brand';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import { showConfirm } from '@/lib/dialog';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'root';

  const [showPwSheet, setShowPwSheet] = useState(false);

  async function handleSignOut() {
    const ok = await showConfirm({
      title: 'Cerrar sesión',
      message: '¿Estás seguro que querés cerrar sesión?',
      confirmText: 'Cerrar sesión',
      destructive: true,
    });
    if (ok) signOut();
  }

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.sectionHeader}>CUENTA</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Nombre</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {profile?.full_name ?? '—'}
            </Text>
          </View>
          <View style={[styles.row, styles.rowBorderTop]}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
          <Pressable
            style={[styles.row, styles.rowBorderTop]}
            onPress={() => setShowPwSheet(true)}
            accessibilityRole="button"
          >
            <Text style={styles.rowLabel}>Cambiar contraseña</Text>
            <Text style={styles.rowValue}>→</Text>
          </Pressable>
        </View>

        {isAdmin && Platform.OS === 'web' && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: spacing[6] }]}>
              ADMINISTRACIÓN
            </Text>
            <View style={styles.section}>
              <Pressable
                style={styles.row}
                onPress={() => router.push('/(tabs)/settings/import')}
                accessibilityRole="button"
              >
                <Text style={styles.rowLabel}>Importar datos</Text>
                <Text style={styles.rowValue}>Excel →</Text>
              </Pressable>
            </View>
          </>
        )}

        <View style={styles.signOutWrapper}>
          <Pressable
            style={styles.signOutButton}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Text style={styles.signOutLabel}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>{brand.appName}</Text>
          <Text style={styles.appInfoText}>
            Versión {Constants.expoConfig?.version || 'desconocida'}
          </Text>
        </View>
      </View>

      <ChangePasswordSheet
        visible={showPwSheet}
        onClose={() => setShowPwSheet(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing[4],
  },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[1],
  },
  section: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  rowValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing[3],
  },
  signOutWrapper: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[6],
  },
  signOutButton: {
    height: 52,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing[8],
    gap: spacing[1],
  },
  appInfoText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
  },
});
