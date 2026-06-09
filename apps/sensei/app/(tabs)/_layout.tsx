import { Platform, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { brand } from '@/constants/brand';
import {
  colors,
  fontSize,
  spacing,
  BREAKPOINT_WIDE,
  MAX_CONTAINER_WIDTH,
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabIconProps {
  activeIcon: MCIconName;
  inactiveIcon: MCIconName;
  focused: boolean;
  color: string;
}

function TabIcon({ activeIcon, inactiveIcon, focused, color }: TabIconProps) {
  return (
    <MaterialCommunityIcons
      name={focused ? activeIcon : inactiveIcon}
      size={24}
      color={color}
    />
  );
}

export default function TabsLayout() {
  const profile = useAuthStore((state) => state.profile);
  const isAdminOrRoot = profile?.role === 'admin' || profile?.role === 'root';
  const { width } = useWindowDimensions();

  const isWideScreen = Platform.OS === 'web' && width > BREAKPOINT_WIDE;

  const screenOptions = {
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
    headerTitleAlign: 'center' as const,
    headerShadowVisible: false,
    headerTintColor: colors.primary,
    headerTitleStyle: {
      fontSize: fontSize.lg,
      fontWeight: '600' as const,
      color: colors.textPrimary,
    },
    ...(isWideScreen && {
      cardStyle: {
        width: MAX_CONTAINER_WIDTH,
        alignSelf: 'center',
        marginHorizontal: 'auto' as const,
      },
    }),
  };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              activeIcon="view-dashboard"
              inactiveIcon="view-dashboard-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Campañas',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              activeIcon="bullhorn"
              inactiveIcon="bullhorn-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="interactions"
        options={{
          title: 'Gestiones',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              activeIcon="clipboard-check"
              inactiveIcon="clipboard-check-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clientes',
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
        name="team"
        options={{
          title: 'Equipo',
          href: isAdminOrRoot ? undefined : null,
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              activeIcon="account-multiple"
              inactiveIcon="account-multiple-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
