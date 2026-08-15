import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { IAuthRepository } from './domain/auth.repository.interface';
import { MailerService } from '../../infrastructure/mailer/mailer.interface';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../../shared/errors/index';
import { TempTokenResponse, AuthResponse, UserResponse } from './domain/auth.types';
import { OtpCode, OtpPurpose, User } from '../../models/index';
import env from '../../config/env';
import { SettingService } from '../settings/setting.service';
import { resolveAcademicRefs } from '../../shared/utils/academic-refs';

export class AuthService {
  private settingService: SettingService;

  constructor(
    private authRepository: IAuthRepository,
    private mailerService: MailerService
  ) {
    this.settingService = new SettingService();
  }

  async register(data: any): Promise<TempTokenResponse> {
    const allowRegistration = await this.settingService.getSettingValue<boolean>('allow_self_registration', true);
    if (!allowRegistration) {
      throw new ForbiddenError('L\'auto-inscription est désactivée. Contactez un administrateur.');
    }

    // Le parcours « je n'ai pas d'adresse institutionnelle » lève la
    // restriction de domaine : l'appartenance académique sera vérifiée par un
    // humain sur pièce justificative avant tout accès au contenu.
    if (!data.sansEmailInstitutionnel) {
      const isAllowed = await this.settingService.isEmailDomainAllowed(data.email);
      if (!isAllowed) {
        const domains = await this.settingService.getEmailDomains();
        throw new ForbiddenError(`Domaine email non autorisé. Domaines acceptés: ${domains.join(', ')}`);
      }
    }

    const existingUser = await this.authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('Un compte avec cet email existe déjà');
    }

    // Résolution des références académiques dès l'inscription : sans elles,
    // le compte ne peut pas être ciblé par les notifications de nouveaux
    // contenus. Le nom reste stocké tel quel pour l'affichage.
    const academicRefs = await resolveAcademicRefs(data.universite, data.filiere);

    const user = await this.authRepository.createUser({
      email: data.email.toLowerCase(),
      nom: data.nom,
      prenom: data.prenom,
      universite: data.universite,
      filiere: data.filiere,
      ...academicRefs,
      niveau: data.niveau,
      // Sans le cycle, le niveau reste ambigu (N4 = INGE 4 ou Master 1) et
      // l'affichage du parcours serait faux.
      ...(data.cycle ? { cycle: data.cycle } : {}),
      isEmailVerified: false,
      // Marque le compte comme devant fournir un justificatif. Tant que ce
      // champ vaut autre chose que « approuve », l'accès au contenu est refusé.
      ...(data.sansEmailInstitutionnel ? { verificationStatus: 'requis' } : {}),
    });

    const otp = this.generateOtp();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.authRepository.createOtpCode({
      email: user.email,
      code: hashedOtp,
      purpose: OtpPurpose.REGISTER,
      expiresAt,
      userId: user.id,
    });

    try {
      console.log(`[EMAIL] Tentative d'envoi OTP à ${user.email} pour l'inscription`);
      await this.mailerService.sendOtpEmail(user.email, otp, `${user.nom} ${user.prenom}`);
      console.log(`[EMAIL] OTP envoyé avec succès à ${user.email}`);
    } catch (error) {
      console.error('[EMAIL] Erreur envoi OTP:', error);
      console.error('[EMAIL] Détails de l\'erreur:', error instanceof Error ? error.message : error);
      console.error('[EMAIL] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      // On lève toujours une erreur pour l'envoi d'OTP car c'est critique
      throw new Error(`Erreur lors de l'envoi de l'email OTP: ${error instanceof Error ? error.message : error}`);
    }

    const tempToken = this.generateTempToken(user.id, 'register');

    return {
      message: 'Compte créé. Un code OTP a été envoyé à votre e-mail.',
      tempToken,
      expiresIn: 600,
      maskedEmail: this.maskEmail(user.email),
    };
  }

