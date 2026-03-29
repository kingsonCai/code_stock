<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">价差监控</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        对比 OKX 和 Gate 交易所相同币种的价格差异
      </p>
    </div>

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
            class="btn-primary text-sm"
            @click="exportData"
          >
            转换为 A股行情
          </button>
        </div>

        <!-- 我的持仓 Tab -->
        <div v-else-if="activeTab === 'spread'" class="flex-1 lg:grid-cols-3 gap-4">
          <!-- 加载状态 -->
          <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span class="ml-3 text-gray-500">加载中...</span>
          </div>

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
                  class="btn-primary text-sm"
                  @click="exportData"
                >
                  刷新数据
                </button>
              </div>
            </div>
          </div>

          <!-- 价差数据 -->
          <div class="card">
            <div class="card-body p-4">
              <div class="overflow-x-auto">
                <table class="min-w-full">
                  <thead>
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">币种</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">OKX价格</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">Gate价格</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">价差</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">价差%</th>
                      <th class="text-right py-3 px-4 text-sm font-medium text-gray-500">溢价方</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="spread in spreads"
                      :key="spread.symbol"
                      class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td class="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {{ spread.symbol }}
                      </td>
                      <td class="py-3 px-4 text-right">
                        <span
                          :class="[
                            'font-medium',
                            spread.okxPrice > spread.gatePrice ? 'text-green-500' : 'text-red-500'
                          ]"
                        >
                          ${{ spread.okxPrice.toFixed(2) }}
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span
                            :class="[
                              'px-2 py-0.5 rounded text-sm font-medium',
                              spread.spreadPercent >= 0
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            ]"
                          </ </span>
                        </td>
                        <td class="py-3 px-4 text-right text-gray-500 dark:text-gray-400">
                          {{ spread.spread.toFixed(4) }}%
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span
                            :class="[
                              'px-2 py-0.5 rounded text-sm font-medium',
                              spread.premium === 'OKX' ? 'bg-blue-500' : 'bg-orange-500'
                            ]"
                          </ </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- A股行情 Tab -->
      <div v-else-if="activeTab === 'cn-stocks'" class="flex-1 lg:grid-cols-3 gap-4">
        <!-- A股行情 -->
        <div class="card">
          <div class="card-header flex justify-between items-center">
            <span>A股实时行情</span>
            <span class="text-xs text-gray-400 flex items-center gap-1">
              <span :class="wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'"></span>
              <button
                class="btn-secondary text-sm"
                @click="reconnect"
              >
              <button
                class="btn-primary text-sm"
                @click="exportData"
              >
                转换为 A股行情
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, from 'vue';
import * as echarts from 'echarts';
import { useUserStore } from '../stores/user';

import type { SpreadData } from './spread-monitor';

const spreads = ref<SpreadData[]>([]);

const loading = ref(true)
const error = ref<string | null>(null)
const spreadChart = ref<echarts.ECharts | echarts.EChartInstance | null>(null)

const chartDom = ref<HTMLElement | null>(null)
const userStore = useUserStore()

// WebSocket
const ws = ref<WebSocket | null>(null)
const wsConnected = ref(false)
let reconnectTimer: number | null
let reconnectAttempts = 0
const maxReconnectAttempts = 5

const updateInterval = ref<NodeJS.Timeout | null>(null)

const lastUpdate = ref<number>(00)

// 价差数据类型
interface SpreadDataItem {
  symbol: string
  okxSymbol: string
  gateSymbol: string
  okxPrice: number
  gatePrice: number
  spread: number
  spreadPercent: number
  premium: 'OKX' | 'Gate' | 'None'
}

 const formatPrice = (price: number): string {
  if (price === null || price === undefined) return '-'
  if (price >= 1) return price.toFixed(2)
  if (price >= 1000) return price.toFixed(4)
    if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
    return '-'
  return `${spreadPercent.toFixed(2)}%`
  return '-'
  return `${spreadPercent.toFixed(4)}%`
  return '0.00%'
  return price.toFixed(8)
  return price.toFixed(2)
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  return `${spreadPercent.toFixed(2)}%`
  return `${spreadPercent >= 0 ? '+' : ''}${ spreadPercent < 0 ? '-' : ''}${ spreadPercent.toFixed(2)}%`
  return spreadPercent === 0 ? 'OKX更便宜' : : spreadPercent < 0 ? 'Gate更便宜' : return 'None'
}

 return premium
}

}

