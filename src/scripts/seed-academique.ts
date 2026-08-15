import { connectDatabase, disconnectDatabase } from '../config/database';
import { Universite, Filiere, Matiere, User, Document, Epreuve, VerificationRequest } from '../models/index';
import { Cycle, NiveauEtude, NIVEAU_LEGACY_MAP } from '../shared/constants/academique';

/**
 * Restructure le référentiel académique Saint Jean.
 *
 *  1. Migre les niveaux L1..M2 -> N1..N5 (comptes et contenus existants).
 *  2. Supprime les filières orphelines (sans université ni niveaux), qui
 *     doublonnaient les filières structurées et auraient pollué la cascade.
 *  3. Recrée les filières par (université, cycle), en **éclatant les
 *     spécialisations** ISI/SRT en filières distinctes : le modèle n'a pas de
 *     niveau « spécialisation », et ce découpage suffit à rattacher
 *     proprement les matières « INGE 3 SRT S1 ».
 *  4. Charge le programme, matière par matière, avec son niveau et son semestre.
 *
 * Idempotent : relancer le script ne crée pas de doublons.
 *
 *   npx tsx src/scripts/seed-academique.ts
 */

const N1 = NiveauEtude.N1, N2 = NiveauEtude.N2, N3 = NiveauEtude.N3,
      N4 = NiveauEtude.N4, N5 = NiveauEtude.N5;

interface FiliereSeed {
  nom: string;
  universite: string;
  cycle: Cycle;
  niveaux: NiveauEtude[];
  /** matieres[niveau] = [[nom, semestre?], ...] */
  matieres?: Partial<Record<string, [string, string?][]>>;
}

const SJI = 'Saint Jean Ingénieur (SJI)';
const SJM = 'Saint Jean School of Management (SJM)';
const PVY = 'PrépaVogt / Prépa Saint Jean Yaoundé';
const PVD = 'Prépa Saint Jean Douala';
const CPGE = 'Saint Jean CPGE';

