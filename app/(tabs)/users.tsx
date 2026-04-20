/**
 * app/(tabs)/users.tsx — User management screen (admin / root only)
 *
 * EP-048, EP-052
 *
 * Features:
 *  - Lists all users in the company with name, email and role badge
 *  - Pending invites shown with email + amber "Pendiente" badge
 *  - Shows seat usage counter: X / MAX
 *  - "Invitar usuario" button (disabled when seat limit is reached)
 *  - Invite modal: email + role picker (user | admin), Zod-validated
 *  - Deactivate button (trash icon) on active non-admin/non-root rows
 *  - Back button in header via useLayoutEffect
 *  - Refreshes user list after a successful invite or deactivation
 *  - Access-guarded: non-admin/root users see an "Sin acceso" screen
 *
 * All data flows through useUsersStore. No direct Supabase calls.
 * All visual values reference constants/theme.ts tokens.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { z } from 'zod';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useUsersStore } from '@/stores/usersStore';
import type { UserListItem, UserRole } from '@/types';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
});

type InviteErrors = { email?: string };

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Usuario',
  admin: 'Admin',
  root: 'Root',
};

const ROLE_COLOR: Record<UserRole, string> = {
  user: colors.textSecondary,
  admin: colors.primary,
  root: colors.error,
};

const ROLE_BG: Record<UserRole, string> = {
  user: colors.surface,
  admin: colors.primaryLight ?? '#EFF6FF',
  root: '#FEE2E2',
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <View style={[styles.roleBadge, { backgroundColor: ROLE_BG[role] }]}>
      <Text style={[styles.roleBadgeText, { color: ROLE_COLOR[role] }]}>
        {ROLE_LABEL[role]}
      </Text>
    </View>
  );
}

function PendingBadge() {
  return (
    <View style={[styles.roleBadge, { backgroundColor: colors.warningLight }]}>
      <Text style={[styles.roleBadgeText, { color: colors.warning }]}>
        Pendiente
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// User row
// ---------------------------------------------------------------------------

interface UserRowProps {
  user: UserListItem;
  onDeactivate: (user: UserListItem) => void;
}

function UserRow({ user, onDeactivate }: UserRowProps) {
  const isPending = user.status === 'pending';
  const displayName = isPending ? user.email : (user.full_name ?? '—');
  const initial = displayName.charAt(0).toUpperCase();

  const canDeactivate =
    user.status === 'active' && user.role !== 'admin' && user.role !== 'root';

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowName} numberOfLines={1}>
          {displayName}
        </Text>
        {!isPending && (
          <Text style={styles.rowSub} numberOfLines={1}>
            {user.email}
          </Text>
        )}
      </View>

      {isPending ? (
        <PendingBadge />
      ) : user.role ? (
        <RoleBadge role={user.role} />
      ) : null}

      {canDeactivate && (
        <Pressable
          onPress={() => onDeactivate(user)}
          style={styles.deactivateButton}
          accessibilityRole="button"
          accessibilityLabel={`Dar de baja a ${user.full_name ?? user.email}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={20}
            color={colors.error}
          />
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UsersScreen() {
  const profile = useAuthStore((s) => s.profile);
  const navigation = useNavigation();
  const router = useRouter();

  const users = useUsersStore((s) => s.users);
  const companyConfig = useUsersStore((s) => s.companyConfig);
  const loading = useUsersStore((s) => s.loading);
  const error = useUsersStore((s) => s.error);
  const inviteLoading = useUsersStore((s) => s.inviteLoading);
  const inviteError = useUsersStore((s) => s.inviteError);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);
  const fetchCompanyConfig = useUsersStore((s) => s.fetchCompanyConfig);
  const inviteUser = useUsersStore((s) => s.inviteUser);
  const deactivateUser = useUsersStore((s) => s.deactivateUser);
  const clearInviteError = useUsersStore((s) => s.clearInviteError);

  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');
  const [fieldErrors, setFieldErrors] = useState<InviteErrors>({});
  const [emailFocused, setEmailFocused] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root';
  const isRoot = profile?.role === 'root';

  const maxUsers = companyConfig?.max_users ?? null;
  const currentCount = users.filter((u) => u.status !== 'banned').length;
  const atLimit = maxUsers !== null && currentCount >= maxUsers && !isRoot;

  // ── Back button ───────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.primary}
          />
        </Pressable>
      ),
    });
  }, [navigation, router]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAdminOrRoot) return;
    fetchUsers();
    fetchCompanyConfig();
  }, []);

  // ── Deactivate handler ────────────────────────────────────────────────────

  const handleDeactivate = useCallback(
    (user: UserListItem) => {
      Alert.alert(
        'Dar de baja usuario',
        '¿Dar de baja a este usuario? Se archivarán sus clientes y gestiones.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Dar de baja',
            style: 'destructive',
            onPress: async () => {
              await deactivateUser(user.id);
              fetchUsers();
            },
          },
        ]
      );
    },
    [deactivateUser, fetchUsers]
  );

  // ── Invite handlers ───────────────────────────────────────────────────────

  function openModal() {
    setEmail('');
    setSelectedRole('user');
    setFieldErrors({});
    clearInviteError();
    setSuccessMessage(null);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
  }

  const handleSubmit = useCallback(async () => {
    const result = inviteSchema.safeParse({
      email: email.trim().toLowerCase(),
    });
    if (!result.success) {
      const errs: InviteErrors = {};
      for (const issue of result.error.issues) {
        errs.email = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    const { error: err } = await inviteUser({
      email: result.data.email,
      role: selectedRole,
    });

    if (!err) {
      setSuccessMessage(`Invitación enviada a ${result.data.email}`);
      fetchUsers();
      setTimeout(() => {
        setModalVisible(false);
        setSuccessMessage(null);
      }, 1500);
    }
  }, [email, selectedRole, inviteUser, fetchUsers]);

  // ── Access guard ──────────────────────────────────────────────────────────

  if (!isAdminOrRoot) {
    return (
      <View style={styles.guardContainer}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={48}
          color={colors.textDisabled}
        />
        <Text style={styles.guardText}>No tenés acceso a esta sección</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const emailBorderColor = fieldErrors.email
    ? colors.error
    : emailFocused
      ? colors.primary
      : colors.border;

  return (
    <View style={styles.container}>
      {/* ── Seat counter ──────────────────────────────────────────────────── */}
      <View style={styles.counterRow}>
        <View style={styles.counterBlock}>
          <Text style={styles.counterNumber}>
            {currentCount}
            {maxUsers !== null ? ` / ${maxUsers}` : ''}
          </Text>
          <Text style={styles.counterLabel}>
            {maxUsers !== null
              ? `${currentCount === 1 ? 'usuario' : 'usuarios'} · ${maxUsers - currentCount} disponible${maxUsers - currentCount !== 1 ? 's' : ''}`
              : 'usuarios'}
          </Text>
        </View>

        {/* Invite button */}
        <Pressable
          style={[styles.inviteButton, atLimit && styles.inviteButtonDisabled]}
          onPress={openModal}
          disabled={atLimit}
          accessibilityRole="button"
          accessibilityLabel="Invitar usuario"
          accessibilityState={{ disabled: atLimit }}
        >
          <MaterialCommunityIcons
            name="account-plus-outline"
            size={20}
            color={atLimit ? colors.textDisabled : colors.textOnPrimary}
          />
          <Text
            style={[
              styles.inviteButtonLabel,
              atLimit && styles.inviteButtonLabelDisabled,
            ]}
          >
            Invitar
          </Text>
        </Pressable>
      </View>

      {atLimit && (
        <Text style={styles.limitWarning}>
          Límite de usuarios alcanzado ({maxUsers}/{maxUsers}). Contactá a root
          para ampliar el plan.
        </Text>
      )}

      {/* ── User list ─────────────────────────────────────────────────────── */}
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
          renderItem={({ item }) => (
            <UserRow user={item} onDeactivate={handleDeactivate} />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay usuarios en esta empresa
              </Text>
            </View>
          }
        />
      )}

      {/* ── Invite modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invitar usuario</Text>
              <Pressable
                onPress={closeModal}
                style={styles.modalClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Success banner */}
            {successMessage ? (
              <View style={styles.successBanner}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={colors.success}
                />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* Invite error banner */}
            {inviteError ? (
              <Text style={styles.inviteErrorText}>{inviteError}</Text>
            ) : null}

            {/* Email input */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, { borderColor: emailBorderColor }]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (fieldErrors.email) setFieldErrors({});
                  clearInviteError();
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="usuario@empresa.com"
                placeholderTextColor={colors.textDisabled}
                editable={!inviteLoading}
              />
              {fieldErrors.email ? (
                <Text style={styles.fieldError}>{fieldErrors.email}</Text>
              ) : null}
            </View>

            {/* Role picker */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Rol</Text>
              <View style={styles.rolePicker}>
                {(['user', 'admin'] as const).map((r) => (
                  <Pressable
                    key={r}
                    style={[
                      styles.roleOption,
                      selectedRole === r && styles.roleOptionActive,
                    ]}
                    onPress={() => setSelectedRole(r)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selectedRole === r }}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        selectedRole === r && styles.roleOptionTextActive,
                      ]}
                    >
                      {ROLE_LABEL[r]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Submit */}
            <Pressable
              style={[
                styles.submitButton,
                inviteLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={inviteLoading}
              accessibilityRole="button"
              accessibilityLabel="Enviar invitación"
              accessibilityState={{
                disabled: inviteLoading,
                busy: inviteLoading,
              }}
            >
              {inviteLoading ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitButtonLabel}>Enviar invitación</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header button ─────────────────────────────────────────────────────────
  headerButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 48,
    justifyContent: 'center',
  },

  // ── Counter row ───────────────────────────────────────────────────────────
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  counterBlock: {
    gap: spacing[1],
  },
  counterNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold as '700',
    color: colors.textPrimary,
  },
  counterLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  inviteButtonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
  inviteButtonLabelDisabled: {
    color: colors.textDisabled,
  },
  limitWarning: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },

  // ── List ──────────────────────────────────────────────────────────────────
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
    color: colors.textDisabled,
  },
  deactivateButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // ── Role badge ────────────────────────────────────────────────────────────
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

  // ── Loading / error / empty ───────────────────────────────────────────────
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

  // ── Guard ─────────────────────────────────────────────────────────────────
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

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[6],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as '700',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.success,
    flex: 1,
  },
  inviteErrorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  fieldWrapper: {
    gap: spacing[1],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  fieldError: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  rolePicker: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  roleOption: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight ?? '#EFF6FF',
  },
  roleOptionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },
  roleOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as '600',
  },
  submitButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
});
