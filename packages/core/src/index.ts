// @crm/core — shared infrastructure for all CRM apps

// Lib
export { supabase } from './lib/supabase';
export { default as dayjs, fromUTC } from './lib/dayjs';

// Stores
export { useAuthStore } from './stores/authStore';
export type { AuthState } from './stores/authStore';
export { useUsersStore } from './stores/usersStore';
export type { UsersState, InviteUserInput } from './stores/usersStore';
export { useLookupsStore } from './stores/lookupsStore';

// Types
export * from './types';

// Validators
export * from './validators/auth';
export * from './validators/client';

// Theme
export { CoreThemeProvider, useTheme } from './theme';
export type { Theme } from './theme';

// Components
export { default as SearchableSelect } from './components/SearchableSelect';
export type { SearchableSelectProps } from './components/SearchableSelect';
