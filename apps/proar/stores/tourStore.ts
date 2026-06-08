/**
 * stores/tourStore.ts — EP-019 Onboarding Tour v3
 *
 * Self-contained store. No Platform.OS branches.
 * Steps self-register via TourStep components from any screen.
 * TourOverlay drives rendering; this store is the single source of truth.
 *
 * Flow:
 *  1. TourStep components mount → register() adds them to the steps registry
 *  2. startTour() / start() sets currentIndex = 0
 *  3. TourOverlay reads currentIndex, measures the step, shows spotlight + tooltip
 *  4. next() advances; stop() clears currentIndex and calls completeTour()
 */

import { create } from 'zustand';
import { useAuthStore } from './authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Absolute screen-space bounding box of a registered step element. */
export interface StepRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A tour step as registered by TourStep on mount.
 * `measure` is called by TourOverlay when it needs fresh screen coordinates.
 */
export interface TourStep {
  id: string; // deterministic: `step-${order}`
  order: number; // global sort order (1–8 across all screens)
  text: string;
  borderRadius?: number;
  routePath?: string; // if set, TourOverlay navigates here when step isn't mounted yet
  measure: () => Promise<StepRect | null>;
}

interface TourState {
  steps: Record<string, TourStep>;
  currentIndex: number | null; // null = tour not running; 0-based index into sorted array
  register: (step: TourStep) => void;
  unregister: (id: string) => void;
  start: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  /** Entry point kept for _layout.tsx + settings compat — delegates to start() */
  startTour: () => void;
}

// ── Static config ──────────────────────────────────────────────────────────────
// Declaring total steps and route paths statically means TourOverlay can navigate
// to the right screen and compute dot counts BEFORE that screen has mounted
// and self-registered its steps. Without this, next() would stop early (only 3
// steps visible on agenda) and the overlay would fail to navigate cross-screen.

/** Total number of tour steps across all screens. */
export const TOUR_TOTAL_STEPS = 10;

/**
 * Route path for each step order (1-based).
 * Used by TourOverlay to navigate when a step's screen is not yet mounted.
 */
export const TOUR_STEP_ROUTES: Record<number, string> = {
  1: '/(tabs)/agenda',
  2: '/(tabs)/agenda',
  3: '/(tabs)/agenda',
  4: '/(tabs)/clients',
  5: '/(tabs)/clients',
  6: '/(tabs)/clients',
  7: '/(tabs)/visits',
  8: '/(tabs)/visits',
  9: '/(tabs)/settings',
  10: '/(tabs)/settings',
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTourStore = create<TourState>((set, get) => ({
  steps: {},
  currentIndex: null,

  register: (step) => set((s) => ({ steps: { ...s.steps, [step.id]: step } })),

  unregister: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.steps;
      return { steps: rest };
    }),

  start: () => set({ currentIndex: 0 }),

  next: () => {
    const { currentIndex, stop } = get();
    if (currentIndex === null) return;
    if (currentIndex >= TOUR_TOTAL_STEPS - 1) {
      stop();
    } else {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  prev: () => {
    const { currentIndex } = get();
    if (currentIndex === null || currentIndex === 0) return;
    set({ currentIndex: currentIndex - 1 });
  },

  stop: () => {
    set({ currentIndex: null });
    // Fire-and-forget: persists show_tour=false in DB + Zustand
    useAuthStore.getState().completeTour();
  },

  startTour: () => get().start(),
}));