  async verifyOtp(tempToken: string, code: string): Promise<TempTokenResponse> {
    const decoded = this.verifyTempToken(tempToken);
    if (decoded.type !== 'register' && decoded.type !== 'reset_pin') {
      throw new UnauthorizedError('Token invalide');
    }

    const user = await this.authRepository.findUserById(decoded.id);
    if (!user) {
      throw new NotFoundError('Utilisateur');
    }

    const purpose = decoded.type === 'reset_pin' ? OtpPurpose.RESET_PIN : OtpPurpose.REGISTER;
    const otpRecord = await this.authRepository.findValidOtpCode(user.email, purpose);
    if (!otpRecord) {
      throw new UnauthorizedError('Aucun code en attente ou code expiré');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await this.authRepository.deleteOtpCode(otpRecord.id);
      throw new UnauthorizedError('Trop de tentatives. Veuillez redemander un code.');
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    if (hashedCode !== otpRecord.code) {
      await OtpCode.findByIdAndUpdate(otpRecord.id, { $inc: { attempts: 1 } });
      const remaining = otpRecord.maxAttempts - otpRecord.attempts - 1;
      throw new UnauthorizedError(`Code incorrect. ${remaining} tentative(s) restante(s).`);
    }

    await this.authRepository.updateOtpCodeAsUsed(otpRecord.id);

    const newTempToken = this.generateTempToken(user.id, 'setup_pin');

    return {
      message: 'E-mail vérifié.',
      tempToken: newTempToken,
      expiresIn: 600,
    };
  }

  async setupPin(tempToken: string, pin: string): Promise<AuthResponse> {
    const decoded = this.verifyTempToken(tempToken);
    if (decoded.type !== 'setup_pin') {
      throw new UnauthorizedError('Token invalide');
    }

    const user = await this.authRepository.findUserById(decoded.id);
    if (!user) {
      throw new NotFoundError('Utilisateur');
    }

    const pinHash = await bcrypt.hash(pin, 12);
    const updatedUser = await this.authRepository.updateUserPin(user.id, pinHash);

    const { accessToken, refreshToken } = await this.generateTokenPair(user.id, (updatedUser as any).role);

    await this.authRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: this.formatUser(updatedUser),
    };
  }

