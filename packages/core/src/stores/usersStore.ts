import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CompanyConfig, UserListItem } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InviteUserInput {
  email: string;
  role: 'user' | 'product_manager' | 'admin';
}

export interface UsersState {
  users: UserListItem[];
  companyConfig: CompanyConfig | null;
  loading: boolean;
  error: string | null;
  inviteLoading: boolean;
  inviteError: string | null;
  deactivateLoading: boolean;
  deactivateError: string | null;

  fetchUsers: () => Promise<void>;
  fetchCompanyConfig: () => Promise<void>;
  inviteUser: (input: InviteUserInput) => Promise<{ error: string | null }>;
  deactivateUser: (userId: string) => Promise<{ error: string | null }>;
  reactivateUser: (userId: string) => Promise<{ error: string | null }>;
  deleteUser: (userId: string) => Promise<{ error: string | null }>;
  updateUserRole: (
    userId: string,
    role: 'user' | 'product_manager' | 'admin'
  ) => Promise<{ error: string | null }>;
  setUserBranch: (
    userId: string,
    branchId: string | null
  ) => Promise<{ error: string | null }>;
  clearInviteError: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUsersStore = create<UsersState>()((set) => ({
  users: [],
  companyConfig: null,
  loading: false,
  error: null,
  inviteLoading: false,
  inviteError: null,
  deactivateLoading: false,
  deactivateError: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase.functions.invoke('list-users');

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set({ users: (data as UserListItem[]) ?? [], loading: false });
  },

  fetchCompanyConfig: async () => {
    const { data, error } = await supabase
      .from('company_config')
      .select('max_users')
      .single<{ max_users: number }>();

    if (error || !data) return;

    set({ companyConfig: { max_users: data.max_users } });
  },

  inviteUser: async ({ email, role }) => {
    set({ inviteLoading: true, inviteError: null });

    // On web, send the current origin so the invite email links back to the
    // app that issued the invite (e.g. localhost during dev) instead of the
    // project's default Site URL (prod). Native has no origin → undefined.
    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin + '/' : undefined;

    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email, role, redirectTo },
    });

    if (error) {
      let msg = 'Error al enviar la invitación';
      if (error && typeof error === 'object' && 'message' in error) {
        msg = (error as { message: string }).message;
      }
      set({ inviteLoading: false, inviteError: msg });
      return { error: msg };
    }

    set({ inviteLoading: false });
    return { error: null };
  },

  deactivateUser: async (userId: string) => {
    set({ deactivateLoading: true, deactivateError: null });

    const { error } = await supabase.functions.invoke('deactivate-user', {
      body: { userId },
    });

    if (error) {
      let msg = 'Error al dar de baja al usuario';
      if (error && typeof error === 'object' && 'message' in error) {
        msg = (error as { message: string }).message;
      }
      set({ deactivateLoading: false, deactivateError: msg });
      return { error: msg };
    }

    set({ deactivateLoading: false });
    return { error: null };
  },

  reactivateUser: async (userId: string) => {
    set({ deactivateLoading: true, deactivateError: null });

    const { error } = await supabase.functions.invoke('reactivate-user', {
      body: { userId },
    });

    if (error) {
      let msg = 'Error al reactivar al usuario';
      if (error && typeof error === 'object' && 'message' in error) {
        msg = (error as { message: string }).message;
      }
      set({ deactivateLoading: false, deactivateError: msg });
      return { error: msg };
    }

    set({ deactivateLoading: false });
    return { error: null };
  },

  deleteUser: async (userId: string) => {
    set({ deactivateLoading: true, deactivateError: null });

    const { error } = await supabase.functions.invoke('delete-user', {
      body: { userId },
    });

    if (error) {
      let msg = 'Error al eliminar al usuario';
      if (error && typeof error === 'object' && 'message' in error) {
        msg = (error as { message: string }).message;
      }
      set({ deactivateLoading: false, deactivateError: msg });
      return { error: msg };
    }

    set({ deactivateLoading: false });
    return { error: null };
  },

  updateUserRole: async (userId, role) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  },

  setUserBranch: async (userId, branchId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ branch_id: branchId })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, branch_id: branchId } : u
      ),
    }));
    return { error: null };
  },

  clearInviteError: () => set({ inviteError: null }),
}));
