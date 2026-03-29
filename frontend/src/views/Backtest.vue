<script setup lang="ts">
import { ref } from 'vue';

const backtestForm = ref({
  strategyId: '',
  symbol: 'AAPL',
  startDate: '2023-01-01',
  endDate: '2023-12-31',
  initialCapital: 100000,
  commission: 0.001,
});

const isRunning = ref(false);
const result = ref<any>(null);

function runBacktest() {
  isRunning.value = true;

  // 模拟回测
  setTimeout(() => {
    result.value = {
      totalReturn: 24.5,
      annualizedReturn: 24.5,
      maxDrawdown: -8.2,
      sharpeRatio: 1.85,
      winRate: 58.3,
      profitFactor: 1.92,
      totalTrades: 48,
      trades: [
        { date: '2023-01-15', side: 'buy', price: 150.25, quantity: 100, pnl: 0 },
        { date: '2023-01-22', side: 'sell', price: 158.50, quantity: 100, pnl: 825 },
        { date: '2023-02-05', side: 'buy', price: 155.00, quantity: 100, pnl: 0 },
        { date: '2023-02-18', side: 'sell', price: 162.75, quantity: 100, pnl: 775 },
      ],
    };
    isRunning.value = false;
  }, 2000);
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">回测中心</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        运行策略回测，分析历史表现
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 配置面板 -->
      <div class="lg:col-span-1">
        <div class="card">
          <div class="card-header">回测配置</div>
          <div class="card-body space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                交易标的
              </label>
              <input
                v-model="backtestForm.symbol"
                type="text"
                class="input"
                placeholder="股票代码"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  开始日期
                </label>
                <input
                  v-model="backtestForm.startDate"
                  type="date"
                  class="input"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  结束日期
                </label>
                <input
                  v-model="backtestForm.endDate"
                  type="date"
                  class="input"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                初始资金
              </label>
              <input
                v-model="backtestForm.initialCapital"
                type="number"
                class="input"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                手续费率
              </label>
              <input
                v-model="backtestForm.commission"
                type="number"
                step="0.0001"
                class="input"
              />
            </div>

            <button
              @click="runBacktest"
              :disabled="isRunning"
              class="btn-primary w-full"
            >
              {{ isRunning ? '运行中...' : '▶ 开始回测' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 结果面板 -->
      <div class="lg:col-span-2">
        <div v-if="!result" class="card">
          <div class="card-body text-center py-12">
            <div class="text-6xl mb-4">🔬</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              配置参数后运行回测
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              回测结果将在这里展示
            </p>
          </div>
        </div>

        <template v-else>
          <!-- 统计卡片 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="card">
              <div class="card-body text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400">总收益</p>
                <p :class="result.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'" class="text-2xl font-bold">
                  {{ result.totalReturn >= 0 ? '+' : '' }}{{ result.totalReturn }}%
                </p>
              </div>
            </div>
            <div class="card">
              <div class="card-body text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400">最大回撤</p>
                <p class="text-2xl font-bold text-red-500">{{ result.maxDrawdown }}%</p>
              </div>
            </div>
            <div class="card">
              <div class="card-body text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400">夏普比率</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ result.sharpeRatio }}</p>
              </div>
            </div>
            <div class="card">
              <div class="card-body text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400">胜率</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ result.winRate }}%</p>
              </div>
            </div>
          </div>

          <!-- 交易记录 -->
          <div class="card">
            <div class="card-header">交易记录</div>
            <div class="card-body overflow-x-auto">
              <table class="min-w-full">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="text-left py-2 px-4 text-sm font-medium text-gray-500">日期</th>
                    <th class="text-left py-2 px-4 text-sm font-medium text-gray-500">方向</th>
                    <th class="text-right py-2 px-4 text-sm font-medium text-gray-500">价格</th>
                    <th class="text-right py-2 px-4 text-sm font-medium text-gray-500">数量</th>
                    <th class="text-right py-2 px-4 text-sm font-medium text-gray-500">盈亏</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(trade, index) in result.trades"
                    :key="index"
                    class="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td class="py-2 px-4 text-sm text-gray-900 dark:text-white">{{ trade.date }}</td>
                    <td class="py-2 px-4">
                      <span
                        :class="[
                          'inline-flex items-center px-2 py-1 text-xs font-medium rounded',
                          trade.side === 'buy'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        ]"
                      >
                        {{ trade.side === 'buy' ? '买入' : '卖出' }}
                      </span>
                    </td>
                    <td class="py-2 px-4 text-sm text-right text-gray-900 dark:text-white">${{ trade.price }}</td>
                    <td class="py-2 px-4 text-sm text-right text-gray-900 dark:text-white">{{ trade.quantity }}</td>
                    <td
                      :class="[
                        'py-2 px-4 text-sm text-right font-medium',
                        trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                      ]"
                    >
                      {{ trade.pnl >= 0 ? '+' : '' }}${{ trade.pnl }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
