import { Link, Stack } from 'expo-router'
import { Text, View, StyleSheet } from 'react-native'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text>This screen does not exist.</Text>
        <Link href="/">Go home</Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