const FILIERES: FiliereSeed[] = [
  // ══ SJI — Cycle Ingénieur ══════════════════════════════════════════════
  {
    nom: 'Cycle Ingénieur — Tronc commun',
    universite: SJI, cycle: Cycle.INGENIEUR, niveaux: [N1, N2],
    matieres: {
      N1: [
        ['Geometry'], ['Chemistry'], ['I.D.F.O.T'], ['Writing workshop'],
        ['Analysis 2'], ['Algorithmic'], ['Electrostatic'],
        ['Algèbre', 'S1'], ['Communication', 'S1'], ['Anglais A1/A2', 'S1'],
        ['Réflexion Humaine', 'S1'], ['Mécanique', 'S1'],
        ['Électrocinétique', 'S1'], ['Analyse 1', 'S1'],
        ['Projet Mécatronique', 'S1'],
      ],
      N2: [
        ['Algebra'], ['Wave propagation'], ['Technology and Materials Science'],
        ['Connaissance des métiers de l’Ingénieur'], ['Business and management'],
        ['Art Oratoire'], ['Certification Excel'], ['English level B2 Advanced'],
      ],
    },
  },
  {
    nom: 'Cycle Ingénieur — Systèmes, Réseaux & Télécoms (SRT)',
    universite: SJI, cycle: Cycle.INGENIEUR, niveaux: [N3, N4, N5],
    matieres: {
      N3: [
        ['Réflexion Humaine', 'S1'], ['Complexité Algorithmique', 'S1'],
        ['Physique des ondes électromagnétiques', 'S1'], ['Algorithmique', 'S1'],
        ['Électronique analogique (avec TP)', 'S1'],
        ['English Language (A1/A2 & B1)', 'S1'],
        ['Bases de la comptabilité générale et analytique', 'S1'],
        ['Mathématiques de l’ingénieur', 'S1'], ['Développement Web', 'S1'],
        ['Réflexion Humaine', 'S2'], ['Bases de données', 'S2'],
        ['Réseaux Informatiques', 'S2'], ['Électronique Numérique (avec TP)', 'S2'],
        ['English (A1/A2 & B1)', 'S2'], ['Analyse Numérique', 'S2'],
        ['Architecture des calculateurs et pratique des microprocesseurs', 'S2'],
        ['Technologies Larges bandes (Fixes et Mobiles)', 'S2'],
      ],
      N5: [
        ['Réflexion Humaine', 'S1'], ['Core IP Network (IMS/MPLS)', 'S1'],
        ['FH et VSAT', 'S1'], ['Évolution des réseaux vers le NGN', 'S1'],
        ['Big Data', 'S1'], ['Sécurité des Applications', 'S1'],
        ['Gestion de Projets', 'S1'], ['Sécurité Avancée : Réseaux IP', 'S1'],
        ['SIG (Systèmes d’Information Géographique)', 'S1'],
        ['Planification des réseaux mobiles, réglementation', 'S1'],
        ['Audit de Sécurité des SI', 'S1'], ['Projet Tutoré III', 'S1'],
      ],
    },
  },
  {
    nom: 'Cycle Ingénieur — Ingénierie des Systèmes d’Information (ISI)',
    universite: SJI, cycle: Cycle.INGENIEUR, niveaux: [N3, N4, N5],
    matieres: {
      N3: [
        ['Sagesse & Science', 'S2'], ['English (A1/A2 & B1/B2)', 'S2'],
        ['Techdays - Wordpress', 'S2'], ['Bases de données', 'S2'],
        ['Génie Logiciel', 'S2'],
        ['Bases de la comptabilité générale et analytique', 'S2'],
        ['Programmation Web JAVA', 'S2'], ['IHM (UI/UX design)', 'S2'],
        ['Communication', 'S2'], ['Wisdom & Science', 'S2'],
        ['Software Engineering', 'S2'], ['Expression & Communication', 'S2'],
        ['Databases', 'S2'], ['Java web programming', 'S2'],
        ['System Administration', 'S2'], ['English', 'S2'],
        ['Fundamentals of general and cost accounting', 'S2'], ['Sport', 'S2'],
      ],
      N4: [['Compilation', 'S1'], ['Projet Tutoré', 'S1']],
    },
  },

  // ══ SJI — Licence Professionnelle ══════════════════════════════════════
  {
    nom: 'Licence Professionnelle — Conception et Développement d’Applications pour l’Économie Numérique',
    universite: SJI, cycle: Cycle.LICENCE_PRO, niveaux: [N1, N2, N3],
    matieres: {
      N1: [
        ['Algorithmique et structures de données 1', 'S1'],
        ['Architecture et fonctionnement des ordinateurs', 'S1'],
        ['Analyse et Algèbre 1', 'S1'], ['Optique géométrique et électronique', 'S1'],
        ['Français (Communication écrite et orale)', 'S1'], ['Anglais 1', 'S1'],
        ['Histoire des sciences et des techniques', 'S1'],
        ['Introduction aux réseaux informatiques', 'S1'],
        ['Technologies du Web (HTML/CSS)', 'S1'],
        ['Algorithmique et structures de données 2', 'S2'],
        ['Programmation C/C++', 'S2'], ['Mathématiques discrètes', 'S2'],
        ['Électrocinétique et composants électroniques', 'S2'],
        ['Méthodologie de travail universitaire', 'S2'], ['Anglais 2', 'S2'],
        ['Droit et Éthique de l’informatique', 'S2'],
        ['Systèmes d’exploitation 1', 'S2'],
        ['Bases de données relationnelles (SQL)', 'S2'],
      ],
      N2: [
        ['Programmation Orientée Objet (Java/C#)', 'S1'],
        ['Génie logiciel et UML', 'S1'],
        ['Développement Web dynamique (PHP/JavaScript)', 'S1'],
        ['Bases du développement mobile', 'S1'],
        ['Réseaux informatiques avancés (Routage et Commutation)', 'S1'],
        ['Introduction à la sécurité informatique', 'S1'],
        ['Probabilités et Statistiques', 'S1'],
        ['Comptabilité générale et gestion d’entreprise', 'S1'],
        ['Conception avancée et Design Patterns', 'S2'],
        ['Frameworks de développement (Backend/Frontend)', 'S2'],
        ['Administration des bases de données', 'S2'],
        ['Systèmes d’exploitation avancés (Linux/Unix)', 'S2'],
        ['Économie numérique et commerce électronique', 'S2'],
        ['Gestion de projets informatiques (Agile/Scrum)', 'S2'],
      ],
      N3: [
        ['Développement d’applications distribuées et Web APIs', 'S1'],
        ['Stratégie et modèles d’affaires de l’économie numérique', 'S1'],
        ['Développement d’applications mobiles avancées (Android/iOS/Flutter)', 'S1'],
        ['Cloud Computing et architectures microservices', 'S1'],
        ['Sécurité des applications et du Web', 'S1'],
        ['Bases de données NoSQL et Big Data', 'S1'],
        ['Entrepreneuriat et création d’entreprise numérique', 'S1'],
        ['Anglais professionnel et préparation aux certifications', 'S1'],
      ],
    },
  },

  // ══ SJI — Masters ══════════════════════════════════════════════════════
  {
    nom: 'Master — Sécurité des Systèmes d’Information (SSI)',
    universite: SJI, cycle: Cycle.MASTER, niveaux: [N4, N5],
    matieres: {
      N4: [
        ['Théorie et codage de l’information', 'S1'],
        ['Concepts de base de la sécurité informatique', 'S1'],
        ['Bases de données avancées', 'S1'],
        ['Architecture d’entreprise et des SI', 'S1'],
        ['Administration et gestion des réseaux', 'S1'],
        ['Administration des systèmes Unix/Linux (LPI 101&102)', 'S1'],
        ['Système d’exploitation', 'S1'], ['Anglais technique', 'S1'],
        ['Cybercriminalité et Forensique informatique', 'S2'],
        ['Sécurité des réseaux d’entreprises', 'S2'], ['DevSecOps', 'S2'],
        ['Systèmes d’exploitation avancés et Sécurité des SE', 'S2'],
        ['Sécurité des bases de données', 'S2'],
        ['Cryptologie et signature électronique', 'S2'],
        ['Anglais (public speaking)', 'S2'],
      ],
      N5: [
        ['Sécurité pour le Cloud', 'S1'], ['Cloud et virtualisation', 'S1'],
        ['Sécurité des applications web et mobiles', 'S1'],
        ['Initiation à la recherche', 'S1'],
        ['Audit et Gestion de la sécurité', 'S1'], ['Risk management', 'S1'],
        ['Aspects juridiques et éthiques de la sécurité des SI', 'S1'],
        ['Traitement d’image pour les applications de sécurité', 'S1'],
        ['CCNA Security', 'S1'], ['Accompagnement à la certification CEH', 'S1'],
        ['Cisco Certified CyberOps Associate', 'S2'], ['Droit du travail', 'S2'],
        ['Droit de la propriété intellectuelle', 'S2'], ['Droit du numérique', 'S2'],
        ['Management et gestion de projets', 'S2'],
      ],
    },
  },
  {
    nom: 'Master — Data Science',
    universite: SJI, cycle: Cycle.MASTER, niveaux: [N4, N5],
    matieres: {
      N5: [
        ['Gestion de risques en finance et assurance', 'S1'],
        ['Entrepreneuriat et innovation', 'S1'], ['Initiation à la recherche', 'S1'],
        ['Analytical marketing', 'S1'], ['Data management', 'S1'],
        ['Certification Cloud', 'S1'], ['Virtualisation', 'S1'],
        ['Deep learning', 'S1'], ['Développement Web en python', 'S1'],
        ['Traitement automatique du langage naturel', 'S2'],
        ['Droit de la propriété intellectuelle', 'S2'], ['Droit du travail', 'S2'],
        ['Droit du numérique', 'S2'], ['Management et gestion de projets', 'S2'],
      ],
    },
  },

  // ══ SJM ════════════════════════════════════════════════════════════════
  { nom: 'Licence — Gestion', universite: SJM, cycle: Cycle.LICENCE, niveaux: [N1, N2, N3] },
  { nom: 'Licence — Finance', universite: SJM, cycle: Cycle.LICENCE, niveaux: [N1, N2, N3] },
  { nom: 'Licence — Marketing', universite: SJM, cycle: Cycle.LICENCE, niveaux: [N1, N2, N3] },
  { nom: 'Master — Gestion', universite: SJM, cycle: Cycle.MASTER, niveaux: [N4, N5] },
  { nom: 'Master — Finance', universite: SJM, cycle: Cycle.MASTER, niveaux: [N4, N5] },
  { nom: 'Master — Marketing', universite: SJM, cycle: Cycle.MASTER, niveaux: [N4, N5] },

  // ══ PrépaVogt / Yaoundé ════════════════════════════════════════════════
  { nom: 'Ingénieur Généraliste (InGé)', universite: PVY, cycle: Cycle.PREPA, niveaux: [N1, N2] },
  { nom: 'Ingénieur en Géosciences, Environnement et Agro-Industrie (IGEA)', universite: PVY, cycle: Cycle.PREPA, niveaux: [N1, N2] },
  { nom: 'Ingénieur en Génie Civil (IGC)', universite: PVY, cycle: Cycle.PREPA, niveaux: [N1, N2] },
  { nom: 'Management et Finance (M&F)', universite: PVY, cycle: Cycle.PREPA, niveaux: [N1, N2] },
  { nom: 'Sciences Politiques et Humanités (SPH)', universite: PVY, cycle: Cycle.PREPA, niveaux: [N1, N2] },

  // ══ Prépa Saint Jean Douala ════════════════════════════════════════════
  { nom: 'Ingénieur Généraliste (orientation internationale)', universite: PVD, cycle: Cycle.PREPA, niveaux: [N1, N2] },
  { nom: 'Ingénieur Généraliste (orientation nationale)', universite: PVD, cycle: Cycle.PREPA, niveaux: [N1, N2] },
  { nom: 'Ingénieur Génie Civil', universite: PVD, cycle: Cycle.PREPA, niveaux: [N1, N2] },
  { nom: 'Management et Finance', universite: PVD, cycle: Cycle.PREPA, niveaux: [N1, N2] },

  // ══ Saint Jean CPGE ════════════════════════════════════════════════════
  { nom: 'Scientifique intensive', universite: CPGE, cycle: Cycle.PREPA, niveaux: [N1, N2] },
];

