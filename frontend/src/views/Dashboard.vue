<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useStrategyStore } from '../stores/strategy';

const strategyStore = useStrategyStore();

onMounted(() => {
  strategyStore.fetchStrategies({ page: 1, pageSize: 5 });
});

const stats = ref([
  { label: '总策略数', value: 12, icon: '📝', color: 'bg-blue-500' },
  { label: '运行中', value: 3, icon: '▶️', color: 'bg-green-500' },
  { label: '总收益', value: '+24.5%', icon: '📈', color: 'bg-emerald-500' },
  { label: '最大回撤', value: '-8.2%', icon: '📉', color: 'bg-red-500' },
]);
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">仪表盘</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        欢迎回来，查看您的策略表现
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="card"
      >
        <div class="card-body flex items-center">
          <div :class="[stat.color, 'w-12 h-12 rounded-lg flex items-center justify-center text-2xl']">
            {{ stat.icon }}
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Strategies -->
    <div class="card">
      <div class="card-header flex justify-between items-center">
        <span>最近策略</span>
        <router-link to="/strategies" class="text-sm text-primary-600 hover:text-primary-500">
          查看全部 →
        </router-link>
      </div>
      <div class="card-body">
        <div v-if="strategyStore.loading" class="text-center py-8 text-gray-500">
          加载中...
        </div>
        <div v-else-if="!strategyStore.hasStrategies" class="text-center py-8 text-gray-500">
          暂无策略，
          <router-link to="/strategies" class="text-primary-600 hover:text-primary-500">
            创建第一个策略
          </router-link>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  名称
                </th>
                <th class="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  状态
                </th>
                <th class="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  更新时间
                </th>
                <th class="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="strategy in strategyStore.strategies"
                :key="strategy.id"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="py-3 px-4">
                  <router-link
                    :to="`/strategies/${strategy.id}`"
                    class="text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {{ strategy.name }}
                  </router-link>
                </td>
                <td class="py-3 px-4">
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                      strategy.status === 'published'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : strategy.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    ]"
                  >
                    {{ strategy.status === 'published' ? '已发布' : strategy.status === 'draft' ? '草稿' : '已归档' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                  {{ new Date(strategy.updatedAt).toLocaleDateString() }}
                </td>
                <td class="py-3 px-4 text-right">
                  <router-link
                    :to="`/strategies/${strategy.id}`"
                    class="text-sm text-primary-600 hover:text-primary-500"
                  >
                    编辑
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
