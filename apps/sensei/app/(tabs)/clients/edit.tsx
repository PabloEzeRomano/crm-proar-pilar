import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ClientForm, { type ClientFormValues } from '@/components/ClientForm';
import { colors, fontSize, spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useClientsStore } from '@/stores/clientsStore';
import { clientSchema } from '@/validators/client';

export default function EditClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'root';

  const clients = useClientsStore((s) => s.clients);
  const client = clients.find((c) => c.id === id);
  const updateClient = useClientsStore((s) => s.updateClient);
  const storeError = useClientsStore((s) => s.error);

  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!client) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Cliente no encontrado</Text>
      </View>
    );
  }

  const handleSubmit = async (values: ClientFormValues) => {
    const result = clientSchema.safeParse({
      name: values.name.trim(),
      cuit: values.dni.trim() || undefined,
      address: values.address.trim() || undefined,
      city: values.city.trim() || undefined,
      branch_id: values.branchId || undefined,
      commercial_classification: values.classification.trim() || undefined,
      last_payment_method: values.paymentMethod.trim() || undefined,
      notes: values.notes.trim() || undefined,
    });

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }

    setValidationError(null);
    setSaving(true);

    await updateClient(client.id, {
      name: result.data.name,
      cuit: result.data.cuit ?? null,
      address: result.data.address ?? null,
      city: result.data.city ?? null,
      branch_id: result.data.branch_id ?? null,
      commercial_classification: result.data.commercial_classification ?? null,
      last_payment_method: result.data.last_payment_method ?? null,
      notes: result.data.notes ?? null,
    });

    setSaving(false);

    if (!useClientsStore.getState().error) router.back();
  };

  return (
    <ClientForm
      initial={{
        name: client.name,
        dni: client.cuit ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
        branchId: client.branch_id ?? '',
        classification: client.commercial_classification ?? '',
        paymentMethod: client.last_payment_method ?? '',
        notes: client.notes ?? '',
      }}
      submitLabel="Guardar cambios"
      submitting={saving}
      error={validationError || storeError}
      canEditIdentity={isAdmin}
      onSubmit={handleSubmit}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing[8],
  },
  emptyText: { fontSize: fontSize.base, color: colors.textSecondary },
});
