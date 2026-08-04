import { z } from 'zod';

export const confirmResetPinSchema = z.object({
  tempToken: z.string(),
  code: z.string().length(6, 'Code OTP doit contenir 6 chiffres'),
  newPin: z.string().length(4, 'PIN doit contenir 4 chiffres'),
});

export type ConfirmResetPinInput = z.infer<typeof confirmResetPinSchema>;
