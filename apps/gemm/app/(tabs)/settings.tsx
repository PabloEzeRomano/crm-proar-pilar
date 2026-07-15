import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { brand } from '@/constants/brand';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';
import { showAlert, showConfirm } from '@/lib/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useUsersStore } from '@/stores/usersStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { UserListItem, UserRole } from '@crm/core';

// ── Role helpers ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Usuario',
  product_manager: 'PM',
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
  { value: 'user', label: 'Usuario' },
  { value: 'admin', label: 'Admin' },
];

// ── Invite schema ──────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
});

// ── Sub-components ─────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <View style={[styles.badge, { backgroundColor: ROLE_BG[role] }]}>
      <Text style={[styles.badgeText, { color: ROLE_COLOR[role] }]}>
        {ROLE_LABEL[role]}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: 'active' | 'pending' | 'banned' }) {
  if (status === 'pending')
    return (
      <View style={[styles.badge, { backgroundColor: colors.warningLight }]}>
        <Text style={[styles.badgeText, { color: colors.warning }]}>Pendiente</Text>
      </View>
    );
  if (status === 'banned')
    return (
      <View style={[styles.badge, { backgroundColor: colors.errorLight }]}>
        <Text style={[styles.badgeText, { color: colors.error }]}>Baneado</Text>
      </View>
    );
  return null;
}

