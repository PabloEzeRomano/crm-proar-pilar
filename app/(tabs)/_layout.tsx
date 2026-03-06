/**
 * app/(tabs)/_layout.tsx — Bottom tab bar layout
 *
 * Three tabs: Hoy (Today), Clientes (Clients), Visitas (Visits).
 * Visual values come exclusively from constants/theme.ts and constants/brand.ts.
 * Icons: MaterialCommunityIcons from @expo/vector-icons (bundled with Expo).
 */

import { Tabs } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { brand } from '@/constants/brand'
import { colors, fontSize } from '@/constants/theme'

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
  return (
    <Tabs
      screenOptions={{
        // ── Tab bar ──────────────────────────────────────────────────
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: brand.primaryColor,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
        },

        // ── Screen header ─────────────────────────────────────────────
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontSize: fontSize.lg,
          fontWeight: '600', // fontWeight.semibold — must be a string literal for RN header
          color: colors.textPrimary,
        },
        // headerBackButtonMenuEnabled: false,
      }}
    >
      {/* ── Agenda (Today) ───────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Agenda',
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

      {/* Settings is accessible from the Today header; hide its tab entry */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configuración',
          href: null, // hide from tab bar; navigated to via header icon
        }}
      />
    </Tabs>
  )
}
