<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStrategyStore } from '../stores/strategy';
import { Strategy, StrategyStatus } from '../api/strategy';
import CodeEditor from '../components/editor/CodeEditor.vue';

const route = useRoute();
const router = useRouter();
const strategyStore = useStrategyStore();

const strategyId = computed(() => route.params.id as string);
const strategy = computed(() => strategyStore.currentStrategy);

const saving = ref(false);
const runningBacktest = ref(false);
const activeTab = ref<'code' | 'config' | 'backtest'>('code');

// 编辑表单
const form = ref({
  name: '',
  description: '',
  code: '',
  isPublic: false,
});

// 监听策略变化，更新表单
watch(strategy, (newStrategy) => {
  if (newStrategy) {
    form.value = {
      name: newStrategy.name,
      description: newStrategy.description || '',
      code: newStrategy.code,
      isPublic: newStrategy.isPublic,
    };
  }
}, { immediate: true });

onMounted(() => {
  strategyStore.fetchStrategy(strategyId.value);
});

async function handleSave() {
  if (!strategy.value) return;

  saving.value = true;

  try {
    await strategyStore.updateStrategy(strategy.value.id, {
      name: form.value.name,
      description: form.value.description,
      code: form.value.code,
      isPublic: form.value.isPublic,
    });
  } catch (e) {
    console.error('Failed to save strategy:', e);
  } finally {
    saving.value = false;
  }
}

async function handlePublish() {
  if (!strategy.value) return;

  try {
    await strategyStore.updateStrategy(strategy.value.id, {
      status: 'published',
      isPublic: true,
    });
  } catch (e) {
    console.error('Failed to publish strategy:', e);
  }
}

function runBacktest() {
  runningBacktest.value = true;
  // TODO: 调用后端回测 API
  setTimeout(() => {
    runningBacktest.value = false;
    activeTab.value = 'backtest';
  }, 2000);
}

function getStatusLabel(status: StrategyStatus): string {
  const labels: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  };
  return labels[status] || status;
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="router.back()"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ← 返回
          </button>
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ strategy?.name || '加载中...' }}
              </h1>
              <span
                v-if="strategy"
                :class="[
                  'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                  strategy.status === 'published'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                ]"
              >
                {{ getStatusLabel(strategy.status) }}
              </span>
            </div>
            <p v-if="strategy?.description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ strategy.description }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="runBacktest"
            :disabled="runningBacktest"
            class="btn-secondary"
          >
            {{ runningBacktest ? '运行中...' : '▶ 运行回测' }}
          </button>
          <button
            v-if="strategy?.status === 'draft'"
            @click="handlePublish"
            class="btn-success"
          >
            发布
          </button>
          <button
            @click="handleSave"
            :disabled="saving"
            class="btn-primary"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mt-4 flex gap-4 border-b border-gray-200 dark:border-gray-700 -mb-px">
        <button
          v-for="tab in ['code', 'config', 'backtest'] as const"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          ]"
        >
          {{ tab === 'code' ? '代码' : tab === 'config' ? '配置' : '回测结果' }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-6">
      <!-- Code Tab -->
      <div v-show="activeTab === 'code'" class="h-full">
        <div class="mb-4">
          <input
            v-model="form.name"
            type="text"
            class="input text-lg font-semibold"
            placeholder="策略名称"
          />
        </div>
        <div class="mb-4">
          <textarea
            v-model="form.description"
            class="input"
            rows="2"
            placeholder="策略描述（可选）"
          ></textarea>
        </div>
        <div class="editor-container h-[calc(100%-150px)]">
          <CodeEditor
            v-model="form.code"
            language="python"
            theme="vs-dark"
            :height="500"
            @save="handleSave"
          />
        </div>
        <div class="mt-4 flex items-center gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="form.isPublic"
              type="checkbox"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span class="text-sm text-gray-600 dark:text-gray-400">公开此策略</span>
          </label>
        </div>
      </div>

      <!-- Config Tab -->
      <div v-show="activeTab === 'config'" class="max-w-2xl">
        <div class="card">
          <div class="card-header">回测配置</div>
          <div class="card-body space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                交易标的
              </label>
              <input
                type="text"
                class="input"
                placeholder="例如：AAPL, GOOGL"
                :value="strategy?.config?.symbols?.join(', ')"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                时间周期
              </label>
              <select class="input" :value="strategy?.config?.timeframe || '1d'">
                <option value="1m">1分钟</option>
                <option value="5m">5分钟</option>
                <option value="15m">15分钟</option>
                <option value="1h">1小时</option>
                <option value="4h">4小时</option>
                <option value="1d">日线</option>
                <option value="1w">周线</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                初始资金
              </label>
              <input
                type="number"
                class="input"
                placeholder="100000"
                :value="strategy?.config?.initialCapital || 100000"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                手续费率
              </label>
              <input
                type="number"
                step="0.0001"
                class="input"
                placeholder="0.001"
                :value="strategy?.config?.commission || 0.001"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Backtest Tab -->
      <div v-show="activeTab === 'backtest'" class="text-center py-12">
        <div class="text-6xl mb-4">🔬</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          运行回测查看结果
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          点击顶部的"运行回测"按钮开始回测
        </p>
        <button @click="runBacktest" class="btn-primary">
          开始回测
        </button>
      </div>
    </div>
  </div>
</template>
