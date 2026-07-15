import { z } from 'zod';

const stageSchema = z.enum(['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost']);
const productSchema = z.enum(['crm', 'miturno', 'qrtify']);

const contactInfoSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export const createProspectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  contacts: z.array(contactInfoSchema).default([]),
  industry: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  zone: z.string().nullable().optional(),
  cuit: z.string().nullable().optional(),
  product: productSchema,
  stage: stageSchema.default('lead'),
  notes: z.string().nullable().optional(),
  next_follow_up: z.string().nullable().optional(),
});

export const updateProspectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  contacts: z.array(contactInfoSchema).optional(),
  industry: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  zone: z.string().nullable().optional(),
  cuit: z.string().nullable().optional(),
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
