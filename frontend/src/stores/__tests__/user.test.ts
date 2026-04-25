/**
 * User Store 测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '../user';

// Mock authApi
vi.mock('../../api/auth', () => ({
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

  describe('logout', () => {
    it('应该清除用户状态', () => {
      const store = useUserStore();

      // 先设置状态
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
});
