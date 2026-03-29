/**
 * 用户服务
 */
import bcrypt from 'bcryptjs';
import { DAOFactory } from '../dao/factory.js';
import { User, CreateUserData, UpdateUserData, UserRole } from '../dao/repositories/user.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/error.js';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
  refreshToken: string;
}

class UserService {
  private getRepository() {
    return DAOFactory.createRepository<User>('users');
  }

  /**
   * 用户注册
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, name } = input;
    const repo = this.getRepository();

    // 检查邮箱是否已存在
    const existing = await repo.findOne({ email });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 12);

    // 创建用户
    const user = await repo.create({
      email,
      passwordHash,
      name,
      role: 'user',
      isActive: true,
    });

    // 生成 token
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    return {
      user: this.sanitizeUser(user),
      token,
      refreshToken,
    };
  }

  /**
   * 用户登录
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;
    const repo = this.getRepository();

    // 查找用户
    const user = await repo.findOne({ email });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 检查用户状态
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // 生成 token
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    return {
      user: this.sanitizeUser(user),
      token,
      refreshToken,
    };
  }

  /**
   * 获取用户信息
   */
  async getById(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const repo = this.getRepository();
    const user = await repo.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * 更新用户信息
   */
  async update(userId: string, data: UpdateUserData): Promise<Omit<User, 'passwordHash'>> {
    const repo = this.getRepository();

    const user = await repo.update(userId, data);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * 修改密码
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const repo = this.getRepository();

    const user = await repo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid old password');
    }

    // 加密新密码
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await repo.update(userId, { passwordHash } as Partial<User>);
  }

  /**
   * 刷新 Token
   */
  async refreshToken(userId: string): Promise<{ token: string; refreshToken: string }> {
    const repo = this.getRepository();
    const user = await repo.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid user');
    }

    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    return { token, refreshToken };
  }

  /**
   * 移除敏感信息
   */
  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}

export const userService = new UserService();
