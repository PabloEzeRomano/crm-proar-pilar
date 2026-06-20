/**
 * constants/labels.ts — Spanish display labels for interaction enums.
 *
 * Single source of truth so lists, detail, and forms show the same wording
 * instead of raw enum values (e.g. "interested", "sale").
 */

import type {
  ContactResult,
  InterestResult,
  InteractionChannel,
} from '@/types';

export const contactResultLabel: Record<ContactResult, string> = {
  contacted: 'Contactado',
  not_contacted: 'No contactado',
  no_answer: 'No atiende',
  wrong_number: 'Número equivocado',
};

export const interestResultLabel: Record<InterestResult, string> = {
  interested: 'Interesado',
  not_interested: 'No interesado',
  not_qualified: 'No califica',
  follow_up: 'Seguimiento',
  sale: 'Venta',
};

export const channelLabel: Record<InteractionChannel, string> = {
  phone: 'Teléfono',
  whatsapp: 'WhatsApp',
  in_person: 'Presencial',
  email: 'Email',
};

export const channelIcon: Record<InteractionChannel, string> = {
  phone: 'phone',
  whatsapp: 'whatsapp',
  in_person: 'account',
  email: 'email-outline',
};
