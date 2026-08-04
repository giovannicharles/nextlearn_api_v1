import bcrypt from 'bcryptjs';
import { IUserRepository } from './domain/user.repository.interface';
import { NotFoundError, UnauthorizedError } from '../../shared/errors/index';
import { UserResponse } from '../auth/domain/auth.types';
import { StudySession, OfflineDownload, LectureProgress } from '../../models/index';

export class UserService {
  constructor(private userRepository: IUserRepository) {}

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) throw new NotFoundError('Utilisateur');
    return this.formatUser(user);
  }

  async getProfileWithStats(userId: string): Promise<any> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) throw new NotFoundError('Utilisateur');

    const [sessions, downloads, lectureProgress] = await Promise.all([
      StudySession.find({ userId }).exec(),
      OfflineDownload.find({ userId }).exec(),
      LectureProgress.find({ userId }).exec(),
    ]);

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.dureeSecondes || 0), 0);
    const heuresEtude = Math.round((totalSeconds / 3600) * 10) / 10;
    const docsLus = new Set(lectureProgress.map((p) => p.documentId)).size;
    const docsTelecharges = downloads.length;

    const studyDays = new Set(sessions.map((s) => new Date(s.date).toDateString()));
    const sortedDays = Array.from(studyDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < sortedDays.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (new Date(sortedDays[i]).getTime() === expected.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return {
      user: this.formatUser(user),
      stats: {
        docsTelecharges,
        docsLus,
        heuresEtude,
        streak,
      },
    };
  }

  async updateProfile(userId: string, data: any): Promise<UserResponse> {
    const user = await this.userRepository.updateUser(userId, data);
    return this.formatUser(user);
  }

  async updateLanguage(userId: string, langue: string): Promise<UserResponse> {
    const user = await this.userRepository.updateUser(userId, { langue: langue as any });
    return this.formatUser(user);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<UserResponse> {
    const user = await this.userRepository.updateUser(userId, { avatarUrl });
    return this.formatUser(user);
  }

  async changePin(userId: string, currentPin: string, newPin: string): Promise<void> {
    const user = await this.userRepository.findUserById(userId);
    if (!user || !user.pinHash) {
      throw new NotFoundError('Utilisateur');
    }

    const isValidPin = await bcrypt.compare(currentPin, user.pinHash);
    if (!isValidPin) {
      throw new UnauthorizedError('PIN actuel incorrect');
    }

    const newPinHash = await bcrypt.hash(newPin, 12);
    await this.userRepository.updateUser(userId, { pinHash: newPinHash });
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.userRepository.updateUser(userId, { fcmToken });
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.userRepository.deleteUser(userId);
  }

  async listUsers(options: any): Promise<{ users: UserResponse[]; total: number }> {
    const { users, total } = await this.userRepository.listUsers({}, options);
    return {
      users: users.map((u) => this.formatUser(u)),
      total,
    };
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
      role: user.role || 'USER',
      avatarUrl: user.avatarUrl || null,
    };
  }
}
