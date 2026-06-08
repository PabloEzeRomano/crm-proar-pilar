/**
 * components/tour/TourOverlay.tsx
 *
 * Full-screen absolute overlay rendered once in _layout.tsx.
 * Reads the current tour step from tourStore, measures it, and renders:
 *   - 4 semi-transparent Pressable panels forming a spotlight cutout
 *   - A highlight frame (border) around the active element
 *   - A TourTooltip card positioned above or below the element
 *
 * Returns null when currentIndex === null (tour not running).
 *
 * Cross-screen navigation:
 *   Uses TOUR_STEP_ROUTES (static config) to know the destination route for
 *   every step order — even before that screen has mounted and registered.
 *   Polls every 50ms (up to 1 second) waiting for the step to register.
 *
 * Alignment:
 *   On mount the overlay measures its own window-relative origin and subtracts
 *   it from every element rect. This corrects any offset introduced by
 *   safe-area containers or navigation wrappers in the React tree.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useTourStore,
  TOUR_STEP_ROUTES,
  TOUR_TOTAL_STEPS,
} from '@/stores/tourStore';
import type { StepRect } from '@/stores/tourStore';
import TourTooltip from './TourTooltip';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Padding added around the element to form the spotlight. */
const SPOTLIGHT_PADDING = 6;
/** Fallback tooltip height before first onLayout fires. */
const TOOLTIP_HEIGHT_FALLBACK = 160;
/** Maximum tooltip card width. */
const TOOLTIP_MAX_W = 300;
/** How often (ms) to poll for a step that hasn't registered yet. */
const NAV_POLL_MS = 50;
/** Maximum polling attempts before giving up (~1 second total). */
const NAV_MAX_RETRIES = 20;

const BACKDROP = 'rgba(0,0,0,0.65)';

// ── Component ─────────────────────────────────────────────────────────────────

