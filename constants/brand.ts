/**
 * brand.ts — White-label configuration
 *
 * This is the ONLY file a new customer needs to change to rebrand the app.
 * Do NOT hardcode any of these values elsewhere in the codebase.
 * Import them from this file or via theme.ts.
 */

export const brand = {
  appName: 'Proar CRM',
  primaryColor: '#1D4ED8',       // strong blue, readable in bright sunlight outdoors
  primaryColorDark: '#1E40AF',   // pressed / active state
  primaryColorLight: '#DBEAFE',  // backgrounds, tints
  logoUrl: null,                 // local asset path or remote URL; null = show text logo
} as const
