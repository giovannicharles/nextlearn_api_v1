import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/index';
import { resolveAcademicRefs } from '../shared/utils/academic-refs';

/**
 * Renseigne universiteId / filiereId sur les comptes créés avant l'ajout de ces
 * champs, à partir des noms déjà stockés. Sans ce backfill, les utilisateurs
 * existants ne seraient ciblés par aucune notification de nouveau contenu.
 *
 * Idempotent : ne touche que les comptes dont un id manque, n'écrase jamais un
 * id déjà présent, et ne modifie aucun nom.
 *
 *   npx tsx src/scripts/backfill-academic-refs.ts
 */
async function main() {
  await connectDatabase();

  const users = await User.find({
    $or: [
      { universiteId: { $exists: false } },
      { universiteId: null },
      { filiereId: { $exists: false } },
      { filiereId: null },
    ],
  }).select('_id universite filiere universiteId filiereId');

  console.log(`${users.length} compte(s) à traiter.`);

  let updated = 0;
  const unresolved: { email?: string; universite?: string; filiere?: string }[] = [];

  for (const user of users) {
    const u = user as any;
    const refs = await resolveAcademicRefs(u.universite, u.filiere);

    const patch: Record<string, string> = {};
    if (!u.universiteId && refs.universiteId) patch.universiteId = refs.universiteId;
    if (!u.filiereId && refs.filiereId) patch.filiereId = refs.filiereId;

    if (Object.keys(patch).length > 0) {
      await User.updateOne({ _id: u._id }, { $set: patch });
      updated++;
    }

    // Trace des noms qui ne correspondent à aucune référence : ce sont eux
    // qu'il faudra créer dans /references ou corriger à la main.
    if ((!u.universiteId && !refs.universiteId) || (!u.filiereId && !refs.filiereId)) {
      unresolved.push({
        email: u.email,
        universite: !refs.universiteId ? u.universite : undefined,
        filiere: !refs.filiereId ? u.filiere : undefined,
      });
    }
  }

  console.log(`${updated} compte(s) mis à jour.`);

  if (unresolved.length > 0) {
    console.log(`\n${unresolved.length} compte(s) avec une référence introuvable :`);
    console.table(unresolved);
    console.log('→ Créez ces universités/filières dans les références, puis relancez le script.');
  }

  await disconnectDatabase();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
