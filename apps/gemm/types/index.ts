export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
}

export type ProspectStage =
  | 'lead'
  | 'contacted'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type ProspectProduct = 'crm' | 'miturno' | 'qrtify';

export type InteractionType = 'note' | 'call' | 'email';

export interface Prospect {
  id: string;
  owner_user_id: string;
  company_id: string;
  name: string;
  contacts: ContactInfo[];
  industry: string | null;
  subindustry: string | null;
  address: string | null;
  zone: string | null;
  cuit: string | null;
  product: ProspectProduct;
  stage: ProspectStage;
  notes: string | null;
  next_follow_up: string | null; // ISO 8601
  created_at: string;
  updated_at: string;
}

export interface ProspectInteraction {
  id: string;
  prospect_id: string;
  user_id: string;
  type: InteractionType;
  body: string;
  created_at: string;
}

export const STAGE_LABELS: Record<ProspectStage, string> = {
  lead: 'Lead',
  contacted: 'Contactado',
  proposal: 'Propuesta enviada',
  negotiation: 'Negociación',
  won: 'Ganado',
  lost: 'Perdido',
};

export const PRODUCT_LABELS: Record<ProspectProduct, string> = {
  crm: 'CRM',
  miturno: 'miturno',
  qrtify: 'QRtify',
};

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  note: 'Nota',
  call: 'Llamada',
  email: 'Email',
};

export const PIPELINE_STAGES: ProspectStage[] = [
  'lead',
  'contacted',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

export const PRODUCTS: ProspectProduct[] = ['crm', 'miturno', 'qrtify'];

// ── Email ─────────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  company_id: string;
  created_by: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface EmailSend {
  id: string;
  company_id: string;
  sender_user_id: string;
  template_id: string | null;
  template_name: string;
  prospect_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: 'sent' | 'failed';
  resend_message_id: string | null;
  error_message: string | null;
  created_at: string;
}
