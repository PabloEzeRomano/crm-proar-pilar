import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/constants/theme';

export default function CampaignsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Gestión de campañas comerciales — próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: fontSize.base, color: colors.textDisabled, paddingHorizontal: spacing[6], textAlign: 'center' },
});
