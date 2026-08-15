import { IUniversite, IFiliere, IMatiere, IEnseignant } from '../../../models/index';

export interface IReferencesRepository {
  // Universites
  listUniversites(): Promise<IUniversite[]>;
  createUniversite(data: Partial<IUniversite>): Promise<IUniversite>;
  updateUniversite(id: string, data: Partial<IUniversite>): Promise<IUniversite>;
  deleteUniversite(id: string): Promise<void>;
  
  // Filieres
  listFilieres(universiteId?: string, cycle?: string): Promise<IFiliere[]>;
  createFiliere(data: Partial<IFiliere>): Promise<IFiliere>;
  updateFiliere(id: string, data: Partial<IFiliere>): Promise<IFiliere>;
  deleteFiliere(id: string): Promise<void>;
  
  // Matieres
  listMatieres(filiereId?: string, niveau?: string): Promise<IMatiere[]>;
  createMatiere(data: Partial<IMatiere>): Promise<IMatiere>;
  updateMatiere(id: string, data: Partial<IMatiere>): Promise<IMatiere>;
  deleteMatiere(id: string): Promise<void>;

  // Enseignants
  listEnseignants(): Promise<IEnseignant[]>;
  createEnseignant(data: Partial<IEnseignant>): Promise<IEnseignant>;
  updateEnseignant(id: string, data: Partial<IEnseignant>): Promise<IEnseignant>;
  deleteEnseignant(id: string): Promise<void>;
}
