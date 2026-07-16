import { z } from 'zod';

export const createLeadSearchSchema = z.object({
  query: z.string().min(1, 'El rubro/categoría es requerido'),
  locationText: z.string().min(1, 'La ubicación es requerida'),
  minRating: z.number().min(0).max(5).nullable().optional(),
  minReviews: z.number().int().min(0).nullable().optional(),
});

export type CreateLeadSearchInput = z.infer<typeof createLeadSearchSchema>;
