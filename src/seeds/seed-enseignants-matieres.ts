import { connectDatabase, disconnectDatabase } from '../config/database';
import { Enseignant, Matiere, Universite, Filiere } from '../models/index';

/**
 * Seed des enseignants et matières pour SJI.
 *
 * 1. Supprime tous les enseignants existants (ils sont fictifs).
 * 2. Crée les enseignants réels fournis par l'utilisateur.
 * 3. Crée les matières par filière/niveau pour SJI.
 */
async function seedEnseignantsMatieres() {
  try {
    await connectDatabase();

    // ── 1. Purge des enseignants existants ────────────────────────────────
    const deleted = await Enseignant.deleteMany({});
    console.log(`✓ ${deleted.deletedCount} enseignants supprimés (purge)`);

    // ── 2. Seed des enseignants réels ─────────────────────────────────────
    const enseignantsData = [
      // Professeurs
      { nom: 'Pr. KIANPI' },
      { nom: 'Pr. MBOA' },
      { nom: 'Pr. VESSAH' },
      { nom: 'Pr. WAMBA' },
      // Docteurs
      { nom: 'Dr. AL' },
      { nom: 'Dr. ASSEMBE' },
      { nom: 'Dr. ATAMEWOUE' },
      { nom: 'Dr. BELOBO' },
      { nom: 'Dr. BILLONG' },
      { nom: 'Dr. Denis KEHDINGA' },
      { nom: 'Dr. KEYAMPI' },
      { nom: 'Dr. LAMARA' },
      { nom: 'Dr. MBIEDA Frank' },
      { nom: 'Dr. MELACHIO' },
      { nom: 'Dr. MEKUKO' },
      { nom: 'Dr. NGNOULAYE' },
      { nom: 'Dr. NGOH' },
      { nom: 'Dr. TENKEU' },
      // Religieux / Aumônerie
      { nom: 'Fr. Dominique Savio' },
      { nom: 'Fr. Sébastien' },
      { nom: 'Père Georges LISSOME' },
      { nom: 'Père Jean Hervé' },
      { nom: 'Père NKOA AYISSI' },
      // Messieurs
      { nom: 'M. ABDOURAMAN' },
      { nom: 'M. ACHA' },
      { nom: 'M. AL MBALLA' },
      { nom: 'M. AYANKENG' },
      { nom: 'M. BALERA' },
      { nom: 'M. BESSALA' },
      { nom: 'M. BIAMOU' },
      { nom: 'M. BILLONG' },
      { nom: 'M. BUMA' },
      { nom: 'M. CHEIKH' },
      { nom: 'M. DENGAN' },
      { nom: 'M. FEDIM' },
      { nom: 'M. HAKOUA' },
      { nom: 'M. ISALA' },
      { nom: 'M. Jean Théophile' },
      { nom: 'M. Khan Marcel NJI' },
      { nom: 'M. KOUAMOU' },
      { nom: 'M. LY CHETKH' },
      { nom: 'M. MAHAMAT' },
      { nom: 'M. MAHOU' },
      { nom: 'M. MANGA' },
      { nom: 'M. MBELE' },
      { nom: 'M. MOSSOU BILA' },
      { nom: 'M. MOSSOURITA' },
      { nom: 'M. MOUPOJOU' },
      { nom: 'M. NDAM' },
      { nom: 'M. NITCHEU' },
      { nom: 'M. NYONGA' },
      { nom: 'M. PESSA' },
      { nom: 'M. TAMEH' },
      { nom: 'M. TIYOUH' },
      { nom: 'M. YTEMBE' },
      // Mesdames / Demoiselles
      { nom: 'Mme DAIHA' },
      { nom: 'Mme GBOULIE' },
      { nom: 'Miss TSASSE' },
    ];

    for (const e of enseignantsData) {
      await Enseignant.findOneAndUpdate(
        { nom: e.nom },
        { ...e, actif: true },
        { upsert: true, new: true },
      );
    }
    console.log(`✓ ${enseignantsData.length} enseignants seedés`);

    // ── 3. Récupérer la filière "Cycle Ingénieur" de SJI ──────────────────
    const sji = await Universite.findOne({ nom: 'Saint Jean Ingénieur (SJI)' });
    if (!sji) {
      console.log('⚠️  Université SJI non trouvée — lance d\'abord seed:academic');
      return;
    }
    const cycleIngenieur = await Filiere.findOne({
      universiteId: String(sji._id),
      nom: 'Cycle Ingénieur',
    });
    const filiereId = cycleIngenieur ? String(cycleIngenieur._id) : undefined;

    // ── 4. Seed des matières (Cycle Ingénieur SJI) ────────────────────────
    const matieresData = [
      // INGE 1 EN (Anglophone)
      'Geometry', 'Chemistry', 'I.D.F.O.T', 'Writing workshop', 'Analysis 2',
      'Algorithmic', 'Electrostatic',
      // INGE 1 A Fr (Francophone)
      'Algèbre', 'Communication', 'Anglais A1/A2', 'Réflexion Humaine',
      'Mécanique', 'Électrocinétique', 'Analyse 1',
      // INGE 2 EN
      'Algebra', 'Wave propagation', 'Technology and Materials Science',
      'Connaissance des métiers de l\'ingénieur', 'Business and management',
      'Art Oratoire', 'Certification Excel', 'English level B2 Advanced',
      // INGE 3 SRT S1
      'Complexité Algorithmique', 'Physique des ondes électromagnétiques',
      'Électronique analogique', 'English Language (A1/A2 & B1)',
      'Bases de la comptabilité générale et analytique',
      'Mathématiques de l\'ingénieur', 'Développement Web',
      // INGE 3 SRT S2
      'Bases de données', 'Réseaux Informatiques', 'Électronique Numérique',
      'Analyse Numérique', 'Architecture des calculateurs',
      'Technologies Larges bandes',
      // INGE 5 SRT S1
      'Core IP Network (IMS/MPLS)', 'FH et VSAT',
      'Évolution des réseaux vers le NGN', 'Big Data',
      'Sécurité des Applications', 'Gestion de Projets',
      'Sécurité Avancée : Réseaux IP', 'SIG (Systèmes d\'Information Géographique)',
      'Planification des réseaux mobiles, réglementation',
      'Audit de Sécurité des SI',
      // INGE 3 ISI FR S2
      'Sagesse & Science', 'Techdays - Wordpress', 'Génie Logiciel',
      'Programmation Web JAVA', 'IHM (UI/UX design)',
      // INGE 3 ISI EN S2
      'Wisdom & Science', 'Software Engineering', 'Expression & Communication',
      'Databases', 'Java web programming', 'System Administration',
      'Fundamentals of general and cost accounting',
      // INGE 4 ISI FR
      'Compilation',
      // Master SSI S7
      'Théorie et codage de l\'information',
      'Concepts de base de la sécurité informatique',
      'Bases de données avancées', 'Architecture d\'entreprise et des SI',
      'Administration et gestion des réseaux',
      'Administration des systèmes Unix/Linux (LPI 101&102)',
      'Système d\'exploitation', 'Anglais technique',
      // Master SSI S8
      'Cybercriminalité et Forensique informatique',
      'Sécurité des réseaux d\'entreprises', 'DevSecOps',
      'Systèmes d\'exploitation avancés et Sécurité des SE',
      'Sécurité des bases de données', 'Cryptologie et signature électronique',
      'Anglais (public speaking)',
      // Master SSI S9
      'Sécurité pour le Cloud', 'Cloud et virtualisation',
      'Sécurité des applications web et mobiles', 'Initiation à la recherche',
      'Audit et Gestion de la sécurité', 'Risk management',
      'Aspects juridiques et éthiques de la sécurité des SI',
      'Traitement d\'image pour les applications de sécurité',
      'CCNA Security', 'Accompagnement à la certification CEH',
      // Master SSI S10
      'Cisco Certified CyberOps Associate', 'Droit du travail',
      'Droit de la propriété intellectuelle', 'Droit du numérique',
      'Management et gestion de projets',
      // Master Data Science S9
      'Gestion de risques en finance et assurance',
      'Entrepreneuriat et innovation', 'Analytical marketing',
      'Data management', 'Certification Cloud', 'Virtualisation',
      'Deep learning', 'Développement Web en python',
      // Master Data Science S10
      'Traitement automatique du langage naturel',
      // Licence Pro CDA Niveau 1 S1
      'Informatique Fondamentale 1', 'Algorithmique et structures de données 1',
      'Architecture et fonctionnement des ordinateurs',
      'Analyse et Algèbre 1', 'Optique géométrique et électronique',
      'Français (Communication écrite et orale)', 'Histoire des sciences et des techniques',
      'Introduction aux réseaux informatiques', 'Technologies du Web (HTML/CSS)',
      // Licence Pro CDA Niveau 1 S2
      'Informatique Fondamentale 2', 'Algorithmique et structures de données 2',
      'Programmation C/C++', 'Mathématiques discrètes',
      'Électrocinétique et composants électroniques',
      'Méthodologie de travail universitaire', 'Anglais 2',
      'Droit et Éthique de l\'informatique',
      'Systèmes d\'exploitation 1', 'Bases de données relationnelles (SQL)',
      // Licence Pro CDA Niveau 2 S3
      'Programmation Orientée Objet (Java/C#)', 'Génie logiciel et UML',
      'Développement Web dynamique (PHP/JavaScript)',
      'Bases du développement mobile',
      'Réseaux informatiques avancés (Routage et Commutation)',
      'Introduction à la sécurité informatique',
      'Probabilités et Statistiques',
      'Comptabilité générale et gestion d\'entreprise',
      // Licence Pro CDA Niveau 2 S4
      'Conception avancée et Design Patterns',
      'Frameworks de développement (Backend/Frontend)',
      'Administration des bases de données',
      'Systèmes d\'exploitation avancés (Linux/Unix)',
      'Économie numérique et commerce électronique',
      'Gestion de projets informatiques (Agile/Scrum)',
      // Licence Pro CDA Niveau 3 S5
      'Développement d\'applications distribuées et Web APIs',
      'Stratégie et modèles d\'affaires de l\'économie numérique',
      'Développement d\'applications mobiles avancées (Android/iOS/Flutter)',
      'Cloud Computing et architectures microservices',
      'Sécurité des applications et du Web',
      'Bases de données NoSQL et Big Data',
      'Entrepreneuriat et création d\'entreprise numérique',
      'Anglais professionnel et préparation aux certifications',
    ];

    let matiereCount = 0;
    for (const nom of matieresData) {
      const existing = await Matiere.findOne({ nom, filiereId });
      if (!existing) {
        await Matiere.create({ nom, filiereId, actif: true });
        matiereCount++;
      }
    }
    console.log(`✓ ${matiereCount} nouvelles matières seedées (${matieresData.length - matiereCount} déjà présentes)`);

    console.log('\n✅ Seed enseignants + matières terminé.');
  } catch (error) {
    console.error('❌ Erreur lors du seed :', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

seedEnseignantsMatieres();
