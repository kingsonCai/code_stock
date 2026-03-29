/**
 * Strategy Store 测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStrategyStore } from '../stores/strategy';
import { strategyApi } from '../api/strategy';

// Mock strategyApi
vi.mock('../api/strategy', () => ({
  strategyApi: {
    getList: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    duplicate: vi.fn(),
  },
}));

describe('Strategy Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useStrategyStore();

      expect(store.strategies).toEqual([]);
      expect(store.currentStrategy).toBeNull();
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.hasStrategies).toBe(false);
    });
  });

  describe('fetchStrategies', () => {
    it('应该成功获取策略列表', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [
            { id: '1', name: 'Strategy 1', code: 'code1' },
            { id: '2', name: 'Strategy 2', code: 'code2' },
          ],
          total: 2,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      };

      (strategyApi.getList as any).mockResolvedValue(mockResponse);

      const store = useStrategyStore();
      await store.fetchStrategies({ page: 1, pageSize: 20 });

      expect(strategyApi.getList).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
      expect(store.strategies).toHaveLength(2);
      expect(store.pagination.total).toBe(2);
      expect(store.loading).toBe(false);
    });

    it('获取失败应该设置错误', async () => {
      (strategyApi.getList as any).mockRejectedValue(new Error('Network error'));

      const store = useStrategyStore();
      await store.fetchStrategies();

      expect(store.error).toBe('Network error');
      expect(store.loading).toBe(false);
    });
  });

  describe('createStrategy', () => {
    it('应该成功创建策略', async () => {
      const newStrategy = {
        id: '3',
        name: 'New Strategy',
        code: 'new code',
        status: 'draft',
        isPublic: false,
        userId: 'user1',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (strategyApi.create as any).mockResolvedValue({
        success: true,
        data: newStrategy,
      });

      const store = useStrategyStore();
      const result = await store.createStrategy({
        name: 'New Strategy',
        code: 'new code',
      });

      expect(strategyApi.create).toHaveBeenCalled();
      expect(store.strategies).toContainEqual(newStrategy);
      expect(result).toEqual(newStrategy);
    });
  });

  describe('updateStrategy', () => {
    it('应该成功更新策略', async () => {
      const existingStrategy = {
        id: '1',
        name: 'Old Name',
        code: 'old code',
        status: 'draft' as const,
        isPublic: false,
        userId: 'user1',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedStrategy = {
        ...existingStrategy,
        name: 'New Name',
      };

      (strategyApi.update as any).mockResolvedValue({
        success: true,
        data: updatedStrategy,
      });

      const store = useStrategyStore();
      store.strategies = [existingStrategy];
      store.currentStrategy = existingStrategy;

      await store.updateStrategy('1', { name: 'New Name' });

      expect(strategyApi.update).toHaveBeenCalledWith('1', { name: 'New Name' });
      expect(store.strategies[0].name).toBe('New Name');
      expect(store.currentStrategy?.name).toBe('New Name');
    });
  });

  describe('deleteStrategy', () => {
    it('应该成功删除策略', async () => {
      (strategyApi.delete as any).mockResolvedValue({ success: true });

      const store = useStrategyStore();
      store.strategies = [
        { id: '1', name: 'Strategy 1' },
        { id: '2', name: 'Strategy 2' },
      ] as any;

      await store.deleteStrategy('1');

      expect(strategyApi.delete).toHaveBeenCalledWith('1');
      expect(store.strategies).toHaveLength(1);
      expect(store.strategies[0].id).toBe('2');
    });
  });

  describe('duplicateStrategy', () => {
    it('应该成功复制策略', async () => {
      const duplicated = {
        id: '3',
        name: 'Strategy 1 (Copy)',
        code: 'code',
      };

      (strategyApi.duplicate as any).mockResolvedValue({
        success: true,
        data: duplicated,
      });

      const store = useStrategyStore();
      const result = await store.duplicateStrategy('1');

      expect(strategyApi.duplicate).toHaveBeenCalledWith('1');
      expect(store.strategies).toContainEqual(duplicated);
    });
  });
});
