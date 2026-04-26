<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { useUserStore } from '../stores/user'
import { portfolioApi } from '../api/portfolio'
import type { Portfolio, TradeRecord } from '../api/portfolio'

// 价差数据类型
interface SpreadData {
  symbol: string
  okxSymbol: string
  gateSymbol: string
  okxPrice: number
  gatePrice: number
  spread: number
  spreadPercent: number
  premium: 'OKX' | 'Gate' | 'None'
  timestamp: number
}

// Tab 切换
type MarketTab = 'portfolio' | 'cn-stocks' | 'spread'
const activeTab = ref<MarketTab>('spread')

// 状态
const userStore = useUserStore()

// 组合数据
const portfolio = ref<Portfolio | null>(null)
const recentTrades = ref<TradeRecord[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// 价差数据
const spreads = ref<SpreadData[]>([])
const spreadChart = ref<echarts.ECharts | null>(null)
const chartDom = ref<HTMLElement | null>(null)
const lastUpdate = ref<number>(0)

// A股行情数据
interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
}
const cnStocks = ref<StockQuote[]>([
  { symbol: '600519', name: '贵州茅台', price: 1445.0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0 },
  { symbol: '000858', name: '五粮液', price: 165.0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0 },
  { symbol: '601318', name: '中国平安', price: 42.0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0 },
  { symbol: '000333', name: '美的集团', price: 58.0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0 },
  { symbol: '600036', name: '招商银行', price: 32.0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0 },
  { symbol: '601012', name: '隆基绿能', price: 6.5, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0 },
  { symbol: '000651', name: '格力电器', price: 42.0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0 },
  { symbol: '002594', name: '比亚迪', price: 85.0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0 },
])

// WebSocket
const ws = ref<WebSocket | null>(null)
const wsConnected = ref(false)
let reconnectTimer: number | null = null
let reconnectAttempts = 0
const maxReconnectAttempts = 5

// 持仓列表
const positions = computed(() => portfolio.value?.positions ?? [])
const accountInfo = computed(() => portfolio.value?.account ?? null)

// 格式化时间
function formatTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// 安全格式化数字
function safeToFixed(val: number | null | undefined, digits: number): string {
  return val != null ? val.toFixed(digits) : '-'
}

function safeFormatPercent(val: number | null | undefined): string {
  if (val == null) return '-'
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%'
}

function safePrice(val: number | null | undefined): string {
  if (val == null) return '-'
  return '$' + val.toFixed(val >= 1 ? 2 : 4)
}

// 获取柱状图颜色
function getBarColor(spreadPercent: number | null | undefined, premium: string): string {
  const val = spreadPercent ?? 0
  if (premium === 'OKX') {
    return val >= 0 ? '#26a69a' : '#ef5350'
  } else {
    return val >= 0 ? '#ef5350' : '#26a69a'
  }
}

// 初始化图表
function initChart() {
  if (!chartDom.value) return
  spreadChart.value = echarts.init(chartDom.value)
  updateChart()
}

// 记录每个品种的最大价差
const maxSpreads = ref<Map<string, { spreadPercent: number; spread: number; okxPrice: number; gatePrice: number; premium: 'OKX' | 'Gate' | 'None'; timestamp: number }>>(new Map())

