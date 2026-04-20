import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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
import { useProductsStore } from '@/stores/productsStore';
import type { ProductType } from '@/types';
import type { CreatePresentationInput } from '@/validators/product';

// ---------------------------------------------------------------------------
// Type selector
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'commodity', label: 'Commodity' },
  { value: 'formulated', label: 'Formulado' },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function NewProductScreen() {
  const router = useRouter();
  const createProduct = useProductsStore((s) => s.createProduct);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<ProductType>('commodity');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // First presentation
  const [presLabel, setPresLabel] = useState('');
  const [presUnit, setPresUnit] = useState('');
  const [presQty, setPresQty] = useState('');
  const [presPrice, setPresPrice] = useState('');

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    if (!presLabel.trim() || !presUnit.trim()) {
      Alert.alert('Error', 'Completá la presentación (etiqueta y unidad)');
      return;
    }
    const priceVal = parseFloat(presPrice);
    if (isNaN(priceVal) || priceVal < 0) {
      Alert.alert('Error', 'Ingresá un precio válido');
      return;
    }

    const presentation: CreatePresentationInput = {
      label: presLabel.trim(),
      unit: presUnit.trim(),
      price_usd: priceVal,
      quantity: presQty.trim() ? parseFloat(presQty) || null : null,
    };

    setSaving(true);
    const result = await createProduct({
      name: name.trim(),
      code: code.trim() || null,
      type,
      notes: notes.trim() || null,
      presentations: [presentation],
    });
    setSaving(false);

    if (result) {
      router.replace(`/products/${result.id}` as never);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Datos del producto</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre *"
        placeholderTextColor={colors.textDisabled}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Código (opcional)"
        placeholderTextColor={colors.textDisabled}
        value={code}
        onChangeText={setCode}
      />

      {/* Type selector */}
      <View style={styles.typeRow}>
        {TYPE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.typeBtn, type === opt.value && styles.typeBtnActive]}
            onPress={() => setType(opt.value)}
            accessibilityRole="radio"
          >
            <Text
              style={[
                styles.typeBtnText,
                type === opt.value && styles.typeBtnTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Notas (opcional)"
        placeholderTextColor={colors.textDisabled}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.sectionTitle, { marginTop: spacing[4] }]}>
        Primera presentación *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Etiqueta (ej. Bolsa 25kg) *"
        placeholderTextColor={colors.textDisabled}
        value={presLabel}
        onChangeText={setPresLabel}
      />
      <View style={styles.row2}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Unidad *"
          placeholderTextColor={colors.textDisabled}
          value={presUnit}
          onChangeText={setPresUnit}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Cantidad"
          placeholderTextColor={colors.textDisabled}
          value={presQty}
          onChangeText={setPresQty}
          keyboardType="decimal-pad"
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Precio USD *"
        placeholderTextColor={colors.textDisabled}
        value={presPrice}
        onChangeText={setPresPrice}
        keyboardType="decimal-pad"
      />

      <Pressable
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleCreate}
        disabled={saving}
        accessibilityRole="button"
      >
        <Text style={styles.saveBtnText}>
          {saving ? 'Guardando…' : 'Crear producto'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing[4],
    gap: spacing[3],
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight ?? '#EFF6FF',
  },
  typeBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium as '500',
  },
  typeBtnTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as '600',
  },
  row2: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
  },
});
