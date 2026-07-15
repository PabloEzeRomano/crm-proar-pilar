import { z } from 'zod';

const stageSchema = z.enum(['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost']);
const productSchema = z.enum(['crm', 'miturno', 'qrtify']);

export const createProspectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  company_name: z.string().nullable().optional(),
  email: z.string().email('Email inválido').nullable().optional(),
  phone: z.string().nullable().optional(),
  product: productSchema,
  stage: stageSchema.default('lead'),
  notes: z.string().nullable().optional(),
  next_follow_up: z.string().nullable().optional(),
});

export const updateProspectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  company_name: z.string().nullable().optional(),
  email: z.string().email('Email inválido').nullable().optional(),
  phone: z.string().nullable().optional(),
  product: productSchema.optional(),
  stage: stageSchema.optional(),
  notes: z.string().nullable().optional(),
  next_follow_up: z.string().nullable().optional(),
});

export const createInteractionSchema = z.object({
  prospect_id: z.string().uuid(),
  type: z.enum(['note', 'call', 'email']),
  body: z.string().min(1, 'El contenido es requerido'),
});

export type CreateProspectInput = z.infer<typeof createProspectSchema>;
export type UpdateProspectInput = z.infer<typeof updateProspectSchema>;
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;
