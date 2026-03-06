/**
 * components/OnboardingTour.tsx — First-time onboarding tour
 *
 * A full-screen modal that walks the user through 5 steps.
 * Dismissed via "Siguiente" / "Comenzar" (last step).
 * On completion, calls authStore.completeTour() which sets show_tour = false.
 */

import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'
import { brand } from '@/constants/brand'
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@/constants/theme'

// ---------------------------------------------------------------------------
// Tour steps
// ---------------------------------------------------------------------------

interface Step {
  icon: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: 'hand-wave-outline',
    title: `¡Bienvenido a ${brand.appName}!`,
    body: 'Tu agenda de visitas de ventas. En unos pasos te mostramos todo lo que podés hacer.',
  },
  {
    icon: 'calendar-today',
    title: 'Agenda',
    body: 'Mirá tus visitas de hoy, esta semana o este mes. Tocá una visita para ver detalles y agregar notas.',
  },
  {
    icon: 'account-group-outline',
    title: 'Clientes',
    body: 'Tu cartera de clientes. Buscá, filtrá y tocá un cliente para ver su historial de visitas.',
  },
  {
    icon: 'map-marker-check-outline',
    title: 'Visitas',
    body: 'Todas tus visitas en un solo lugar. Filtrá por estado o por próximas visitas agendadas.',
  },
  {
    icon: 'email-newsletter',
    title: 'Resumen semanal',
    body: 'Activá el resumen semanal en Configuración para recibir un email con tus visitas cada lunes.',
  },
  {
    icon: 'file-excel-outline',
    title: 'Importar clientes y visitas',
    body: 'Importá tus visitas y clientes desde un archivo excel o CSV en Configuración.',
  }
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingTour() {
  const completeTour = useAuthStore((s) => s.completeTour)
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  function handleNext() {
    if (isLast) {
      completeTour()
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleSkip() {
    completeTour()
  }

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Skip button */}
                      <Pressable
              style={styles.skipButton}
              onPress={!isLast ? handleSkip : () => {}}
              accessibilityRole="button"
              accessibilityLabel="Saltar tour"
            >
              <Text style={styles.skipLabel}>{!isLast ? 'Saltar' : ''}</Text>
            </Pressable>


          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={current.icon as never}
              size={56}
              color={colors.primary}
            />
          </View>

          {/* Text */}
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === step && styles.dotActive]}
              />
            ))}
          </View>

          {/* CTA button */}
          <Pressable
            style={styles.button}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Comenzar' : 'Siguiente'}
          >
            <Text style={styles.buttonLabel}>
              {isLast ? 'Comenzar' : 'Siguiente'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
  },

  // Skip
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    marginBottom: spacing[2],
    minHeight: 36,
    justifyContent: 'center',
  },
  skipLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as '500',
    color: colors.textSecondary,
  },

  // Icon
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },

  // Text
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },

  // Dots
  dots: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 20,
  },

  // Button
  button: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold as '600',
    color: colors.textOnPrimary,
  },
})
