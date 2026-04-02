import { User, UpdateUserData } from '../dao/repositories/user.js';
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
declare class UserService {
    private getRepository;
    /**
     * 用户注册
     */
    register(input: RegisterInput): Promise<AuthResponse>;
    /**
     * 用户登录
     */
    login(input: LoginInput): Promise<AuthResponse>;
    /**
     * 获取用户信息
     */
    getById(userId: string): Promise<Omit<User, 'passwordHash'>>;
    /**
     * 更新用户信息
     */
    update(userId: string, data: UpdateUserData): Promise<Omit<User, 'passwordHash'>>;
    /**
     * 修改密码
     */
    changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
    /**
     * 刷新 Token
     */
    refreshToken(userId: string): Promise<{
        token: string;
        refreshToken: string;
    }>;
    /**
     * 移除敏感信息
     */
    private sanitizeUser;
}
export declare const userService: UserService;
export {};
//# sourceMappingURL=user.d.ts.map