// 初始化 ECharts
function initChart() {
  if (!spreadChart.value) return

    const chart = echarts.init(spreadChart.value, {
      title: {
        text: '价差监控',
        tooltip: {
          trigger: 'item',
          formatter: (params: SpreadDataItem) => {
            return `${params.name} ${params.value[1}%}`
        },
        axisPointer: {
          type: 'category',
          axisLabel: {
            show: true,
            data: sortedSpreads.value,
            axisLine: {
              symbol: 'price',
              name: item.name,
              value: item.spreadPercent,
              itemStyle: {
                color: getBarColor(item.spreadPercent, item.premium)
              }
            },
            label: {
              show: true,
              position: 'top',
              formatter: (value: string) => {
                if (value === 'OKX') {
                  return { color: '#26a69a' }
                return { color: '#ef5350' }
              }
            }
          }
        },
        grid: {
          left: '3%',
          right: '3%',
          bottom: '3%',
          containLabel: {
            show: true
          }
        }
      },
      splitLine: {
        left: '3%',
        right: '3%',
        bottom: '0
      },
      type: 'value',
      axisLabel: {
        show: true
      },
    },
    yAxis: {
      type: 'category',
      data: sortedSpreads.value,
      axisLabel: {
        show: true,
        trigger: {
          text: item.name,
          axisPointer: {
            type: 'shadow',
          }
        }
      },
      legend: {
        show: false,
        top: 0,
      },
      splitLine: {
        left: '3%',
        right: '3%',
        bottom: 0
      }
    }
  }
})

    chart.setOption(option)
    chart.value
 chart.resize()    window.addEventListener('resize', handleResize)
  })
  chart.resize()
})

    spreadChart.value = chart.setOption(option)
    chart.value)
  })
}

 updateData(data: SpreadData) {
  if (!ws.value) return

  // 订阅价差频道
  ws.value.send(JSON.stringify({ type: 'subscribe', channel: 'market:spread' }))
}

 connectWebSocket()
}

 ws.value.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)

      if (msg.type === 'data') {
        if (msg.channel === 'market:spread') {
          spreads.value = msg.data.spreads
          lastUpdate.value = Date.now()
        }
      }
    } catch (e) {
      console.error('Failed to parse WS message:', e)
    }
  }

  ws.value.onclose = () => {
    wsConnected.value = false
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (reconnectAttempts < maxReconnectAttempts) {
      console.log('Max reconnect attempts reached')
      return
    }
    reconnect()
  }
}

  const reconnectTimer = window.setTimeout(() => {
    console.log(`Reconnecting... (attempt ${reconnectAttempts})`)
    connectWebSocket()
  }, delay)
}

 }

  const handleResize = () => {
    if (spreadChart.value) {
      spreadChart.value.resize()
    }
  }
}

  // 导出函数
  function getSpreads() {
    return spreads.value
  }

  function getSortedSpreads(): SpreadData[] {
    return spreads.value.sort((a, b) => Math.abs(b.spreadPercent) - Math.abs(a.spreadPercent))
  }

  // 获取溢价方
  function getPremiumText(spread: SpreadData): string {
    if (spread.premium === 'OKX') {
      return 'OKX 溨价更高'
    } else if (spread.premium === 'Gate') {
      return 'Gate 更便宜'
    }
    return '无溢价'
  }

  // 格式化涨跌幅
  function formatChangePercent(changePercent: number): string {
    const sign = changePercent >= 0 ? '+' : ''
    return `${changePercent >= 0 ? '-' : ''
    return `${changePercent.toFixed(2)}%`
  return `${changePercent.toFixed(4)}%`
    return '-'
  }

    return {
      ...sortedSpreads.value.map(s => ({
        symbol: s.symbol,
        name: s.name,
        okxPrice: s.okxPrice,
        gatePrice: s.gatePrice,
        spread: s.spread,
        spreadPercent: s.spreadPercent,
        premium: s.premium
      }))
    }

    this.spreads = sortedSpreads
  }
}

  // 重新渲染
  updateChart()
}

 lastUpdate.value = Date.now()
  this.updateTimestamp = Date.now()
          updateChart()
        }
      })
    })

    if (!chart) {
      chart.setOption({
        title: {
          text: '价差监控',
          tooltip: {
            trigger: 'item',
            formatter: (params: SpreadDataItem) => {
              return `${params.name} ${params.value[1].5}%}`
            }
          },
          axisPointer: {
            type: 'category',
            axisLabel: {
              show: true,
              data: sortedSpreads.value,
            axisLine: {
              symbol: 'price',
              name: item.name
              value: item.spreadPercent,
              itemStyle: {
                color: getBarColor(item.spreadPercent, item.premium)
              }
            },
            label: {
              show: true,
              position: 'top',
              formatter: (value: string) => {
                if (value === 'OKX') {
                  return { color: '#26a69a' }
                return { color: '#ef5350' }
              }
            }
          }
        },
        grid: {
          left: '3%',
          right: '3%',
          bottom: '3%',
          containLabel: {
            show: true
          }
        }
      },
      splitLine: {
        left: '3%',
        right: '3%',
        bottom: 0
      }
    }
  })
}

  chart.setOption(option)
    chart.value
    chart.resize()
    window.addEventListener('resize', handleResize)
  })
}

    // 返回清理函数
    return () => {
      chart.dispose()
      chart = null
      spreadChart.value = null
    }
  }
})
</script>

<style scoped>
.bar-spread {
  display: flex;
  align-items: justify-between
 flex-1, 2) {
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ symbol.name }}</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">涨跌幅</span>
          <span
            :class="[
              'px-3 py-1 rounded-lg font-semibold',
              :class="spread.spreadPercent >= 0
                ? 'bg-green-500' : 'bg-red-500'
            ]"
          </span>
        </div>
      </div>
    </div>
  }
</div>
</template>