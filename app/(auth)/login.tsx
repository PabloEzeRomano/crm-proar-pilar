/**
 * app/(auth)/login.tsx — Login screen
 *
 * Full-screen, vertically centered auth form.
 * - Reads auth state from useAuthStore; never calls Supabase directly.
 * - Validates with Zod before calling signIn.
 * - Auth guard in the root layout handles navigation after a successful sign-in.
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
import { z } from 'zod'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { useAuthStore } from '@/stores/authStore'
import { brand } from '@/constants/brand'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginSchema = z.infer<typeof loginSchema>

type FieldErrors = Partial<Record<keyof LoginSchema, string>>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginScreen() {
  const router = useRouter()
  const signIn = useAuthStore((s) => s.signIn)
  const loading = useAuthStore((s) => s.loading)
  const authError = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Focus state for styled borders
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  function handleEmailChange(text: string) {
    setEmail(text)
    if (authError) clearError()
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
  }

  function handlePasswordChange(text: string) {
    setPassword(text)
    if (authError) clearError()
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
  }

  async function handleSubmit() {
    const result = loginSchema.safeParse({ email: email.trim(), password })

    if (!result.success) {
      const errors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginSchema
        if (!errors[field]) errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    await signIn(result.data.email, result.data.password)
    // Navigation is handled automatically by the root layout auth guard.
  }

  // ------------------------------------------------------------------
  // Derived styles (focus / error state requires runtime values)
  // ------------------------------------------------------------------

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

  // ------------------------------------------------------------------
  // Render
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
        {/* ── Brand block ─────────────────────────────────────────── */}
        <View style={styles.brandBlock}>
          <Text style={styles.appName}>{brand.appName}</Text>
          <Text style={styles.subtitle}>Ingresá para continuar</Text>
        </View>

        {/* ── Form ────────────────────────────────────────────────── */}
        <View style={styles.form}>
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
                autoComplete="current-password"
                textContentType="password"
                placeholder="••••••"
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

          {/* Submit button */}
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Ingresar"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonLabel}>Ingresar</Text>
            )}
          </Pressable>

          {/* Auth error banner */}
          {authError ? (
            <Text style={styles.authError}>{authError}</Text>
          ) : null}

          {/* Password recovery link */}
          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.textLink}
            accessibilityRole="link"
            accessibilityLabel="Olvidaste tu contraseña"
          >
            <Text style={styles.textLinkLabel}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          {/* Sign up link */}
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            style={styles.textLink}
            accessibilityRole="link"
            accessibilityLabel="Crear cuenta"
          >
            <Text style={styles.textLinkLabel}>¿No tenés cuenta? Crear cuenta</Text>
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

  // ── Text links ────────────────────────────────────────────────────────────

  textLink: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textLinkLabel: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
})
