import { create } from 'zustand';
import { Platform } from 'react-native';
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
  isInviteSetup: boolean;
  isInviteUser: boolean;
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
  setInviteUser: (value: boolean) => void;
  completeInviteFlow: (isNewUser: boolean) => void;
  setInitialPassword: (newPassword: string, fullName?: string) => Promise<{ error: string | null }>;
  updateEmailConfig: (config: import('../types').EmailConfig) => Promise<void>;
  completeTour: () => Promise<void>;
  resetTour: () => Promise<void>;
  invokeWeeklyEmail: (
    recipientsOverride?: string[],
    dateFrom?: string,
    dateTo?: string,
    targetUserId?: string,
  ) => Promise<void>;
  setInviteSetup: (value: boolean) => void;
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
  isInviteSetup: false,
  isInviteUser: false,

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
          if (profile) set({ profile })
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
    // On web, use the current origin so the reset link lands on /auth/callback
    // (which calls exchangeCodeForSession via handleWebFragment or the callback screen).
    // On native, use the deep link scheme.
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : 'crm-proar://auth/callback';
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
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

  setInviteSetup: (value: boolean) => set({ isInviteSetup: value }),

  setInviteUser: (value: boolean) => set({ isInviteUser: value }),

  // Atomically clears isInviteSetup and sets isInviteUser in one render cycle,
  // preventing the guard from briefly seeing userId set with both flags false.
  completeInviteFlow: (isNewUser: boolean) =>
    set({ isInviteSetup: false, isInviteUser: isNewUser }),

  // Like updatePassword but does NOT sign out — used for first-time invite password setup.
  // Also completes the invited user's profile: sets email_config from their email address
  // and writes company_id from auth metadata as a safety net (in case the handle_new_user
  // trigger ran before migration 0024 was applied).
  setInitialPassword: async (newPassword: string, fullName?: string) => {
    const updateData: { password: string; data?: { full_name: string } } = {
      password: newPassword,
    }
    if (fullName) updateData.data = { full_name: fullName }
    const { error } = await supabase.auth.updateUser(updateData)
    if (error) return { error: error.message }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const userEmail = user.email ?? ''
      const localPart = userEmail.split('@')[0] ?? ''
      const senderAddress = localPart
        ? `${localPart}@send.gemm-apps.com`
        : 'noreply@send.gemm-apps.com'
      const emailConfig = {
        sender: userEmail,
        sender_address: senderAddress,
        sender_name: fullName ?? userEmail,
        recipients: [],
        enabled: false,
      }

      // company_id from invite metadata — safety net if trigger ran before 0024
      const companyId = (user.user_metadata?.company_id as string | undefined) ?? null

      const profileUpdate: Record<string, unknown> = { email_config: emailConfig }
      if (fullName) profileUpdate.full_name = fullName
      if (companyId) profileUpdate.company_id = companyId

      await supabase.from('profiles').update(profileUpdate).eq('id', user.id)

      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              ...(fullName ? { full_name: fullName } : {}),
              ...(companyId ? { company_id: companyId } : {}),
              email_config: emailConfig,
            }
          : state.profile,
        isInviteUser: false,
      }))
    } else {
      set({ isInviteUser: false })
    }

    return { error: null }
  },

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

  invokeWeeklyEmail: async (
    recipientsOverride?: string[],
    dateFrom?: string,
    dateTo?: string,
    targetUserId?: string,
  ) => {
    set({ error: null });

    const userId = targetUserId ?? useAuthStore.getState().user?.id;
    const body: Record<string, unknown> = {};
    if (userId) body.userId = userId;
    if (recipientsOverride) body.recipients = recipientsOverride;
    if (dateFrom) body.dateFrom = dateFrom;
    if (dateTo) body.dateTo = dateTo;

    const { data, error } = await supabase.functions.invoke('weekly-email', {
      body: Object.keys(body).length > 0 ? body : undefined,
    });

    console.log('[weekly-email] response:', JSON.stringify(data), 'error:', error, 'body:', body);

    if (error) {
      set({
        error: typeof error === 'string' ? error : 'Error sending weekly email',
      });
      console.error('[weekly-email] error:', error);
    }
  },
}));
