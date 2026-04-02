/**
 * 用户实体定义
 */
import { BaseEntity } from '../types.js';
export type UserRole = 'user' | 'admin';
export interface User extends BaseEntity {
    email: string;
    passwordHash: string;
    name: string;
    avatar?: string;
    role: UserRole;
    isActive: boolean;
}
/**
 * 创建用户时的数据
 */
export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * 更新用户时的数据
 */
export type UpdateUserData = Partial<Pick<User, 'name' | 'avatar' | 'role' | 'isActive'>>;
//# sourceMappingURL=user.d.ts.map