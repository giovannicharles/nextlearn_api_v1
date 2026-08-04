import { IUser, User, OtpCode, RefreshToken } from '../../models/index';
import { IAuthRepository } from '../../modules/auth/domain/auth.repository.interface';
import { ConflictError, NotFoundError } from '../../shared/errors/index';
import bcrypt from 'bcryptjs';

export class AuthRepository implements IAuthRepository {
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    try {
      const user = await User.create(userData);
      return user;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictError('Un compte avec cet email existe déjà');
      }
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email: email.toLowerCase() }).select('+pinHash').exec();
  }

  async findUserById(id: string): Promise<IUser | null> {
    return await User.findById(id).exec();
  }

  async updateUserPin(userId: string, pinHash: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(userId, { pinHash }, { new: true }).exec();
    if (!user) throw new NotFoundError('Utilisateur');
    return user;
  }

  async createOtpCode(otpData: Partial<any>): Promise<any> {
    return await OtpCode.create(otpData);
  }

  async findValidOtpCode(email: string, purpose: string): Promise<any | null> {
    return await OtpCode.findOne({
      email: email.toLowerCase(),
      purpose,
      used: false,
      expiresAt: { $gt: new Date() },
    }).select('+code').exec();
  }

  async updateOtpCodeAsUsed(otpId: string): Promise<void> {
    await OtpCode.findByIdAndUpdate(otpId, { used: true }).exec();
  }

  async deleteOtpCode(otpId: string): Promise<void> {
    await OtpCode.findByIdAndDelete(otpId).exec();
  }

  async createRefreshToken(tokenData: Partial<any>): Promise<any> {
    return await RefreshToken.create(tokenData);
  }

  async findRefreshToken(token: string): Promise<any | null> {
    return await RefreshToken.findOne({ token, revoked: false }).exec();
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await RefreshToken.findByIdAndUpdate(tokenId, { revoked: true }).exec();
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await RefreshToken.updateMany({ userId }, { revoked: true }).exec();
  }
}
