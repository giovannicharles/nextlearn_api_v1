import { connectDatabase, disconnectDatabase } from '../config/database';
import { Enseignant, Document, Epreuve } from '../models/index';

/**
 * Remplace le jeu d'enseignants fictifs par la liste réelle de Saint Jean.
 *
 * Les enseignants sont volontairement **transverses** : aucun `universiteId`,
 * aucun rattachement à une filière. Un même enseignant intervient sur
 * plusieurs cycles et plusieurs filières, et la liste doit rester extensible
 * depuis le formulaire d'ajout de document.
 *
 * Les documents qui référençaient un enseignant supprimé voient leur
 * `enseignantId` vidé plutôt que de conserver une référence morte.
 *
 *   npx tsx src/scripts/seed-enseignants.ts
 */

/** Liste fournie par l'établissement. Le titre fait partie du nom affiché. */
const ENSEIGNANTS: string[] = [
  // ── Professeurs ──────────────────────────────────────────────────────────
  'Pr. KIANPI',
  'Pr. MBOA',
  'Pr. VESSAH',
  'Pr. WAMBA',

  // ── Docteurs ─────────────────────────────────────────────────────────────
  'Dr. AL',
  'Dr. ASSEMBE',
  'Dr. ATAMEWOUE',
  'Dr. BELOBO',
  'Dr. BILLONG',
  'Dr. Denis KEHDINGA',
  'Dr. KEYAMPI',
  'Dr. LAMARA',
  'Dr. MBIEDA Frank',
  'Dr. MELACHIO',
  'Dr. MEKUKO',
  'Dr. NGNOULAYE',
  'Dr. NGOH',
  'Dr. TENKEU',

  // ── Religieux / Aumônerie ────────────────────────────────────────────────
  'Fr. Dominique Savio',
  'Fr. Sébastien',
  'Père Georges LISSOME',
  'Père Jean Hervé',
  'Père NKOA AYISSI',

  // ── Messieurs ────────────────────────────────────────────────────────────
  'M. ABDOURAMAN',
  'M. ACHA',
  'M. AL MBALLA',
  'M. AYANKENG',
  'M. BALERA',
  'M. BESSALA',
  'M. BIAMOU',
  'M. BILLONG',
  'M. BUMA',
  'M. CHEIKH',
  'M. DENGAN',
  'M. FEDIM',
  'M. HAKOUA',
  'M. ISALA',
  'M. Jean Théophile',
  'M. Khan Marcel NJI',
  'M. KOUAMOU',
  'M. LY CHETKH',
  'M. MAHAMAT',
  'M. MAHOU',
  'M. MANGA',
  'M. MBELE',
  'M. MOSSOU BILA',
  'M. MOSSOURITA',
  'M. MOUPOJOU',
  'M. NDAM',
  'M. NITCHEU',
  'M. NYONGA',
  'M. PESSA',
  'M. TAMEH',
  'M. TIYOUH',
  'M. YTEMBE',

  // ── Mesdames / Demoiselles ───────────────────────────────────────────────
  'Mme DAIHA',
  'Mme GBOULIE',
  'Miss TSASSE',
];

async function main() {
  await connectDatabase();

  const anciens = await Enseignant.find().select('_id nom').lean();
  const anciensIds = anciens.map((e: any) => String(e._id));
  console.log(`${anciens.length} enseignant(s) fictif(s) à supprimer.`);

  // Références à nettoyer AVANT la suppression, pour ne jamais laisser de
  // pointeur mort sur un contenu publié.
  if (anciensIds.length > 0) {
    const docs = await Document.updateMany(
      { enseignantId: { $in: anciensIds } },
      { $unset: { enseignantId: 1 } },
    );
    const eps = await Epreuve.updateMany(
      { enseignantId: { $in: anciensIds } },
      { $unset: { enseignantId: 1 } },
    );
    console.log(`  Références nettoyées : ${docs.modifiedCount} document(s), ${eps.modifiedCount} épreuve(s).`);

    await Enseignant.deleteMany({ _id: { $in: anciensIds } });
    console.log('  Suppression effectuée.');
  }

  // Insertion idempotente : relancer le script ne crée pas de doublons.
  let crees = 0;
  for (const nom of ENSEIGNANTS) {
    const res = await Enseignant.updateOne(
      { nom },
      { $setOnInsert: { nom, actif: true } },
      { upsert: true },
    );
    if ((res as any).upsertedCount > 0) crees++;
  }

  const total = await Enseignant.countDocuments();
  console.log(`\n${crees} enseignant(s) créé(s). Total en base : ${total}.`);

  await disconnectDatabase();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