  async login(email: string, pin: string): Promise<TempTokenResponse> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user || !user.pinHash) {
      throw new UnauthorizedError('Email ou PIN incorrect');
    }

    if ((user as any).status === 'banned') {
      throw new ForbiddenError('Votre compte a été banni. Contactez un administrateur.');
    }
    if ((user as any).status === 'suspended') {
      const until = (user as any).suspendedUntil;
      if (until && new Date(until) > new Date()) {
        throw new ForbiddenError(`Votre compte est suspendu jusqu'au ${new Date(until).toLocaleDateString()}. Raison: ${(user as any).suspendedReason || 'Non spécifiée'}`);
      }
    }

    // Verrouillage temporaire après PIN erronés répétés : protège le compte et
    // rend surtout l'étudiant en difficulté visible côté administration.
    const lockedUntil = (user as any).lockedUntil;
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      throw new ForbiddenError(
        'Trop de tentatives incorrectes. Compte temporairement bloqué — réinitialisez votre PIN ou contactez le support.',
      );
    }

    const isValidPin = await bcrypt.compare(pin, user.pinHash);
    if (!isValidPin) {
      await this.registerFailedPinAttempt(user.id);
      throw new UnauthorizedError('Email ou PIN incorrect');
    }

    await this.clearFailedPinAttempts(user.id);

    const otpExpiryMinutes = await this.settingService.getSettingValue<number>('otp_expiry_minutes', 10);
    const otp = this.generateOtp();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);

    await this.authRepository.createOtpCode({
      email: user.email,
      code: hashedOtp,
      purpose: OtpPurpose.LOGIN,
      expiresAt,
      userId: user.id,
    });

    try {
      await this.mailerService.sendOtpEmail(user.email, otp, `${user.nom} ${user.prenom}`);
    } catch (error) {
      console.error('Erreur envoi OTP 2FA:', error);
    }

    const tempToken = this.generateTempToken(user.id, 'login_2fa');

    return {
      message: 'PIN vérifié. Un code OTP a été envoyé à votre e-mail pour la vérification 2FA.',
      tempToken,
      expiresIn: 600,
      maskedEmail: this.maskEmail(user.email),
    };
  }

  /** Nombre de PIN erronés consécutifs au-delà duquel le compte est verrouillé. */
  private static readonly MAX_PIN_ATTEMPTS = 5;
  private static readonly PIN_LOCK_MINUTES = 30;

  private async registerFailedPinAttempt(userId: string): Promise<void> {
    const user = await User.findById(userId).select('failedPinAttempts');
    if (!user) return;

    const attempts = ((user as any).failedPinAttempts || 0) + 1;
    const patch: Record<string, unknown> = {
      failedPinAttempts: attempts,
      lastFailedLoginAt: new Date(),
    };

    if (attempts >= AuthService.MAX_PIN_ATTEMPTS) {
      patch.lockedUntil = new Date(Date.now() + AuthService.PIN_LOCK_MINUTES * 60 * 1000);
    }

    await User.updateOne({ _id: userId }, { $set: patch });
  }

  private async clearFailedPinAttempts(userId: string): Promise<void> {
    await User.updateOne(
      { _id: userId },
      { $set: { failedPinAttempts: 0 }, $unset: { lockedUntil: 1 } },
    );
  }

  async verify2faLogin(tempToken: string, code: string): Promise<AuthResponse> {
    const decoded = this.verifyTempToken(tempToken);
    if (decoded.type !== 'login_2fa') {
      throw new UnauthorizedError('Token invalide');
    }

    const user = await this.authRepository.findUserById(decoded.id);
    if (!user) {
      throw new NotFoundError('Utilisateur');
    }

    if ((user as any).status === 'banned') {
      throw new ForbiddenError('Votre compte a été banni.');
    }

    const otpRecord = await this.authRepository.findValidOtpCode(user.email, OtpPurpose.LOGIN);
    if (!otpRecord) {
      throw new UnauthorizedError('Aucun code en attente ou code expiré');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await this.authRepository.deleteOtpCode(otpRecord.id);
      throw new UnauthorizedError('Trop de tentatives. Veuillez vous reconnecter.');
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    if (hashedCode !== otpRecord.code) {
      await OtpCode.findByIdAndUpdate(otpRecord.id, { $inc: { attempts: 1 } });
      const remaining = otpRecord.maxAttempts - otpRecord.attempts - 1;
      throw new UnauthorizedError(`Code 2FA incorrect. ${remaining} tentative(s) restante(s).`);
    }

    await this.authRepository.updateOtpCodeAsUsed(otpRecord.id);

    const role = ((user as any).role || 'user').toLowerCase();
    const { accessToken, refreshToken } = await this.generateTokenPair(user.id, role);

    await this.authRepository.revokeAllUserRefreshTokens(user.id);
    await this.authRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    try {
      const { User } = await import('../../models/index');
      await User.findByIdAndUpdate(user.id, { lastLoginAt: new Date() });
    } catch (e) {
      // non-critical
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: this.formatUser(user),
    };
  }

  // Le refresh token tourne à chaque appel (l'ancien est révoqué ligne 277) : il
  // DOIT être renvoyé au client, sinon celui-ci rejoue un token mort au refresh
  // suivant et se retrouve déconnecté (renvoyé sur /login) alors que sa session
  // est valide. Ajout purement additif : les consommateurs qui ne lisent que
  // accessToken/expiresIn ne sont pas impactés.
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const tokenRecord = await this.authRepository.findRefreshToken(refreshToken);
    if (!tokenRecord || tokenRecord.revoked) {
      throw new UnauthorizedError('Refresh token invalide ou révoqué');
    }

    const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as any;
    const user = await this.authRepository.findUserById(decoded.id);
    if (!user) {
      throw new NotFoundError('Utilisateur');
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokenPair(user.id, (user as any).role);

    await this.authRepository.revokeRefreshToken(tokenRecord.id);
    await this.authRepository.createRefreshToken({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.revokeAllUserRefreshTokens(userId);
  }

  async resendOtp(tempToken: string): Promise<TempTokenResponse> {
    const decoded = this.verifyTempToken(tempToken);
    const user = await this.authRepository.findUserById(decoded.id);
    if (!user) {
      throw new NotFoundError('Utilisateur');
    }

    const purpose = decoded.type === 'setup_pin' ? OtpPurpose.REGISTER : OtpPurpose.REGISTER;

    const otp = this.generateOtp();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.authRepository.createOtpCode({
      email: user.email,
      code: hashedOtp,
      purpose,
      expiresAt,
      userId: user.id,
    });

    try {
      console.log(`[EMAIL] Tentative d'envoi OTP à ${user.email} pour l'inscription`);
      await this.mailerService.sendOtpEmail(user.email, otp, `${user.nom} ${user.prenom}`);
      console.log(`[EMAIL] OTP envoyé avec succès à ${user.email}`);
    } catch (error) {
      console.error('[EMAIL] Erreur envoi OTP:', error);
      console.error('[EMAIL] Détails de l\'erreur:', error instanceof Error ? error.message : error);
      console.error('[EMAIL] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      // On lève toujours une erreur pour l'envoi d'OTP car c'est critique
      throw new Error(`Erreur lors de l'envoi de l'email OTP: ${error instanceof Error ? error.message : error}`);
    }

    const newTempToken = this.generateTempToken(user.id, 'register');

    return {
      message: 'Un nouveau code OTP a été envoyé à votre e-mail.',
      tempToken: newTempToken,
      expiresIn: 600,
      maskedEmail: this.maskEmail(user.email),
    };
  }

  async resetPin(email: string): Promise<TempTokenResponse> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundError('Utilisateur');
    }

    const otp = this.generateOtp();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.authRepository.createOtpCode({
      email: user.email,
      code: hashedOtp,
      purpose: OtpPurpose.RESET_PIN,
      expiresAt,
      userId: user.id,
    });

    try {
      console.log(`[EMAIL] Tentative d'envoi OTP à ${user.email} pour l'inscription`);
      await this.mailerService.sendOtpEmail(user.email, otp, `${user.nom} ${user.prenom}`);
      console.log(`[EMAIL] OTP envoyé avec succès à ${user.email}`);
    } catch (error) {
      console.error('[EMAIL] Erreur envoi OTP:', error);
      console.error('[EMAIL] Détails de l\'erreur:', error instanceof Error ? error.message : error);
      console.error('[EMAIL] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      // On lève toujours une erreur pour l'envoi d'OTP car c'est critique
      throw new Error(`Erreur lors de l'envoi de l'email OTP: ${error instanceof Error ? error.message : error}`);
    }

    const tempToken = this.generateTempToken(user.id, 'reset_pin');

    return {
      message: 'Un code OTP a été envoyé pour réinitialiser votre PIN.',
      tempToken,
      expiresIn: 600,
      maskedEmail: this.maskEmail(user.email),
    };
  }

  async confirmResetPin(tempToken: string, code: string, newPin: string): Promise<{ message: string }> {
    const decoded = this.verifyTempToken(tempToken);
    if (decoded.type !== 'reset_pin') {
      throw new UnauthorizedError('Token invalide');
    }

    const user = await this.authRepository.findUserById(decoded.id);
    if (!user) {
      throw new NotFoundError('Utilisateur');
    }

    const otpRecord = await this.authRepository.findValidOtpCode(user.email, OtpPurpose.RESET_PIN);
    if (!otpRecord) {
      throw new UnauthorizedError('Aucun code en attente ou code expiré');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await this.authRepository.deleteOtpCode(otpRecord.id);
      throw new UnauthorizedError('Trop de tentatives. Veuillez redemander un code.');
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    if (hashedCode !== otpRecord.code) {
      await OtpCode.findByIdAndUpdate(otpRecord.id, { $inc: { attempts: 1 } });
      const remaining = otpRecord.maxAttempts - otpRecord.attempts - 1;
      throw new UnauthorizedError(`Code incorrect. ${remaining} tentative(s) restante(s).`);
    }

    await this.authRepository.updateOtpCodeAsUsed(otpRecord.id);

    const pinHash = await bcrypt.hash(newPin, 12);
    await this.authRepository.updateUserPin(user.id, pinHash);

    return { message: 'PIN réinitialisé avec succès. Vous pouvez vous connecter avec votre nouveau PIN.' };
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('Utilisateur');
    }
    return this.formatUser(user);
  }

  private generateOtp(): string {
    const buf = crypto.randomBytes(3);
    const num = (buf.readUIntBE(0, 3) % 900000) + 100000;
    return num.toString();
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 3) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
  }

  private generateTempToken(userId: string, type: string): string {
    return jwt.sign({ id: userId, type }, env.JWT_SECRET, { expiresIn: '15m' });
  }

  private verifyTempToken(token: string): any {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
      throw new UnauthorizedError('Token invalide ou expiré');
    }
  }

  private async generateTokenPair(userId: string, role: string = 'user'): Promise<{ accessToken: string; refreshToken: string }> {
    const accessExpiry = env.JWT_ACCESS_EXPIRES_IN || env.JWT_EXPIRES_IN || '15m';
    const refreshExpiry = env.JWT_REFRESH_EXPIRES_IN || '30d';
    const accessToken = jwt.sign({ id: userId, role }, env.JWT_SECRET, { expiresIn: accessExpiry } as any);
    const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, env.JWT_SECRET, { expiresIn: refreshExpiry } as any);
    return { accessToken, refreshToken };
  }

  private formatUser(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      universite: user.universite,
      filiere: user.filiere,
      niveau: user.niveau,
      langue: user.langue,
      role: (user.role || 'user').toLowerCase(),
      status: user.status || 'active',
      avatarUrl: user.avatarUrl || null,
      isPremium: user.isPremium || false,
      verificationStatus: (user as any).verificationStatus,
    };
  }
}
