import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <View style={styles.container}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={colors.textSecondary}
          style={styles.icon}
        />
        <Text style={styles.title}>Página no encontrada</Text>
        <Text style={styles.description}>
          La pantalla que buscas no existe en esta aplicación.
        </Text>
        <Link href="/" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Ir al inicio</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing[4],
    gap: spacing[4],
  },
  icon: {
    marginBottom: spacing[2],
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.base * 1.5,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: '#FFFFFF',
  },
});