// 更新图表
function updateChart() {
  if (!spreadChart.value) return

  // 更新最大价差记录
  for (const s of spreads.value) {
    const existing = maxSpreads.value.get(s.symbol)
    if (!existing || Math.abs(s.spreadPercent) > Math.abs(existing.spreadPercent)) {
      maxSpreads.value.set(s.symbol, {
        spreadPercent: s.spreadPercent,
        spread: s.spread,
        okxPrice: s.okxPrice,
        gatePrice: s.gatePrice,
        premium: s.premium,
        timestamp: s.timestamp
      })
    }
  }

  // 按价差绝对值排序，取 top 20
  const topSpreads = Array.from(maxSpreads.value.entries())
    .map(([symbol, data]) => ({ symbol, ...data }))
    .sort((a, b) => Math.abs(b.spreadPercent) - Math.abs(a.spreadPercent))
    .slice(0, 20)

  if (topSpreads.length === 0) return

  const option = {
    title: {
      text: 'OKX vs Gate 价差分布 (Top 20 最大价差)',
      left: 'center',
      textStyle: {
        color: '#666'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const data = topSpreads.find(s => s.symbol === params[0].name)
        if (!data) return ''
        return `<strong>${params[0].name}</strong><br/>OKX: $${safeToFixed(data.okxPrice, 4)}<br/>Gate: $${safeToFixed(data.gatePrice, 4)}<br/>最大价差: ${safeFormatPercent(data.spreadPercent)}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: topSpreads.map(s => s.symbol),
      axisLabel: {
        color: '#666',
        rotate: 45,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '价差 (%)',
      axisLabel: {
        color: '#666',
        formatter: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
      }
    },
    series: [
      {
        name: '价差',
        type: 'bar',
        data: topSpreads.map(s => ({
          name: s.symbol,
          value: s.spreadPercent,
          itemStyle: {
            color: getBarColor(s.spreadPercent, s.premium)
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            return `${params.value >= 0 ? '+' : ''}${params.value.toFixed(2)}%`
          }
        }
      }
    ]
  }

  spreadChart.value.setOption(option)
}

// 初始化数据
async function initData() {
  try {
    loading.value = true
    error.value = null

    const [portfolioRes, tradesRes] = await Promise.all([
      portfolioApi.getPortfolio(),
      portfolioApi.getRecentTrades(10)
    ])

    portfolio.value = portfolioRes.data
    recentTrades.value = tradesRes.data
  } catch (e: any) {
    error.value = e.message || '加载数据失败'
    console.error('Failed to load portfolio:', e)
  } finally {
    loading.value = false
  }
}

// 连接 WebSocket
function connectWebSocket() {
  if (!userStore.token) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const wsUrl = `${protocol}//${host}/ws?token=${userStore.token}`

  ws.value = new WebSocket(wsUrl)

  ws.value.onopen = () => {
    console.log('WebSocket connected')
    wsConnected.value = true
    reconnectAttempts = 0

    // 订阅账户更新频道
    ws.value!.send(JSON.stringify({ type: 'subscribe', channel: 'account:default' }))

    // 订阅 A股市场频道
    ws.value!.send(JSON.stringify({ type: 'subscribe', channel: 'market:cn' }))

    // 订阅价差频道
    ws.value!.send(JSON.stringify({ type: 'subscribe', channel: 'market:spread' }))

    // 订阅持仓中每个标的的行情
    if (portfolio.value?.positions) {
      portfolio.value.positions.forEach((pos) => {
        ws.value!.send(JSON.stringify({ type: 'subscribe', channel: `market:${pos.symbol}` }))
      })
    }

    // 初始化图表
    nextTick(() => {
      initChart()
    })
  }

  ws.value.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)

      if (msg.type === 'data') {
        if (msg.channel?.startsWith('account:')) {
          portfolio.value = msg.data as Portfolio
        } else if (msg.channel === 'market:cn') {
          updateCNStock(msg.data)
        } else if (msg.channel === 'market:spread') {
          spreads.value = msg.data.spreads
          lastUpdate.value = Date.now()
          updateChart()
        } else if (msg.channel?.startsWith('market:')) {
          const symbol = msg.channel.split(':')[1]
          updatePositionPrice(symbol, msg.data)
        }
      }
    } catch (e) {
      console.error('Failed to parse WS message:', e)
    }
  }

  ws.value.onclose = () => {
    console.log('WebSocket disconnected')
    wsConnected.value = false
    scheduleReconnect()
  }

  ws.value.onerror = (e) => {
    console.error('WebSocket error:', e)
  }
}

// 更新A股数据
function updateCNStock(data: StockQuote) {
  const index = cnStocks.value.findIndex(s => s.symbol === data.symbol)
  if (index >= 0) {
    cnStocks.value[index] = { ...cnStocks.value[index], ...data }
  }
}

// 更新持仓价格
function updatePositionPrice(symbol: string, marketData: { price: number; change: number; changePercent: number }) {
  if (!portfolio.value) return

  const pos = portfolio.value.positions.find((p) => p.symbol === symbol)
  if (pos) {
    pos.currentPrice = marketData.price
    const marketValue = pos.quantity * marketData.price
    const costBasis = pos.quantity * pos.avgPrice
    pos.pnl = marketValue - costBasis
    pos.pnlPercent = costBasis > 0 ? (pos.pnl / costBasis) * 100 : 0
    pos.updatedAt = Date.now()
    recalculateAccount()
  }
}

// 重新计算账户汇总
function recalculateAccount() {
  if (!portfolio.value) return

  const marketValue = portfolio.value.positions.reduce((sum, p) => sum + p.marketValue, 0)
  const totalPnl = portfolio.value.positions.reduce((sum, p) => sum + p.pnl, 0)

  portfolio.value.account.marketValue = marketValue
  portfolio.value.account.totalAssets = marketValue + portfolio.value.account.availableCash
  portfolio.value.account.todayPnl = totalPnl
  portfolio.value.account.todayPnlPercent = marketValue > 0 ? (totalPnl / marketValue) * 100 : 0
  portfolio.value.account.updatedAt = Date.now()
}

// 定时重连
function scheduleReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log('Max reconnect attempts reached')
    return
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
  reconnectAttempts++

  reconnectTimer = window.setTimeout(() => {
    console.log(`Reconnecting... (attempt ${reconnectAttempts})`)
    connectWebSocket()
  }, delay)
}

