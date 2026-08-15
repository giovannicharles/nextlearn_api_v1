import { z } from 'zod';
import { DOCUMENT_TYPE_VALUES } from '../../../shared/constants/document-types';
import { NIVEAU_VALUES } from '../../../shared/constants/academique';

export const createDocumentSchema = z.object({
  titre: z.string().min(1, 'Titre requis'),
  description: z.string().min(1, 'Description requise'),
  type: z.enum(DOCUMENT_TYPE_VALUES),
  matiereId: z.string().min(1, 'ID matière invalide'),
  enseignantId: z.string().optional(),
  universiteId: z.string().optional(),
  filiereId: z.string().optional(),
  niveau: z.enum(NIVEAU_VALUES),
  anneeAcademique: z.string().min(1, 'Année académique requise'),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// La modification n'était pas validée du tout : `req.body` partait brut vers
// findByIdAndUpdate, ce qui laissait écraser des champs calculés (vues, urlPdf,
// noteMoyenne…). Whitelist explicite, tous les champs optionnels (édition
// partielle). Les clés inconnues sont ignorées par zod, pas rejetées, pour ne
// casser aucun appelant existant.
export const updateDocumentSchema = z.object({
  titre: z.string().min(1, 'Titre requis').optional(),
  description: z.string().min(1, 'Description requise').optional(),
  type: z.enum(DOCUMENT_TYPE_VALUES).optional(),
  matiereId: z.string().min(1, 'ID matière invalide').optional(),
  enseignantId: z.string().optional(),
  universiteId: z.string().optional(),
  filiereId: z.string().optional(),
  niveau: z.enum(NIVEAU_VALUES).optional(),
  anneeAcademique: z.string().min(1, 'Année académique requise').optional(),
  // Pas de z.coerce.boolean() : en multipart tout arrive en chaîne et
  // Boolean('false') vaut true. On interprète explicitement la chaîne.
  actif: z.preprocess(
    v => (typeof v === 'string' ? v === 'true' : v),
    z.boolean(),
  ).optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
