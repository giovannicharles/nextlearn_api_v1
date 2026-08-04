import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { registerSchema, verifyOtpSchema, setupPinSchema, loginSchema, refreshTokenSchema, resendOtpSchema, resetPinSchema, verify2faSchema, confirmResetPinSchema } from './dto/index';
import { successResponse } from '../../shared/http/response';

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    const validatedData = registerSchema.parse(req.body);
    const result = await this.authService.register(validatedData);
    successResponse(res, result, 201);
  }

  async verifyOtp(req: Request, res: Response): Promise<void> {
    const validatedData = verifyOtpSchema.parse(req.body);
    const result = await this.authService.verifyOtp(validatedData.tempToken, validatedData.code);
    successResponse(res, result);
  }

  async setupPin(req: Request, res: Response): Promise<void> {
    const validatedData = setupPinSchema.parse(req.body);
    const result = await this.authService.setupPin(validatedData.tempToken, validatedData.pin);
    successResponse(res, result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const validatedData = loginSchema.parse(req.body);
    const result = await this.authService.login(validatedData.email, validatedData.pin);
    successResponse(res, result);
  }

  async verify2faLogin(req: Request, res: Response): Promise<void> {
    const validatedData = verify2faSchema.parse(req.body);
    const result = await this.authService.verify2faLogin(validatedData.tempToken, validatedData.code);
    successResponse(res, result);
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const validatedData = refreshTokenSchema.parse(req.body);
    const result = await this.authService.refreshAccessToken(validatedData.refreshToken);
    successResponse(res, result);
  }

  async resendOtp(req: Request, res: Response): Promise<void> {
    const validatedData = resendOtpSchema.parse(req.body);
    const result = await this.authService.resendOtp(validatedData.tempToken);
    successResponse(res, result);
  }

  async resetPin(req: Request, res: Response): Promise<void> {
    const validatedData = resetPinSchema.parse(req.body);
    const result = await this.authService.resetPin(validatedData.email);
    successResponse(res, result);
  }

  async confirmResetPin(req: Request, res: Response): Promise<void> {
    const validatedData = confirmResetPinSchema.parse(req.body);
    const result = await this.authService.confirmResetPin(validatedData.tempToken, validatedData.code, validatedData.newPin);
    successResponse(res, result);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await this.authService.logout(userId);
    successResponse(res, { message: 'Déconnexion réussie' });
  }

  async getMe(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await this.authService.getMe(userId);
    successResponse(res, result);
  }
}
