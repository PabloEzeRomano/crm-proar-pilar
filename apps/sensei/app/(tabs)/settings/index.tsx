import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  const changePassword = useAuthStore((s) => s.changePassword);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'root';

  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  function openPasswordModal() {
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
    setPwError(null);
    setPwDone(false);
    setShowPwModal(true);
  }

  async function handleChangePassword() {
    if (!currentPw) {
      setPwError('Ingresá la contraseña actual');
      return;
    }
    if (newPw.length < 6) {
      setPwError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Las contraseñas no coinciden');
      return;
    }
    setPwError(null);
    setPwSaving(true);
    const { error } = await changePassword(currentPw, newPw);
    setPwSaving(false);
    if (error) {
      setPwError(error);
    } else {
      setPwDone(true);
    }
  }

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
            onPress={openPasswordModal}
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

      <Modal
        visible={showPwModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPwModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPwModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            {pwDone ? (
              <View style={styles.doneContainer}>
                <Text style={styles.doneTitle}>Contraseña actualizada</Text>
                <Pressable style={styles.saveBtn} onPress={() => setShowPwModal(false)}>
                  <Text style={styles.saveBtnText}>Cerrar</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Cambiar contraseña</Text>

                <Text style={styles.fieldLabel}>Contraseña actual</Text>
                <View style={styles.pwContainer}>
                  <TextInput
                    style={[styles.input, styles.pwInput, pwError ? styles.inputError : null]}
                    value={currentPw}
                    onChangeText={setCurrentPw}
                    secureTextEntry={!showCurrentPw}
                    placeholder="Tu contraseña actual"
                    placeholderTextColor={colors.textDisabled}
                    autoFocus
                  />
                  <Pressable style={styles.pwToggle} onPress={() => setShowCurrentPw((v) => !v)} accessibilityRole="button">
                    <MaterialCommunityIcons name={showCurrentPw ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <Text style={[styles.fieldLabel, { marginTop: spacing[3] }]}>
                  Nueva contraseña
                </Text>
                <View style={styles.pwContainer}>
                  <TextInput
                    style={[styles.input, styles.pwInput, pwError ? styles.inputError : null]}
                    value={newPw}
                    onChangeText={setNewPw}
                    secureTextEntry={!showNewPw}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor={colors.textDisabled}
                  />
                  <Pressable style={styles.pwToggle} onPress={() => setShowNewPw((v) => !v)} accessibilityRole="button">
                    <MaterialCommunityIcons name={showNewPw ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <Text style={[styles.fieldLabel, { marginTop: spacing[3] }]}>
                  Confirmar contraseña
                </Text>
                <View style={styles.pwContainer}>
                  <TextInput
                    style={[styles.input, styles.pwInput, pwError ? styles.inputError : null]}
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    secureTextEntry={!showConfirmPw}
                    placeholder="Repetir contraseña"
                    placeholderTextColor={colors.textDisabled}
                    onSubmitEditing={handleChangePassword}
                  />
                  <Pressable style={styles.pwToggle} onPress={() => setShowConfirmPw((v) => !v)} accessibilityRole="button">
                    <MaterialCommunityIcons name={showConfirmPw ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {pwError ? (
                  <Text style={styles.fieldError}>{pwError}</Text>
                ) : null}

                <Pressable
                  style={[styles.saveBtn, { marginTop: spacing[4] }]}
                  onPress={handleChangePassword}
                  disabled={pwSaving}
                >
                  {pwSaving ? (
                    <ActivityIndicator color={colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.saveBtnText}>Guardar contraseña</Text>
                  )}
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  saveBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  doneContainer: {
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  doneTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  pwContainer: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  pwInput: { flex: 1, paddingRight: 48 },
  pwToggle: { position: 'absolute', right: spacing[3], padding: spacing[2], height: 48, justifyContent: 'center' },
});
