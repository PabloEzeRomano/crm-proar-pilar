/**
 * ChangePasswordSheet — in-session password change.
 *
 * Verifies the current password before updating (see authStore.changePassword,
 * which re-authenticates and does NOT sign the user out). Presented as a bottom
 * sheet so it works the same on every app.
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../theme';
import PasswordInput from './PasswordInput';

export interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Minimum length enforced on the new password. Defaults to 6. */
  minLength?: number;
  /** Extra bottom padding, e.g. safe-area inset from the host screen. */
  bottomInset?: number;
}

export default function ChangePasswordSheet({
  visible,
  onClose,
  minLength = 6,
  bottomInset = 0,
}: ChangePasswordSheetProps) {
  const { colors, spacing, fontSize, fontWeight, borderRadius } = useTheme();
  const changePassword = useAuthStore((s) => s.changePassword);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Reset every time the sheet opens so a previous attempt never leaks through.
  useEffect(() => {
    if (!visible) return;
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setError(null);
    setSaving(false);
    setDone(false);
  }, [visible]);

  async function handleSave() {
    if (!currentPw) {
      setError('Ingresá la contraseña actual');
      return;
    }
    if (newPw.length < minLength) {
      setError(`La nueva contraseña debe tener al menos ${minLength} caracteres`);
      return;
    }
    if (newPw !== confirmPw) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError(null);
    setSaving(true);
    const result = await changePassword(currentPw, newPw);
    setSaving(false);
    if (result.error) setError(result.error);
    else setDone(true);
  }

  const inputStyle = {
    height: 48,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: error ? colors.error : colors.border,
    paddingHorizontal: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
  };

  const labelStyle = {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing[1],
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              padding: spacing[4],
              paddingBottom: spacing[4] + bottomInset,
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: colors.border, borderRadius: borderRadius.full },
            ]}
          />

          {done ? (
            <View style={{ alignItems: 'center', gap: spacing[3], paddingVertical: spacing[4] }}>
              <MaterialCommunityIcons name="check-circle" size={40} color={colors.success} />
              <Text
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.bold,
                  color: colors.textPrimary,
                }}
              >
                Contraseña actualizada
              </Text>
              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, borderRadius: borderRadius.md },
                ]}
                onPress={onClose}
                accessibilityRole="button"
              >
                <Text
                  style={{
                    color: colors.textOnPrimary,
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  Cerrar
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.semibold,
                    color: colors.textPrimary,
                  }}
                >
                  Cambiar contraseña
                </Text>
                <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
                  <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" style={{ marginTop: spacing[3] }}>
                <Text style={labelStyle}>Contraseña actual</Text>
                <PasswordInput
                  style={inputStyle}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  placeholder="Tu contraseña actual"
                  placeholderTextColor={colors.textDisabled}
                  textContentType="password"
                  iconSize={20}
                />

                <Text style={[labelStyle, { marginTop: spacing[3] }]}>Nueva contraseña</Text>
                <PasswordInput
                  style={inputStyle}
                  value={newPw}
                  onChangeText={setNewPw}
                  placeholder={`Mínimo ${minLength} caracteres`}
                  placeholderTextColor={colors.textDisabled}
                  textContentType="newPassword"
                  iconSize={20}
                />

                <Text style={[labelStyle, { marginTop: spacing[3] }]}>Confirmar contraseña</Text>
                <PasswordInput
                  style={inputStyle}
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  placeholder="Repetir contraseña"
                  placeholderTextColor={colors.textDisabled}
                  textContentType="newPassword"
                  onSubmitEditing={handleSave}
                  iconSize={20}
                />

                {error ? (
                  <Text
                    style={{ fontSize: fontSize.xs, color: colors.error, marginTop: spacing[2] }}
                  >
                    {error}
                  </Text>
                ) : null}

                <Pressable
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: borderRadius.md,
                      marginTop: spacing[4],
                      opacity: saving ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                  accessibilityRole="button"
                >
                  {saving ? (
                    <ActivityIndicator color={colors.textOnPrimary} size="small" />
                  ) : (
                    <Text
                      style={{
                        color: colors.textOnPrimary,
                        fontSize: fontSize.base,
                        fontWeight: fontWeight.semibold,
                      }}
                    >
                      Guardar contraseña
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { marginTop: 'auto', maxHeight: '85%' },
  handle: { width: 36, height: 4, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
