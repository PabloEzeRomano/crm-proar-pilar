export type UserRole = 'user' | 'admin' | 'root';

export interface EmailConfig {
  sender: string;
  recipients: string[];
  enabled: boolean;
  sender_address: string;
  sender_name: string;
}

export function isValidEmailConfig(config: unknown): config is EmailConfig {
  if (!config || typeof config !== 'object') return false;
  const obj = config as Record<string, unknown>;
  return (
    typeof obj.sender_address === 'string' &&
    typeof obj.sender_name === 'string' &&
    Array.isArray(obj.recipients) &&
    typeof obj.enabled === 'boolean'
  );
}

export interface Profile {
  id: string;
  full_name: string | null;
  email_config: EmailConfig;
  role: UserRole;
  company_id: string | null;
  show_tour: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyConfig {
  max_users: number;
}

export interface UserListItem {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole | null;
  status: 'active' | 'pending' | 'banned';
  invited_at: string | null;
  company_id: string | null;
}

export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
}

export interface Client {
  id: string;
  owner_user_id: string;
  name: string;
  industry: string | null;
  address: string | null;
  city: string | null;
  contacts: ContactInfo[];
  notes: string | null;
  last_visited_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}
