"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
/**
 * 用户服务
 */
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const factory_js_1 = require("../dao/factory.js");
const error_js_1 = require("../middleware/error.js");
const auth_js_1 = require("../middleware/auth.js");
class UserService {
    getRepository() {
        return factory_js_1.DAOFactory.createRepository('users');
    }
    /**
     * 用户注册
     */
    async register(input) {
        const { email, password, name } = input;
        const repo = this.getRepository();
        // 检查邮箱是否已存在
        const existing = await repo.findOne({ email });
        if (existing) {
            throw new error_js_1.ConflictError('Email already registered');
        }
        // 加密密码
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // 创建用户
        const user = await repo.create({
            email,
            passwordHash,
            name,
            role: 'user',
            isActive: true,
        });
        // 生成 token
        const token = (0, auth_js_1.generateToken)({ userId: user.id, email: user.email });
        const refreshToken = (0, auth_js_1.generateRefreshToken)({ userId: user.id, email: user.email });
        return {
            user: this.sanitizeUser(user),
            token,
            refreshToken,
        };
    }
    /**
     * 用户登录
     */
    async login(input) {
        const { email, password } = input;
        const repo = this.getRepository();
        // 查找用户
        const user = await repo.findOne({ email });
        if (!user) {
            throw new error_js_1.UnauthorizedError('Invalid email or password');
        }
        // 验证密码
        const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValid) {
            throw new error_js_1.UnauthorizedError('Invalid email or password');
        }
        // 检查用户状态
        if (!user.isActive) {
            throw new error_js_1.UnauthorizedError('Account is deactivated');
        }
        // 生成 token
        const token = (0, auth_js_1.generateToken)({ userId: user.id, email: user.email });
        const refreshToken = (0, auth_js_1.generateRefreshToken)({ userId: user.id, email: user.email });
        return {
            user: this.sanitizeUser(user),
            token,
            refreshToken,
        };
    }
    /**
     * 获取用户信息
     */
    async getById(userId) {
        const repo = this.getRepository();
        const user = await repo.findById(userId);
        if (!user) {
            throw new error_js_1.NotFoundError('User not found');
        }
        return this.sanitizeUser(user);
    }
    /**
     * 更新用户信息
     */
    async update(userId, data) {
        const repo = this.getRepository();
        const user = await repo.update(userId, data);
        if (!user) {
            throw new error_js_1.NotFoundError('User not found');
        }
        return this.sanitizeUser(user);
    }
    /**
     * 修改密码
     */
    async changePassword(userId, oldPassword, newPassword) {
        const repo = this.getRepository();
        const user = await repo.findById(userId);
        if (!user) {
            throw new error_js_1.NotFoundError('User not found');
        }
        // 验证旧密码
        const isValid = await bcryptjs_1.default.compare(oldPassword, user.passwordHash);
        if (!isValid) {
            throw new error_js_1.UnauthorizedError('Invalid old password');
        }
        // 加密新密码
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await repo.update(userId, { passwordHash });
    }
    /**
     * 刷新 Token
     */
    async refreshToken(userId) {
        const repo = this.getRepository();
        const user = await repo.findById(userId);
        if (!user || !user.isActive) {
            throw new error_js_1.UnauthorizedError('Invalid user');
        }
        const token = (0, auth_js_1.generateToken)({ userId: user.id, email: user.email });
        const refreshToken = (0, auth_js_1.generateRefreshToken)({ userId: user.id, email: user.email });
        return { token, refreshToken };
    }
    /**
     * 移除敏感信息
     */
    sanitizeUser(user) {
        const { passwordHash, ...rest } = user;
        return rest;
    }
}
exports.userService = new UserService();
//# sourceMappingURL=user.js.map