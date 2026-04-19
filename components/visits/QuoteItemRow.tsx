import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/constants/theme'
import { QuoteItem } from '@/types'

interface Props {
  item: QuoteItem
  onChangeQuantity: (qty: number) => void
  onChangeMargin: (pct: number) => void
  onRemove: () => void
}

export default function QuoteItemRow({ item, onChangeQuantity, onChangeMargin, onRemove }: Props) {
  const [qtyText, setQtyText] = useState(String(item.quantity))
  const [marginText, setMarginText] = useState(String(item.margin_pct))

  function handleQtyChange(text: string) {
    setQtyText(text)
    const n = parseFloat(text)
    if (!isNaN(n) && n > 0) onChangeQuantity(n)
  }

  function handleMarginChange(text: string) {
    setMarginText(text)
    const n = parseFloat(text)
    if (!isNaN(n) && n >= 0) onChangeMargin(n)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.product_code ? `[${item.product_code}] ` : ''}{item.product_name}
          </Text>
          <Text style={styles.presentationLabel}>
            {item.presentation_label} · {item.unit}
          </Text>
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Quitar producto"
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.inputs}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cant.</Text>
          <TextInput
            style={styles.input}
            value={qtyText}
            onChangeText={handleQtyChange}
            keyboardType="numeric"
            selectTextOnFocus
            accessibilityLabel="Cantidad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Margen</Text>
          <View style={styles.marginWrapper}>
            <TextInput
              style={[styles.input, styles.marginInput]}
              value={marginText}
              onChangeText={handleMarginChange}
              keyboardType="numeric"
              selectTextOnFocus
              accessibilityLabel="Porcentaje de margen"
            />
            <Text style={styles.percentSuffix}>%</Text>
          </View>
        </View>

        <View style={styles.totalGroup}>
          <Text style={styles.inputLabel}>Total</Text>
          <Text style={styles.totalValue}>
            ${item.total_usd.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} USD
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  productInfo: {
    flex: 1,
    gap: spacing[1],
  },
  productName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
  presentationLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  inputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  inputGroup: {
    gap: spacing[1],
  },
  inputLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  input: {
    height: 36,
    width: 64,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[2],
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  marginWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marginInput: {
    width: 52,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  percentSuffix: {
    height: 36,
    paddingHorizontal: spacing[2],
    lineHeight: 36,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
  },
  totalGroup: {
    flex: 1,
    gap: spacing[1],
    alignItems: 'flex-end',
  },
  totalValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
  },
})
