import { Universite, Filiere, Matiere } from '../models/index';
import { connectDatabase } from '../config/database';

async function seedReferences() {
  try {
    await connectDatabase();

    // Seed Universités
    const universites = [
      { nom: 'Université de Yaoundé I', ville: 'Yaoundé', pays: 'Cameroun', actif: true },
      { nom: 'Université de Yaoundé II', ville: 'Yaoundé', pays: 'Cameroun', actif: true },
      { nom: 'Université de Douala', ville: 'Douala', pays: 'Cameroun', actif: true },
      { nom: 'Université de Buea', ville: 'Buea', pays: 'Cameroun', actif: true },
      { nom: 'Université de Dschang', ville: 'Dschang', pays: 'Cameroun', actif: true },
      { nom: 'Université de Ngaoundéré', ville: 'Ngaoundéré', pays: 'Cameroun', actif: true },
      { nom: 'Université de Bamenda', ville: 'Bamenda', pays: 'Cameroun', actif: true },
      { nom: 'Université de Maroua', ville: 'Maroua', pays: 'Cameroun', actif: true },
      { nom: 'Université des Montagnes', ville: 'Bangangté', pays: 'Cameroun', actif: true },
      { nom: 'Université Catholique d\'Afrique Centrale', ville: 'Yaoundé', pays: 'Cameroun', actif: true },
    ];

    for (const uni of universites) {
      await Universite.findOneAndUpdate({ nom: uni.nom }, uni, { upsert: true, new: true });
    }

    console.log('✓ Universités seedées');

    // Get université IDs
    const uy1 = await Universite.findOne({ nom: 'Université de Yaoundé I' });
    const ud = await Universite.findOne({ nom: 'Université de Douala' });

    // Seed Filieres
    const filieres = [
      { nom: 'Informatique', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Mathématiques', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Physique', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Chimie', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Biologie', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Géologie', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Économie', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Gestion', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Droit', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Lettres', niveau: 'Licence', universiteId: uy1?._id, actif: true },
      { nom: 'Informatique', niveau: 'Master', universiteId: uy1?._id, actif: true },
      { nom: 'Mathématiques', niveau: 'Master', universiteId: uy1?._id, actif: true },
      { nom: 'Informatique', niveau: 'Licence', universiteId: ud?._id, actif: true },
      { nom: 'Génie Civil', niveau: 'Licence', universiteId: ud?._id, actif: true },
      { nom: 'Génie Électrique', niveau: 'Licence', universiteId: ud?._id, actif: true },
      { nom: 'Génie Mécanique', niveau: 'Licence', universiteId: ud?._id, actif: true },
      { nom: 'Chimie Industrielle', niveau: 'Licence', universiteId: ud?._id, actif: true },
      { nom: 'Génie des Procédés', niveau: 'Licence', universiteId: ud?._id, actif: true },
    ];

    for (const fil of filieres) {
      await Filiere.findOneAndUpdate({ nom: fil.nom, niveau: fil.niveau, universiteId: fil.universiteId }, fil, { upsert: true, new: true });
    }

    console.log('✓ Filières seedées');

    // Get filière IDs
    const infoLicence = await Filiere.findOne({ nom: 'Informatique', niveau: 'Licence' });
    const mathsLicence = await Filiere.findOne({ nom: 'Mathématiques', niveau: 'Licence' });
    const phyLicence = await Filiere.findOne({ nom: 'Physique', niveau: 'Licence' });
    const chimieLicence = await Filiere.findOne({ nom: 'Chimie', niveau: 'Licence' });
    const bioLicence = await Filiere.findOne({ nom: 'Biologie', niveau: 'Licence' });
    const geoLicence = await Filiere.findOne({ nom: 'Géologie', niveau: 'Licence' });
    const ecoLicence = await Filiere.findOne({ nom: 'Économie', niveau: 'Licence' });
    const gestionLicence = await Filiere.findOne({ nom: 'Gestion', niveau: 'Licence' });
    const droitLicence = await Filiere.findOne({ nom: 'Droit', niveau: 'Licence' });
    const lettresLicence = await Filiere.findOne({ nom: 'Lettres', niveau: 'Licence' });

    // Seed Matières
    const matieres = [
      { nom: 'Algorithmique', code: 'ALGO', filiereId: infoLicence?._id, semestre: 1, actif: true },
      { nom: 'Programmation C', code: 'PROGC', filiereId: infoLicence?._id, semestre: 1, actif: true },
      { nom: 'Architecture des Ordinateurs', code: 'ARCH', filiereId: infoLicence?._id, semestre: 1, actif: true },
      { nom: 'Mathématiques Discrètes', code: 'MATHD', filiereId: infoLicence?._id, semestre: 1, actif: true },
      { nom: 'Bases de Données', code: 'BDD', filiereId: infoLicence?._id, semestre: 2, actif: true },
      { nom: 'Programmation Orientée Objet', code: 'POO', filiereId: infoLicence?._id, semestre: 2, actif: true },
      { nom: 'Réseaux Informatiques', code: 'RESEAU', filiereId: infoLicence?._id, semestre: 2, actif: true },
      { nom: 'Systèmes d\'Exploitation', code: 'SE', filiereId: infoLicence?._id, semestre: 2, actif: true },
      { nom: 'Algèbre Linéaire', code: 'ALGLIN', filiereId: mathsLicence?._id, semestre: 1, actif: true },
      { nom: 'Analyse', code: 'ANALYSE', filiereId: mathsLicence?._id, semestre: 1, actif: true },
      { nom: 'Probabilités', code: 'PROBA', filiereId: mathsLicence?._id, semestre: 2, actif: true },
      { nom: 'Statistiques', code: 'STAT', filiereId: mathsLicence?._id, semestre: 2, actif: true },
      { nom: 'Mécanique Newtonienne', code: 'MECAN', filiereId: phyLicence?._id, semestre: 1, actif: true },
      { nom: 'Électricité', code: 'ELEC', filiereId: phyLicence?._id, semestre: 1, actif: true },
      { nom: 'Thermodynamique', code: 'THERMO', filiereId: phyLicence?._id, semestre: 2, actif: true },
      { nom: 'Optique', code: 'OPTIQUE', filiereId: phyLicence?._id, semestre: 2, actif: true },
      { nom: 'Chimie Organique', code: 'CHIMORG', filiereId: chimieLicence?._id, semestre: 1, actif: true },
      { nom: 'Chimie Minérale', code: 'CHIMMIN', filiereId: chimieLicence?._id, semestre: 2, actif: true },
      { nom: 'Biologie Cellulaire', code: 'BIOCEL', filiereId: bioLicence?._id, semestre: 1, actif: true },
      { nom: 'Génétique', code: 'GENET', filiereId: bioLicence?._id, semestre: 2, actif: true },
      { nom: 'Microbiologie', code: 'MICRO', filiereId: bioLicence?._id, semestre: 2, actif: true },
      { nom: 'Pétrologie', code: 'PETRO', filiereId: geoLicence?._id, semestre: 1, actif: true },
      { nom: 'Minéralogie', code: 'MINERAL', filiereId: geoLicence?._id, semestre: 2, actif: true },
      { nom: 'Microéconomie', code: 'MICROE', filiereId: ecoLicence?._id, semestre: 1, actif: true },
      { nom: 'Macroéconomie', code: 'MACROE', filiereId: ecoLicence?._id, semestre: 2, actif: true },
      { nom: 'Comptabilité Générale', code: 'COMPTA', filiereId: gestionLicence?._id, semestre: 1, actif: true },
      { nom: 'Finance', code: 'FINANCE', filiereId: gestionLicence?._id, semestre: 2, actif: true },
      { nom: 'Droit Civil', code: 'DROITC', filiereId: droitLicence?._id, semestre: 1, actif: true },
      { nom: 'Droit Pénal', code: 'DROITP', filiereId: droitLicence?._id, semestre: 2, actif: true },
      { nom: 'Littérature Française', code: 'LITFR', filiereId: lettresLicence?._id, semestre: 1, actif: true },
      { nom: 'Linguistique', code: 'LING', filiereId: lettresLicence?._id, semestre: 2, actif: true },
    ];

    for (const mat of matieres) {
      await Matiere.findOneAndUpdate({ code: mat.code }, mat, { upsert: true, new: true });
    }

    console.log('✓ Matières seedées');
    console.log('Seed terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors du seed:', error);
    process.exit(1);
  }
}

seedReferences();
