<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useChart } from '../../composables/useChart';
import { KlineData } from '../../types/market';

interface Props {
  symbol: string;
  height?: number;
  showVolume?: boolean;
  showMA?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  height: 500,
  showVolume: true,
  showMA: true,
});

const emit = defineEmits<{
  (e: 'ready'): void;
  (e: 'crosshairMove', data: any): void;
}>();

const chartContainer = ref<HTMLElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const {
  chart,
  candlestickSeries,
  setData,
  updateData,
  addMA,
  fitContent,
} = useChart(chartContainer, {
  height: props.height,
});

// 模拟 K 线数据生成
function generateKlineData(symbol: string, count: number = 200): KlineData[] {
  const data: KlineData[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let price = symbol === 'AAPL' ? 175 :
              symbol === 'GOOGL' ? 140 :
              symbol === 'MSFT' ? 375 : 100;

  for (let i = 0; i < count; i++) {
    const time = Math.floor((now - (count - i) * dayMs) / 1000);
    const open = price;
    const change = price * 0.03 * (Math.random() - 0.5);
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 10000000);

    data.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return data;
}

// 计算 MA
function calculateMA(data: KlineData[], period: number): Array<{ time: number; value: number }> {
  const result: Array<{ time: number; value: number }> = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({
      time: data[i].time,
      value: Number((sum / period).toFixed(2)),
    });
  }

  return result;
}

// 加载数据
async function loadData() {
  loading.value = true;
  error.value = null;

  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500));

    const klineData = generateKlineData(props.symbol);

    // 设置 K 线数据
    setData(klineData as any);

    // 添加 MA 指标
    if (props.showMA) {
      const ma5 = addMA(5, '#2962FF');
      const ma20 = addMA(20, '#FF6D00');

      if (ma5) {
        ma5.setData(calculateMA(klineData, 5) as any);
      }
      if (ma20) {
        ma20.setData(calculateMA(klineData, 20) as any);
      }
    }

    // 自适应
    fitContent();

    loading.value = false;
    emit('ready');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
    loading.value = false;
  }
}

// 监听 symbol 变化
watch(() => props.symbol, () => {
  loadData();
});

onMounted(() => {
  loadData();
});

// 暴露方法
defineExpose({
  chart,
  candlestickSeries,
  setData,
  updateData,
  fitContent,
});
</script>

<template>
  <div class="chart-wrapper relative">
    <!-- 加载状态 -->
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10"
    >
      <div class="text-center">
        <div class="animate-spin text-4xl mb-2">⏳</div>
        <p class="text-gray-500">加载中...</p>
      </div>
    </div>

    <!-- 错误状态 -->
    <div
      v-if="error"
      class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10"
    >
      <div class="text-center text-red-500">
        <p class="text-xl mb-2">⚠️</p>
        <p>{{ error }}</p>
        <button
          @click="loadData"
          class="mt-2 px-4 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          重试
        </button>
      </div>
    </div>

    <!-- 图表容器 -->
    <div
      ref="chartContainer"
      class="chart-container"
      :style="{ height: `${height}px` }"
    ></div>
  </div>
</template>

<style scoped>
.chart-wrapper {
  width: 100%;
  position: relative;
}

.chart-container {
  width: 100%;
}
</style>
