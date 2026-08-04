import { IUser } from '../../../models/User.model';

export interface IUserRepository {
  findUserById(id: string): Promise<IUser | null>;
  updateUser(id: string, data: Partial<IUser>): Promise<IUser>;
  listUsers(filters?: any, options?: any): Promise<{ users: IUser[]; total: number }>;
  deleteUser(id: string): Promise<void>;
}
