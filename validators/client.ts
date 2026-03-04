import { z } from 'zod'

export const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  industry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  notes: z.string().optional(),
})

export const updateClientSchema = createClientSchema.partial().extend({
  name: z.string().min(1, 'El nombre es requerido'),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
