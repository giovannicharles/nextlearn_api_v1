import { Response } from 'express';
import { z } from 'zod';
import { VerificationService } from './verification.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';
import { JUSTIFICATIF_TYPE_VALUES } from '../../shared/constants/verification';
import { NIVEAU_VALUES } from '../../shared/constants/academique';

const submitSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(80),
  prenom: z.string().min(1, 'Prénom requis').max(80),
  matricule: z.string().max(40).optional(),
  universite: z.string().min(1, 'Université requise'),
  filiere: z.string().min(1, 'Filière requise'),
  niveau: z.enum(NIVEAU_VALUES),
  justificatifType: z.enum(JUSTIFICATIF_TYPE_VALUES),
});

export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  async submit(req: AuthRequest, res: Response): Promise<void> {
    const data = submitSchema.parse(req.body);
    const file = (req as any).file;
    if (!file) throw new Error('Justificatif requis');

    const result = await this.verificationService.submit(
      req.user!.id,
      data,
      file.buffer,
      req.ip,
    );
    successResponse(res, result, 201);
  }

  async getMyStatus(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.verificationService.getMyStatus(req.user!.id);
    successResponse(res, result);
  }
}
