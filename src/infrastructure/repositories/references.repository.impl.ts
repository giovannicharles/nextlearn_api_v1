import { Universite, Filiere, Matiere } from '../../models/index';
import { IReferencesRepository } from '../../modules/references/domain/references.repository.interface';
import { NotFoundError } from '../../shared/errors/index';

export class ReferencesRepository implements IReferencesRepository {
  // Universites
  async listUniversites(): Promise<any[]> {
    return await Universite.find({ actif: true }).sort({ nom: 1 }).exec();
  }

  async createUniversite(data: Partial<any>): Promise<any> {
    return await Universite.create(data);
  }

  async updateUniversite(id: string, data: Partial<any>): Promise<any> {
    const universite = await Universite.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!universite) throw new NotFoundError('Université');
    return universite;
  }

  async deleteUniversite(id: string): Promise<void> {
    const universite = await Universite.findByIdAndUpdate(id, { actif: false }).exec();
    if (!universite) throw new NotFoundError('Université');
  }

  // Filieres
  async listFilieres(): Promise<any[]> {
    return await Filiere.find({ actif: true }).sort({ nom: 1 }).exec();
  }

  async createFiliere(data: Partial<any>): Promise<any> {
    return await Filiere.create(data);
  }

  async updateFiliere(id: string, data: Partial<any>): Promise<any> {
    const filiere = await Filiere.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!filiere) throw new NotFoundError('Filière');
    return filiere;
  }

  async deleteFiliere(id: string): Promise<void> {
    const filiere = await Filiere.findByIdAndUpdate(id, { actif: false }).exec();
    if (!filiere) throw new NotFoundError('Filière');
  }

  // Matieres
  async listMatieres(): Promise<any[]> {
    return await Matiere.find({ actif: true }).sort({ nom: 1 }).exec();
  }

  async createMatiere(data: Partial<any>): Promise<any> {
    return await Matiere.create(data);
  }

  async updateMatiere(id: string, data: Partial<any>): Promise<any> {
    const matiere = await Matiere.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!matiere) throw new NotFoundError('Matière');
    return matiere;
  }

  async deleteMatiere(id: string): Promise<void> {
    const matiere = await Matiere.findByIdAndUpdate(id, { actif: false }).exec();
    if (!matiere) throw new NotFoundError('Matière');
  }
}
