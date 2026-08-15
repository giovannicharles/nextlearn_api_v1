import { IReferencesRepository } from './domain/references.repository.interface';
import { DOCUMENT_TYPE_CATALOG } from '../../shared/constants/document-types';
import { JUSTIFICATIF_TYPES, MOTIFS_REJET } from '../../shared/constants/verification';
import { CYCLES, libelleNiveau } from '../../shared/constants/academique';
import { Filiere } from '../../models/index';

export class ReferencesService {
  constructor(private referencesRepository: IReferencesRepository) {}

  // Types de documents : servis depuis le catalogue backend pour que les
  // frontends cessent de les coder en dur (cause du type « Épreuve » manquant).
  listDocumentTypes() {
    return DOCUMENT_TYPE_CATALOG;
  }

  /** Types de justificatifs acceptés pour la vérification académique. */
  listJustificatifTypes() {
    return JUSTIFICATIF_TYPES;
  }

  /** Motifs de rejet standards proposés aux réviseurs. */
  listMotifsRejet() {
    return MOTIFS_REJET;
  }

  /**
   * Cycles réellement ouverts, filtrés par université quand elle est fournie :
   * c'est le 2ᵉ étage de la cascade École → Cycle → Filière → Niveau.
   * Sans université, renvoie le catalogue complet.
   */
  async listCycles(universiteId?: string) {
    if (!universiteId) return CYCLES;

    const ouverts = await Filiere.distinct('cycle', {
      universiteId,
      actif: true,
      cycle: { $ne: null },
    });
    return CYCLES.filter(c => ouverts.includes(c.value));
  }

  /**
   * Niveaux ouverts par une filière, avec leur libellé contextualisé par le
   * cycle (« Niveau 4 » devient « Master 1 » en cycle master).
   */
  async listNiveaux(filiereId: string) {
    const filiere = await Filiere.findById(filiereId).select('cycle niveaux').lean();
    if (!filiere) return [];

    const codes = ((filiere as any).niveaux || []) as string[];
    const cycle = (filiere as any).cycle;
    return codes.map(code => ({ value: code, label: libelleNiveau(code, cycle) }));
  }

  // Universites
  async listUniversites() {
    return await this.referencesRepository.listUniversites();
  }

  async createUniversite(data: any) {
    return await this.referencesRepository.createUniversite(data);
  }

  async updateUniversite(id: string, data: any) {
    return await this.referencesRepository.updateUniversite(id, data);
  }

  async deleteUniversite(id: string) {
    await this.referencesRepository.deleteUniversite(id);
  }

  // Filieres
  async listFilieres(universiteId?: string, cycle?: string) {
    return await this.referencesRepository.listFilieres(universiteId, cycle);
  }

  async createFiliere(data: any) {
    return await this.referencesRepository.createFiliere(data);
  }

  async updateFiliere(id: string, data: any) {
    return await this.referencesRepository.updateFiliere(id, data);
  }

  async deleteFiliere(id: string) {
    await this.referencesRepository.deleteFiliere(id);
  }

  // Matieres
  async listMatieres(filiereId?: string, niveau?: string) {
    return await this.referencesRepository.listMatieres(filiereId, niveau);
  }

  async createMatiere(data: any) {
    return await this.referencesRepository.createMatiere(data);
  }

  async updateMatiere(id: string, data: any) {
    return await this.referencesRepository.updateMatiere(id, data);
  }

  async deleteMatiere(id: string) {
    await this.referencesRepository.deleteMatiere(id);
  }

  // Enseignants
  async listEnseignants() {
    return await this.referencesRepository.listEnseignants();
  }

  async createEnseignant(data: any) {
    return await this.referencesRepository.createEnseignant(data);
  }

  async updateEnseignant(id: string, data: any) {
    return await this.referencesRepository.updateEnseignant(id, data);
  }

  async deleteEnseignant(id: string) {
    await this.referencesRepository.deleteEnseignant(id);
  }
}
