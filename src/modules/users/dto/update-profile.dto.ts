import { z } from 'zod';

export const updateProfileSchema = z.object({
  nom: z.string().min(2).optional(),
  prenom: z.string().min(2).optional(),
  universite: z.string().min(1).optional(),
  filiere: z.string().min(1).optional(),
  niveau: z.enum(['L1', 'L2', 'L3', 'M1', 'M2']).optional(),
  langue: z.enum(['FR', 'EN']).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
