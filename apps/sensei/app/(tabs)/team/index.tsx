import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  shadows,
  spacing,
} from '@/constants/theme';

interface MenuItemProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  subtitle: string;
  onPress: () => void;
}

function MenuItem({ icon, label, subtitle, onPress }: MenuItemProps) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={colors.textDisabled}
      />
    </Pressable>
  );
}

export default function TeamScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <MenuItem
        icon="office-building"
        label="Sucursales"
        subtitle="Administrar sucursales de la empresa"
        onPress={() => router.push('/team/branches')}
      />
      <MenuItem
        icon="account-group"
        label="Colaboradores"
        subtitle="Gestionar colaboradores y permisos"
        onPress={() => router.push('/team/users')}
      />
      <MenuItem
        icon="clipboard-list"
        label="Motivos de rechazo"
        subtitle="Configurar motivos de rechazo"
        onPress={() => router.push('/team/rejection-reasons')}
      />
      <MenuItem
        icon="credit-card-outline"
        label="Medios de pago"
        subtitle="Configurar medios de pago"
        onPress={() => router.push('/team/payment-methods')}
      />
      <MenuItem
        icon="bank-outline"
        label="Financieras"
        subtitle="Configurar financieras"
        onPress={() => router.push('/team/financiers')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    gap: spacing[3],
    ...shadows.subtle,
    minHeight: 56,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
