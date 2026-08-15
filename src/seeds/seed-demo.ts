import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import {
  Universite,
  Filiere,
  Matiere,
  Enseignant,
  Document,
  DocumentType,
  Epreuve,
  Quiz,
  Question,
  Role,
  User,
} from '../models/index';
import { DEFAULT_ROLES } from '../shared/permissions/index';

async function seedDemo() {
  try {
    await connectDatabase();

    // ── Universités ──────────────────────────────────────────────────────
    const universitesData = [
      { nom: 'ISJ Yaoundé', ville: 'Yaoundé', actif: true },
      { nom: 'Université de Yaoundé I', ville: 'Yaoundé', actif: true },
      { nom: 'Université de Yaoundé II', ville: 'Yaoundé', actif: true },
      { nom: 'ESSEC Douala', ville: 'Douala', actif: true },
      { nom: 'IRIC Yaoundé', ville: 'Yaoundé', actif: true },
      { nom: 'Université de Douala', ville: 'Douala', actif: true },
      { nom: 'Université de Buea', ville: 'Buea', actif: true },
      { nom: 'ENSP Yaoundé', ville: 'Yaoundé', actif: true },
    ];
    const universites: Record<string, any> = {};
    for (const u of universitesData) {
      universites[u.nom] = await Universite.findOneAndUpdate({ nom: u.nom }, u, { upsert: true, new: true });
    }
    console.log(`✓ ${universitesData.length} universités seedées`);

    // ── Filières ─────────────────────────────────────────────────────────
    const filieresData = [
      'Informatique', 'Gestion', 'Droit', 'Médecine', 'Génie civil',
      'Électronique', 'Finance', 'Marketing', 'Relations internationales',
    ];
    for (const nom of filieresData) {
      await Filiere.findOneAndUpdate({ nom }, { nom, actif: true }, { upsert: true, new: true });
    }
    console.log(`✓ ${filieresData.length} filières seedées`);

    // ── Matières ─────────────────────────────────────────────────────────
    const matieresData = [
      'Algorithmique', 'Bases de données', 'Réseaux informatiques',
      "Systèmes d'information", 'Mathématiques', 'Programmation Java', 'Génie logiciel',
    ];
    const matieres: Record<string, any> = {};
    for (const nom of matieresData) {
      matieres[nom] = await Matiere.findOneAndUpdate({ nom }, { nom, actif: true }, { upsert: true, new: true });
    }
    console.log(`✓ ${matieresData.length} matières seedées`);

    // ── Enseignants ──────────────────────────────────────────────────────
    const enseignantsData = [
      { nom: 'Pr. Jean-Baptiste Mvogo', universite: 'ISJ Yaoundé' },
      { nom: 'Pr. Marie-Claire Nkolo', universite: 'ISJ Yaoundé' },
      { nom: 'Pr. Emmanuel Ngono', universite: 'Université de Yaoundé I' },
      { nom: 'Pr. Rose Essono', universite: 'ESSEC Douala' },
      { nom: 'Pr. Claude Tchuente', universite: 'Université de Yaoundé II' },
      { nom: 'Pr. Henri Nguema', universite: 'ISJ Yaoundé' },
      { nom: 'Pr. Patricia Kamga', universite: 'ISJ Yaoundé' },
    ];
    const enseignants: Record<string, any> = {};
    for (const e of enseignantsData) {
      enseignants[e.nom] = await Enseignant.findOneAndUpdate(
        { nom: e.nom },
        { nom: e.nom, universiteId: universites[e.universite]._id },
        { upsert: true, new: true }
      );
    }
    console.log(`✓ ${enseignantsData.length} enseignants seedés`);

    // ── Documents ────────────────────────────────────────────────────────
    type DocSeed = {
      titre: string; description: string; type: DocumentType; matiere: string;
      enseignant: string; universite: string; niveau: string; pages: number; tailleMb: number;
      vues: number; telechargements: number; noteMoyenne: number;
    };
    const documentsData: DocSeed[] = [
      { titre: 'Introduction aux algorithmes de tri', description: 'Cours complet sur les algorithmes de tri (rapide, fusion, tas, insertion) avec analyse de complexité.', type: DocumentType.COURS, matiere: 'Algorithmique', enseignant: 'Pr. Jean-Baptiste Mvogo', universite: 'ISJ Yaoundé', niveau: 'L3', pages: 48, tailleMb: 3.2, vues: 1240, telechargements: 387, noteMoyenne: 4.7 },
      { titre: 'TD — Exercices sur les graphes', description: "Travaux dirigés sur les parcours de graphes, plus courts chemins et arbres couvrants.", type: DocumentType.TD, matiere: 'Algorithmique', enseignant: 'Pr. Jean-Baptiste Mvogo', universite: 'ISJ Yaoundé', niveau: 'L3', pages: 32, tailleMb: 2.1, vues: 620, telechargements: 210, noteMoyenne: 4.4 },
      { titre: 'Synthèse — Algorithmique L3 complète', description: 'Fiche de synthèse couvrant tout le programme algorithmique de L3.', type: DocumentType.SYNTHESE, matiere: 'Algorithmique', enseignant: 'Pr. Jean-Baptiste Mvogo', universite: 'ISJ Yaoundé', niveau: 'L3', pages: 18, tailleMb: 1.4, vues: 980, telechargements: 540, noteMoyenne: 4.8 },
      { titre: 'Bases de données relationnelles', description: 'Modélisation, normalisation et algèbre relationnelle.', type: DocumentType.COURS, matiere: 'Bases de données', enseignant: 'Pr. Marie-Claire Nkolo', universite: 'ISJ Yaoundé', niveau: 'L3', pages: 72, tailleMb: 4.8, vues: 1560, telechargements: 490, noteMoyenne: 4.6 },
      { titre: 'TP SQL avancé — Requêtes complexes', description: 'Jointures, sous-requêtes, fonctions de fenêtrage et optimisation.', type: DocumentType.TD, matiere: 'Bases de données', enseignant: 'Pr. Marie-Claire Nkolo', universite: 'ISJ Yaoundé', niveau: 'L3', pages: 28, tailleMb: 1.9, vues: 710, telechargements: 265, noteMoyenne: 4.5 },
      { titre: 'Mémo SQL et modélisation', description: 'Aide-mémoire des commandes SQL essentielles et du modèle entité-association.', type: DocumentType.SYNTHESE, matiere: 'Bases de données', enseignant: 'Pr. Marie-Claire Nkolo', universite: 'ISJ Yaoundé', niveau: 'L3', pages: 10, tailleMb: 0.8, vues: 890, telechargements: 610, noteMoyenne: 4.9 },
      { titre: 'Protocoles TCP/IP et modèle OSI', description: 'Architecture des réseaux, couches OSI et protocoles de communication.', type: DocumentType.COURS, matiere: 'Réseaux informatiques', enseignant: 'Pr. Emmanuel Ngono', universite: 'Université de Yaoundé I', niveau: 'L2', pages: 84, tailleMb: 5.6, vues: 1120, telechargements: 340, noteMoyenne: 4.3 },
      { titre: 'TD — Configuration de réseaux locaux', description: 'Exercices pratiques de configuration LAN, VLAN et sous-réseaux.', type: DocumentType.TD, matiere: 'Réseaux informatiques', enseignant: 'Pr. Emmanuel Ngono', universite: 'Université de Yaoundé I', niveau: 'L2', pages: 40, tailleMb: 2.7, vues: 480, telechargements: 175, noteMoyenne: 4.2 },
      { titre: 'Fiches révision — Réseaux L2', description: 'Synthèse des protocoles et concepts réseaux vus en L2.', type: DocumentType.SYNTHESE, matiere: 'Réseaux informatiques', enseignant: 'Pr. Emmanuel Ngono', universite: 'Université de Yaoundé I', niveau: 'L2', pages: 14, tailleMb: 1.1, vues: 650, telechargements: 400, noteMoyenne: 4.6 },
      { titre: "Architecture des systèmes d'information", description: "Conception et urbanisation des systèmes d'information d'entreprise.", type: DocumentType.COURS, matiere: "Systèmes d'information", enseignant: 'Pr. Rose Essono', universite: 'ESSEC Douala', niveau: 'M1', pages: 96, tailleMb: 6.2, vues: 540, telechargements: 160, noteMoyenne: 4.1 },
      { titre: 'TD — Méthode Merise appliquée', description: 'Étude de cas complète en modélisation Merise (MCD, MLD, MPD).', type: DocumentType.TD, matiere: "Systèmes d'information", enseignant: 'Pr. Rose Essono', universite: 'ESSEC Douala', niveau: 'M1', pages: 52, tailleMb: 3.4, vues: 310, telechargements: 95, noteMoyenne: 4.0 },
      { titre: 'Analyse mathématique — L1 complet', description: 'Suites, limites, dérivées et intégrales — programme complet L1.', type: DocumentType.COURS, matiere: 'Mathématiques', enseignant: 'Pr. Claude Tchuente', universite: 'Université de Yaoundé II', niveau: 'L1', pages: 120, tailleMb: 7.8, vues: 2100, telechargements: 780, noteMoyenne: 4.5 },
      { titre: "TD — Exercices d'intégration", description: 'Techniques de calcul intégral avec corrigés détaillés.', type: DocumentType.TD, matiere: 'Mathématiques', enseignant: 'Pr. Claude Tchuente', universite: 'Université de Yaoundé II', niveau: 'L1', pages: 36, tailleMb: 2.4, vues: 890, telechargements: 320, noteMoyenne: 4.3 },
      { titre: 'Aide-mémoire mathématiques L1', description: 'Formulaire condensé pour révisions rapides.', type: DocumentType.SYNTHESE, matiere: 'Mathématiques', enseignant: 'Pr. Claude Tchuente', universite: 'Université de Yaoundé II', niveau: 'L1', pages: 12, tailleMb: 0.9, vues: 1450, telechargements: 920, noteMoyenne: 4.8 },
      { titre: 'Programmation orientée objet — Java', description: 'Classes, héritage, polymorphisme et interfaces en Java.', type: DocumentType.COURS, matiere: 'Programmation Java', enseignant: 'Pr. Henri Nguema', universite: 'ISJ Yaoundé', niveau: 'L2', pages: 78, tailleMb: 5.1, vues: 1680, telechargements: 610, noteMoyenne: 4.6 },
      { titre: 'Génie logiciel et qualité', description: 'Cycle de vie logiciel, méthodes agiles et assurance qualité.', type: DocumentType.COURS, matiere: 'Génie logiciel', enseignant: 'Pr. Patricia Kamga', universite: 'ISJ Yaoundé', niveau: 'L3', pages: 65, tailleMb: 4.3, vues: 920, telechargements: 300, noteMoyenne: 4.4 },
      { titre: 'TD — UML et design patterns', description: 'Diagrammes UML et patrons de conception courants.', type: DocumentType.TD, matiere: 'Génie logiciel', enseignant: 'Pr. Patricia Kamga', universite: 'ISJ Yaoundé', niveau: 'L3', pages: 44, tailleMb: 2.9, vues: 560, telechargements: 220, noteMoyenne: 4.3 },
      { titre: 'Synthèse — Génie logiciel & patterns', description: 'Résumé des principaux design patterns et bonnes pratiques.', type: DocumentType.SYNTHESE, matiere: 'Génie logiciel', enseignant: 'Pr. Patricia Kamga', universite: 'ISJ Yaoundé', niveau: 'L3', pages: 16, tailleMb: 1.2, vues: 780, telechargements: 470, noteMoyenne: 4.7 },
    ];

    const createdDocs: Record<string, any> = {};
    for (let i = 0; i < documentsData.length; i++) {
      const d = documentsData[i];
      const doc = await Document.findOneAndUpdate(
        { titre: d.titre },
        {
          titre: d.titre,
          description: d.description,
          type: d.type,
          matiereId: matieres[d.matiere]._id,
          enseignantId: enseignants[d.enseignant]._id,
          universiteId: universites[d.universite]._id,
          niveau: d.niveau,
          anneeAcademique: '2023-2024',
          tailleMb: d.tailleMb,
          pages: d.pages,
          // Placeholder — aucun vrai fichier PDF n'est stocké pour ces données de démo.
          urlPdf: `https://example.com/pdfs/placeholder-${i + 1}.pdf`,
          dateAjout: new Date(),
          vues: d.vues,
          telechargements: d.telechargements,
          noteMoyenne: d.noteMoyenne,
          actif: true,
        },
        { upsert: true, new: true }
      );
      createdDocs[d.titre] = doc;
    }
    console.log(`✓ ${documentsData.length} documents seedés`);

    // ── Épreuves ─────────────────────────────────────────────────────────
    const epreuvesData = [
      { matiere: 'Algorithmique', annee: 2024, universite: 'ISJ Yaoundé', niveau: 'L3', dureeMinutes: 120, avecCorrige: true },
      { matiere: 'Algorithmique', annee: 2023, universite: 'ISJ Yaoundé', niveau: 'L3', dureeMinutes: 120, avecCorrige: true },
      { matiere: 'Algorithmique', annee: 2022, universite: 'ISJ Yaoundé', niveau: 'L3', dureeMinutes: 120, avecCorrige: false },
      { matiere: 'Bases de données', annee: 2024, universite: 'ISJ Yaoundé', niveau: 'L3', dureeMinutes: 90, avecCorrige: true },
      { matiere: 'Bases de données', annee: 2022, universite: 'ISJ Yaoundé', niveau: 'L3', dureeMinutes: 90, avecCorrige: false },
      { matiere: 'Réseaux informatiques', annee: 2023, universite: 'Université de Yaoundé I', niveau: 'L2', dureeMinutes: 90, avecCorrige: true },
      { matiere: 'Réseaux informatiques', annee: 2021, universite: 'Université de Yaoundé I', niveau: 'L2', dureeMinutes: 90, avecCorrige: false },
      { matiere: 'Mathématiques', annee: 2024, universite: 'Université de Yaoundé II', niveau: 'L1', dureeMinutes: 150, avecCorrige: true },
      { matiere: 'Mathématiques', annee: 2022, universite: 'Université de Yaoundé II', niveau: 'L1', dureeMinutes: 150, avecCorrige: false },
      { matiere: 'Programmation Java', annee: 2024, universite: 'ISJ Yaoundé', niveau: 'L2', dureeMinutes: 120, avecCorrige: true },
    ];
    for (let i = 0; i < epreuvesData.length; i++) {
      const e = epreuvesData[i];
      await Epreuve.findOneAndUpdate(
        { matiereId: matieres[e.matiere]._id, annee: e.annee, universiteId: universites[e.universite]._id, niveau: e.niveau },
        {
          matiereId: matieres[e.matiere]._id,
          annee: e.annee,
          universiteId: universites[e.universite]._id,
          niveau: e.niveau,
          dureeMinutes: e.dureeMinutes,
          avecCorrige: e.avecCorrige,
          urlPdf: `https://example.com/pdfs/epreuve-${i + 1}.pdf`,
          urlCorrigePdf: e.avecCorrige ? `https://example.com/pdfs/epreuve-${i + 1}-corrige.pdf` : undefined,
          vues: 50 + i * 17,
          telechargements: 10 + i * 6,
          actif: true,
        },
        { upsert: true, new: true }
      );
    }
    console.log(`✓ ${epreuvesData.length} épreuves seedées`);

    // ── Quiz + Questions ─────────────────────────────────────────────────
    const quizzesData = [
      {
        titre: 'Quiz — Algorithmes de tri',
        documentTitre: 'Introduction aux algorithmes de tri',
        matiere: 'Algorithmique',
        dureeSecondes: 480,
        questions: [
          { enonce: 'Quelle est la complexité temporelle du tri rapide (quicksort) dans le meilleur cas ?', options: ['O(n²)', 'O(n log n)', 'O(n)', 'O(log n)'], bonneReponseIndex: 1, explication: 'Le tri rapide a une complexité O(n log n) dans le meilleur et moyen cas grâce au partitionnement équilibré.' },
          { enonce: 'Quel algorithme de tri est dit "stable" par nature ?', options: ['Tri rapide', 'Tri par sélection', 'Tri par insertion', 'Tri par tas'], bonneReponseIndex: 2, explication: "Le tri par insertion est stable car il ne déplace pas deux éléments égaux l'un par rapport à l'autre." },
          { enonce: 'La complexité du tri fusion (merge sort) est :', options: ['O(n²) dans tous les cas', 'O(n log n) dans tous les cas', 'O(n) dans le meilleur cas', 'O(n³)'], bonneReponseIndex: 1, explication: "Le tri fusion a toujours une complexité O(n log n), c'est l'un de ses avantages sur le tri rapide." },
          { enonce: "Dans l'algorithme de Dijkstra, quelle structure de données est utilisée pour choisir le sommet suivant ?", options: ['Une pile (stack)', 'Une file (queue)', 'Une file de priorité (min-heap)', 'Un tableau trié'], bonneReponseIndex: 2, explication: 'Dijkstra utilise une file de priorité (min-heap) pour extraire efficacement le sommet de distance minimale.' },
          { enonce: 'Quelle est la différence principale entre BFS et DFS ?', options: ['BFS utilise une pile, DFS une file', 'BFS parcourt en largeur (file), DFS en profondeur (pile)', 'BFS est plus rapide que DFS', 'DFS trouve toujours le chemin le plus court'], bonneReponseIndex: 1, explication: 'BFS (Breadth-First Search) utilise une file et explore niveau par niveau. DFS (Depth-First Search) utilise une pile et explore branche par branche.' },
          { enonce: 'Le tri par tas (heapsort) utilise quelle structure de données ?', options: ['Un arbre binaire de recherche', 'Un tas binaire (binary heap)', 'Un arbre AVL', 'Une liste chaînée'], bonneReponseIndex: 1, explication: "Le heapsort construit d'abord un tas binaire max, puis extrait les éléments un par un pour les placer en ordre." },
          { enonce: 'Quelle est la complexité de la recherche dichotomique (binary search) ?', options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(1)'], bonneReponseIndex: 2, explication: 'La recherche dichotomique divise le tableau en deux à chaque étape, donnant une complexité O(log n).' },
          { enonce: "L'algorithme de Bellman-Ford diffère de Dijkstra car il :", options: ['Est plus rapide sur tous les graphes', 'Peut gérer des arêtes de poids négatif', 'Fonctionne uniquement sur les arbres', "N'utilise pas de relaxation"], bonneReponseIndex: 1, explication: 'Bellman-Ford peut traiter des graphes avec des arêtes négatives (mais pas de cycles négatifs), contrairement à Dijkstra.' },
        ],
      },
      {
        titre: 'Quiz — Bases de données',
        documentTitre: 'Bases de données relationnelles',
        matiere: 'Bases de données',
        dureeSecondes: 480,
        questions: [
          { enonce: "La clé primaire d'une table SQL doit être :", options: ['Unique et nullable', 'Unique et non nulle', 'Non unique et non nulle', 'Indexée seulement'], bonneReponseIndex: 1, explication: 'Une clé primaire identifie de façon unique chaque ligne et ne peut jamais être NULL.' },
          { enonce: 'La 3ème forme normale (3NF) élimine :', options: ['Les dépendances transitives', 'Les dépendances partielles', 'Les doublons complets', 'Les clés étrangères'], bonneReponseIndex: 0, explication: 'La 3NF élimine les dépendances transitives : tout attribut non-clé doit dépendre directement de la clé primaire.' },
          { enonce: 'Quel type de JOIN retourne toutes les lignes des deux tables, même sans correspondance ?', options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'], bonneReponseIndex: 3, explication: "FULL OUTER JOIN retourne toutes les lignes des deux tables, avec NULL là où il n'y a pas de correspondance." },
          { enonce: 'Une transaction ACID garantit :', options: ['Atomicité, Cohérence, Isolation, Durabilité', 'Accessibilité, Cohérence, Intégrité, Distribution', 'Atomicité, Concurrence, Index, Durabilité', 'Aucune de ces réponses'], bonneReponseIndex: 0, explication: 'ACID = Atomicité (tout ou rien), Cohérence (état valide), Isolation (transactions indépendantes), Durabilité (persistance).' },
          { enonce: 'La commande SQL pour supprimer une table et toutes ses données est :', options: ['DELETE TABLE', 'DROP TABLE', 'REMOVE TABLE', 'TRUNCATE TABLE'], bonneReponseIndex: 1, explication: 'DROP TABLE supprime la table et sa structure. TRUNCATE supprime les données mais garde la structure.' },
          { enonce: 'Un index en base de données sert principalement à :', options: ['Protéger les données', 'Accélérer les requêtes SELECT', 'Compresser les données', 'Synchroniser les transactions'], bonneReponseIndex: 1, explication: 'Les index accélèrent les recherches en créant une structure de données (B-tree) permettant un accès rapide.' },
          { enonce: 'Dans UML/Merise, un MCD (Modèle Conceptuel de Données) représente :', options: ['Les tables SQL', 'Les entités et associations du domaine métier', 'Les procédures stockées', "Les droits d'accès"], bonneReponseIndex: 1, explication: 'Le MCD modélise le domaine métier avec des entités, propriétés et associations, indépendamment du SGBD choisi.' },
          { enonce: 'GROUP BY en SQL est utilisé avec :', options: ['WHERE', 'ORDER BY seulement', "Fonctions d'agrégation (COUNT, SUM, AVG...)", 'JOIN'], bonneReponseIndex: 2, explication: "GROUP BY regroupe les lignes et est toujours associé à des fonctions d'agrégation pour calculer des valeurs par groupe." },
        ],
      },
    ];

    let totalQuestions = 0;
    for (const q of quizzesData) {
      const doc = createdDocs[q.documentTitre];
      const quiz = await Quiz.findOneAndUpdate(
        { titre: q.titre, documentId: doc._id.toString() },
        {
          titre: q.titre,
          documentId: doc._id.toString(),
          matiereId: matieres[q.matiere]._id,
          dureeSecondes: q.dureeSecondes,
          actif: true,
        },
        { upsert: true, new: true }
      );

      for (let i = 0; i < q.questions.length; i++) {
        const qs = q.questions[i];
        await Question.findOneAndUpdate(
          { quizId: quiz._id.toString(), ordre: i },
          {
            quizId: quiz._id.toString(),
            enonce: qs.enonce,
            options: qs.options,
            bonneReponseIndex: qs.bonneReponseIndex,
            explication: qs.explication,
            ordre: i,
          },
          { upsert: true, new: true }
        );
        totalQuestions++;
      }
    }
    console.log(`✓ ${quizzesData.length} quiz seedés (${totalQuestions} questions)`);

    // ── Rôles par défaut (admin/moderator/user) ─────────────────────────
    for (const role of DEFAULT_ROLES) {
      await Role.findOneAndUpdate({ name: role.name }, role, { upsert: true, new: true });
    }
    console.log(`✓ ${DEFAULT_ROLES.length} rôles seedés (admin/moderator/user)`);

    // ── Compte admin pour le panneau d'administration ───────────────────
    const adminPin = '1234';
    const adminPinHash = await bcrypt.hash(adminPin, 12);
    await User.findOneAndUpdate(
      { email: 'admin@nextlearn.local' },
      {
        email: 'admin@nextlearn.local',
        nom: 'Admin',
        prenom: 'NextLearn',
        universite: 'ISJ Yaoundé',
        filiere: 'Administration',
        niveau: 'M2',
        role: 'admin',
        status: 'active',
        isEmailVerified: true,
        pinHash: adminPinHash,
      },
      { upsert: true, new: true }
    );
    console.log('✓ Compte admin seedé — email: admin@nextlearn.local, PIN: 1234');

    console.log('\n🌱 Seed de démonstration terminé avec succès !');
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

seedDemo();
