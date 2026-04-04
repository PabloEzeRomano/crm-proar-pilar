/**
 * components/tour/TourStep.tsx
 *
 * Transparent wrapper that marks any UI element as a tour step.
 * Registers itself into tourStore on mount, unregisters on unmount.
 * The `measure` callback is called by TourOverlay when this step becomes
 * active, returning fresh screen-relative coordinates via measureInWindow.
 *
 * Renders children inside a <View ref collapsable={false}> with no extra
 * styles, so it is layout-neutral.
 */

import React, { useEffect, useRef } from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'
import { useTourStore } from '@/stores/tourStore'
import type { StepRect } from '@/stores/tourStore'

interface TourStepProps {
  order: number
  text: string
  borderRadius?: number
  /** If set, TourOverlay navigates here when this step is not yet mounted. */
  routePath?: string
  children: React.ReactNode
  /** Optional style forwarded to the wrapper View — use for flex passthrough. */
  wrapperStyle?: StyleProp<ViewStyle>
}

export default function TourStep({
  order,
  text,
  borderRadius,
  routePath,
  children,
  wrapperStyle,
}: TourStepProps) {
  const viewRef = useRef<View>(null)
  const register = useTourStore((s) => s.register)
  const unregister = useTourStore((s) => s.unregister)
  const id = `step-${order}`

  /**
   * Returns screen-relative position via measureInWindow.
   * measureInWindow gives coordinates relative to the device window, which
   * matches the coordinate space of the full-screen TourOverlay.
   * collapsable={false} on the View prevents Android's view flattening
   * optimizer from making the ref stale.
   */
  function measure(): Promise<StepRect | null> {
    return new Promise((resolve) => {
      if (!viewRef.current) {
        resolve(null)
        return
      }
      // On React Native Web the ref IS the DOM element — scroll it into view
      // only if it is currently outside the visible viewport. Fixed/absolute
      // elements (e.g. FABs) are always visible; calling scrollIntoView on them
      // scrolls the page and pushes their bounding rect off-screen. We guard
      // against this by checking getBoundingClientRect first.
      const domEl = viewRef.current as any
      if (typeof document !== 'undefined' && typeof domEl?.getBoundingClientRect === 'function') {
        const r = domEl.getBoundingClientRect()

        // Find nearest scrollable ancestor to use as the visible bounds.
        // window.innerHeight is wrong here: the element may be inside a
        // ScrollView div that ends before the window bottom (e.g. settings
        // page with a tab bar below). Using the container bounds catches that.
        let scrollAncestor: Element | null = domEl.parentElement
        while (scrollAncestor && scrollAncestor !== document.documentElement) {
          const s = window.getComputedStyle(scrollAncestor)
          if (s.overflowY === 'scroll' || s.overflowY === 'auto' ||
              s.overflow === 'scroll' || s.overflow === 'auto') break
          scrollAncestor = scrollAncestor.parentElement
        }
        const container = (scrollAncestor && scrollAncestor !== document.documentElement)
          ? scrollAncestor.getBoundingClientRect()
          : { top: 0, left: 0, bottom: window.innerHeight ?? 0, right: window.innerWidth ?? 0 }

        const inViewport =
          r.top >= container.top &&
          r.left >= container.left &&
          r.bottom <= container.bottom &&
          r.right <= container.right
        if (!inViewport) {
          domEl.scrollIntoView?.({ behavior: 'instant', block: 'nearest' })
        }
      }

      // Give the browser one frame to apply the scroll before sampling coords.
      setTimeout(() => {
        viewRef.current?.measureInWindow((x, y, width, height) => {
          if (width === 0 && height === 0) {
            resolve(null)
          } else {
            resolve({ x, y, width, height })
          }
        })
      }, 50)
    })
  }

  useEffect(() => {
    register({ id, order, text, borderRadius, routePath, measure })
    return () => unregister(id)
  }, [order, text, borderRadius, routePath]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View ref={viewRef} collapsable={false} style={wrapperStyle}>
      {children}
    </View>
  )
}
