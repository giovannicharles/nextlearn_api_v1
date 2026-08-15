export interface RegisterDto {
  email: string;
  nom: string;
  prenom: string;
  universite: string;
  filiere: string;
  niveau: string;
}

export interface VerifyOtpDto {
  tempToken: string;
  code: string;
}

export interface SetupPinDto {
  tempToken: string;
  pin: string;
}

export interface LoginDto {
  email: string;
  pin: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ResendOtpDto {
  tempToken: string;
}

export interface ResetPinDto {
  email: string;
  otp: string;
  newPin: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  universite: string;
  filiere: string;
  niveau: string;
  langue: string;
  role: string;
  status?: string;
  avatarUrl: string | null;
  isPremium?: boolean;
  verificationStatus?: string;
}

export interface TempTokenResponse {
  message: string;
  tempToken: string;
  expiresIn: number;
  maskedEmail?: string;
}
