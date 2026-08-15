/**
 * Catalogues de la vérification académique.
 *
 * Servis par l'API (`GET /api/references/justificatif-types`) : ni le mobile ni
 * l'admin ne doivent redéclarer ces listes, pour la même raison qui avait
 * laissé le type « Épreuve » absent du formulaire d'import.
 */

export interface JustificatifTypeEntry {
  value: string;
  label: string;
  description: string;
}

export const JUSTIFICATIF_TYPES: readonly JustificatifTypeEntry[] = [
  {
    value: 'PV_REUSSITE',
    label: 'PV de réussite',
    description: 'Procès-verbal de réussite de la dernière année validée',
  },
  {
    value: 'ATTESTATION_SCOLARITE',
    label: 'Attestation de scolarité',
    description: 'Attestation délivrée par la scolarité pour l’année en cours',
  },
  {
    value: 'CARTE_ETUDIANT',
    label: 'Carte d’étudiant',
    description: 'Carte d’étudiant en cours de validité, recto lisible',
  },
  {
    value: 'RECU_INSCRIPTION',
    label: 'Reçu d’inscription',
    description: 'Reçu ou quittance de paiement des frais d’inscription',
  },
  {
    value: 'AUTRE',
    label: 'Autre document',
    description: 'Tout document officiel prouvant votre inscription',
  },
] as const;

export const JUSTIFICATIF_TYPE_VALUES = JUSTIFICATIF_TYPES.map(t => t.value) as [
  string,
  ...string[],
];

export interface MotifRejetEntry {
  code: string;
  label: string;
  /** Un motif « Autre » impose à l'admin de saisir une explication. */
  texteObligatoire: boolean;
}

export const MOTIFS_REJET: readonly MotifRejetEntry[] = [
  { code: 'ILLISIBLE', label: 'Document illisible', texteObligatoire: false },
  { code: 'TYPE_INCORRECT', label: 'Le document ne correspond pas au type déclaré', texteObligatoire: false },
  { code: 'INFOS_INCOHERENTES', label: 'Informations incohérentes avec le document', texteObligatoire: false },
  { code: 'TRIPLET_NON_CONFORME', label: 'Université, filière ou niveau non conformes', texteObligatoire: false },
  { code: 'DOCUMENT_EXPIRE', label: 'Document expiré ou non valide', texteObligatoire: false },
  { code: 'FALSIFICATION', label: 'Suspicion de falsification', texteObligatoire: false },
  { code: 'DOUBLON', label: 'Doublon d’un compte existant', texteObligatoire: false },
  { code: 'AUTRE', label: 'Autre', texteObligatoire: true },
] as const;

export const MOTIF_REJET_CODES = MOTIFS_REJET.map(m => m.code) as [string, ...string[]];

// ── Règles de traitement ───────────────────────────────────────────────────

/** Délai cible de traitement d'un dossier. */
export const SLA_HOURS = 48;

/** Rétention du justificatif après décision, avant purge. */
export const JUSTIFICATIF_RETENTION_DAYS = 30;

/** Resoumissions autorisées avant escalade en revue prioritaire. */
export const MAX_RESUBMISSIONS = 3;
