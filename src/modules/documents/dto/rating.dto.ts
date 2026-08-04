import { z } from 'zod';

export const ratingSchema = z.object({
  note: z.number().min(1, 'Note minimum 1').max(5, 'Note maximum 5'),
});

export type RatingInput = z.infer<typeof ratingSchema>;
