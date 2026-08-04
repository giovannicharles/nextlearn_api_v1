import { z } from 'zod';

export const changePinSchema = z.object({
  currentPin: z.string().length(4),
  newPin: z.string().length(4).regex(/^\d{4}$/),
});

export type ChangePinInput = z.infer<typeof changePinSchema>;
