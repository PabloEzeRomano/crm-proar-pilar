export type VisitStatus = 'pending' | 'completed' | 'canceled'

export interface EmailConfig {
  /** User's personal/business email — used as Reply-To in outgoing emails */
  sender: string | null
  recipients: string[]
  enabled: boolean
  /** Auto-generated sender address from auth email local part + send domain (e.g., gvega@send.gemm-apps.com) */
  sender_address?: string
  /** Auto-generated sender display name from auth email local part (e.g., gvega) */
  sender_name?: string
}

/**
 * Type guard to ensure EmailConfig has required sender fields.
 * Used by Edge Function to validate profile data before sending emails.
 */
export function isValidEmailConfig(config: unknown): config is EmailConfig {
  if (!config || typeof config !== 'object') return false
  const obj = config as Record<string, unknown>
  return (
    typeof obj.sender_address === 'string' &&
    typeof obj.sender_name === 'string' &&
    Array.isArray(obj.recipients) &&
    typeof obj.enabled === 'boolean'
  )
}

export interface Profile {
  id: string
  full_name: string | null
  email_config: EmailConfig
  show_tour: boolean
  created_at: string
  updated_at: string
}

export interface ContactInfo {
  name?: string
  phone?: string
  email?: string
}

export interface Client {
  id: string
  owner_user_id: string
  name: string
  industry: string | null
  address: string | null
  city: string | null
  contacts: ContactInfo[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  owner_user_id: string
  client_id: string
  scheduled_at: string
  status: VisitStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// Visit with client data joined
export interface VisitWithClient extends Visit {
  client: Client
}
