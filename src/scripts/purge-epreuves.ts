import { connectDatabase, disconnectDatabase } from '../config/database';
import { Epreuve } from '../models/index';

/**
 * Supprime toutes les épreuves (collection Epreuve). Aucune autre collection
 * ne référence Epreuve (Favorite/OfflineDownload pointent uniquement vers
 * Document), donc aucune cascade n'est nécessaire.
 *
 * Usage : npx tsx src/scripts/purge-epreuves.ts --confirm
 */
async function main() {
  const confirmed = process.argv.includes('--confirm');
  if (!confirmed) {
    console.error(
      'Opération destructive. Relance avec --confirm pour exécuter :\n' +
        '  npx tsx src/scripts/purge-epreuves.ts --confirm'
    );
    process.exit(1);
  }

  await connectDatabase();

  const result = await Epreuve.deleteMany({});
  console.log(`✓ Épreuves supprimées : ${result.deletedCount}`);

  await disconnectDatabase();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Erreur pendant la purge :', err);
  await disconnectDatabase();
  process.exit(1);
});
