import { IUniversite, IFiliere, IMatiere } from '../../../models/index';

export interface IReferencesRepository {
  // Universites
  listUniversites(): Promise<IUniversite[]>;
  createUniversite(data: Partial<IUniversite>): Promise<IUniversite>;
  updateUniversite(id: string, data: Partial<IUniversite>): Promise<IUniversite>;
  deleteUniversite(id: string): Promise<void>;
  
  // Filieres
  listFilieres(): Promise<IFiliere[]>;
  createFiliere(data: Partial<IFiliere>): Promise<IFiliere>;
  updateFiliere(id: string, data: Partial<IFiliere>): Promise<IFiliere>;
  deleteFiliere(id: string): Promise<void>;
  
  // Matieres
  listMatieres(): Promise<IMatiere[]>;
  createMatiere(data: Partial<IMatiere>): Promise<IMatiere>;
  updateMatiere(id: string, data: Partial<IMatiere>): Promise<IMatiere>;
  deleteMatiere(id: string): Promise<void>;
}
