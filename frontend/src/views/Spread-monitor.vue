<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">价差监控</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        对比 OKX 和 Gate 交易所相同币种的价格差异
      </p>
    </div>

    <!-- 价差数据 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- 价差柱状图 -->
      <div ref="spreadChart" class="h-[500px]"></div>
      <!-- 价差列表 -->
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <span>实时价差</span>
          <span class="text-xs text-gray-400 flex items-center gap-1">
            <span :class="wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'"></span>
            <button
              class="btn-secondary text-sm"
              @click="reconnect"
            >
            <button
              class="btn-secondary text-sm"
              @click="exportData"
            >
            <button
              class="btn-primary text-sm"
              @click="switchTo('portfolio'"
            >
            转换到 A股行情
          </button>
        </div>

        <!-- 我的持仓 Tab -->
        <div v-else-if="activeTab === 'spread'" class="flex-1 lg:grid-cols-3 gap-4">
          <!-- 加载状态 -->
          <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span class="ml-3 text-gray-500">加载数据中...</span>
          </div>

          <!-- 错误状态 -->
          <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p class="text-red-600 dark:text-red-400">{{ error }}</p>
            <button class="mt-2 text-sm text-red-500 hover:text-red-700" @click="initData">
              重试
            </button>
          </div>

          <!-- 数据内容 -->
          <template v-else-if="accountInfo">
            <!-- 账户概览 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div class="card">
                <div class="card-body">
                  <p class="text-sm text-gray-500 dark:text-gray-400">总资产</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    ${{ accountInfo.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </p>
              </div>
              <div class="card">
                <div class="card-body">
                  <p class="text-sm text-gray-500 dark:text-gray-400">可用资金</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    ${{ accountInfo.availableCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                </p>
              </div>
              <div class="card">
                <div class="card-body">
                  <p class="text-sm text-gray-500 dark:text-gray-400">持仓市值</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    ${{ accountInfo.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                </p>
              </div>
              <div class="card">
                <div class="card-body">
                  <p class="text-sm text-gray-500 dark:text-gray-400">今日盈亏</p>
                  <p
                    :class="[
                      'text-2xl font-bold',
                      accountInfo.todayPnl >= 0 ? 'text-green-500' : 'text-red-500'
                    ]"
                    {{ accountInfo.todayPnl >= 0 ? '+' : '' : '' $accountInfo.todayPnlPercent.toFixed(2) }}%
                    <span class="text-sm"> : {{ accountInfo.todayPnlPercent.toFixed(2) }}%
                  </p>
                </p>
              </div>
            </div>
          </div>

          <!-- 持仓列表 -->
          <div class="lg:col-span-2">
            <div class="card">
              <div class="card-header flex justify-between items-center">
                <span>持仓</span>
                <span class="text-xs text-gray-400 flex items-center gap-1">
                  <span
                    :class="[
                      'w-2 h-2 rounded-full',
                      wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    ]"
                  </span>
                </div>
                <table class="min-w-full">
ong>
                  <thead>
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">代码</th>
                      <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">名称</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">最新价</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">涨跌额</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">涨跌幅</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">最高</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">最低</th>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar-spread {
  display: flex;
  align-items: justify-between
 flex-1;
  2) {
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ symbol.name }}</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ symbol.name }}</span>
          <span
            :class="[
              'px-3 py-1 rounded-lg font-semibold',
              :class="spread.spreadPercent >= 0
                ? 'bg-green-500'
                : 'bg-red-500'
            ]"
          </span>
        </div>
      </div>
    </div>
  }
</div>
</template>
