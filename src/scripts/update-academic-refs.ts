import { connectDatabase, disconnectDatabase } from '../config/database';
import { Universite, Filiere } from '../models/index';

/**
 * Remplace la liste des écoles (Universite) et des filières (Filiere) par le
 * référentiel réel du Groupe Saint Jean. Les anciennes entrées (données de
 * démo) sont supprimées. Les libellés quasi-identiques répétés entre écoles
 * (ex: variantes de « Génie Civil » ou « Management et Finance ») sont
 * volontairement conservés distincts, tel qu'énoncés par chaque école — le
 * modèle Filiere reste une liste plate sans lien vers Universite.
 *
 * Usage : npx tsx src/scripts/update-academic-refs.ts --confirm
 */
const universitesData = [
  { nom: 'Saint Jean Ingénieur (SJI)', ville: 'Yaoundé', actif: true },
  { nom: 'Saint Jean School of Management (SJM)', ville: 'Yaoundé', actif: true },
  { nom: 'PrépaVogt / Prépa Saint Jean Yaoundé', ville: 'Yaoundé', actif: true },
  { nom: 'Prépa Saint Jean Douala', ville: 'Douala', actif: true },
  { nom: 'Saint Jean CPGE', ville: 'Yaoundé', actif: true },
];

const filieresData = [
  // Saint Jean Ingénieur (SJI)
  'Génie Informatique (ISI)',
  'Réseaux Télécoms (SRT)',
  "Informatique, option Conception et Développement d'applications pour l'économie numérique",
  'Informatique et Systèmes d\'Information, option Data Science',
  'Informatique et Systèmes d\'Information, option Sécurité des SI',
  // Saint Jean School of Management (SJM)
  'Gestion',
  'Finance',
  'Marketing',
  // PrépaVogt / Prépa Saint Jean Yaoundé
  'Ingénieur Généraliste (InGé)',
  'Ingénieur en Géosciences, Environnement et Agro-Industrie (IGEA)',
  'Ingénieur en Génie Civil (IGC)',
  'Management et Finance (M&F)',
  'Sciences Politiques et Humanités (SPH)',
  // Prépa Saint Jean Douala
  'Ingénieur Généraliste (orientation internationale)',
  'Ingénieur Généraliste (orientation nationale)',
  'Ingénieur Génie Civil',
  'Management et Finance',
  // Saint Jean CPGE
  'Scientifique intensive',
];

async function main() {
  const confirmed = process.argv.includes('--confirm');
  if (!confirmed) {
    console.error(
      'Opération destructive. Relance avec --confirm pour exécuter :\n' +
        '  npx tsx src/scripts/update-academic-refs.ts --confirm'
    );
    process.exit(1);
  }

  await connectDatabase();

  const oldUniRes = await Universite.deleteMany({});
  const oldFilRes = await Filiere.deleteMany({});
  console.log(`Anciennes universités supprimées : ${oldUniRes.deletedCount}`);
  console.log(`Anciennes filières supprimées : ${oldFilRes.deletedCount}`);

  const createdUnis = await Universite.insertMany(universitesData);
  console.log(`✓ ${createdUnis.length} écoles créées`);

  const createdFils = await Filiere.insertMany(filieresData.map((nom) => ({ nom, actif: true })));
  console.log(`✓ ${createdFils.length} filières créées`);

  console.log('✓ Référentiel académique mis à jour.');
  await disconnectDatabase();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Erreur pendant la mise à jour :', err);
  await disconnectDatabase();
  process.exit(1);
});
