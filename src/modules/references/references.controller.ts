import { Request, Response } from 'express';
import { ReferencesService } from './references.service';
import { successResponse } from '../../shared/http/response';

export class ReferencesController {
  constructor(private referencesService: ReferencesService) {}

  // Universites
  async listUniversites(_req: Request, res: Response): Promise<void> {
    const result = await this.referencesService.listUniversites();
    successResponse(res, result);
  }

  async createUniversite(req: Request, res: Response): Promise<void> {
    const result = await this.referencesService.createUniversite(req.body);
    successResponse(res, result, 201);
  }

  async updateUniversite(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.referencesService.updateUniversite(id, req.body);
    successResponse(res, result);
  }

  async deleteUniversite(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.referencesService.deleteUniversite(id);
    successResponse(res, { message: 'Université supprimée' });
  }

  // Filieres
  async listFilieres(_req: Request, res: Response): Promise<void> {
    const result = await this.referencesService.listFilieres();
    successResponse(res, result);
  }

  async createFiliere(req: Request, res: Response): Promise<void> {
    const result = await this.referencesService.createFiliere(req.body);
    successResponse(res, result, 201);
  }

  async updateFiliere(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.referencesService.updateFiliere(id, req.body);
    successResponse(res, result);
  }

  async deleteFiliere(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.referencesService.deleteFiliere(id);
    successResponse(res, { message: 'Filière supprimée' });
  }

  // Matieres
  async listMatieres(_req: Request, res: Response): Promise<void> {
    const result = await this.referencesService.listMatieres();
    successResponse(res, result);
  }

  async createMatiere(req: Request, res: Response): Promise<void> {
    const result = await this.referencesService.createMatiere(req.body);
    successResponse(res, result, 201);
  }

  async updateMatiere(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.referencesService.updateMatiere(id, req.body);
    successResponse(res, result);
  }

  async deleteMatiere(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.referencesService.deleteMatiere(id);
    successResponse(res, { message: 'Matière supprimée' });
  }
}