// 下一个 tick 执行
function nextTick(callback: () => void) {
  setTimeout(callback, 0)
}

onMounted(async () => {
  await initData()
  connectWebSocket()
})

onUnmounted(() => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws.value) {
    ws.value.close()
    ws.value = null
  }
  if (spreadChart.value) {
    spreadChart.value.dispose()
    spreadChart.value = null
  }
})
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">实时监控</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        实时查看账户状态和市场行情
      </p>
    </div>

    <!-- Tab 切换 -->
    <div class="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
      <button
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'spread'
            ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
            : 'text-gray-500 border-transparent hover:text-gray-700'
        ]"
        @click="activeTab = 'spread'"
      >
        价差监控
      </button>
      <button
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'cn-stocks'
            ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
            : 'text-gray-500 border-transparent hover:text-gray-700'
        ]"
        @click="activeTab = 'cn-stocks'"
      >
        A股行情
      </button>
      <button
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'portfolio'
            ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
            : 'text-gray-500 border-transparent hover:text-gray-700'
        ]"
        @click="activeTab = 'portfolio'"
      >
        我的持仓
      </button>
    </div>

    <!-- 价差监控 Tab -->
    <div v-if="activeTab === 'spread'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 价差柱状图 -->
        <div class="card">
          <div class="card-header flex justify-between items-center">
            <span>OKX vs Gate 价差分布</span>
            <span class="text-xs text-gray-400 flex items-center gap-1">
              <span
                :class="[
                  'w-2 h-2 rounded-full',
                  wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                ]"
              ></span>
              {{ wsConnected ? '实时更新' : '连接中...' }}
            </span>
          </div>
          <div class="card-body">
            <div ref="chartDom" class="h-[500px]"></div>
          </div>
        </div>

        <!-- 价差列表 -->
        <div class="card">
          <div class="card-header flex justify-between items-center">
            <span>价差详情</span>
            <span class="text-xs text-gray-400">
              最后更新: {{ lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '--' }}
            </span>
          </div>
          <div class="card-body overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">币种</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">OKX价格</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">Gate价格</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">价差</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">溢价方</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="spread in spreads"
                  :key="spread.symbol"
                  class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-gray-900 dark:text-white">{{ spread.symbol }}</span>
                      <span
                        :class="[
                          'px-2 py-0.5 rounded text-xs font-medium',
                          spread.spreadPercent != null && spread.spreadPercent >= 0
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : spread.spreadPercent != null
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        ]"
                      >
                        {{ safeFormatPercent(spread.spreadPercent) }}
                      </span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <span
                      :class="[
                        'font-medium',
                        spread.okxPrice != null && spread.gatePrice != null && spread.okxPrice > spread.gatePrice ? 'text-green-500' : 'text-red-500'
                      ]"
                    >
                      {{ safePrice(spread.okxPrice) }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <span
                      :class="[
                        'font-medium',
                        spread.gatePrice != null && spread.okxPrice != null && spread.gatePrice > spread.okxPrice ? 'text-green-500' : 'text-red-500'
                      ]"
                    >
                      {{ safePrice(spread.gatePrice) }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <span
                      :class="[
                        'font-mono',
                        spread.spread != null && spread.spread >= 0 ? 'text-green-500' : 'text-red-500'
                      ]"
                    >
                      {{ spread.spread != null ? (spread.spread >= 0 ? '+' : '') + spread.spread.toFixed(4) : '-' }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <span
                      :class="[
                        'px-2 py-0.5 rounded text-xs font-medium',
                        spread.premium === 'OKX' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                      ]"
                    >
                      {{ spread.premium === 'OKX' ? 'OKX更贵' : 'Gate更贵' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="spreads.length === 0" class="text-center py-8 text-gray-400">
              等待数据...
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- A股行情 Tab -->
    <div v-else-if="activeTab === 'cn-stocks'">
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <span>A股实时行情</span>
          <span class="text-xs text-gray-400 flex items-center gap-1">
            <span
              :class="[
                'w-2 h-2 rounded-full',
                wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              ]"
            ></span>
            {{ wsConnected ? '实时更新' : '连接中...' }}
          </span>
        </div>
        <div class="card-body overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">代码</th>
                <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">名称</th>
                <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">最新价</th>
                <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">涨跌额</th>
                <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">涨跌幅</th>
                <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">最高</th>
                <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">最低</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="stock in cnStocks"
                :key="stock.symbol"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="py-3 px-4">
                  <span class="font-mono text-gray-900 dark:text-white">{{ stock.symbol }}</span>
                </td>
                <td class="py-3 px-4">
                  <span class="font-medium text-gray-900 dark:text-white">{{ stock.name }}</span>
                </td>
                <td class="py-3 px-4 text-right">
                  <span
                    :class="[
                      'font-medium',
                      stock.changePercent >= 0 ? 'text-red-500' : 'text-green-500'
                    ]"
                  >
                    ¥{{ stock.price.toFixed(2) }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <span :class="[stock.change >= 0 ? 'text-red-500' : 'text-green-500']">
                    {{ stock.change >= 0 ? '+' : '' }}{{ stock.change.toFixed(2) }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <span
                    :class="[
                      'px-2 py-0.5 rounded text-sm font-medium',
                      stock.changePercent >= 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    ]"
                  >
                    {{ stock.changePercent >= 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%
                  </span>
                </td>
                <td class="py-3 px-4 text-right text-gray-900 dark:text-white">
                  ¥{{ stock.high.toFixed(2) }}
                </td>
                <td class="py-3 px-4 text-right text-gray-900 dark:text-white">
                  ¥{{ stock.low.toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 我的持仓 Tab -->
    <div v-else-if="activeTab === 'portfolio'">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-gray-500">加载数据中...</span>
      </div>

      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <p class="text-red-600 dark:text-red-400">{{ error }}</p>
        <button class="mt-2 text-sm text-red-500 hover:text-red-700" @click="initData">
          重试
        </button>
      </div>

      <template v-else-if="accountInfo">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="card">
            <div class="card-body">
              <p class="text-sm text-gray-500 dark:text-gray-400">总资产</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                ${{ accountInfo.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </p>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <p class="text-sm text-gray-500 dark:text-gray-400">可用资金</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                ${{ accountInfo.availableCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </p>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <p class="text-sm text-gray-500 dark:text-gray-400">持仓市值</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                ${{ accountInfo.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </p>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <p class="text-sm text-gray-500 dark:text-gray-400">今日盈亏</p>
              <p :class="['text-2xl font-bold', accountInfo.todayPnl >= 0 ? 'text-green-500' : 'text-red-500']">
                {{ accountInfo.todayPnl >= 0 ? '+' : '' }}${{ accountInfo.todayPnl.toFixed(2) }}
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <div class="card">
              <div class="card-header flex justify-between items-center">
                <span>持仓</span>
                <span class="text-xs text-gray-400 flex items-center gap-1">
                  <span :class="['w-2 h-2 rounded-full', wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400']"></span>
                  {{ wsConnected ? '实时更新' : '连接中...' }}
                </span>
              </div>
              <div class="card-body overflow-x-auto">
                <table class="min-w-full">
                  <thead>
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">标的</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">持仓</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">成本</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">现价</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">盈亏</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="pos in positions" :key="pos.symbol" class="border-b border-gray-100 dark:border-gray-800">
                      <td class="py-3 px-4">
                        <span class="font-medium text-gray-900 dark:text-white">{{ pos.symbol }}</span>
                      </td>
                      <td class="py-3 px-4 text-right text-gray-900 dark:text-white">{{ pos.quantity }}</td>
                      <td class="py-3 px-4 text-right text-gray-900 dark:text-white">${{ pos.avgPrice.toFixed(2) }}</td>
                      <td class="py-3 px-4 text-right text-gray-900 dark:text-white">${{ pos.currentPrice.toFixed(2) }}</td>
                      <td class="py-3 px-4 text-right">
                        <span :class="['font-medium', pos.pnl >= 0 ? 'text-green-500' : 'text-red-500']">
                          {{ pos.pnl >= 0 ? '+' : '' }}${{ pos.pnl.toFixed(2) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-if="positions.length === 0" class="text-center py-8 text-gray-400">暂无持仓</div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-1">
            <div class="card">
              <div class="card-header">最近交易</div>
              <div class="card-body">
                <div class="space-y-3">
                  <div v-for="trade in recentTrades" :key="trade.id" class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div>
                      <div class="flex items-center gap-2">
                        <span
                          :class="[
                            'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded',
                            trade.side === 'buy'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          ]"
                        >
                          {{ trade.side === 'buy' ? '买入' : '卖出' }}
                        </span>
                        <span class="font-medium text-gray-900 dark:text-white">{{ trade.symbol }}</span>
                      </div>
                      <span class="text-xs text-gray-400">{{ formatTime(trade.createdAt) }}</span>
                    </div>
                    <div class="text-right">
                      <p class="text-sm text-gray-900 dark:text-white">${{ (trade.price || trade.filledPrice || 0).toFixed(2) }}</p>
                      <p class="text-xs text-gray-400">× {{ trade.quantity }}</p>
                    </div>
                  </div>
                  <div v-if="recentTrades.length === 0" class="text-center py-8 text-gray-400">暂无交易记录</div>
                </div>
              </div>
            </div>

            <div class="card mt-4">
              <div class="card-header">快捷操作</div>
              <div class="card-body space-y-2">
                <button class="btn-primary w-full">一键平仓</button>
                <button class="btn-secondary w-full">暂停所有策略</button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
