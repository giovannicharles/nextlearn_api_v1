import { User } from '../../models/index';
import { IUserRepository } from '../../modules/users/domain/user.repository.interface';
import { NotFoundError } from '../../shared/errors/index';

export class UserRepository implements IUserRepository {
  async findUserById(id: string): Promise<any | null> {
    return await User.findById(id).exec();
  }

  async updateUser(id: string, data: Partial<any>): Promise<any> {
    const user = await User.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!user) throw new NotFoundError('Utilisateur');
    return user;
  }

  async listUsers(filters: any = {}, options: any = {}): Promise<{ users: any[]; total: number }> {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit).exec(),
      User.countDocuments(query),
    ]);

    return { users, total };
  }

  async deleteUser(id: string): Promise<void> {
    const user = await User.findByIdAndDelete(id).exec();
    if (!user) throw new NotFoundError('Utilisateur');
  }
}
