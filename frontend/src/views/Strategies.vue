<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useStrategyStore } from '../stores/strategy';

const router = useRouter();
const strategyStore = useStrategyStore();

const showCreateModal = ref(false);
const newStrategyName = ref('');
const creating = ref(false);

onMounted(() => {
  strategyStore.fetchStrategies({ page: 1, pageSize: 20 });
});

const hasStrategies = computed(() => strategyStore.hasStrategies);

async function handleCreate() {
  if (!newStrategyName.value.trim()) return;

  creating.value = true;

  try {
    const strategy = await strategyStore.createStrategy({
      name: newStrategyName.value,
      code: `# 策略: ${newStrategyName.value}
# 在这里编写您的交易策略

def initialize(context):
    """初始化策略配置"""
    context.symbol = 'AAPL'
    context.fast_period = 10
    context.slow_period = 20

def handle_data(context, data):
    """每个交易周期执行的策略逻辑"""
    # 获取历史价格
    prices = data.history(context.symbol, 'close', context.slow_period + 1)

    # 计算移动平均线
    fast_ma = prices[-context.fast_period:].mean()
    slow_ma = prices[-context.slow_period:].mean()

    # 获取当前持仓
    position = context.portfolio.positions.get(context.symbol, 0)

    # 交易逻辑
    if fast_ma > slow_ma and position == 0:
        # 金叉买入
        context.order(context.symbol, 100)
    elif fast_ma < slow_ma and position > 0:
        # 死叉卖出
        context.order(context.symbol, -position)
`,
      status: 'draft',
      isPublic: false,
    });

    showCreateModal.value = false;
    newStrategyName.value = '';
    router.push(`/strategies/${strategy.id}`);
  } catch (e) {
    console.error('Failed to create strategy:', e);
  } finally {
    creating.value = false;
  }
}

async function handleDelete(id: string) {
  if (!confirm('确定要删除这个策略吗？')) return;

  try {
    await strategyStore.deleteStrategy(id);
  } catch (e) {
    console.error('Failed to delete strategy:', e);
  }
}

async function handleDuplicate(id: string) {
  try {
    await strategyStore.duplicateStrategy(id);
  } catch (e) {
    console.error('Failed to duplicate strategy:', e);
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  };
  return labels[status] || status;
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    archived: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
  return classes[status] || classes.draft;
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">策略管理</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          管理和编辑您的交易策略
        </p>
      </div>
      <button
        @click="showCreateModal = true"
        class="btn-primary"
      >
        + 新建策略
      </button>
    </div>

    <!-- Strategy List -->
    <div v-if="strategyStore.loading" class="text-center py-12 text-gray-500">
      加载中...
    </div>

    <div v-else-if="!hasStrategies" class="card">
      <div class="card-body text-center py-12">
        <div class="text-6xl mb-4">📝</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          还没有任何策略
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          创建您的第一个交易策略，开始量化交易之旅
        </p>
        <button @click="showCreateModal = true" class="btn-primary">
          + 新建策略
        </button>
      </div>
    </div>

    <div v-else class="grid gap-4">
      <div
        v-for="strategy in strategyStore.strategies"
        :key="strategy.id"
        class="card hover:shadow-md transition-shadow cursor-pointer"
        @click="router.push(`/strategies/${strategy.id}`)"
      >
        <div class="card-body">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ strategy.name }}
                </h3>
                <span
                  :class="[
                    'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                    getStatusClass(strategy.status)
                  ]"
                >
                  {{ getStatusLabel(strategy.status) }}
                </span>
                <span
                  v-if="strategy.isPublic"
                  class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  公开
                </span>
              </div>
              <p v-if="strategy.description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ strategy.description }}
              </p>
              <div class="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                <span>更新于 {{ new Date(strategy.updatedAt).toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2" @click.stop>
              <button
                @click="handleDuplicate(strategy.id)"
                class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="复制"
              >
                📋
              </button>
              <button
                @click="handleDelete(strategy.id)"
                class="p-2 text-gray-400 hover:text-red-500"
                title="删除"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="hasStrategies && strategyStore.pagination.totalPages > 1" class="mt-6 flex justify-center">
      <nav class="flex items-center gap-2">
        <button
          :disabled="strategyStore.pagination.page === 1"
          @click="strategyStore.fetchStrategies({ page: strategyStore.pagination.page - 1 })"
          class="btn-secondary px-3 py-1"
        >
          上一页
        </button>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ strategyStore.pagination.page }} / {{ strategyStore.pagination.totalPages }}
        </span>
        <button
          :disabled="strategyStore.pagination.page === strategyStore.pagination.totalPages"
          @click="strategyStore.fetchStrategies({ page: strategyStore.pagination.page + 1 })"
          class="btn-secondary px-3 py-1"
        >
          下一页
        </button>
      </nav>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showCreateModal = false"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          新建策略
        </h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            策略名称
          </label>
          <input
            v-model="newStrategyName"
            type="text"
            class="input"
            placeholder="例如：双均线交叉策略"
            @keyup.enter="handleCreate"
          />
        </div>
        <div class="flex justify-end gap-3">
          <button
            @click="showCreateModal = false"
            class="btn-secondary"
          >
            取消
          </button>
          <button
            @click="handleCreate"
            :disabled="creating || !newStrategyName.trim()"
            class="btn-primary"
          >
            {{ creating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
