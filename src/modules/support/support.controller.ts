import { Response } from 'express';
import { z } from 'zod';
import { SupportService } from './support.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

const createTicketSchema = z.object({
  categorie: z.enum(['CONNEXION', 'DOCUMENT', 'COMPTE', 'BUG', 'AUTRE']).optional(),
  sujet: z.string().min(1, 'Sujet requis').max(140),
  message: z.string().min(1, 'Message requis').max(4000),
});

const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']).optional(),
  reponseAdmin: z.string().max(4000).optional(),
});

export class SupportController {
  constructor(private supportService: SupportService) {}

  // ── Étudiant ─────────────────────────────────────────────────────────────

  async createTicket(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const data = createTicketSchema.parse(req.body);
    const result = await this.supportService.createTicket(userId, data);
    successResponse(res, result, 201);
  }

  async listMyTickets(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.supportService.listUserTickets(req.user!.id);
    successResponse(res, result);
  }

  // ── Administration ───────────────────────────────────────────────────────

  async listTickets(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.supportService.listTickets(req.query);
    successResponse(res, result.data, 200, result.meta);
  }

  async updateTicket(req: AuthRequest, res: Response): Promise<void> {
    const data = updateTicketSchema.parse(req.body);
    const result = await this.supportService.updateTicket(
      String(req.params.id),
      req.user!.id,
      data,
    );
    successResponse(res, result);
  }

  async listAccountsNeedingAttention(_req: AuthRequest, res: Response): Promise<void> {
    const result = await this.supportService.listAccountsNeedingAttention();
    successResponse(res, result);
  }

  async unlockAccount(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.supportService.unlockAccount(String(req.params.id));
    successResponse(res, result);
  }
}
