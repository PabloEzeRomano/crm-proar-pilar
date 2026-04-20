/**
 * app/(auth)/forgot-password.tsx — Password recovery screen
 *
 * User enters their email to request a password reset link.
 * After submission, shows confirmation that email was sent.
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

import { useAuthStore } from '@/stores/authStore';
import { forgotPasswordSchema } from '@/validators/auth';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'sent'>('form');
  const [emailFocused, setEmailFocused] = useState(false);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  function handleEmailChange(text: string) {
    setEmail(text);
    if (fieldError) setFieldError(undefined);
  }

  async function handleSubmit() {
    const result = forgotPasswordSchema.safeParse({
      email: email.trim().toLowerCase(),
    });

    if (!result.success) {
      setFieldError(result.error.issues[0]?.message);
      return;
    }

    setFieldError(undefined);
    setLoading(true);
    const { error } = await requestPasswordReset(result.data.email);
    setLoading(false);

    // Always show "sent" step regardless of error
    // (don't leak whether email exists in the system)
    setStep('sent');
  }

  // ------------------------------------------------------------------
  // Derived styles
  // ------------------------------------------------------------------

  const emailBorderColor = fieldError
    ? colors.error
    : emailFocused
      ? colors.primary
      : colors.border;

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
          <View style={styles.form}>
            <Text style={styles.title}>Recuperar contraseña</Text>

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
              {fieldError ? (
                <Text style={styles.fieldError}>{fieldError}</Text>
              ) : null}
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Enviar link"
            >
              {loading ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.buttonLabel}>Enviar link</Text>
              )}
            </Pressable>

            <Pressable onPress={() => router.back()} style={styles.backLink}>
              <Text style={styles.backLinkLabel}>Volver</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ------------------------------------------------------------------
  // Render: sent step
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
        <View style={styles.sentBlock}>
          <Text style={styles.sentTitle}>Revisá tu email</Text>
          <Text style={styles.sentMessage}>
            Si la cuenta existe, enviamos un link para resetear tu contraseña.
          </Text>

          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backLink}
          >
            <Text style={styles.backLinkLabel}>Volver al inicio</Text>
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
    marginBottom: spacing[4],
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
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },

  backLink: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backLinkLabel: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },

  sentBlock: {
    alignItems: 'center',
    gap: spacing[4],
  },

  sentTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  sentMessage: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
