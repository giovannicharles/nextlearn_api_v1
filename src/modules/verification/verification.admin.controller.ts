import { Response } from 'express';
import { z } from 'zod';
import { VerificationAdminService } from './verification.admin.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';
import { MOTIF_REJET_CODES } from '../../shared/constants/verification';

const rejectSchema = z.object({
  motifCode: z.enum(MOTIF_REJET_CODES),
  motifTexte: z.string().max(2000).optional(),
});

const moreInfoSchema = z.object({
  message: z.string().min(1, 'Message requis').max(2000),
});

const assignSchema = z.object({
  adminId: z.string().min(1),
});

const bulkSchema = z.object({
  requestIds: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(['approve', 'reject']),
  motifCode: z.enum(MOTIF_REJET_CODES).optional(),
  motifTexte: z.string().max(2000).optional(),
});

export class VerificationAdminController {
  constructor(private service: VerificationAdminService) {}

  async list(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.service.listRequests(req.query);
    successResponse(res, result.data, 200, result.meta);
  }

  async detail(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.service.getRequestDetail(String(req.params.id));
    successResponse(res, result);
  }

  async justificatifUrl(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.service.getJustificatifUrl(
      String(req.params.id),
      req.user!.id,
      req.ip,
    );
    successResponse(res, result);
  }

  async takeReview(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.service.takeReview(String(req.params.id), req.user!.id, req.ip);
    successResponse(res, result);
  }

  async assign(req: AuthRequest, res: Response): Promise<void> {
    const { adminId } = assignSchema.parse(req.body);
    const result = await this.service.assign(String(req.params.id), req.user!.id, adminId, req.ip);
    successResponse(res, result);
  }

  async approve(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.service.approve(String(req.params.id), req.user!.id, req.ip);
    successResponse(res, result);
  }

  async reject(req: AuthRequest, res: Response): Promise<void> {
    const { motifCode, motifTexte } = rejectSchema.parse(req.body);
    const result = await this.service.reject(
      String(req.params.id),
      req.user!.id,
      motifCode,
      motifTexte,
      req.ip,
    );
    successResponse(res, result);
  }

  async requestMoreInfo(req: AuthRequest, res: Response): Promise<void> {
    const { message } = moreInfoSchema.parse(req.body);
    const result = await this.service.requestMoreInfo(
      String(req.params.id),
      req.user!.id,
      message,
      req.ip,
    );
    successResponse(res, result);
  }

  async bulk(req: AuthRequest, res: Response): Promise<void> {
    const data = bulkSchema.parse(req.body);
    const result = await this.service.bulk(
      data.requestIds,
      req.user!.id,
      data.action,
      data.motifCode,
      data.motifTexte,
      req.ip,
    );
    successResponse(res, result);
  }

  async stats(_req: AuthRequest, res: Response): Promise<void> {
    successResponse(res, await this.service.getStats());
  }

  async reviewers(_req: AuthRequest, res: Response): Promise<void> {
    successResponse(res, await this.service.listReviewers());
  }
}
