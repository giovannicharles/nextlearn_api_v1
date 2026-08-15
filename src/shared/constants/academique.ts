/**
 * Référentiel académique : cycles et niveaux.
 *
 * Un niveau seul est ambigu — « Niveau 4 » désigne la 4ᵉ année du cycle
 * ingénieur ou la 1ʳᵉ année de master selon le contexte. C'est le **couple
 * (cycle, niveau)** qui identifie une promotion, d'où l'ajout du cycle à côté
 * du niveau sur les comptes, les filières et les contenus.
 *
 * Servi par l'API (`GET /api/references/cycles`) : aucun frontend ne
 * redéclare ces listes.
 */

export enum Cycle {
  PREPA = 'PREPA',
  INGENIEUR = 'INGENIEUR',
  LICENCE = 'LICENCE',
  LICENCE_PRO = 'LICENCE_PRO',
  MASTER = 'MASTER',
}

export enum NiveauEtude {
  N1 = 'N1',
  N2 = 'N2',
  N3 = 'N3',
  N4 = 'N4',
  N5 = 'N5',
}

export interface CycleEntry {
  value: Cycle;
  label: string;
  /** Niveaux ouverts par défaut pour ce cycle. */
  niveaux: NiveauEtude[];
}

export const CYCLES: readonly CycleEntry[] = [
  {
    value: Cycle.PREPA,
    label: 'Cycle préparatoire',
    niveaux: [NiveauEtude.N1, NiveauEtude.N2],
  },
  {
    value: Cycle.INGENIEUR,
    label: 'Cycle Ingénieur',
    niveaux: [NiveauEtude.N1, NiveauEtude.N2, NiveauEtude.N3, NiveauEtude.N4, NiveauEtude.N5],
  },
  {
    value: Cycle.LICENCE,
    label: 'Licence',
    niveaux: [NiveauEtude.N1, NiveauEtude.N2, NiveauEtude.N3],
  },
  {
    value: Cycle.LICENCE_PRO,
    label: 'Licence Professionnelle',
    niveaux: [NiveauEtude.N1, NiveauEtude.N2, NiveauEtude.N3],
  },
  {
    value: Cycle.MASTER,
    label: 'Master',
    niveaux: [NiveauEtude.N4, NiveauEtude.N5],
  },
] as const;

export const CYCLE_VALUES = CYCLES.map(c => c.value) as [string, ...string[]];
export const NIVEAU_VALUES = Object.values(NiveauEtude) as [string, ...string[]];

/**
 * Libellé d'un niveau dans le contexte d'un cycle. En master, « Niveau 4 »
 * s'affiche « Master 1 » — le code interne reste N4.
 */
export function libelleNiveau(niveau: string, cycle?: string): string {
  const rang = Number(String(niveau).replace('N', '')) || 0;
  if (cycle === Cycle.MASTER) return `Master ${rang - 3}`;
  return `Niveau ${rang}`;
}

/** Semestres possibles pour une matière. */
export const SEMESTRES = ['S1', 'S2'] as const;

/**
 * Correspondance ancienne notation -> nouvelle, pour la migration des comptes
 * et contenus créés avant l'introduction des cycles.
 */
export const NIVEAU_LEGACY_MAP: Record<string, NiveauEtude> = {
  L1: NiveauEtude.N1,
  L2: NiveauEtude.N2,
  L3: NiveauEtude.N3,
  M1: NiveauEtude.N4,
  M2: NiveauEtude.N5,
};
