/**
 * User Store 测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '../stores/user';
import { authApi } from '../api/auth';

// Mock authApi
vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    refresh: vi.fn(),
  },
}));

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useUserStore();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.isLoggedIn).toBe(false);
      expect(store.userName).toBe('Guest');
    });
  });

  describe('login', () => {
    it('应该成功登录并设置用户状态', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      (authApi.login as any).mockResolvedValue(mockResponse);

      const store = useUserStore();
      await store.login('test@example.com', 'password123');

      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(store.user).toEqual(mockResponse.data.user);
      expect(store.token).toBe('mock-token');
      expect(store.refreshToken).toBe('mock-refresh-token');
      expect(store.isLoggedIn).toBe(true);
      expect(store.userName).toBe('Test User');
    });

    it('登录失败应该不设置用户状态', async () => {
      (authApi.login as any).mockRejectedValue(new Error('Invalid credentials'));

      const store = useUserStore();

      await expect(store.login('test@example.com', 'wrong')).rejects.toThrow();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isLoggedIn).toBe(false);
    });
  });

  describe('register', () => {
    it('应该成功注册并设置用户状态', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '2',
            email: 'new@example.com',
            name: 'New User',
            role: 'user',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          token: 'new-token',
          refreshToken: 'new-refresh-token',
        },
      };

      (authApi.register as any).mockResolvedValue(mockResponse);

      const store = useUserStore();
      await store.register('new@example.com', 'password123', 'New User');

      expect(authApi.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(store.isLoggedIn).toBe(true);
      expect(store.userName).toBe('New User');
    });
  });

  describe('logout', () => {
    it('应该清除用户状态', async () => {
      const store = useUserStore();

      // 先登录
      store.user = { id: '1', email: 'test@example.com', name: 'Test' } as any;
      store.token = 'token';
      store.refreshToken = 'refresh';

      expect(store.isLoggedIn).toBe(true);

      // 登出
      store.logout();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.isLoggedIn).toBe(false);
    });
  });

  describe('fetchUser', () => {
    it('应该获取当前用户信息', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (authApi.me as any).mockResolvedValue({ success: true, data: mockUser });

      const store = useUserStore();
      store.token = 'existing-token';

      await store.fetchUser();

      expect(authApi.me).toHaveBeenCalled();
      expect(store.user).toEqual(mockUser);
    });

    it('没有 token 时不应该调用 API', async () => {
      const store = useUserStore();
      store.token = null;

      await store.fetchUser();

      expect(authApi.me).not.toHaveBeenCalled();
    });
  });
});
