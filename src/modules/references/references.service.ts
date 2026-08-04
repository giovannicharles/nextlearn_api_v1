import { IReferencesRepository } from './domain/references.repository.interface';

export class ReferencesService {
  constructor(private referencesRepository: IReferencesRepository) {}

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
  async listFilieres() {
    return await this.referencesRepository.listFilieres();
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
  async listMatieres() {
    return await this.referencesRepository.listMatieres();
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
}
