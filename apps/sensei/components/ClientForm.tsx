/**
 * components/ClientForm.tsx — Shared create/edit form for clients.
 *
 * Collects field values and calls onSubmit. Validation + persistence live in
 * the parent screen (new / edit). Payment method and classification are free
 * text for now; they will become catalog-backed dropdowns later.
 */

import { SearchableSelect } from '@crm/core';
import { useEffect, useState } from 'react';
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

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme';
import { useBranchesStore } from '@/stores/branchesStore';
import { usePaymentMethodsStore } from '@/stores/paymentMethodsStore';

export interface ClientFormValues {
  name: string;
  dni: string;
  address: string;
  city: string;
  branchId: string;
  classification: string;
  paymentMethod: string;
  notes: string;
}

interface ClientFormProps {
  initial?: Partial<ClientFormValues>;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: ClientFormValues) => void;
}

export default function ClientForm({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
}: ClientFormProps) {
  const branches = useBranchesStore((s) => s.branches);
  const fetchBranches = useBranchesStore((s) => s.fetchBranches);
  const paymentMethods = usePaymentMethodsStore((s) => s.items);
  const fetchPaymentMethods = usePaymentMethodsStore((s) => s.fetchItems);

  const [name, setName] = useState(initial?.name ?? '');
  const [dni, setDni] = useState(initial?.dni ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [branchId, setBranchId] = useState(initial?.branchId ?? '');
  const [classification, setClassification] = useState(
    initial?.classification ?? ''
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initial?.paymentMethod ?? ''
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');

  useEffect(() => {
    fetchBranches();
    fetchPaymentMethods();
  }, []);

  const branchName = branches.find((b) => b.id === branchId)?.name;

  function handleSubmit() {
    onSubmit({
      name,
      dni,
      address,
      city,
      branchId,
      classification,
      paymentMethod,
      notes,
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del cliente"
            placeholderTextColor={colors.textDisabled}
            autoFocus={!initial}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>DNI</Text>
          <TextInput
            style={styles.input}
            value={dni}
            onChangeText={setDni}
            placeholder="DNI"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Dirección"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ciudad</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Ciudad"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        {branches.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Sucursal</Text>
            <SearchableSelect
              label="Sucursal"
              placeholder="Seleccionar sucursal"
              options={branches.map((b) => b.name)}
              selected={branchName ? [branchName] : []}
              onChange={(names) => {
                const id = branches.find((b) => b.name === names[0])?.id;
                setBranchId(id ?? '');
              }}
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Calificación</Text>
          <TextInput
            style={styles.input}
            value={classification}
            onChangeText={setClassification}
            placeholder="Ej: muy bueno, regular, sin datos"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Medio de pago</Text>
          {paymentMethods.length > 0 ? (
            <SearchableSelect
              label="Medio de pago"
              placeholder="Último medio de pago usado"
              options={paymentMethods.filter((p) => p.active).map((p) => p.name)}
              selected={paymentMethod ? [paymentMethod] : []}
              onChange={(names) => setPaymentMethod(names[0] ?? '')}
            />
          ) : (
            <TextInput
              style={styles.input}
              value={paymentMethod}
              onChangeText={setPaymentMethod}
              placeholder="Último medio de pago usado"
              placeholderTextColor={colors.textDisabled}
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas adicionales"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>{submitLabel}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing[4], gap: spacing[4] },
  field: { gap: spacing[1] },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: fontSize.base,
    color: colors.textPrimary,
    minHeight: 48,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: colors.error, fontSize: fontSize.sm },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing[2],
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});
