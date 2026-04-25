import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  strategyApi,
  Strategy,
  CreateStrategyInput,
  UpdateStrategyInput,
  StrategyQueryParams,
} from '../api/strategy';

export const useStrategyStore = defineStore('strategy', () => {
  // State
  const strategies = ref<Strategy[]>([]);
  const currentStrategy = ref<Strategy | null>(null);
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const hasStrategies = computed(() => strategies.value.length > 0);

  // Actions
  async function fetchStrategies(params?: StrategyQueryParams): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await strategyApi.getList(params);
      strategies.value = response.data.data;
      pagination.value = {
        page: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total,
        totalPages: response.data.totalPages,
      };
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch strategies';
    } finally {
      loading.value = false;
    }
  }

  async function fetchStrategy(id: string): Promise<Strategy> {
    loading.value = true;
    error.value = null;

    try {
      const response = await strategyApi.getById(id);
      currentStrategy.value = response.data;
      return response.data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch strategy';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createStrategy(data: CreateStrategyInput): Promise<Strategy> {
    loading.value = true;
    error.value = null;

    try {
      const response = await strategyApi.create(data);
      strategies.value.unshift(response.data);
      return response.data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create strategy';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updateStrategy(id: string, data: UpdateStrategyInput): Promise<Strategy> {
    loading.value = true;
    error.value = null;

    try {
      const response = await strategyApi.update(id, data);

      // 更新列表中的策略
      const index = strategies.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        strategies.value[index] = response.data;
      }

      // 更新当前策略
      if (currentStrategy.value?.id === id) {
        currentStrategy.value = response.data;
      }

      return response.data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update strategy';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteStrategy(id: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await strategyApi.delete(id);
      strategies.value = strategies.value.filter((s) => s.id !== id);

      if (currentStrategy.value?.id === id) {
        currentStrategy.value = null;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete strategy';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function duplicateStrategy(id: string): Promise<Strategy> {
    loading.value = true;
    error.value = null;

    try {
      const response = await strategyApi.duplicate(id);
      strategies.value.unshift(response.data);
      return response.data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to duplicate strategy';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function clearCurrentStrategy(): void {
    currentStrategy.value = null;
  }

  return {
    // State
    strategies,
    currentStrategy,
    pagination,
    loading,
    error,
    // Getters
    hasStrategies,
    // Actions
    fetchStrategies,
    fetchStrategy,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    duplicateStrategy,
    clearCurrentStrategy,
  };
});
