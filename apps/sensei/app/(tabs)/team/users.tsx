/**
 * team/users.tsx — User management (admin/root only)
 *
 * Features:
 *  - List all users with role badge (tappable → change role)
 *  - Pending invites with amber badge
 *  - Banned users with red badge + reactivate / permanent-delete (root only)
 *  - Deactivate active users (trash icon)
 *  - Branch picker for vendedores
 *  - Seat counter + limit warning
 *  - Invite modal (email + role)
 *  - Role change modal
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import {
  ActivityIndicator,
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

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { showAlert, showConfirm } from '@/lib/dialog';
import { SearchableSelect } from '@crm/core';
import { useAuthStore } from '@/stores/authStore';
import { useBranchesStore } from '@/stores/branchesStore';
import { useUsersStore } from '@/stores/usersStore';
import type { Branch, UserListItem, UserRole } from '@/types';

// ─── Validation ───────────────────────────────────────────────────────────────

const inviteSchema = z.object({ email: z.string().email('Email inválido') });
type InviteErrors = { email?: string };

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Vendedor',
  product_manager: 'Productos',
  admin: 'Admin',
  root: 'Root',
};

const ROLE_COLOR: Record<UserRole, string> = {
  user: colors.textSecondary,
  product_manager: '#EA580C',
  admin: colors.primary,
  root: colors.error,
};

const ROLE_BG: Record<UserRole, string> = {
  user: colors.surface,
  product_manager: '#FFEDD5',
  admin: colors.primaryLight,
  root: '#FEE2E2',
};

const ROLE_LEVEL: Record<UserRole, number> = {
  user: 1,
  product_manager: 1,
  admin: 2,
  root: 3,
};

type AssignableRole = 'user' | 'admin';

const ASSIGNABLE_ROLES: { value: AssignableRole; label: string }[] = [
  { value: 'user', label: 'Vendedor' },
  { value: 'admin', label: 'Admin' },
];

// ─── Badges ───────────────────────────────────────────────────────────────────

function RoleBadge({
  role,
  tappable,
  onPress,
}: {
  role: UserRole;
  tappable?: boolean;
  onPress?: () => void;
}) {
  const badge = (
    <View
      style={[
        styles.roleBadge,
        { backgroundColor: ROLE_BG[role] },
        tappable && styles.roleBadgeTappable,
      ]}
    >
      <Text style={[styles.roleBadgeText, { color: ROLE_COLOR[role] }]}>
        {ROLE_LABEL[role]}
      </Text>
      {tappable && (
        <MaterialCommunityIcons
          name="chevron-down"
          size={14}
          color={ROLE_COLOR[role]}
        />
      )}
    </View>
  );

  if (tappable && onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
        {badge}
      </Pressable>
    );
  }
  return badge;
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

function BannedBadge() {
  return (
    <View style={[styles.roleBadge, { backgroundColor: colors.errorLight }]}>
      <Text style={[styles.roleBadgeText, { color: colors.error }]}>
        Baneado
      </Text>
    </View>
  );
}

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  callerRole,
  branches,
  onDeactivate,
  onReactivate,
  onDelete,
  onChangeRole,
  onSetBranch,
}: {
  user: UserListItem;
  callerRole: UserRole;
  branches: Branch[];
  onDeactivate: (u: UserListItem) => void;
  onReactivate: (u: UserListItem) => void;
  onDelete: (u: UserListItem) => void;
  onChangeRole: (u: UserListItem) => void;
  onSetBranch: (userId: string, branchId: string | null) => void;
}) {
  const isPending = user.status === 'pending';
  const displayName = isPending ? user.email : (user.full_name ?? '—');
  const initial = displayName.charAt(0).toUpperCase();

  const callerLevel = ROLE_LEVEL[callerRole];
  const targetLevel = user.role ? ROLE_LEVEL[user.role] : 0;

  const canDeactivate = user.status === 'active' && targetLevel < callerLevel;
  const canReactivate = user.status === 'banned' && targetLevel < callerLevel;
  const canDelete =
    user.status === 'banned' &&
    callerRole === 'root' &&
    targetLevel < callerLevel;
  const canChangeRole =
    !isPending && user.status === 'active' && targetLevel < callerLevel;

  const showBranch =
    user.status === 'active' && user.role === 'user' && branches.length > 0;
  const branchName = branches.find((b) => b.id === user.branch_id)?.name;

  return (
    <View style={styles.rowWrapper}>
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

        {/* Status / role badge */}
        {isPending ? (
          <PendingBadge />
        ) : user.status === 'banned' ? (
          <BannedBadge />
        ) : user.role ? (
          <RoleBadge
            role={user.role}
            tappable={canChangeRole}
            onPress={() => onChangeRole(user)}
          />
        ) : null}

        {/* Action buttons */}
        {canDeactivate && (
          <Pressable
            onPress={() => onDeactivate(user)}
            style={styles.actionBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Dar de baja a ${user.full_name ?? user.email}`}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color={colors.error}
            />
          </Pressable>
        )}

        {canReactivate && (
          <Pressable
            onPress={() => onReactivate(user)}
            style={styles.actionBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Reactivar a ${user.full_name ?? user.email}`}
          >
            <MaterialCommunityIcons
              name="account-check-outline"
              size={20}
              color={colors.success}
            />
          </Pressable>
        )}

        {canDelete && (
          <Pressable
            onPress={() => onDelete(user)}
            style={styles.actionBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar definitivamente a ${user.full_name ?? user.email}`}
          >
            <MaterialCommunityIcons
              name="account-remove-outline"
              size={20}
              color={colors.error}
            />
          </Pressable>
        )}
      </View>

      {showBranch && (
        <View style={styles.branchPicker}>
          <Text style={styles.branchLabel}>Sucursal</Text>
          <SearchableSelect
            label="Sucursal"
            placeholder="Sin sucursal"
            options={branches.map((b) => b.name)}
            selected={branchName ? [branchName] : []}
            onChange={(names) => {
              const id = branches.find((b) => b.name === names[0])?.id ?? null;
              onSetBranch(user.id, id);
            }}
          />
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UsersScreen() {
  const profile = useAuthStore((s) => s.profile);
  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root';

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
  const reactivateUser = useUsersStore((s) => s.reactivateUser);
  const deleteUser = useUsersStore((s) => s.deleteUser);
  const updateUserRole = useUsersStore((s) => s.updateUserRole);
  const setUserBranch = useUsersStore((s) => s.setUserBranch);
  const clearInviteError = useUsersStore((s) => s.clearInviteError);

  const branches = useBranchesStore((s) => s.branches);
  const fetchBranches = useBranchesStore((s) => s.fetchBranches);

  // Invite modal
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<AssignableRole>('user');
  const [fieldErrors, setFieldErrors] = useState<InviteErrors>({});
  const [emailFocused, setEmailFocused] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Role change modal
  const [roleModalUser, setRoleModalUser] = useState<UserListItem | null>(null);
  const [roleModalRole, setRoleModalRole] = useState<AssignableRole>('user');
  const [roleChanging, setRoleChanging] = useState(false);

  const maxUsers = companyConfig?.max_users ?? null;
  const currentCount = users.filter((u) => u.status !== 'banned').length;
  const isRoot = profile?.role === 'root';
  const atLimit = maxUsers !== null && currentCount >= maxUsers && !isRoot;

  useEffect(() => {
    if (!isAdminOrRoot) return;
    fetchUsers();
    fetchCompanyConfig();
    fetchBranches();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDeactivate = useCallback(
    async (user: UserListItem) => {
      const ok = await showConfirm({
        title: 'Dar de baja usuario',
        message: '¿Dar de baja a este usuario? Se archivarán sus gestiones.',
        confirmText: 'Dar de baja',
        destructive: true,
      });
      if (!ok) return;
      await deactivateUser(user.id);
      fetchUsers();
    },
    [deactivateUser, fetchUsers]
  );

  const handleReactivate = useCallback(
    async (user: UserListItem) => {
      const ok = await showConfirm({
        title: 'Reactivar usuario',
        message:
          '¿Reactivar a este usuario? Recuperará el acceso a la plataforma.',
        confirmText: 'Reactivar',
      });
      if (!ok) return;
      const { error: err } = await reactivateUser(user.id);
      if (err) showAlert('Error', err);
      fetchUsers();
    },
    [reactivateUser, fetchUsers]
  );

  const handleDelete = useCallback(
    async (user: UserListItem) => {
      const ok = await showConfirm({
        title: 'Eliminar definitivamente',
        message:
          'Esta acción es irreversible. Se borrarán el usuario y todos sus datos. El email quedará libre para una nueva invitación.',
        confirmText: 'Eliminar',
        destructive: true,
      });
      if (!ok) return;
      const { error: err } = await deleteUser(user.id);
      if (err) showAlert('Error', err);
      fetchUsers();
    },
    [deleteUser, fetchUsers]
  );

  function openRoleModal(user: UserListItem) {
    setRoleModalUser(user);
    setRoleModalRole((user.role ?? 'user') as AssignableRole);
  }

  const handleRoleChange = useCallback(async () => {
    if (!roleModalUser || roleChanging) return;
    if (roleModalRole === roleModalUser.role) {
      setRoleModalUser(null);
      return;
    }
    setRoleChanging(true);
    const { error: err } = await updateUserRole(roleModalUser.id, roleModalRole);
    setRoleChanging(false);
    if (err) {
      showAlert('Error', `No se pudo cambiar el rol: ${err}`);
    } else {
      fetchUsers();
      setRoleModalUser(null);
    }
  }, [roleModalUser, roleModalRole, roleChanging, updateUserRole, fetchUsers]);

  function openInviteModal() {
    setEmail('');
    setSelectedRole('user');
    setFieldErrors({});
    clearInviteError();
    setSuccessMessage(null);
    setModalVisible(true);
  }

  const handleSubmit = useCallback(async () => {
    const result = inviteSchema.safeParse({ email: email.trim().toLowerCase() });
    if (!result.success) {
      setFieldErrors({ email: result.error.issues[0]?.message });
      return;
    }
    setFieldErrors({});
    const { error: err } = await inviteUser({ email: result.data.email, role: selectedRole });
    if (err) {
      showAlert('Error', `No se pudo enviar la invitación: ${err}`);
      return;
    }
    setSuccessMessage(`Invitación enviada a ${result.data.email}`);
    fetchUsers();
    setTimeout(() => {
      setModalVisible(false);
      setSuccessMessage(null);
    }, 1500);
  }, [email, selectedRole, inviteUser, fetchUsers]);

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!isAdminOrRoot) {
    return (
      <View style={styles.guard}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={48}
          color={colors.textDisabled}
        />
        <Text style={styles.guardText}>Sin acceso</Text>
      </View>
    );
  }

  const emailBorderColor = fieldErrors.email
    ? colors.error
    : emailFocused
      ? colors.primary
      : colors.border;

  const callerRole = profile?.role ?? 'user';

  // Roles the caller can assign
  const assignableRoles = ASSIGNABLE_ROLES.filter((r) => {
    const callerLevel = ROLE_LEVEL[callerRole];
    return ROLE_LEVEL[r.value] < callerLevel || callerLevel >= 3;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Counter + invite */}
      <View style={styles.counterRow}>
        <View>
          <Text style={styles.counterNumber}>
            {currentCount}
            {maxUsers !== null ? ` / ${maxUsers}` : ''}
          </Text>
          <Text style={styles.counterLabel}>
            {maxUsers !== null
              ? `${maxUsers - currentCount} disponible${maxUsers - currentCount !== 1 ? 's' : ''}`
              : 'usuarios'}
          </Text>
        </View>
        <Pressable
          style={[styles.inviteBtn, atLimit && styles.inviteBtnDisabled]}
          onPress={openInviteModal}
          disabled={atLimit}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="account-plus-outline"
            size={20}
            color={atLimit ? colors.textDisabled : colors.textOnPrimary}
          />
          <Text
            style={[
              styles.inviteBtnText,
              atLimit && { color: colors.textDisabled },
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

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              callerRole={callerRole}
              branches={branches}
              onDeactivate={handleDeactivate}
              onReactivate={handleReactivate}
              onDelete={handleDelete}
              onChangeRole={openRoleModal}
              onSetBranch={setUserBranch}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No hay usuarios</Text>
            </View>
          }
        />
      )}

      {/* ── Invite modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invitar usuario</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            {successMessage && (
              <View style={styles.successBanner}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={colors.success}
                />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}
            {inviteError && (
              <Text style={styles.inviteErrorText}>{inviteError}</Text>
            )}

            <View style={styles.field}>
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
                placeholder="usuario@empresa.com"
                placeholderTextColor={colors.textDisabled}
                editable={!inviteLoading}
              />
              {fieldErrors.email && (
                <Text style={styles.fieldError}>{fieldErrors.email}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Rol</Text>
              <View style={styles.rolePicker}>
                {assignableRoles.map((r) => (
                  <Pressable
                    key={r.value}
                    style={[
                      styles.roleOption,
                      selectedRole === r.value && styles.roleOptionActive,
                    ]}
                    onPress={() => setSelectedRole(r.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selectedRole === r.value }}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        selectedRole === r.value && styles.roleOptionTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.submitBtn, inviteLoading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={inviteLoading}
              accessibilityRole="button"
            >
              {inviteLoading ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>Enviar invitación</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Role change modal ─────────────────────────────────────────────── */}
      <Modal
        visible={roleModalUser !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRoleModalUser(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setRoleModalUser(null)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar rol</Text>
              <Pressable
                onPress={() => setRoleModalUser(null)}
                style={styles.modalClose}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <Text style={styles.roleModalSub}>
              {roleModalUser?.full_name ?? roleModalUser?.email}
            </Text>

            <View style={styles.rolePicker}>
              {assignableRoles.map((r) => (
                <Pressable
                  key={r.value}
                  style={[
                    styles.roleOption,
                    roleModalRole === r.value && styles.roleOptionActive,
                  ]}
                  onPress={() => setRoleModalRole(r.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: roleModalRole === r.value }}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      roleModalRole === r.value && styles.roleOptionTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.submitBtn, roleChanging && { opacity: 0.6 }]}
              onPress={handleRoleChange}
              disabled={roleChanging}
              accessibilityRole="button"
            >
              {roleChanging ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>Confirmar</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.background,
  },
  guardText: { fontSize: fontSize.base, color: colors.textSecondary },

  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  counterNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  counterLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  limitWarning: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  inviteBtnDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },

  listContent: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  separator: { height: spacing[2] },

  rowWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    ...shadows.subtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 48,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  rowContent: { flex: 1, gap: spacing[1] },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  rowSub: { fontSize: fontSize.xs, color: colors.textDisabled },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  roleBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    minHeight: 28,
    justifyContent: 'center',
  },
  roleBadgeTappable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  roleBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  branchPicker: { marginTop: spacing[3], gap: spacing[1] },
  branchLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: fontSize.base, color: colors.error, textAlign: 'center' },
  emptyText: { fontSize: fontSize.base, color: colors.textSecondary },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
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
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleModalSub: { fontSize: fontSize.base, color: colors.textSecondary },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  successText: { fontSize: fontSize.sm, color: colors.success, flex: 1 },
  inviteErrorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },

  field: { gap: spacing[1] },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
  fieldError: { fontSize: fontSize.sm, color: colors.error },
  rolePicker: { flexDirection: 'row', gap: spacing[3] },
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
    backgroundColor: colors.primaryLight,
  },
  roleOptionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  roleOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  submitBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  submitBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
