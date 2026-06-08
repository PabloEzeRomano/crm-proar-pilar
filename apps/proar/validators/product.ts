import { z } from 'zod';

export const createPresentationSchema = z.object({
  label: z.string().min(1, 'La presentación es requerida'),
  unit: z.string().min(1, 'La unidad es requerida'),
  quantity: z.number().positive().nullable().optional(),
  price_usd: z.number().nonnegative('El precio debe ser mayor o igual a 0'),
});

export const updatePresentationSchema = createPresentationSchema.partial();

export const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().nullable().optional(),
  type: z.enum(['commodity', 'formulated']),
  notes: z.string().nullable().optional(),
  presentations: z
    .array(createPresentationSchema)
    .min(1, 'Agregá al menos una presentación'),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  code: z.string().nullable().optional(),
  type: z.enum(['commodity', 'formulated']).optional(),
  notes: z.string().nullable().optional(),
});

export type CreatePresentationInput = z.infer<typeof createPresentationSchema>;
export type UpdatePresentationInput = z.infer<typeof updatePresentationSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const quoteItemSchema = z.object({
  product_id: z.uuid(),
  product_name: z.string().min(1),
  product_code: z.string().nullable(),
  presentation_id: z.uuid(),
  presentation_label: z.string().min(1),
  unit: z.string().min(1),
  presentation_quantity_kg: z.number().positive().nullable(),
  custom_quantity_kg: z.number().positive().nullable().optional(),
  quantity: z.number().int().min(0),
  unit_price_usd: z.number().nonnegative(),
  margin_pct: z.number().min(0),
  total_usd: z.number().min(0).nullable(),
});
