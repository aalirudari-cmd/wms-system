import { z } from 'zod';

export const createSupplierSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  contactName: z.string().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  active: z.boolean().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();