async function migrerNiveaux() {
  console.log('\n── 1. Migration des niveaux L1..M2 -> N1..N5 ──');
  for (const [ancien, nouveau] of Object.entries(NIVEAU_LEGACY_MAP)) {
    const res = await Promise.all([
      User.updateMany({ niveau: ancien }, { $set: { niveau: nouveau } }),
      Document.updateMany({ niveau: ancien }, { $set: { niveau: nouveau } }),
      Epreuve.updateMany({ niveau: ancien }, { $set: { niveau: nouveau } }),
      VerificationRequest.updateMany({ niveau: ancien }, { $set: { niveau: nouveau } }),
    ]);
    const total = res.reduce((s, r: any) => s + r.modifiedCount, 0);
    if (total > 0) console.log(`   ${ancien} -> ${nouveau} : ${total} enregistrement(s)`);
  }
}

async function nettoyerFilieresOrphelines() {
  console.log('\n── 2. Suppression des filières orphelines ──');
  const orphelines = await Filiere.find({
    $or: [{ universiteId: { $exists: false } }, { universiteId: null }],
  }).select('_id nom').lean();

  if (orphelines.length === 0) {
    console.log('   Aucune.');
    return;
  }

  const ids = orphelines.map((f: any) => String(f._id));
  // On ne supprime que si aucun contenu ni compte ne s'y rattache.
  const [docs, users] = await Promise.all([
    Document.countDocuments({ filiereId: { $in: ids } }),
    User.countDocuments({ filiereId: { $in: ids } }),
  ]);
  if (docs > 0 || users > 0) {
    console.log(`   ⚠️  ${docs} document(s) et ${users} compte(s) y sont rattachés — suppression annulée.`);
    return;
  }

  await Matiere.deleteMany({ filiereId: { $in: ids } });
  await Filiere.deleteMany({ _id: { $in: ids } });
  console.log(`   ${orphelines.length} filière(s) orpheline(s) supprimée(s).`);
}

