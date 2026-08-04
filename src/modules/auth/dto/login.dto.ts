import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  pin: z.string().length(4, 'PIN doit contenir 4 chiffres'),
});

export type LoginInput = z.infer<typeof loginSchema>;
