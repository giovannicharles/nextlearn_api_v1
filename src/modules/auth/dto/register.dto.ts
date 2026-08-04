import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  nom: z.string().min(2, 'Nom requis (min 2 caractères)'),
  prenom: z.string().min(2, 'Prénom requis (min 2 caractères)'),
  universite: z.string().min(1, 'Université requise'),
  filiere: z.string().min(1, 'Filière requise'),
  niveau: z.enum(['L1', 'L2', 'L3', 'M1', 'M2'], {
    errorMap: () => ({ message: 'Niveau invalide (L1, L2, L3, M1, M2)' }),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
