import { z } from 'zod'

const contactInfoSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
})

export const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  industry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  contacts: z.array(contactInfoSchema).optional(),
  notes: z.string().optional(),
})

export const updateClientSchema = createClientSchema.partial().extend({
  name: z.string().min(1, 'El nombre es requerido'),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
