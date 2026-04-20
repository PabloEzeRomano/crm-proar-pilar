/**
 * app/(auth)/set-invite-password.tsx — First-time password setup for invited users
 *
 * Shown after a user accepts an invite link. They are already authenticated
 * (session established from the invite token) but have no password yet.
 * After saving, they are sent to the main app — no sign-out needed.
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
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import {
  setInvitePasswordSchema,
  type SetInvitePasswordInput,
} from '@/validators/auth';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';

type FieldErrors = Partial<Record<keyof SetInvitePasswordInput, string>>;

export default function SetInvitePasswordScreen() {
  const router = useRouter();
  const setInitialPassword = useAuthStore((s) => s.setInitialPassword);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleFullNameChange(text: string) {
    setFullName(text);
    if (fieldErrors.fullName)
      setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
  }

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
    const result = setInvitePasswordSchema.safeParse({
      fullName,
      password,
      passwordConfirm,
    });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SetInvitePasswordInput;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    const { error } = await setInitialPassword(
      result.data.password,
      result.data.fullName
    );
    setLoading(false);

    if (error) {
      setFieldErrors({ password: error });
      return;
    }

    // isInviteUser is now false → useAuthGuard routes to /(tabs)/agenda
    router.replace('/(tabs)/agenda');
  }

  const fullNameBorderColor = fieldErrors.fullName
    ? colors.error
    : fullNameFocused
      ? colors.primary
      : colors.border;

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
          <View style={styles.header}>
            <Text style={styles.title}>Configurar tu cuenta</Text>
            <Text style={styles.subtitle}>
              Ingresá tu nombre y elegí una contraseña para activar tu acceso.
            </Text>
          </View>

          {/* Full name field */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={[styles.input, { borderColor: fullNameBorderColor }]}
              value={fullName}
              onChangeText={handleFullNameChange}
              onFocus={() => setFullNameFocused(true)}
              onBlur={() => setFullNameFocused(false)}
              autoCapitalize="words"
              textContentType="name"
              placeholder="Ej: Juan García"
              placeholderTextColor={colors.textDisabled}
              editable={!loading}
              autoFocus
              returnKeyType="next"
            />
            {fieldErrors.fullName ? (
              <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>
            ) : null}
          </View>

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
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={colors.textDisabled}
                editable={!loading}
                returnKeyType="next"
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
                placeholder="Repetí la contraseña"
                placeholderTextColor={colors.textDisabled}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
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

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Guardar y continuar"
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonLabel}>Continuar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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

  header: {
    gap: spacing[2],
  },

  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },

  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
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
});
