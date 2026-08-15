import { DocumentType } from '../../models/Document.model';

/**
 * Source unique de vérité des types publiables depuis l'admin.
 *
 * Les frontends (admin Angular, mobile) ne doivent JAMAIS redéclarer cette
 * liste : ils la récupèrent via `GET /api/references/document-types`. C'est ce
 * qui manquait et qui a laissé « Épreuve » absent du formulaire d'import.
 *
 * `collection` indique au frontend vers quelle ressource poster : les épreuves
 * ont leur propre collection (année, durée, corrigé) et leur propre onglet
 * mobile — elles ne sont pas des documents de la bibliothèque.
 */
export interface DocumentTypeEntry {
  value: string;
  label: string;
  collection: 'documents' | 'epreuves';
}

export const DOCUMENT_TYPE_CATALOG: readonly DocumentTypeEntry[] = [
  { value: DocumentType.COURS, label: 'Cours', collection: 'documents' },
  { value: DocumentType.TD, label: 'TD', collection: 'documents' },
  { value: DocumentType.SYNTHESE, label: 'Synthèse', collection: 'documents' },
  { value: 'EPREUVE', label: 'Épreuve', collection: 'epreuves' },
] as const;

/** Valeurs acceptées par les DTO documents — dérivées du catalogue pour qu'un
 *  ajout de type ne puisse pas être oublié dans la validation. */
export const DOCUMENT_TYPE_VALUES = DOCUMENT_TYPE_CATALOG
  .filter(t => t.collection === 'documents')
  .map(t => t.value) as [string, ...string[]];
