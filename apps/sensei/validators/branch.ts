import { z } from 'zod';

export const branchSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

export type BranchInput = z.infer<typeof branchSchema>;
