import { z } from 'zod';
import { NIVEAU_VALUES, CYCLE_VALUES } from '../../../shared/constants/academique';

export const updateProfileSchema = z.object({
  nom: z.string().min(2).optional(),
  prenom: z.string().min(2).optional(),
  universite: z.string().min(1).optional(),
  filiere: z.string().min(1).optional(),
  niveau: z.enum(NIVEAU_VALUES).optional(),
  cycle: z.enum(CYCLE_VALUES).optional(),
  langue: z.enum(['FR', 'EN']).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
