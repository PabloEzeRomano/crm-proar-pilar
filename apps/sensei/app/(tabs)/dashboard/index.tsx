import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';
import { brand } from '@/constants/brand';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardScreen() {
  const profile = useAuthStore((s) => s.profile);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{brand.appName}</Text>
      <Text style={styles.subtitle}>
        Bienvenido{profile?.full_name ? `, ${profile.full_name}` : ''}
      </Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Dashboard de campañas — próximamente
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing[6],
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing[16],
  },
  placeholderText: {
    fontSize: fontSize.base,
    color: colors.textDisabled,
  },
});
