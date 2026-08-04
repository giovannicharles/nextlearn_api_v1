import { IUser } from '../../../models/User.model';
import { IOtpCode } from '../../../models/OtpCode.model';
import { IRefreshToken } from '../../../models/RefreshToken.model';

export interface IAuthRepository {
  createUser(userData: Partial<IUser>): Promise<IUser>;
  findUserByEmail(email: string): Promise<IUser | null>;
  findUserById(id: string): Promise<IUser | null>;
  updateUserPin(userId: string, pinHash: string): Promise<IUser>;
  createOtpCode(otpData: Partial<IOtpCode>): Promise<IOtpCode>;
  findValidOtpCode(email: string, purpose: string): Promise<IOtpCode | null>;
  updateOtpCodeAsUsed(otpId: string): Promise<void>;
  deleteOtpCode(otpId: string): Promise<void>;
  createRefreshToken(tokenData: Partial<IRefreshToken>): Promise<IRefreshToken>;
  findRefreshToken(token: string): Promise<IRefreshToken | null>;
  revokeRefreshToken(tokenId: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;
}
