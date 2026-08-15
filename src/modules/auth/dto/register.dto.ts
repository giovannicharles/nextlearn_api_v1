import { z } from 'zod';
import { NIVEAU_VALUES, CYCLE_VALUES } from '../../../shared/constants/academique';

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  nom: z.string().min(2, 'Nom requis (min 2 caractères)'),
  prenom: z.string().min(2, 'Prénom requis (min 2 caractères)'),
  universite: z.string().min(1, 'Université requise'),
  filiere: z.string().min(1, 'Filière requise'),
  niveau: z.enum(NIVEAU_VALUES, {
    errorMap: () => ({ message: 'Niveau invalide (N1 à N5)' }),
  }),
  /** Cycle suivi — désambiguïse le niveau (N4 = INGE 4 ou Master 1). */
  cycle: z.enum(CYCLE_VALUES).optional(),
  /**
   * Inscription avec une adresse personnelle : lève la restriction de domaine,
   * mais le compte devra passer par la vérification humaine avant d'accéder au
   * contenu. Absent = inscription standard, comportement inchangé.
   */
  sansEmailInstitutionnel: z.coerce.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