async function seedFilieresEtMatieres() {
  console.log('\n── 3. Filières et matières ──');
  let nbFilieres = 0, nbMatieres = 0;

  for (const seed of FILIERES) {
    const univ = await Universite.findOne({ nom: seed.universite }).select('_id').lean();
    if (!univ) {
      console.log(`   ⚠️  Université introuvable : ${seed.universite}`);
      continue;
    }
    const universiteId = String((univ as any)._id);

    await Filiere.updateOne(
      { nom: seed.nom, universiteId },
      { $set: { cycle: seed.cycle, niveaux: seed.niveaux, actif: true } },
      { upsert: true },
    );
    const filiere = await Filiere.findOne({ nom: seed.nom, universiteId }).select('_id').lean();
    const filiereId = String((filiere as any)._id);
    nbFilieres++;

    for (const [niveau, liste] of Object.entries(seed.matieres || {})) {
      for (const [nom, semestre] of liste || []) {
        const res = await Matiere.updateOne(
          { nom, filiereId, niveau, semestre: semestre ?? null },
          { $setOnInsert: { nom, filiereId, niveau, semestre: semestre ?? null, actif: true } },
          { upsert: true },
        );
        if ((res as any).upsertedCount > 0) nbMatieres++;
      }
    }
  }

  console.log(`   ${nbFilieres} filière(s) traitée(s), ${nbMatieres} matière(s) créée(s).`);
}

async function main() {
  await connectDatabase();
  await migrerNiveaux();
  await nettoyerFilieresOrphelines();
  await seedFilieresEtMatieres();

  const [f, m] = await Promise.all([Filiere.countDocuments(), Matiere.countDocuments()]);
  console.log(`\n✅ Total en base : ${f} filières, ${m} matières.`);

  await disconnectDatabase();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
