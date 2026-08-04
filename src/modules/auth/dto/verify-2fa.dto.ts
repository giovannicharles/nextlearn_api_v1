import { z } from 'zod';

export const verify2faSchema = z.object({
  tempToken: z.string(),
  code: z.string().length(6, 'Code OTP doit contenir 6 chiffres'),
});

export type Verify2faInput = z.infer<typeof verify2faSchema>;
