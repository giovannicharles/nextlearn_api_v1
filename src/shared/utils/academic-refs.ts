import { Universite, Filiere } from '../../models/index';

/**
 * Résolution nom → id des références académiques.
 *
 * Les comptes stockent l'université et la filière sous forme de noms libres
 * (choisis dans une liste déroulante alimentée par /api/references, mais
 * enregistrés en clair). Le ciblage des notifications ne peut pas comparer des
 * chaînes libres à des ObjectId : on résout une fois à l'inscription, et on
 * conserve les deux — le nom pour l'affichage, l'id pour les requêtes.
 *
 * Comparaison insensible à la casse et aux espaces de bord. Renvoie undefined
 * si aucune référence ne correspond : le compte reste créable, il ne sera
 * simplement pas ciblé tant que la référence n'existe pas.
 */

/** Échappe une chaîne destinée à être injectée dans une RegExp. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exactInsensitive = (value: string) => new RegExp(`^${escapeRegex(value.trim())}$`, 'i');

export async function resolveUniversiteId(nom?: string): Promise<string | undefined> {
  if (!nom?.trim()) return undefined;
  const match = await Universite.findOne({ nom: exactInsensitive(nom) }).select('_id').lean();
  return match ? String((match as any)._id) : undefined;
}

export async function resolveFiliereId(nom?: string): Promise<string | undefined> {
  if (!nom?.trim()) return undefined;
  const match = await Filiere.findOne({ nom: exactInsensitive(nom) }).select('_id').lean();
  return match ? String((match as any)._id) : undefined;
}

/** Résout les deux références d'un coup. Les clés absentes ne sont pas posées,
 *  pour ne jamais écraser un id déjà correct par undefined. */
export async function resolveAcademicRefs(
  universite?: string,
  filiere?: string,
): Promise<{ universiteId?: string; filiereId?: string }> {
  const [universiteId, filiereId] = await Promise.all([
    resolveUniversiteId(universite),
    resolveFiliereId(filiere),
  ]);

  const refs: { universiteId?: string; filiereId?: string } = {};
  if (universiteId) refs.universiteId = universiteId;
  if (filiereId) refs.filiereId = filiereId;
  return refs;
}
