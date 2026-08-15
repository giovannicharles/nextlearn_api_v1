import { connectDatabase, disconnectDatabase } from '../config/database';
import { Universite, Filiere } from '../models/index';

/**
 * Seed des 5 établissements Saint Jean avec leurs filières et niveaux.
 *
 * La structure est: Universite → Filière (avec universiteId) → Niveaux (tableau).
 * Les filières sans universiteId sont conservées (rétro-compatibilité).
 */
async function seedAcademic() {
  try {
    await connectDatabase();

    // ── Universités ──────────────────────────────────────────────────────
    const universitesData = [
      { nom: 'Saint Jean Ingénieur (SJI)', ville: 'Yaoundé', actif: true },
      { nom: 'Saint Jean School of Management (SJM)', ville: 'Yaoundé', actif: true },
      { nom: 'PrépaVogt / Prépa Saint Jean Yaoundé', ville: 'Yaoundé', actif: true },
      { nom: 'Prépa Saint Jean Douala', ville: 'Douala', actif: true },
      { nom: 'Saint Jean CPGE', ville: 'Yaoundé', actif: true },
    ];

    const univMap: Record<string, string> = {};
    for (const u of universitesData) {
      const doc = await Universite.findOneAndUpdate(
        { nom: u.nom },
        u,
        { upsert: true, new: true },
      );
      univMap[u.nom] = String(doc._id);
    }
    console.log(`✓ ${universitesData.length} universités seedées`);

    // ── Filières avec niveaux ────────────────────────────────────────────
    const filieresData = [
      // SJI — Cycle Ingénieur
      {
        nom: 'Cycle Ingénieur',
        universiteId: univMap['Saint Jean Ingénieur (SJI)'],
        niveaux: ['Niveau 1', 'Niveau 2', 'Niveau 3', 'Niveau 4', 'Niveau 5'],
        actif: true,
      },
      // SJI — Licence Professionnelle
      {
        nom: 'Licence Professionnelle — Informatique (CDA)',
        universiteId: univMap['Saint Jean Ingénieur (SJI)'],
        niveaux: ['Niveau 1', 'Niveau 2', 'Niveau 3'],
        actif: true,
      },
      // SJI — Master Professionnel
      {
        nom: 'Master Professionnel — Informatique & SI',
        universiteId: univMap['Saint Jean Ingénieur (SJI)'],
        niveaux: ['Niveau 4 (Master 1)', 'Niveau 5 (Master 2)'],
        actif: true,
      },

      // SJM — Licence
      {
        nom: 'Licence — Gestion, Finance, Marketing',
        universiteId: univMap['Saint Jean School of Management (SJM)'],
        niveaux: ['Niveau 1', 'Niveau 2', 'Niveau 3'],
        actif: true,
      },
      // SJM — Master
      {
        nom: 'Master — Gestion, Finance, Marketing',
        universiteId: univMap['Saint Jean School of Management (SJM)'],
        niveaux: ['Niveau 4 (Master 1)', 'Niveau 5 (Master 2)'],
        actif: true,
      },

      // PrépaVogt — Cycle préparatoire
      {
        nom: 'Cycle préparatoire — Ingénieur & Management',
        universiteId: univMap['PrépaVogt / Prépa Saint Jean Yaoundé'],
        niveaux: ['Niveau 1', 'Niveau 2'],
        actif: true,
      },

      // Prépa Saint Jean Douala — Cycle préparatoire
      {
        nom: 'Cycle préparatoire — Ingénieur & Management (Douala)',
        universiteId: univMap['Prépa Saint Jean Douala'],
        niveaux: ['Niveau 1', 'Niveau 2'],
        actif: true,
      },

      // Saint Jean CPGE — Cycle préparatoire
      {
        nom: 'Cycle préparatoire — Scientifique intensive',
        universiteId: univMap['Saint Jean CPGE'],
        niveaux: ['Niveau 1', 'Niveau 2'],
        actif: true,
      },
    ];

    for (const f of filieresData) {
      await Filiere.findOneAndUpdate(
        { nom: f.nom, universiteId: f.universiteId },
        f,
        { upsert: true, new: true },
      );
    }
    console.log(`✓ ${filieresData.length} filières seedées (avec niveaux)`);

    console.log('\n✅ Seed académique terminé.');
  } catch (error) {
    console.error('❌ Erreur lors du seed académique :', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

seedAcademic();
