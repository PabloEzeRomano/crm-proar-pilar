/**
 * app/(auth)/register.tsx — User registration screen
 *
 * Full-screen, vertically centered registration form with email verification flow.
 * - Reads auth state from useAuthStore; never calls Supabase directly.
 * - Validates with Zod before calling signUp.
 * - After signup, shows "check your email" pending verification state.
 * - Auth guard in the root layout handles navigation after email confirmation.
 * - All visual values come from constants/theme.ts and constants/brand.ts.
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
import { brand } from '@/constants/brand'
import { signUpSchema, type SignUpInput } from '@/validators/auth'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type FieldErrors = Partial<Record<keyof SignUpInput, string>>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RegisterScreen() {
  const router = useRouter()
  const signUp = useAuthStore((s) => s.signUp)
  const loading = useAuthStore((s) => s.loading)
  const authError = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [step, setStep] = useState<'form' | 'pending-verification'>('form')

  // Focus state for styled borders
  const [fullNameFocused, setFullNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  function handleClearError() {
    clearError()
    if (authError) return
  }

  function handleFullNameChange(text: string) {
    setFullName(text)
    handleClearError()
    if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }))
  }

  function handleEmailChange(text: string) {
    setEmail(text)
    handleClearError()
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
  }

  function handlePasswordChange(text: string) {
    setPassword(text)
    handleClearError()
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
  }

  function handleConfirmChange(text: string) {
    setPasswordConfirm(text)
    handleClearError()
    if (fieldErrors.passwordConfirm) setFieldErrors((prev) => ({ ...prev, passwordConfirm: undefined }))
  }

  async function handleSubmit() {
    const result = signUpSchema.safeParse({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      passwordConfirm,
    })

    if (!result.success) {
      const errors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SignUpInput
        if (!errors[field]) errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    const { requiresVerification, error } = await signUp(
      result.data.email,
      result.data.password,
      result.data.fullName
    )

    if (error) {
      clearError() // Clear any previous error
      // Note: authError is set by authStore; handled by rendering authError banner
      return
    }

    if (requiresVerification) {
      setStep('pending-verification')
    }
  }

  // ------------------------------------------------------------------
  // Derived styles (focus / error state requires runtime values)
  // ------------------------------------------------------------------

  const fullNameBorderColor = fieldErrors.fullName
    ? colors.error
    : fullNameFocused
    ? colors.primary
    : colors.border

  const emailBorderColor = fieldErrors.email
    ? colors.error
    : emailFocused
    ? colors.primary
    : colors.border

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

  // ------------------------------------------------------------------
  // Render: form step
  // ------------------------------------------------------------------

  if (step === 'form') {
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
          {/* ── Brand block ─────────────────────────────────────────── */}
          <View style={styles.brandBlock}>
            <Text style={styles.appName}>{brand.appName}</Text>
            <Text style={styles.subtitle}>Creá tu cuenta</Text>
          </View>

          {/* ── Form ────────────────────────────────────────────────── */}
          <View style={styles.form}>
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
                autoCorrect={false}
                autoComplete="name"
                textContentType="name"
                placeholder="Tu nombre"
                placeholderTextColor={colors.textDisabled}
                editable={!loading}
              />
              {fieldErrors.fullName ? (
                <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>
              ) : null}
            </View>

            {/* Email field */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, { borderColor: emailBorderColor }]}
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="tu@email.com"
                placeholderTextColor={colors.textDisabled}
                editable={!loading}
              />
              {fieldErrors.email ? (
                <Text style={styles.fieldError}>{fieldErrors.email}</Text>
              ) : null}
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
                  placeholder="••••••••"
                  placeholderTextColor={colors.textDisabled}
                  editable={!loading}
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
                  placeholder="••••••••"
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

            {/* Submit button */}
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Crear cuenta"
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.buttonLabel}>Crear cuenta</Text>
              )}
            </Pressable>

            {/* Auth error banner */}
            {authError ? (
              <Text style={styles.authError}>{authError}</Text>
            ) : null}

            {/* Link to login */}
            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              style={styles.textLink}
              accessibilityRole="link"
              accessibilityLabel="Ingresar"
            >
              <Text style={styles.textLinkLabel}>¿Ya tenés cuenta? Ingresar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ------------------------------------------------------------------
  // Render: pending verification step
  // ------------------------------------------------------------------

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.verificationBlock}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.verificationTitle}>Revisá tu bandeja de entrada</Text>
          <Text style={styles.verificationSubtitle}>Enviamos un link de confirmación a {email}</Text>

          <Pressable style={styles.textLink} onPress={() => setStep('form')} accessibilityRole="link">
            <Text style={styles.textLinkLabel}>Volver al inicio de sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
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

  // ── Brand block ──────────────────────────────────────────────────────────

  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },

  appName: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[1],
  },

  // ── Form ─────────────────────────────────────────────────────────────────

  form: {
    gap: spacing[4],
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

  // ── Submit button ─────────────────────────────────────────────────────────

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

  // ── Auth error ────────────────────────────────────────────────────────────

  authError: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },

  // ── Text link ─────────────────────────────────────────────────────────────

  textLink: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textLinkLabel: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },

  // ── Verification state ────────────────────────────────────────────────────

  verificationBlock: {
    alignItems: 'center',
    gap: spacing[4],
  },

  checkmark: {
    fontSize: fontSize['3xl'],
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },

  verificationTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  verificationSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
})
