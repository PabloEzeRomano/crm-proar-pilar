import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type { ClientAssignment, ClientAssignmentWithClient } from '../types';

interface AssignmentsState {
  assignments: ClientAssignmentWithClient[];
  loading: boolean;
  error: string | null;

  fetchAssignments: (campaignId: string) => Promise<void>;
  fetchMyAssignments: (campaignId?: string) => Promise<void>;
  createAssignments: (
    campaignId: string,
    clientIds: string[],
    assignedTo: string,
    branchId?: string
  ) => Promise<number>;
  updateAssignmentStatus: (
    id: string,
    status: ClientAssignment['status']
  ) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
}

export const useAssignmentsStore = create<AssignmentsState>()((set) => ({
  assignments: [],
  loading: false,
  error: null,

  // Admin: fetch all assignments for a campaign
  fetchAssignments: async (campaignId: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('client_assignments')
      .select('*, client:clients(*)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({
      assignments: (data as ClientAssignmentWithClient[]) ?? [],
      loading: false,
    });
  },

  // Vendedor: fetch my assignments (optionally filtered by campaign)
  fetchMyAssignments: async (campaignId?: string) => {
    set({ loading: true, error: null });

    let query = supabase
      .from('client_assignments')
      .select('*, client:clients(*)')
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({
      assignments: (data as ClientAssignmentWithClient[]) ?? [],
      loading: false,
    });
  },

  // Admin: bulk assign clients to a user for a campaign
  createAssignments: async (
    campaignId: string,
    clientIds: string[],
    assignedTo: string,
    branchId?: string
  ) => {
    set({ error: null });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ error: 'No autenticado' });
      return 0;
    }

    const rows = clientIds.map((clientId) => ({
      campaign_id: campaignId,
      client_id: clientId,
      assigned_to: assignedTo,
      assigned_by: user.id,
      branch_id: branchId ?? null,
    }));

    const { data, error } = await supabase
      .from('client_assignments')
      .upsert(rows, { onConflict: 'campaign_id,client_id,assigned_to' })
      .select('*, client:clients(*)');

    if (error) {
      set({ error: error.message });
      return 0;
    }

    const created = (data as ClientAssignmentWithClient[]) ?? [];
    set((state) => ({
      assignments: [
        ...created,
        ...state.assignments.filter((a) => !created.some((c) => c.id === a.id)),
      ],
    }));

    return created.length;
  },

  updateAssignmentStatus: async (
    id: string,
    status: ClientAssignment['status']
  ) => {
    set({ error: null });

    const { data, error } = await supabase
      .from('client_assignments')
      .update({ status })
      .eq('id', id)
      .select('*, client:clients(*)')
      .single();

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === id ? (data as ClientAssignmentWithClient) : a
      ),
    }));
  },

  deleteAssignment: async (id: string) => {
    set({ error: null });

    const { error } = await supabase
      .from('client_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== id),
    }));
  },
}));
