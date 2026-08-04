import { z } from 'zod';

export const createDocumentSchema = z.object({
  titre: z.string().min(1, 'Titre requis'),
  description: z.string().min(1, 'Description requise'),
  type: z.enum(['COURS', 'TD', 'SYNTHESE']),
  matiereId: z.coerce.number().positive('ID matière invalide'),
  enseignantId: z.coerce.number().optional(),
  universiteId: z.coerce.number().optional(),
  niveau: z.enum(['L1', 'L2', 'L3', 'M1', 'M2']),
  anneeAcademique: z.string().min(1, 'Année académique requise'),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
