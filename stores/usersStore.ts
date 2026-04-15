import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile, CompanyConfig } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InviteUserInput {
  email: string;
  role: 'user' | 'admin';
}

export interface UsersState {
  users: Profile[];
  companyConfig: CompanyConfig | null;
  loading: boolean;
  error: string | null;
  inviteLoading: boolean;
  inviteError: string | null;

  fetchUsers: () => Promise<void>;
  fetchCompanyConfig: () => Promise<void>;
  inviteUser: (input: InviteUserInput) => Promise<{ error: string | null }>;
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

  fetchUsers: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'root')
      .order('created_at', { ascending: true });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set({ users: (data as Profile[]) ?? [], loading: false });
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

    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email, role },
    });

    if (error) {
      // supabase.functions.invoke wraps non-2xx as an error with a message
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

  clearInviteError: () => set({ inviteError: null }),
}));
