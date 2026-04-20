import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
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
  shadows,
  spacing,
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProductsStore } from '@/stores/productsStore';
import type { Product, ProductPresentation } from '@/types';
import type {
  UpdateProductInput,
  CreatePresentationInput,
} from '@/validators/product';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number) {
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USD`;
}

// ---------------------------------------------------------------------------
// Presentation row
// ---------------------------------------------------------------------------

function PresentationRow({
  pres,
  isAdmin,
  onDelete,
}: {
  pres: ProductPresentation;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={styles.presRow}>
      <View style={styles.presInfo}>
        <Text style={styles.presLabel}>{pres.label}</Text>
        <Text style={styles.presSub}>
          {pres.unit}
          {pres.quantity != null ? ` · ${pres.quantity}` : ''}
        </Text>
      </View>
      <Text style={styles.presPrice}>{formatPrice(pres.price_usd)}</Text>
      {isAdmin && (
        <Pressable
          style={styles.presDelete}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Eliminar presentación"
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={18}
            color={colors.error}
          />
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Add presentation inline form
// ---------------------------------------------------------------------------

function AddPresentationForm({
  onAdd,
}: {
  onAdd: (data: CreatePresentationInput) => void;
}) {
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  function submit() {
    const priceVal = parseFloat(price);
    if (!label.trim() || !unit.trim() || isNaN(priceVal) || priceVal < 0)
      return;
    onAdd({
      label: label.trim(),
      unit: unit.trim(),
      price_usd: priceVal,
      quantity: quantity.trim() ? parseFloat(quantity) || null : null,
    });
    setLabel('');
    setUnit('');
    setPrice('');
    setQuantity('');
  }

  return (
    <View style={styles.addPresForm}>
      <Text style={styles.addPresTitle}>Nueva presentación</Text>
      <TextInput
        style={styles.input}
        placeholder="Etiqueta (ej. Bolsa 25kg)"
        placeholderTextColor={colors.textDisabled}
        value={label}
        onChangeText={setLabel}
      />
      <View style={styles.row2}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Unidad (ej. kg)"
          placeholderTextColor={colors.textDisabled}
          value={unit}
          onChangeText={setUnit}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Cantidad"
          placeholderTextColor={colors.textDisabled}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Precio USD"
        placeholderTextColor={colors.textDisabled}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />
      <Pressable
        style={styles.addPresBtn}
        onPress={submit}
        accessibilityRole="button"
      >
        <Text style={styles.addPresBtnText}>Agregar</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'root';

  const products = useProductsStore((s) => s.products);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const deleteProduct = useProductsStore((s) => s.deleteProduct);
  const addPresentation = useProductsStore((s) => s.addPresentation);
  const deletePresentation = useProductsStore((s) => s.deletePresentation);

  const product: Product | undefined = products.find((p) => p.id === id);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCode(product.code ?? '');
      setNotes(product.notes ?? '');
    }
  }, [product?.id]);

  useLayoutEffect(() => {
    if (!isAdmin || !product) return;
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setEditing((v) => !v)}
          style={{ marginRight: spacing[4] }}
          hitSlop={8}
        >
          <Text style={{ color: colors.primary, fontSize: fontSize.base }}>
            {editing ? 'Cancelar' : 'Editar'}
          </Text>
        </Pressable>
      ),
    });
  }, [isAdmin, editing, product]);

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Producto no encontrado</Text>
      </View>
    );
  }

  async function handleSave() {
    const data: UpdateProductInput = {
      name: name.trim() || product!.name,
      code: code.trim() || null,
      notes: notes.trim() || null,
    };
    await updateProduct(product!.id, data);
    setEditing(false);
  }

  function handleDelete() {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${product!.name}"? Esto eliminará todas sus presentaciones.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteProduct(product!.id);
            router.back();
          },
        },
      ]
    );
  }

  function handleDeletePresentation(presId: string) {
    Alert.alert('Eliminar presentación', '¿Eliminar esta presentación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deletePresentation(presId),
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Info section ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        {editing ? (
          <View style={styles.editForm}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nombre"
              placeholderTextColor={colors.textDisabled}
            />
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="Código (opcional)"
              placeholderTextColor={colors.textDisabled}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas (opcional)"
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={3}
            />
            <View style={styles.editActions}>
              <Pressable
                style={styles.saveBtn}
                onPress={handleSave}
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>Guardar</Text>
              </Pressable>
              {profile?.role === 'root' && (
                <Pressable
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  accessibilityRole="button"
                >
                  <Text style={styles.deleteBtnText}>Eliminar producto</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <InfoRow label="Nombre" value={product.name} />
            <InfoRow
              label="Tipo"
              value={product.type === 'commodity' ? 'Commodity' : 'Formulado'}
            />
            {product.code && <InfoRow label="Código" value={product.code} />}
            {product.notes && <InfoRow label="Notas" value={product.notes} />}
          </View>
        )}
      </View>

      {/* ── Presentations section ────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Presentaciones</Text>
        {product.presentations.length === 0 ? (
          <Text style={styles.emptyText}>Sin presentaciones</Text>
        ) : (
          <View style={styles.presList}>
            {product.presentations.map((pres) => (
              <PresentationRow
                key={pres.id}
                pres={pres}
                isAdmin={isAdmin}
                onDelete={() => handleDeletePresentation(pres.id)}
              />
            ))}
          </View>
        )}

        {isAdmin && (
          <AddPresentationForm
            onAdd={(data) => addPresentation(product.id, data)}
          />
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[4],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    ...shadows.subtle,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing[4],
  },
  editForm: {
    gap: spacing[3],
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
  editActions: {
    gap: spacing[2],
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: colors.error,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
  },
  presList: {
    gap: spacing[2],
  },
  presRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[3],
    ...shadows.subtle,
    minHeight: 56,
  },
  presInfo: {
    flex: 1,
    gap: spacing[1],
  },
  presLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium as '500',
    color: colors.textPrimary,
  },
  presSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  presPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.primary,
  },
  presDelete: {
    padding: spacing[1],
  },
  addPresForm: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addPresTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textSecondary,
  },
  row2: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  addPresBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  addPresBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
});
