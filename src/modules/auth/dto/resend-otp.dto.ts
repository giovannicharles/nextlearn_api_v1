import { z } from 'zod';

export const resendOtpSchema = z.object({
  tempToken: z.string().min(1, 'Token temporaire requis'),
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
