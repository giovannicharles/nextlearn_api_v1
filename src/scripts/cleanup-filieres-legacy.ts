import { connectDatabase, disconnectDatabase } from '../config/database';
import { Filiere, Matiere, User, Document, Epreuve } from '../models/index';
import { Cycle } from '../shared/constants/academique';

/**
 * Retire les filières héritées, remplacées par le référentiel structuré.
 *
 * Les comptes et contenus encore rattachés sont **réaffectés** vers la filière
 * équivalente du nouveau référentiel, jamais orphelinés : le `filiereId` sert
 * au ciblage des notifications, le vider reviendrait à priver ces étudiants de
 * toute notification.
 *
 *   npx tsx src/scripts/cleanup-filieres-legacy.ts
 */

/** Ancien intitulé -> nouvel intitulé, pour les filières ayant des rattachements. */
const REAFFECTATIONS: { ancien: string; nouveau: string; cycle: Cycle }[] = [
  {
    ancien: "Informatique, option Conception et Développement d'applications pour l'économie numérique",
    nouveau: 'Licence Professionnelle — Conception et Développement d’Applications pour l’Économie Numérique',
    cycle: Cycle.LICENCE_PRO,
  },
];

async function main() {
  await connectDatabase();

  // ── 1. Réaffectations explicites ────────────────────────────────────────
  console.log('── Réaffectation des rattachements ──');
  for (const { ancien, nouveau, cycle } of REAFFECTATIONS) {
    const source = await Filiere.findOne({ nom: ancien, cycle: null }).select('_id').lean();
    const cible = await Filiere.findOne({ nom: nouveau, cycle }).select('_id').lean();

    if (!source) { console.log(`   (déjà traité) ${ancien.slice(0, 50)}…`); continue; }
    if (!cible) { console.log(`   ⚠️  Cible introuvable : ${nouveau}`); continue; }

    const sourceId = String((source as any)._id);
    const cibleId = String((cible as any)._id);

    const [users, docs, eps] = await Promise.all([
      User.updateMany(
        { filiereId: sourceId },
        { $set: { filiereId: cibleId, filiere: nouveau, cycle } },
      ),
      Document.updateMany({ filiereId: sourceId }, { $set: { filiereId: cibleId } }),
      Epreuve.updateMany({ filiereId: sourceId }, { $set: { filiereId: cibleId } }),
    ]);
    console.log(`   ${users.modifiedCount} compte(s), ${docs.modifiedCount} document(s), ${eps.modifiedCount} épreuve(s) réaffecté(s).`);
  }

  // ── 2. Suppression des filières sans cycle ──────────────────────────────
  console.log('\n── Suppression des filières héritées ──');
  const legacy = await Filiere.find({
    $or: [{ cycle: { $exists: false } }, { cycle: null }],
  }).select('_id nom').lean();

  const ids = legacy.map((f: any) => String(f._id));
  const restants = await Promise.all([
    User.countDocuments({ filiereId: { $in: ids } }),
    Document.countDocuments({ filiereId: { $in: ids } }),
    Epreuve.countDocuments({ filiereId: { $in: ids } }),
  ]);
  const bloquants = restants.reduce((a, b) => a + b, 0);

  if (bloquants > 0) {
    console.log(`   ⚠️  ${bloquants} rattachement(s) subsistent — suppression annulée.`);
    console.log('   Complétez REAFFECTATIONS avant de relancer.');
  } else {
    await Matiere.deleteMany({ filiereId: { $in: ids } });
    const res = await Filiere.deleteMany({ _id: { $in: ids } });
    console.log(`   ${res.deletedCount} filière(s) héritée(s) supprimée(s).`);
  }

  const [f, m] = await Promise.all([Filiere.countDocuments(), Matiere.countDocuments()]);
  console.log(`\n✅ Référentiel final : ${f} filières, ${m} matières.`);

  await disconnectDatabase();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
