import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isPasswordRecovery: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ requiresVerification: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  setError: (message: string) => void;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  updateEmailConfig: (config: import('../types').EmailConfig) => Promise<void>;
  completeTour: () => Promise<void>;
  resetTour: () => Promise<void>;
  invokeWeeklyEmail: () => Promise<void>;
}

// Module-level variable to hold the auth state change subscription so it
// persists for the lifetime of the app without requiring cleanup from React.
let authSubscription:
  | ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription']
  | null = null;

// Module-level helper so it is not part of AuthState and avoids the
// get()._fetchProfile() pattern which would require extending the interface.
async function fetchProfile(
  userId: string,
  // set: (partial: Partial<AuthState>) => void,
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!error && data) {
    // set({ profile: data as Profile });
    return data as Profile;
  }

  // return error;
  return null;
  // Silently ignore errors — the profile row may not exist yet on first
  // sign-up because the DB trigger that creates it runs asynchronously.
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,
  isPasswordRecovery: false,

  initialize: async () => {
    set({ loading: true });

    // Restore any previously persisted session.
    const { data: sessionData } = await supabase.auth.getSession();
    const existingSession = sessionData.session;

    if (existingSession) {
      set({ session: existingSession, user: existingSession.user });
      const profile = await fetchProfile(existingSession.user.id);

      if (profile) {
        set({ profile });
      }
    }

    // Tear down any previous subscription before registering a new one.
    if (authSubscription) {
      authSubscription.unsubscribe();
    }

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        // Set session and user immediately, unblock the UI
        set({ session, user: session.user, loading: false });

        // Fetch profile in the background without blocking
        fetchProfile(session.user.id).then((profile) => {
          if (profile) set({ profile });
        }).catch(() => {
          // Profile may not exist yet on first sign-up (DB trigger is async)
        });
      } else if (event === 'SIGNED_OUT') {
        set({
          session: null,
          user: null,
          profile: null,
          loading: false,
          isPasswordRecovery: false,
        });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        set({ session });
      } else if (event === 'PASSWORD_RECOVERY' && session) {
        set({
          session,
          user: session.user,
          isPasswordRecovery: true,
          loading: false,
        });
      }
    });

    authSubscription = data.subscription;

    // Set loading to false after initial session restore
    set({ loading: false });
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    // On success, onAuthStateChange fires SIGNED_IN and handles setting
    // session / user / profile. Reset loading here so the UI unblocks
    // immediately while the listener runs asynchronously.
    set({ loading: false });
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true, error: null });

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: 'crm-proar://auth/callback',
      },
    });

    if (error) {
      const msg = error.message.includes('already registered')
        ? 'Este email ya tiene una cuenta. ¿Querés ingresar?'
        : error.message;
      set({ error: msg, loading: false });
      return { requiresVerification: false, error: msg };
    }

    set({ loading: false });
    return { requiresVerification: true, error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    // onAuthStateChange fires SIGNED_OUT and clears session / user / profile.
  },

  requestPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'crm-proar://auth/callback',
    });
    return { error: error?.message ?? null };
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    set({ isPasswordRecovery: false });
    await supabase.auth.signOut();
    return { error: null };
  },

  clearError: () => set({ error: null }),

  setError: (message: string) => set({ error: message }),

  completeTour: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ show_tour: false })
      .eq('id', user.id);
    set((state) => ({
      profile: state.profile
        ? { ...state.profile, show_tour: false }
        : state.profile,
    }));
  },

  resetTour: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ show_tour: true })
      .eq('id', user.id);
    set((state) => ({
      profile: state.profile
        ? { ...state.profile, show_tour: true }
        : state.profile,
    }));
  },

  updateEmailConfig: async (config) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({ email_config: config })
      .eq('id', user.id)
      .select('*')
      .single();

    if (!error && data) {
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, email_config: config }
          : (data as Profile),
      }));
    }
  },

  invokeWeeklyEmail: async () => {
    set({ error: null });

    const { error } = await supabase.functions.invoke('weekly-email');

    if (error) {
      set({
        error: typeof error === 'string' ? error : 'Error sending weekly email',
      });
    }
  },
}));
