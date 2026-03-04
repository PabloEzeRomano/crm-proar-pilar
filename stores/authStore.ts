import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

export interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

// Module-level variable to hold the auth state change subscription so it
// persists for the lifetime of the app without requiring cleanup from React.
let authSubscription: ReturnType<
  typeof supabase.auth.onAuthStateChange
>['data']['subscription'] | null = null

// Module-level helper so it is not part of AuthState and avoids the
// get()._fetchProfile() pattern which would require extending the interface.
async function fetchProfile(
  userId: string,
  set: (partial: Partial<AuthState>) => void,
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!error && data) {
    set({ profile: data as Profile })
  }
  // Silently ignore errors — the profile row may not exist yet on first
  // sign-up because the DB trigger that creates it runs asynchronously.
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,

  initialize: async () => {
    set({ loading: true })

    // Restore any previously persisted session.
    const { data: sessionData } = await supabase.auth.getSession()
    const existingSession = sessionData.session

    if (existingSession) {
      set({ session: existingSession, user: existingSession.user })
      await fetchProfile(existingSession.user.id, set)
    }

    // Tear down any previous subscription before registering a new one.
    if (authSubscription) {
      authSubscription.unsubscribe()
    }

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        set({ session, user: session.user })
        await fetchProfile(session.user.id, set)
      } else if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, profile: null })
      } else if (event === 'TOKEN_REFRESHED' && session) {
        set({ session })
      }
    })

    authSubscription = data.subscription

    set({ loading: false })
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null })

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    // On success, onAuthStateChange fires SIGNED_IN and handles setting
    // session / user / profile. Reset loading here so the UI unblocks
    // immediately while the listener runs asynchronously.
    set({ loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    // onAuthStateChange fires SIGNED_OUT and clears session / user / profile.
  },

  clearError: () => set({ error: null }),
}))