function SectionHeader({ children }: { children: string }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  destructive,
  rightContent,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  rightContent?: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingsRow, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress && !rightContent}
    >
      <View style={[styles.settingsRowIcon, destructive && styles.settingsRowIconDestructive]}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={destructive ? colors.error : colors.primary}
        />
      </View>
      <View style={styles.settingsRowContent}>
        <Text style={[styles.settingsRowLabel, destructive && { color: colors.error }]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.settingsRowSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {rightContent ?? (
        onPress ? (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={colors.textDisabled}
          />
        ) : null
      )}
    </Pressable>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const { isAdminOrRoot, isRoot } = usePermissions();

  const users = useUsersStore((s) => s.users);
  const companyConfig = useUsersStore((s) => s.companyConfig);
  const loading = useUsersStore((s) => s.loading);
  const inviteLoading = useUsersStore((s) => s.inviteLoading);
  const inviteError = useUsersStore((s) => s.inviteError);
  const deactivateLoading = useUsersStore((s) => s.deactivateLoading);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);
  const fetchCompanyConfig = useUsersStore((s) => s.fetchCompanyConfig);
  const inviteUser = useUsersStore((s) => s.inviteUser);
  const deactivateUser = useUsersStore((s) => s.deactivateUser);
  const reactivateUser = useUsersStore((s) => s.reactivateUser);
  const deleteUser = useUsersStore((s) => s.deleteUser);
  const updateUserRole = useUsersStore((s) => s.updateUserRole);
  const clearInviteError = useUsersStore((s) => s.clearInviteError);

  // Invite modal
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableRole>('user');
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null);
  const [inviteDone, setInviteDone] = useState(false);

  // Role change modal
  const [roleTarget, setRoleTarget] = useState<UserListItem | null>(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAdminOrRoot) {
        fetchUsers();
        fetchCompanyConfig();
      }
    }, [isAdminOrRoot])
  );

  const version = Constants.expoConfig?.version ?? '—';
  const callerRole = profile?.role ?? 'user';

  // ── Invite ────────────────────────────────────────────────────────────────

  function openInvite() {
    clearInviteError();
    setInviteEmail('');
    setInviteRole('user');
    setInviteFieldError(null);
    setInviteDone(false);
    setInviteVisible(true);
  }

  async function handleInvite() {
    const result = inviteSchema.safeParse({ email: inviteEmail });
    if (!result.success) {
      setInviteFieldError(result.error.issues[0]?.message ?? 'Email inválido');
      return;
    }
    setInviteFieldError(null);

    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin + '/'
        : undefined;

    const { error } = await inviteUser({ email: inviteEmail.trim().toLowerCase(), role: inviteRole, redirectTo });
    if (!error) setInviteDone(true);
  }

  // ── Role change ───────────────────────────────────────────────────────────

  async function handleRoleChange(role: AssignableRole) {
    if (!roleTarget) return;
    setRoleChangeLoading(true);
    const { error } = await updateUserRole(roleTarget.id, role);
    setRoleChangeLoading(false);
    setRoleTarget(null);
    if (error) showAlert('Error', error);
    else fetchUsers();
  }

  // ── Deactivate / reactivate / delete ──────────────────────────────────────

  async function handleDeactivate(u: UserListItem) {
    const ok = await showConfirm({
      title: `Dar de baja a ${u.full_name ?? u.email}`,
      message: 'No podrá iniciar sesión.',
      confirmText: 'Dar de baja',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deactivateUser(u.id);
    if (error) showAlert('Error', error);
    else fetchUsers();
  }

  async function handleReactivate(u: UserListItem) {
    const { error } = await reactivateUser(u.id);
    if (error) showAlert('Error', error);
    else fetchUsers();
  }

  async function handleDelete(u: UserListItem) {
    const ok = await showConfirm({
      title: `Eliminar cuenta de ${u.full_name ?? u.email}`,
      message: 'Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deleteUser(u.id);
    if (error) showAlert('Error', error);
    else fetchUsers();
  }

  async function handleSignOut() {
    const ok = await showConfirm({ title: 'Cerrar sesión', confirmText: 'Cerrar sesión' });
    if (ok) signOut();
  }

  // ── Render user row ───────────────────────────────────────────────────────

  function renderUser({ item: u }: { item: UserListItem }) {
    const isPending = u.status === 'pending';
    const displayName = isPending ? u.email : (u.full_name ?? '—');
    const initial = displayName.charAt(0).toUpperCase();
    const targetLevel = u.role ? ROLE_LEVEL[u.role] : 0;
    const callerLevel = ROLE_LEVEL[callerRole as UserRole] ?? 0;
    const canAct = targetLevel < callerLevel;
    const canChangeRole = !isPending && u.status === 'active' && canAct;
    const canDeactivate = u.status === 'active' && canAct;
    const canReactivate = u.status === 'banned' && canAct;
    const canDelete = u.status === 'banned' && isRoot && canAct;

    return (
      <View style={styles.userRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userRowContent}>
          <Text style={styles.userRowName} numberOfLines={1}>{displayName}</Text>
          {!isPending && (
            <Text style={styles.userRowSub} numberOfLines={1}>{u.email}</Text>
          )}
        </View>

        {isPending || u.status === 'banned' ? (
          <StatusBadge status={u.status} />
        ) : u.role ? (
          canChangeRole ? (
            <Pressable onPress={() => setRoleTarget(u)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={[styles.badge, { backgroundColor: ROLE_BG[u.role] }, styles.badgeTappable]}>
                <Text style={[styles.badgeText, { color: ROLE_COLOR[u.role] }]}>{ROLE_LABEL[u.role]}</Text>
                <MaterialCommunityIcons name="chevron-down" size={12} color={ROLE_COLOR[u.role]} />
              </View>
            </Pressable>
          ) : (
            <RoleBadge role={u.role} />
          )
        ) : null}

        {canDeactivate && (
          <Pressable onPress={() => handleDeactivate(u)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
          </Pressable>
        )}
        {canReactivate && (
          <Pressable onPress={() => handleReactivate(u)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="account-check-outline" size={18} color={colors.success} />
          </Pressable>
        )}
        {canDelete && (
          <Pressable onPress={() => handleDelete(u)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="account-remove-outline" size={18} color={colors.error} />
          </Pressable>
        )}
      </View>
    );
  }

  const seatsFull =
    companyConfig != null && users.filter((u) => u.status !== 'banned').length >= companyConfig.max_users;

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[8] }]}
      >
        {/* ── EQUIPO ────────────────────────────────────────────── */}
        {isAdminOrRoot && (
          <>
            <SectionHeader>EQUIPO</SectionHeader>
            <View style={styles.section}>
              {loading ? (
                <ActivityIndicator color={colors.primary} style={{ padding: spacing[4] }} />
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={(u) => u.id}
                  renderItem={renderUser}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.sep} />}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Sin usuarios</Text>
                  }
                />
              )}

              <View style={[styles.sep, { marginTop: 0 }]} />

              <Pressable
                style={({ pressed }) => [styles.inviteBtn, pressed && styles.inviteBtnPressed, seatsFull && styles.inviteBtnDisabled]}
                onPress={openInvite}
                disabled={seatsFull}
              >
                <MaterialCommunityIcons name="account-plus-outline" size={18} color={seatsFull ? colors.textDisabled : colors.primary} />
                <Text style={[styles.inviteBtnText, seatsFull && { color: colors.textDisabled }]}>
                  {seatsFull ? `Límite alcanzado (${companyConfig?.max_users})` : 'Invitar usuario'}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── CORREOS ──────────────────────────────────────────── */}
        <SectionHeader>CORREOS</SectionHeader>
        <View style={styles.section}>
          <SettingsRow
            icon="email-edit-outline"
            label="Plantillas de correo"
            subtitle="Crear y editar mensajes predeterminados"
            onPress={() => router.push('/(tabs)/correos/templates' as any)}
          />
        </View>

        {/* ── DATOS ────────────────────────────────────────────── */}
        {isAdminOrRoot && (
          <>
            <SectionHeader>DATOS</SectionHeader>
            <View style={styles.section}>
              <SettingsRow
                icon="upload"
                label="Importar prospectos"
                subtitle="Excel / CSV"
                onPress={() => router.push('/(tabs)/import' as any)}
              />
            </View>
          </>
        )}

        {/* ── CUENTA ───────────────────────────────────────────── */}
        <SectionHeader>CUENTA</SectionHeader>
        <View style={styles.section}>
          <SettingsRow
            icon="account-circle-outline"
            label={profile?.full_name ?? '—'}
            subtitle={user?.email ?? '—'}
          />
          <View style={styles.sep} />
          <SettingsRow
            icon="logout"
            label="Cerrar sesión"
            destructive
            onPress={handleSignOut}
          />
        </View>

        {/* ── APLICACIÓN ───────────────────────────────────────── */}
        <SectionHeader>APLICACIÓN</SectionHeader>
        <View style={styles.section}>
          <SettingsRow
            icon="information-outline"
            label={brand.appName}
            subtitle={`Versión ${version}`}
          />
        </View>
      </ScrollView>

      {/* ── Invite modal ──────────────────────────────────────── */}
      <Modal
        visible={inviteVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setInviteVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />

              {inviteDone ? (
                <View style={styles.doneContainer}>
                  <MaterialCommunityIcons name="check-circle-outline" size={48} color={colors.success} />
                  <Text style={styles.doneTitle}>Invitación enviada</Text>
                  <Text style={styles.doneSub}>{inviteEmail}</Text>
                  <Pressable style={styles.saveBtn} onPress={() => setInviteVisible(false)}>
                    <Text style={styles.saveBtnText}>Cerrar</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>Invitar usuario</Text>

                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={[styles.input, inviteFieldError && styles.inputError]}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="nombre@empresa.com"
                    placeholderTextColor={colors.textDisabled}
                    autoFocus
                  />
                  {inviteFieldError ? <Text style={styles.fieldError}>{inviteFieldError}</Text> : null}
                  {inviteError ? <Text style={styles.fieldError}>{inviteError}</Text> : null}

                  <Text style={[styles.fieldLabel, { marginTop: spacing[3] }]}>Rol</Text>
                  <View style={styles.roleRow}>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <Pressable
                        key={r.value}
                        style={[styles.roleChip, inviteRole === r.value && styles.roleChipActive]}
                        onPress={() => setInviteRole(r.value)}
                      >
                        <Text style={[styles.roleChipText, inviteRole === r.value && styles.roleChipTextActive]}>
                          {r.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.saveBtn, { marginTop: spacing[4] }, pressed && styles.saveBtnPressed]}
                    onPress={handleInvite}
                    disabled={inviteLoading}
                  >
                    {inviteLoading
                      ? <ActivityIndicator color={colors.textOnPrimary} />
                      : <Text style={styles.saveBtnText}>Enviar invitación</Text>
                    }
                  </Pressable>
                </>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── Role change modal ─────────────────────────────────── */}
      <Modal
        visible={!!roleTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setRoleTarget(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRoleTarget(null)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Cambiar rol de {roleTarget?.full_name ?? roleTarget?.email}
            </Text>
            {ASSIGNABLE_ROLES.map((r) => {
              const active = roleTarget?.role === r.value;
              return (
                <Pressable
                  key={r.value}
                  style={[styles.roleOption, active && styles.roleOptionActive]}
                  onPress={() => handleRoleChange(r.value)}
                  disabled={roleChangeLoading}
                >
                  <Text style={[styles.roleOptionText, { color: ROLE_COLOR[r.value] }]}>
                    {r.label}
                  </Text>
                  {active && <MaterialCommunityIcons name="check" size={18} color={ROLE_COLOR[r.value]} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[2] },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    paddingHorizontal: spacing[2],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.subtle,
    marginBottom: spacing[2],
  },
  sep: { height: 1, backgroundColor: colors.border },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
    minHeight: 56,
  },
  rowPressed: { backgroundColor: colors.background },
  settingsRowIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowIconDestructive: { backgroundColor: colors.errorLight },
  settingsRowContent: { flex: 1 },
  settingsRowLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  settingsRowSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // User list
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  userRowContent: { flex: 1 },
  userRowName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  userRowSub: { fontSize: fontSize.xs, color: colors.textSecondary },
  badge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  badgeTappable: { paddingRight: spacing[1] },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  iconBtn: { padding: spacing[1] },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    padding: spacing[4],
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[4],
  },
  inviteBtnPressed: { backgroundColor: colors.background },
  inviteBtnDisabled: { opacity: 0.5 },
  inviteBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[2],
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  fieldError: { fontSize: fontSize.xs, color: colors.error },
  input: {
    height: 48,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    marginTop: spacing[1],
  },
  inputError: { borderColor: colors.error },
  roleRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] },
  roleChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  roleChipTextActive: { color: colors.primary },
  saveBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: { color: colors.textOnPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  doneContainer: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[4] },
  doneTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  doneSub: { fontSize: fontSize.base, color: colors.textSecondary },
  // Role option
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
  },
  roleOptionActive: { backgroundColor: colors.background },
  roleOptionText: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
});
