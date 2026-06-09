import { z } from 'zod';

export const interactionSchema = z.object({
  assignment_id: z.string().uuid().nullable().optional(),
  campaign_id: z.string().uuid(),
  client_id: z.string().uuid(),
  contact_result: z.enum(['contacted', 'not_contacted', 'no_answer', 'wrong_number']),
  interest_result: z.enum(['interested', 'not_interested', 'not_qualified', 'follow_up', 'sale']).nullable().optional(),
  rejection_reason_id: z.string().uuid().nullable().optional(),
  offer_id: z.string().uuid().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  financing: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  amount: z.number().positive().nullable().optional(),
  channel: z.enum(['phone', 'whatsapp', 'in_person', 'email']),
  notes: z.string().nullable().optional(),
});

export type InteractionInput = z.infer<typeof interactionSchema>;
