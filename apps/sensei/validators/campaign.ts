import { z } from 'zod';

export const campaignSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed']).default('active'),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  priority: z.number().int().default(0),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

export const campaignOfferSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  payment_methods: z.array(z.string()).optional(),
  financing: z.string().optional(),
});

export type CampaignOfferInput = z.infer<typeof campaignOfferSchema>;
