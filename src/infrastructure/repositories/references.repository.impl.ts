import { Universite, Filiere, Matiere, Enseignant } from '../../models/index';
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
  // Cascade École → Cycle → Filière : les deux filtres se combinent.
  async listFilieres(universiteId?: string, cycle?: string): Promise<any[]> {
    const query: any = { actif: true };
    if (universiteId) query.universiteId = universiteId;
    if (cycle) query.cycle = cycle;
    return await Filiere.find(query).sort({ nom: 1 }).exec();
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
  // Cascade Filière → Niveau → Matière.
  async listMatieres(filiereId?: string, niveau?: string): Promise<any[]> {
    const query: any = { actif: true };
    if (filiereId) query.filiereId = filiereId;
    if (niveau) query.niveau = niveau;
    return await Matiere.find(query).sort({ semestre: 1, nom: 1 }).exec();
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

  // Enseignants
  async listEnseignants(): Promise<any[]> {
    return await Enseignant.find({ actif: true }).sort({ nom: 1 }).exec();
  }

  async createEnseignant(data: Partial<any>): Promise<any> {
    return await Enseignant.create(data);
  }

  async updateEnseignant(id: string, data: Partial<any>): Promise<any> {
    const enseignant = await Enseignant.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!enseignant) throw new NotFoundError('Enseignant');
    return enseignant;
  }

  async deleteEnseignant(id: string): Promise<void> {
    const enseignant = await Enseignant.findByIdAndUpdate(id, { actif: false }).exec();
    if (!enseignant) throw new NotFoundError('Enseignant');
  }
}
