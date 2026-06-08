/**
 * app/(auth)/reset-password.tsx — Password reset screen
 *
 * Shown after user clicks password reset email link.
 * User enters new password and confirmation.
 * After successful save, signs out and redirects to login.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '@/validators/auth';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type FieldErrors = Partial<Record<keyof ResetPasswordInput, string>>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResetPasswordScreen() {
  const updatePassword = useAuthStore((s) => s.updatePassword);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  function handlePasswordChange(text: string) {
    setPassword(text);
    if (fieldErrors.password)
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
  }

  function handleConfirmChange(text: string) {
    setPasswordConfirm(text);
    if (fieldErrors.passwordConfirm)
      setFieldErrors((prev) => ({ ...prev, passwordConfirm: undefined }));
  }

  async function handleSubmit() {
    const result = resetPasswordSchema.safeParse({ password, passwordConfirm });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordInput;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    const { error } = await updatePassword(result.data.password);
    setLoading(false);

    if (error) {
      // Error is set in fieldErrors or shown as a banner
      // For simplicity, just show an error alert or banner
      setFieldErrors({ password: error });
      return;
    }

    setSuccess(true);
    // updatePassword calls signOut → onAuthStateChange SIGNED_OUT → guard redirects to login
  }

  // ------------------------------------------------------------------
  // Derived styles
  // ------------------------------------------------------------------

  const passwordBorderColor = fieldErrors.password
    ? colors.error
    : passwordFocused
      ? colors.primary
      : colors.border;

  const confirmBorderColor = fieldErrors.passwordConfirm
    ? colors.error
    : confirmFocused
      ? colors.primary
      : colors.border;

  // ------------------------------------------------------------------
  // Render: success state
  // ------------------------------------------------------------------

  if (success) {
    return (
      <View style={styles.flex}>
        <View style={styles.scrollContent}>
          <View style={styles.successBlock}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.successTitle}>Contraseña actualizada</Text>
          </View>
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Render: form
  // ------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <Text style={styles.title}>Crear contraseña nueva</Text>

          {/* Password field */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordFieldContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  { borderColor: passwordBorderColor },
                ]}
                value={password}
                onChangeText={handlePasswordChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                placeholder="••••••••"
                placeholderTextColor={colors.textDisabled}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                accessibilityLabel={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
            {fieldErrors.password ? (
              <Text style={styles.fieldError}>{fieldErrors.password}</Text>
            ) : null}
          </View>

          {/* Confirm password field */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.passwordFieldContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  { borderColor: confirmBorderColor },
                ]}
                value={passwordConfirm}
                onChangeText={handleConfirmChange}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                placeholder="••••••••"
                placeholderTextColor={colors.textDisabled}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowConfirm(!showConfirm)}
                style={styles.passwordToggle}
                accessibilityLabel={
                  showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name={showConfirm ? 'eye-off' : 'eye'}
                  size={24}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
            {fieldErrors.passwordConfirm ? (
              <Text style={styles.fieldError}>
                {fieldErrors.passwordConfirm}
              </Text>
            ) : null}
          </View>

          {/* Submit button */}
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Guardar contraseña"
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonLabel}>Guardar contraseña</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[8],
  },

  form: {
    gap: spacing[6],
  },

  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },

  fieldWrapper: {
    gap: spacing[1],
  },

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

  passwordFieldContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
    paddingRight: 48,
  },

  passwordToggle: {
    position: 'absolute',
    right: spacing[3],
    padding: spacing[2],
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fieldError: {
    fontSize: fontSize.sm,
    color: colors.error,
  },

  button: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },

  successBlock: {
    alignItems: 'center',
    gap: spacing[4],
  },

  checkmark: {
    fontSize: fontSize['3xl'],
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },

  successTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
