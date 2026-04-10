/**
 * app/(auth)/set-invite-password.tsx — First-time password setup for invited users
 *
 * Shown after a user accepts an invite link. They are already authenticated
 * (session established from the invite token) but have no password yet.
 * After saving, they are sent to the main app — no sign-out needed.
 */

import { useState } from 'react'
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
} from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { useAuthStore } from '@/stores/authStore'
import { resetPasswordSchema, type ResetPasswordInput } from '@/validators/auth'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'

type FieldErrors = Partial<Record<keyof ResetPasswordInput, string>>

export default function SetInvitePasswordScreen() {
  const router = useRouter()
  const setInitialPassword = useAuthStore((s) => s.setInitialPassword)

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handlePasswordChange(text: string) {
    setPassword(text)
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
  }

  function handleConfirmChange(text: string) {
    setPasswordConfirm(text)
    if (fieldErrors.passwordConfirm) setFieldErrors((prev) => ({ ...prev, passwordConfirm: undefined }))
  }

  async function handleSubmit() {
    const result = resetPasswordSchema.safeParse({ password, passwordConfirm })

    if (!result.success) {
      const errors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordInput
        if (!errors[field]) errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setLoading(true)
    const { error } = await setInitialPassword(result.data.password)
    setLoading(false)

    if (error) {
      setFieldErrors({ password: error })
      return
    }

    // isInviteUser is now false → useAuthGuard routes to /(tabs)/agenda
    router.replace('/(tabs)/agenda')
  }

  const passwordBorderColor = fieldErrors.password
    ? colors.error
    : passwordFocused
    ? colors.primary
    : colors.border

  const confirmBorderColor = fieldErrors.passwordConfirm
    ? colors.error
    : confirmFocused
    ? colors.primary
    : colors.border

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
            <Text style={styles.title}>Configurar contraseña</Text>
            <Text style={styles.subtitle}>
              Para completar tu acceso, elegí una contraseña para tu cuenta.
            </Text>
          </View>

          {/* Password field */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordFieldContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, { borderColor: passwordBorderColor }]}
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
                autoFocus
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
                style={[styles.input, styles.passwordInput, { borderColor: confirmBorderColor }]}
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
              />
              <Pressable
                onPress={() => setShowConfirm(!showConfirm)}
                style={styles.passwordToggle}
                accessibilityLabel={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
              <Text style={styles.fieldError}>{fieldErrors.passwordConfirm}</Text>
            ) : null}
          </View>

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
              <Text style={styles.buttonLabel}>Continuar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
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
})
