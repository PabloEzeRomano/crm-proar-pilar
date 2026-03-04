import { z } from 'zod'

export const createVisitSchema = z.object({
  client_id: z.string().uuid('Seleccioná un cliente'),
  scheduled_at: z.string().min(1, 'La fecha es requerida'), // ISO 8601 string
  notes: z.string().optional(),
})

export const updateVisitSchema = z.object({
  scheduled_at: z.string().min(1, 'La fecha es requerida').optional(),
  notes: z.string().optional(),
})

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'completed', 'canceled']),
})

export type CreateVisitInput = z.infer<typeof createVisitSchema>
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
