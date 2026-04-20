export type VisitStatus = 'pending' | 'completed' | 'canceled'

export type VisitType = 'sale' | 'visit' | 'call' | 'quote'

export type UserRole = 'user' | 'admin' | 'root'

export interface EmailConfig {
  /** User's personal/business email — used as Reply-To in outgoing emails */
  sender: string
  recipients: string[]
  enabled: boolean
  /** Auto-generated sender address from auth email local part + send domain (e.g., gvega@send.gemm-apps.com) */
  sender_address: string
  /** Auto-generated sender display name from auth email local part (e.g., gvega) */
  sender_name: string
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
  role: UserRole
  company_id: string | null
  show_tour: boolean
  created_at: string
  updated_at: string
}

export interface CompanyConfig {
  max_users: number
}

export interface UserListItem {
  id: string
  email: string
  full_name: string | null
  role: UserRole | null
  status: 'active' | 'pending' | 'banned'
  invited_at: string | null
  company_id: string | null
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
  last_visited_at?: string | null
  latitude?: number | null
  longitude?: number | null
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  owner_user_id: string
  client_id: string
  scheduled_at: string
  status: VisitStatus
  type: VisitType
  notes: string | null
  notification_id?: string | null
  amount?: number | null
  quote_id?: string | null
  items?: QuoteItem[] | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type ProductType = 'commodity' | 'formulated'

export interface ProductPresentation {
  id: string
  product_id: string
  label: string
  unit: string
  quantity: number | null
  price_usd: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  code: string | null
  type: ProductType
  notes: string | null
  presentations: ProductPresentation[]
  created_at: string
  updated_at: string
}

export interface ClientProduct {
  id: string
  client_id: string
  product_id: string
  product_presentation_id: string
}

export interface QuoteItem {
  product_id: string
  product_name: string
  product_code: string | null
  presentation_id: string
  presentation_label: string
  unit: string
  // kg or L per package — null for IBC/Granel (variable)
  presentation_quantity_kg: number | null
  // manually entered kg/L when presentation_quantity_kg is null
  custom_quantity_kg?: number | null
  // number of packages — only used for sale type
  quantity: number
  // price per kg or per L (from product_presentations.price_usd)
  unit_price_usd: number
  margin_pct: number
  // quote: null (no total shown). sale: quantity × pkg_kg × price × (1+margin/100)
  total_usd: number | null
}

// ---------------------------------------------------------------------------

// Visit with client data joined
export interface VisitWithClient extends Visit {
  client: Client
  owner?: {
    id: string
    full_name: string | null
    email_config: EmailConfig
  }
}
