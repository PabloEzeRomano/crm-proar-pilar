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

// Import for local use in Visit interface
import type { ContactInfo } from '@crm/core';

// ---------------------------------------------------------------------------
// Proar-specific types
// ---------------------------------------------------------------------------

export type VisitStatus = 'pending' | 'completed' | 'canceled';

export type VisitType =
  | 'customer_service'
  | 'quote'
  | 'sales_orders'
  | 'new_projects'
  | 'payments'
  | 'technical_service'
  | 'other';

export interface Visit {
  id: string;
  owner_user_id: string;
  company_id: string;
  client_id: string;
  scheduled_at: string;
  status: VisitStatus;
  type: VisitType;
  title: string | null;
  contact_snapshot: ContactInfo | null;
  notes: string | null;
  thread_id: string | null;
  notification_id?: string | null;
  amount?: number | null;
  quote_id?: string | null;
  items?: QuoteItem[] | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type ProductType = 'commodity' | 'formulated';

export interface ProductPresentation {
  id: string;
  product_id: string;
  label: string;
  unit: string;
  quantity: number | null;
  price_usd: number;
  freight_usd: number | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  type: ProductType;
  notes: string | null;
  presentations: ProductPresentation[];
  created_at: string;
  updated_at: string;
}

export interface ClientProduct {
  id: string;
  company_id: string;
  client_id: string;
  product_id: string;
  product_presentation_id: string;
}

export interface QuoteItem {
  product_id: string;
  product_name: string;
  product_code: string | null;
  presentation_id: string;
  presentation_label: string;
  unit: string;
  presentation_quantity_kg: number | null;
  custom_quantity_kg?: number | null;
  quantity: number;
  unit_price_usd: number;
  freight_usd: number;
  margin_pct: number;
  total_usd: number | null;
}

// ---------------------------------------------------------------------------

// Visit with client data joined
import type { Client as ClientType, EmailConfig as EmailConfigType } from '@crm/core';

export interface VisitWithClient extends Visit {
  client: ClientType;
  owner?: {
    id: string;
    full_name: string | null;
    email_config: EmailConfigType;
  };
}
