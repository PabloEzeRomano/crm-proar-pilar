import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type { Campaign, CampaignOffer, CampaignWithStats } from '../types';
import type { CampaignInput, CampaignOfferInput } from '../validators/campaign';

interface CampaignsState {
  campaigns: Campaign[];
  campaignsWithStats: CampaignWithStats[];
  offers: CampaignOffer[];
  loading: boolean;
  offersLoading: boolean;
  error: string | null;

  fetchCampaigns: () => Promise<void>;
  fetchCampaignsWithStats: () => Promise<void>;
  createCampaign: (data: CampaignInput) => Promise<Campaign | null>;
  updateCampaign: (id: string, data: Partial<CampaignInput>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;

  fetchOffers: (campaignId: string) => Promise<void>;
  createOffer: (campaignId: string, data: CampaignOfferInput) => Promise<CampaignOffer | null>;
  updateOffer: (id: string, data: CampaignOfferInput) => Promise<void>;
  deleteOffer: (id: string) => Promise<void>;
}

export const useCampaignsStore = create<CampaignsState>()((set, get) => ({
  campaigns: [],
  campaignsWithStats: [],
  offers: [],
  loading: false,
  offersLoading: false,
  error: null,

  fetchCampaigns: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({ campaigns: (data as Campaign[]) ?? [], loading: false });
  },

  fetchCampaignsWithStats: async () => {
    set({ loading: true, error: null });

    const { data: campaigns, error: cError } = await supabase
      .from('campaigns')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (cError) {
      set({ error: cError.message, loading: false });
      return;
    }

    const withStats: CampaignWithStats[] = [];

    for (const c of (campaigns as Campaign[]) ?? []) {
      const { count: total } = await supabase
        .from('client_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', c.id);

      const { count: contacted } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', c.id)
        .eq('contact_result', 'contacted');

      const { count: interested } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', c.id)
        .in('interest_result', ['interested', 'follow_up', 'sale']);

      const { count: sales } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', c.id)
        .eq('interest_result', 'sale');

      withStats.push({
        ...c,
        total_assignments: total ?? 0,
        contacted: contacted ?? 0,
        interested: interested ?? 0,
        sales: sales ?? 0,
      });
    }

    set({ campaignsWithStats: withStats, campaigns: (campaigns as Campaign[]) ?? [], loading: false });
  },

  createCampaign: async (input: CampaignInput) => {
    set({ error: null });

    const { data, error } = await supabase
      .from('campaigns')
      .insert(input)
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return null;
    }

    const campaign = data as Campaign;
    set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
    return campaign;
  },

  updateCampaign: async (id: string, data: Partial<CampaignInput>) => {
    set({ error: null });

    const { data: updated, error } = await supabase
      .from('campaigns')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? (updated as Campaign) : c
      ),
    }));
  },

  deleteCampaign: async (id: string) => {
    set({ error: null });

    const { error } = await supabase.from('campaigns').delete().eq('id', id);

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      campaigns: state.campaigns.filter((c) => c.id !== id),
    }));
  },

  fetchOffers: async (campaignId: string) => {
    set({ offersLoading: true, error: null });

    const { data, error } = await supabase
      .from('campaign_offers')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (error) {
      set({ error: error.message, offersLoading: false });
      return;
    }

    set({ offers: (data as CampaignOffer[]) ?? [], offersLoading: false });
  },

  createOffer: async (campaignId: string, input: CampaignOfferInput) => {
    set({ error: null });

    const { data, error } = await supabase
      .from('campaign_offers')
      .insert({ ...input, campaign_id: campaignId })
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return null;
    }

    const offer = data as CampaignOffer;
    set((state) => ({ offers: [...state.offers, offer] }));
    return offer;
  },

  updateOffer: async (id: string, data: CampaignOfferInput) => {
    set({ error: null });

    const { data: updated, error } = await supabase
      .from('campaign_offers')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      offers: state.offers.map((o) =>
        o.id === id ? (updated as CampaignOffer) : o
      ),
    }));
  },

  deleteOffer: async (id: string) => {
    set({ error: null });

    const { error } = await supabase.from('campaign_offers').delete().eq('id', id);

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      offers: state.offers.filter((o) => o.id !== id),
    }));
  },
}));
