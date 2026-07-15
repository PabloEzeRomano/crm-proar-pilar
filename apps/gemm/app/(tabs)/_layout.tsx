import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { brand } from '@/constants/brand';
import { colors, fontSize, spacing } from '@/constants/theme';

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({
  activeIcon,
  inactiveIcon,
  focused,
  color,
}: {
  activeIcon: MCIconName;
  inactiveIcon: MCIconName;
  focused: boolean;
  color: string;
}) {
  return (
    <MaterialCommunityIcons
      name={focused ? activeIcon : inactiveIcon}
      size={24}
      color={color}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          minHeight: 56,
        },
        tabBarActiveTintColor: brand.primaryColor,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: fontSize.sm,
          marginBottom: spacing[1],
        },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontSize: fontSize.lg,
          fontWeight: '600',
          color: colors.textPrimary,
        },
      }}
    >
      <Tabs.Screen
        name="pipeline"
        options={{
          title: 'Pipeline',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              activeIcon="view-column"
              inactiveIcon="view-column-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="prospects"
        options={{
          title: 'Prospectos',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              activeIcon="account-group"
              inactiveIcon="account-group-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="correos"
        options={{
          title: 'Correos',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              activeIcon="email"
              inactiveIcon="email-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden tabs — navigated to programmatically */}
      <Tabs.Screen name="settings" options={{ title: 'Configuración', href: null }} />
      <Tabs.Screen name="import" options={{ title: 'Importar', href: null, headerShown: false }} />
    </Tabs>
  );
}
