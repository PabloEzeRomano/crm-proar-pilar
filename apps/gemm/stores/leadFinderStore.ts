import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ProspectProduct } from '@/types';
import type { LeadSearch, LeadPlace, PlaceSortKey, PlaceFilters } from '@/types/leadFinder';
import type { CreateLeadSearchInput } from '@/validators/leadFinder';

interface LeadFinderState {
  searches: LeadSearch[];
  placesBySearch: Record<string, LeadPlace[]>;
  loadingSearches: boolean;
  error: string | null;

  fetchSearches: () => Promise<void>;
  fetchPlaces: (searchId: string) => Promise<void>;
  createSearch: (input: CreateLeadSearchInput) => Promise<string | null>;
  importPlace: (placeId: string, product: ProspectProduct) => Promise<string | null>;
  updatePlaceFromRealtime: (place: LeadPlace) => void;
  updateSearchFromRealtime: (search: LeadSearch) => void;
}

export const useLeadFinderStore = create<LeadFinderState>((set, get) => ({
  searches: [],
  placesBySearch: {},
  loadingSearches: false,
  error: null,

  fetchSearches: async () => {
    set({ loadingSearches: true, error: null });
    const { data, error } = await supabase
      .from('lead_searches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      set({ error: error.message, loadingSearches: false });
      return;
    }
    set({ searches: (data ?? []) as LeadSearch[], loadingSearches: false });
  },

  fetchPlaces: async (searchId: string) => {
    const { data, error } = await supabase
      .from('lead_places')
      .select('*')
      .eq('search_id', searchId)
      .order('created_at', { ascending: true });
    if (error) return;
    set((s) => ({
      placesBySearch: {
        ...s.placesBySearch,
        [searchId]: (data ?? []) as LeadPlace[],
      },
    }));
  },

  createSearch: async (input: CreateLeadSearchInput) => {
    const profile = useAuthStore.getState().profile;
    const userId = useAuthStore.getState().session?.user?.id;
    if (!profile?.company_id || !userId) return null;

    set({ error: null });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await supabase.functions.invoke('lead-search', {
      body: {
        query: input.query,
        locationText: input.locationText,
        minRating: input.minRating ?? null,
        minReviews: input.minReviews ?? null,
      },
    });

    if (response.error) {
      set({ error: response.error.message ?? 'Error al iniciar búsqueda' });
      return null;
    }

    const searchId: string = response.data?.searchId;
    if (!searchId) {
      set({ error: 'Respuesta inválida del servidor' });
      return null;
    }

    await get().fetchSearches();
    return searchId;
  },

  importPlace: async (placeId: string, product: ProspectProduct) => {
    set({ error: null });

    const response = await supabase.functions.invoke('lead-import', {
      body: { placeId, product },
    });

    if (response.error) {
      set({ error: response.error.message ?? 'Error al importar negocio' });
      return null;
    }

    const prospectId: string = response.data?.prospectId;
    if (!prospectId) return null;

    // Update local place state so UI reflects imported status immediately
    set((s) => {
      const updated: Record<string, LeadPlace[]> = {};
      for (const [sid, places] of Object.entries(s.placesBySearch)) {
        updated[sid] = places.map((p) =>
          p.id === placeId
            ? { ...p, prospect_id: prospectId, imported_at: new Date().toISOString() }
            : p
        );
      }
      return { placesBySearch: updated };
    });

    return prospectId;
  },

  updatePlaceFromRealtime: (place: LeadPlace) => {
    set((s) => {
      const existing = s.placesBySearch[place.search_id] ?? [];
      const idx = existing.findIndex((p) => p.id === place.id);
      const updated =
        idx >= 0
          ? existing.map((p) => (p.id === place.id ? place : p))
          : [...existing, place];
      return {
        placesBySearch: { ...s.placesBySearch, [place.search_id]: updated },
      };
    });
  },

  updateSearchFromRealtime: (search: LeadSearch) => {
    set((s) => ({
      searches: s.searches.map((ls) => (ls.id === search.id ? search : ls)),
    }));
  },
}));
