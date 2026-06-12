import { z } from 'zod';

export const visitTypeSchema = z.enum([
  'customer_service',
  'sales_orders',
  'new_projects',
  'payments',
  'technical_service',
  'other',
]);

export const quoteItemSchema = z.object({
  product_id: z.uuid(),
  product_name: z.string().min(1),
  product_code: z.string().nullable(),
  presentation_id: z.uuid(),
  presentation_label: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().positive(),
  unit_price_usd: z.number().nonnegative(),
  margin_pct: z.number().min(0).max(100),
  total_usd: z.number().nonnegative(),
});

export type QuoteItemInput = z.infer<typeof quoteItemSchema>;

const contactSnapshotSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  })
  .nullable()
  .optional();

export const createVisitSchema = z.object({
  client_id: z.uuid('Seleccioná un cliente'),
  scheduled_at: z.string().min(1, 'La fecha es requerida'), // ISO 8601 string
  title: z.string().optional(),
  contact_snapshot: contactSnapshotSchema,
  notes: z.string().optional(),
  status: z.enum(['pending', 'completed', 'canceled']).optional(),
  type: visitTypeSchema.optional(),
  amount: z
    .number()
    .positive('El monto debe ser mayor a 0')
    .nullable()
    .optional(),
  quote_id: z.uuid().nullable().optional(),
  items: z.array(quoteItemSchema).nullable().optional(),
});

export const updateVisitSchema = z.object({
  scheduled_at: z.string().min(1, 'La fecha es requerida').optional(),
  title: z.string().optional(),
  contact_snapshot: contactSnapshotSchema,
  notes: z.string().optional(),
  status: z.enum(['pending', 'completed', 'canceled']).optional(),
  type: visitTypeSchema.optional(),
  amount: z
    .number()
    .positive('El monto debe ser mayor a 0')
    .nullable()
    .optional(),
  quote_id: z.uuid().nullable().optional(),
  items: z.array(quoteItemSchema).nullable().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'canceled']),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
