import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type {
  Client,
  ClientAssignment,
  ClientAssignmentWithClient,
} from '../types';

export interface AutoAssignResult {
  assigned: number;
  skippedNoBranch: number;
  skippedNoVendor: number;
}

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
    branchByClientId?: Record<string, string | null>
  ) => Promise<number>;
  autoAssignByBranch: (
    campaignId: string,
    clients: Client[],
    vendedores: { id: string; branch_id: string | null }[]
  ) => Promise<AutoAssignResult | null>;
  updateAssignmentStatus: (
    id: string,
    status: ClientAssignment['status']
  ) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
}

export const useAssignmentsStore = create<AssignmentsState>()((set, get) => ({
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
    branchByClientId?: Record<string, string | null>
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
      branch_id: branchByClientId?.[clientId] ?? null,
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

  // Admin: auto-assign each unassigned client to a vendedor of its own branch.
  // Distributes round-robin when a branch has several vendedores.
  autoAssignByBranch: async (campaignId, clients, vendedores) => {
    set({ error: null });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ error: 'No autenticado' });
      return null;
    }

    // Vendedores grouped by branch
    const vendedoresByBranch = new Map<string, string[]>();
    for (const v of vendedores) {
      if (!v.branch_id) continue;
      const list = vendedoresByBranch.get(v.branch_id) ?? [];
      list.push(v.id);
      vendedoresByBranch.set(v.branch_id, list);
    }

    const alreadyAssigned = new Set(
      get().assignments.map((a) => a.client_id)
    );

    const rows: {
      campaign_id: string;
      client_id: string;
      assigned_to: string;
      assigned_by: string;
      branch_id: string;
    }[] = [];
    const rrIndex = new Map<string, number>();
    let skippedNoBranch = 0;
    let skippedNoVendor = 0;

    for (const client of clients) {
      if (alreadyAssigned.has(client.id)) continue;
      if (!client.branch_id) {
        skippedNoBranch++;
        continue;
      }
      const branchVendedores = vendedoresByBranch.get(client.branch_id);
      if (!branchVendedores || branchVendedores.length === 0) {
        skippedNoVendor++;
        continue;
      }
      const i = rrIndex.get(client.branch_id) ?? 0;
      const assignedTo = branchVendedores[i % branchVendedores.length];
      rrIndex.set(client.branch_id, i + 1);

      rows.push({
        campaign_id: campaignId,
        client_id: client.id,
        assigned_to: assignedTo,
        assigned_by: user.id,
        branch_id: client.branch_id,
      });
    }

    if (rows.length === 0) {
      return { assigned: 0, skippedNoBranch, skippedNoVendor };
    }

    const { data, error } = await supabase
      .from('client_assignments')
      .upsert(rows, { onConflict: 'campaign_id,client_id,assigned_to' })
      .select('*, client:clients(*)');

    if (error) {
      set({ error: error.message });
      return null;
    }

    const created = (data as ClientAssignmentWithClient[]) ?? [];
    set((state) => ({
      assignments: [
        ...created,
        ...state.assignments.filter((a) => !created.some((c) => c.id === a.id)),
      ],
    }));

    return { assigned: created.length, skippedNoBranch, skippedNoVendor };
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
