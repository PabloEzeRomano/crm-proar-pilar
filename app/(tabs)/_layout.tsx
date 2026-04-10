/**
 * app/(tabs)/_layout.tsx — Bottom tab bar layout
 *
 * Tabs: Hoy (Today), Clientes (Clients), Visitas (Visits), Equipo (Team - admin + web only).
 * Visual values come exclusively from constants/theme.ts and constants/brand.ts.
 * Icons: MaterialCommunityIcons from @expo/vector-icons (bundled with Expo).
 */

import { Platform, useWindowDimensions } from 'react-native'
import { Tabs } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { brand } from '@/constants/brand'
import { colors, fontSize, spacing, BREAKPOINT_WIDE, MAX_CONTAINER_WIDTH } from '@/constants/theme'
import { useAuthStore } from '@/stores/authStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

// ---------------------------------------------------------------------------
// Tab icon helper
// ---------------------------------------------------------------------------

interface TabIconProps {
  activeIcon: MCIconName
  inactiveIcon: MCIconName
  focused: boolean
  color: string
}

function TabIcon({ activeIcon, inactiveIcon, focused, color }: TabIconProps) {
  return (
    <MaterialCommunityIcons
      name={focused ? activeIcon : inactiveIcon}
      size={24}
      color={color}
    />
  )
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function TabsLayout() {
  const profile = useAuthStore((state) => state.profile)
  const isAdminOnWeb = profile?.role === 'admin' && Platform.OS === 'web'
  const { width } = useWindowDimensions()

  // On web screens > 768px wide, constrain content to 480px and center it
  const isWideScreen = Platform.OS === 'web' && width > BREAKPOINT_WIDE

  // Screen options with responsive container styling
  const screenOptions = {
    // ── Tab bar ──────────────────────────────────────────────────
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

    // ── Screen header ─────────────────────────────────────────────
    headerStyle: {
      backgroundColor: colors.surface,
    },
    headerTitleAlign: 'center' as const,
    headerShadowVisible: false,
    headerTintColor: colors.primary,
    headerTitleStyle: {
      fontSize: fontSize.lg,
      fontWeight: '600' as const, // fontWeight.semibold — must be a string literal for RN header
      color: colors.textPrimary,
    },
    // headerBackButtonMenuEnabled: false,

    // ── Responsive: constrain width on wide web screens ──────────
    ...(isWideScreen && {
      cardStyle: {
        width: MAX_CONTAINER_WIDTH,
        alignSelf: 'center',
        marginHorizontal: 'auto' as const,
      },
    }),
  }

  return (
    <Tabs screenOptions={screenOptions}>
      {/* ── Agenda (Today) ───────────────────────────────────────────── */}
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          headerShown: false, // nested Stack in agenda/_layout.tsx owns the header
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              activeIcon="home"
              inactiveIcon="home-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      {/* ── Clientes (Clients) ───────────────────────────────────────── */}
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clientes',
          headerShown: false, // nested Stack in clients/_layout.tsx owns the header
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

      {/* ── Visitas (Visits) ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Visitas',
          headerShown: false, // nested Stack in visits/_layout.tsx owns the header
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              activeIcon="calendar"
              inactiveIcon="calendar-outline"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      {/* ── Equipo (Team) — admin + web only ──────────────────────────────── */}
      <Tabs.Screen
        name="team"
        options={{
          title: 'Equipo',
          href: isAdminOnWeb ? undefined : null, // hide unless admin + web
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

      {/* Settings is accessible from the Today header; hide its tab entry */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configuración',
          href: null, // hide from tab bar; navigated to via header icon
        }}
      />

      {/* Users management — admin/root only; navigated to from Settings */}
      <Tabs.Screen
        name="users"
        options={{
          title: 'Usuarios',
          href: null, // hide from tab bar
        }}
      />
    </Tabs>
  )
}