export default function TourOverlay() {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const currentIndex = useTourStore((s) => s.currentIndex);
  const steps = useTourStore((s) => s.steps);
  const next = useTourStore((s) => s.next);
  const prev = useTourStore((s) => s.prev);
  const stop = useTourStore((s) => s.stop);
  const router = useRouter();

  const [rect, setRect] = useState<StepRect | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(TOOLTIP_HEIGHT_FALLBACK);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the previous currentIndex to detect tab changes (for backward navigation).
  const prevIndexRef = useRef<number | null>(null);

  // Self-measured origin of this overlay view in window coordinates.
  // Subtracting it from element rects corrects any container offset.
  const overlayRef = useRef<View>(null);
  const overlayOrigin = useRef({ x: 0, y: 0 });

  // Deterministic step id for the current index (step-1, step-2, …)
  const currentStepId =
    currentIndex !== null ? `step-${currentIndex + 1}` : null;

  // The registered step (has a live measure() fn) — may be null if screen not yet mounted
  const currentStep = currentStepId ? (steps[currentStepId] ?? null) : null;

  // ── Measure / cross-screen navigation ──────────────────────────────────────

  function clearRetry() {
    if (retryRef.current !== null) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  }

  function measureOverlayOrigin(): Promise<void> {
    return new Promise((resolve) => {
      if (!overlayRef.current) {
        resolve();
        return;
      }
      overlayRef.current.measureInWindow((x, y) => {
        overlayOrigin.current = { x, y };
        resolve();
      });
    });
  }

  async function measureStep(stepId: string) {
    const step = useTourStore.getState().steps[stepId];
    if (!step) return;

    await measureOverlayOrigin();
    const raw = await step.measure();

    if (raw && raw.width > 0) {
      setRect({
        x: raw.x - overlayOrigin.current.x,
        y: raw.y - overlayOrigin.current.y,
        width: raw.width,
        height: raw.height,
      });
    } else {
      // Registered but not painted yet — retry once after a frame
      retryRef.current = setTimeout(async () => {
        await measureOverlayOrigin();
        const retry = useTourStore.getState().steps[stepId];
        if (!retry) return;
        const r = await retry.measure();
        if (r && r.width > 0) {
          setRect({
            x: r.x - overlayOrigin.current.x,
            y: r.y - overlayOrigin.current.y,
            width: r.width,
            height: r.height,
          });
        }
      }, 100);
    }
  }

  function waitForStep(stepId: string, attempt: number) {
    retryRef.current = setTimeout(() => {
      const found = useTourStore.getState().steps[stepId];
      if (found) {
        measureStep(stepId);
      } else if (attempt < NAV_MAX_RETRIES) {
        waitForStep(stepId, attempt + 1);
      } else {
        stop();
      }
    }, NAV_POLL_MS);
  }

  // Fire on step change
  useEffect(() => {
    clearRetry();
    setTooltipHeight(TOOLTIP_HEIGHT_FALLBACK);

    if (currentIndex === null || currentStepId === null) {
      setRect(null);
      prevIndexRef.current = null;
      return;
    }

    const targetRoute = TOUR_STEP_ROUTES[currentIndex + 1];
    const prevRoute =
      prevIndexRef.current !== null
        ? TOUR_STEP_ROUTES[prevIndexRef.current + 1]
        : null;
    prevIndexRef.current = currentIndex;

    // Always navigate when switching tabs (covers both forward and backward navigation).
    // Expo Router keeps all tab screens mounted, so steps from hidden tabs remain registered
    // but their coordinates are wrong. Navigating ensures the correct tab is visible.
    const routeChanged = targetRoute && targetRoute !== prevRoute;
    if (routeChanged) {
      router.push(targetRoute as `/${string}`);
      waitForStep(currentStepId, 0);
      return;
    }

    const registered = useTourStore.getState().steps[currentStepId];
    if (!registered) {
      // Screen not yet mounted — navigate there using static route table
      if (targetRoute) {
        router.push(targetRoute as `/${string}`);
      }
      waitForStep(currentStepId, 0);
      return;
    }

    measureStep(currentStepId);
  }, [currentIndex]);

  // Re-measure when a new step registers (fires after cross-screen nav completes)
  useEffect(() => {
    if (currentStepId && steps[currentStepId] && rect === null) {
      measureStep(currentStepId);
    }
  }, [steps]);

  // Cleanup on unmount
  useEffect(() => () => clearRetry(), []);

  // ── Early return ─────────────────────────────────────────────────────────────

  if (currentIndex === null) return null;

  // ── Spotlight geometry ────────────────────────────────────────────────────

  // While rect is null (still measuring), render a fully opaque backdrop
  // so there's no flash of the underlying UI before positioning is ready.
  const hX = rect ? rect.x - SPOTLIGHT_PADDING : 0;
  const hY = rect ? rect.y - SPOTLIGHT_PADDING : 0;
  const hW = rect ? rect.width + SPOTLIGHT_PADDING * 2 : 0;
  const hH = rect ? rect.height + SPOTLIGHT_PADDING * 2 : 0;

  // 4 panels around the spotlight hole
  const topH = Math.max(0, hY);
  const bottomY = hY + hH;
  const bottomH = Math.max(0, screenH - bottomY);
  const leftW = Math.max(0, hX);
  const rightX = hX + hW;
  const rightW = Math.max(0, screenW - rightX);

  // ── Tooltip position ──────────────────────────────────────────────────────

  const spaceBelow = screenH - (hY + hH);
  const showAbove = spaceBelow < tooltipHeight + 16;

  const tooltipTop = showAbove
    ? Math.max(8, hY - tooltipHeight - 12)
    : hY + hH + 12;

  // Center the tooltip on the spotlight, clamped to screen edges.
  // When showing above AND the spotlight is near the right edge, also shift the
  // tooltip left so its right edge doesn't extend over the spotlight hole.
  let tooltipLeft = Math.max(
    8,
    Math.min(screenW - TOOLTIP_MAX_W - 8, hX + hW / 2 - TOOLTIP_MAX_W / 2)
  );
  if (showAbove) {
    const tooltipRight = tooltipLeft + TOOLTIP_MAX_W;
    if (tooltipRight > hX && tooltipLeft < hX + hW) {
      // Horizontally overlaps the spotlight — shift left clear of it
      tooltipLeft = Math.max(8, hX - TOOLTIP_MAX_W - 8);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // On web, `position: fixed` ensures the overlay is painted above all stacking
  // contexts created by Expo Router's navigator (which uses CSS transforms for
  // screen transitions). On native, absoluteFill is sufficient.
  const rootStyle =
    Platform.OS === 'web'
      ? [styles.root, styles.rootFixed]
      : [StyleSheet.absoluteFill, styles.root];

  return (
    <View ref={overlayRef} style={rootStyle} pointerEvents="box-none">
      {/* Top panel */}
      <Pressable
        style={[styles.backdrop, { top: 0, left: 0, right: 0, height: topH }]}
        onPress={stop}
        accessibilityLabel="Cerrar tour"
      />
      {/* Bottom panel */}
      <Pressable
        style={[
          styles.backdrop,
          { top: bottomY, left: 0, right: 0, height: bottomH },
        ]}
        onPress={stop}
        accessibilityLabel="Cerrar tour"
      />
      {/* Left panel */}
      <Pressable
        style={[
          styles.backdrop,
          { top: hY, left: 0, width: leftW, height: hH },
        ]}
        onPress={stop}
        accessibilityLabel="Cerrar tour"
      />
      {/* Right panel */}
      <Pressable
        style={[
          styles.backdrop,
          { top: hY, left: rightX, width: rightW, height: hH },
        ]}
        onPress={stop}
        accessibilityLabel="Cerrar tour"
      />

      {/* Highlight frame */}
      {rect && (
        <View
          style={[
            styles.highlight,
            {
              top: hY,
              left: hX,
              width: hW,
              height: hH,
              borderRadius:
                (currentStep?.borderRadius ?? 0) + SPOTLIGHT_PADDING,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Tooltip */}
      {rect && currentStep && (
        <View
          style={[
            styles.tooltipWrapper,
            { top: tooltipTop, left: tooltipLeft, maxWidth: TOOLTIP_MAX_W },
          ]}
          pointerEvents="box-none"
          onLayout={(e: LayoutChangeEvent) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0) setTooltipHeight(h);
          }}
        >
          <TourTooltip
            text={currentStep.text}
            currentIndex={currentIndex}
            total={TOUR_TOTAL_STEPS}
            onNext={next}
            onPrev={prev}
            onStop={stop}
          />
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    elevation: 9999,
  },
  // Web-only: position fixed to escape Expo Router's CSS transform stacking contexts
  rootFixed: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: 'absolute',
    backgroundColor: BACKDROP,
  },
  highlight: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.8)',
  },
  tooltipWrapper: {
    position: 'absolute',
  },
});
