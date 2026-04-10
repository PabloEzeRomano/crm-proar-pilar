/**
 * app/(tabs)/team/index.tsx — Team user list (admin/root only)
 *
 * Shows all users in the company. Tapping a row navigates to the
 * per-user drill-down screen at /(tabs)/team/[userId].
 *
 * Access-guarded: non-admin/root users see a lock screen.
 * All data flows through useUsersStore. No direct Supabase calls.
 */

import React, { useEffect } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme'
import { useAuthStore } from '@/stores/authStore'
import { useUsersStore } from '@/stores/usersStore'
import type { Profile, UserRole } from '@/types'

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Usuario',
  admin: 'Admin',
  root: 'Root',
}

const ROLE_COLOR: Record<UserRole, string> = {
  user: colors.textSecondary,
  admin: colors.primary,
  root: colors.error,
}

const ROLE_BG: Record<UserRole, string> = {
  user: colors.surface,
  admin: colors.primaryLight ?? '#EFF6FF',
  root: '#FEE2E2',
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <View style={[styles.roleBadge, { backgroundColor: ROLE_BG[role] }]}>
      <Text style={[styles.roleBadgeText, { color: ROLE_COLOR[role] }]}>
        {ROLE_LABEL[role]}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TeamIndexScreen() {
  const router = useRouter()
  const profile = useAuthStore((s) => s.profile)

  const users = useUsersStore((s) => s.users)
  const loading = useUsersStore((s) => s.loading)
  const error = useUsersStore((s) => s.error)
  const fetchUsers = useUsersStore((s) => s.fetchUsers)

  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root'

  useEffect(() => {
    if (!isAdminOrRoot) return
    fetchUsers()
  }, [])

  if (!isAdminOrRoot) {
    return (
      <View style={styles.guardContainer}>
        <MaterialCommunityIcons name="lock-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.guardText}>No tenés acceso a esta sección</Text>
      </View>
    )
  }

  function renderItem({ item }: { item: Profile }) {
    const initial = (item.full_name ?? item.id).charAt(0).toUpperCase()
    const emailDisplay = item.email_config?.sender ?? '—'

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => router.push(`/(tabs)/team/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Ver actividad de ${item.full_name ?? item.id}`}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.full_name ?? '—'}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {emailDisplay}
          </Text>
        </View>
        <RoleBadge role={item.role} />
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay usuarios en el equipo</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  separator: {
    height: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    ...shadows.subtle,
    minHeight: 64,
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight ?? '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold as '700',
    color: colors.primary,
  },
  rowContent: {
    flex: 1,
    gap: spacing[1],
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    minHeight: 28,
    justifyContent: 'center',
  },
  roleBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing[12],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  guardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.background,
  },
  guardText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
})
