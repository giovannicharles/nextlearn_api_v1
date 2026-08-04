import { z } from 'zod';

export const resetPinSchema = z.object({
  email: z.string().email('Email invalide'),
});

export type ResetPinInput = z.infer<typeof resetPinSchema>;
