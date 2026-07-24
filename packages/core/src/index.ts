// @crm/core — shared infrastructure for all CRM apps

// Lib
export { supabase } from './lib/supabase';
export { default as dayjs, fromUTC } from './lib/dayjs';
export { showAlert, showConfirm, showActionSheet } from './lib/dialog';
export type { ConfirmOptions, DialogAction } from './lib/dialog';

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

export { default as PasswordInput } from './components/PasswordInput';
export type { PasswordInputProps } from './components/PasswordInput';

export { default as ChangePasswordSheet } from './components/ChangePasswordSheet';
export type { ChangePasswordSheetProps } from './components/ChangePasswordSheet';
