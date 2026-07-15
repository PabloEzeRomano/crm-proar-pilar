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
import { z } from 'zod';

import { useAuthStore } from '@/stores/authStore';
import { brand } from '@/constants/brand';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/constants/theme';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleLogin() {
    clearError();
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    await signIn(email.trim().toLowerCase(), password);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.appName}>{brand.appName}</Text>
          <Text style={styles.subtitle}>Ingresá a tu cuenta</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, fieldErrors.email ? styles.inputError : null]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="tu@email.com"
              placeholderTextColor={colors.textDisabled}
            />
            {fieldErrors.email ? (
              <Text style={styles.fieldError}>{fieldErrors.email}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={[styles.input, fieldErrors.password ? styles.inputError : null]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••"
              placeholderTextColor={colors.textDisabled}
            />
            {fieldErrors.password ? (
              <Text style={styles.fieldError}>{fieldErrors.password}</Text>
            ) : null}
          </View>

          {authError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing[6],
  },
  header: {
    marginBottom: spacing[8],
    alignItems: 'center',
  },
  appName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  form: { gap: spacing[4] },
  field: { gap: spacing[1] },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.error },
  fieldError: { fontSize: fontSize.xs, color: colors.error },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  errorText: { fontSize: fontSize.sm, color: colors.error },
  button: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
