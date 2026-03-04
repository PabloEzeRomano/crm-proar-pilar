export type VisitStatus = 'pending' | 'completed' | 'canceled'

export interface Profile {
  id: string
  full_name: string | null
  email_config: EmailConfig
  created_at: string
  updated_at: string
}

export interface EmailConfig {
  sender: string | null
  recipients: string[]
  enabled: boolean
}

export interface Client {
  id: string
  owner_user_id: string
  name: string
  industry: string | null
  address: string | null
  city: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
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
