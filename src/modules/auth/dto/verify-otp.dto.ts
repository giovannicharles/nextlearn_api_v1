import { z } from 'zod';

export const verifyOtpSchema = z.object({
  tempToken: z.string().min(1, 'Token temporaire requis'),
  code: z.string().length(6, 'Code OTP doit contenir 6 chiffres'),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
