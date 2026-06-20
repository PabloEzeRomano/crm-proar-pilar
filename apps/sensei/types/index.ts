// Re-export shared types from @crm/core
export type {
  UserRole,
  EmailConfig,
  Profile,
  CompanyConfig,
  UserListItem,
  ContactInfo,
  Client,
} from '@crm/core';
export { isValidEmailConfig } from '@crm/core';

// ---------------------------------------------------------------------------
// Sensei-specific types
// ---------------------------------------------------------------------------

export type CampaignStatus = 'active' | 'paused' | 'completed';

export type ContactResult =
  | 'contacted'
  | 'not_contacted'
  | 'no_answer'
  | 'wrong_number';

export type InterestResult =
  | 'interested'
  | 'not_interested'
  | 'not_qualified'
  | 'follow_up'
  | 'sale';

export type InteractionChannel = 'phone' | 'whatsapp' | 'in_person' | 'email';

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed';

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Financier {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignOffer {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  payment_methods: string[] | null;
  financing: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientAssignment {
  id: string;
  campaign_id: string;
  client_id: string;
  assigned_to: string;
  assigned_by: string;
  branch_id: string | null;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
}

export interface RejectionReason {
  id: string;
  company_id: string;
  value: string;
  active: boolean;
  created_at: string;
}

export interface Interaction {
  id: string;
  assignment_id: string | null;
  user_id: string;
  campaign_id: string;
  client_id: string;
  contact_result: ContactResult;
  interest_result: InterestResult | null;
  rejection_reason_id: string | null;
  offer_id: string | null;
  payment_method: string | null;
  financing: string | null;
  invoice_number: string | null;
  amount: number | null;
  channel: InteractionChannel;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Joined types for UI
export interface ClientAssignmentWithClient extends ClientAssignment {
  client: import('@crm/core').Client;
}

export interface InteractionWithClient extends Interaction {
  client: import('@crm/core').Client;
  campaign?: Campaign;
}

export interface CampaignWithStats extends Campaign {
  total_assignments: number;
  contacted: number;
  interested: number;
  sales: number;
}
