import { Request, Response } from 'express';
import { ReferencesService } from './references.service';
import { successResponse } from '../../shared/http/response';

export class ReferencesController {
  constructor(private referencesService: ReferencesService) {}

  // Types de documents
  async listDocumentTypes(_req: Request, res: Response): Promise<void> {
    successResponse(res, this.referencesService.listDocumentTypes());
  }

  async listJustificatifTypes(_req: Request, res: Response): Promise<void> {
    successResponse(res, this.referencesService.listJustificatifTypes());
  }

  async listMotifsRejet(_req: Request, res: Response): Promise<void> {
    successResponse(res, this.referencesService.listMotifsRejet());
  }

  // ── Cascade académique ───────────────────────────────────────────────────

  async listCycles(req: Request, res: Response): Promise<void> {
    const universiteId = req.query.universiteId as string | undefined;
    successResponse(res, await this.referencesService.listCycles(universiteId));
  }


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
  async listFilieres(req: Request, res: Response): Promise<void> {
    const universiteId = req.query.universiteId as string | undefined;
    const cycle = req.query.cycle as string | undefined;
    const result = await this.referencesService.listFilieres(universiteId, cycle);
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

  // Niveaux d'une filière
  async listNiveaux(req: Request, res: Response): Promise<void> {
    const filiereId = req.query.filiereId as string;
    const result = await this.referencesService.listNiveaux(filiereId);
    successResponse(res, result);
  }

  // Matieres
  async listMatieres(req: Request, res: Response): Promise<void> {
    const filiereId = req.query.filiereId as string | undefined;
    const niveau = req.query.niveau as string | undefined;
    const result = await this.referencesService.listMatieres(filiereId, niveau);
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

  // Enseignants
  async listEnseignants(_req: Request, res: Response): Promise<void> {
    const result = await this.referencesService.listEnseignants();
    successResponse(res, result);
  }

  async createEnseignant(req: Request, res: Response): Promise<void> {
    const result = await this.referencesService.createEnseignant(req.body);
    successResponse(res, result, 201);
  }

  async updateEnseignant(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const result = await this.referencesService.updateEnseignant(id, req.body);
    successResponse(res, result);
  }

  async deleteEnseignant(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.referencesService.deleteEnseignant(id);
    successResponse(res, { message: 'Enseignant supprimé' });
  }
}
