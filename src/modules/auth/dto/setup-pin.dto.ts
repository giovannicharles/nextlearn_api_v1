import { z } from 'zod';

export const setupPinSchema = z.object({
  tempToken: z.string().min(1, 'Token temporaire requis'),
  pin: z.string().length(4, 'PIN doit contenir 4 chiffres').regex(/^\d{4}$/, 'PIN doit contenir uniquement des chiffres'),
});

export type SetupPinInput = z.infer<typeof setupPinSchema>;
