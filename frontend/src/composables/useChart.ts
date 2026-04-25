/**
 * lightweight-charts 封装
 * 基于 TradingView 开源图表库
 */
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  ColorType,
  CrosshairMode,
  Time,
  DeepPartial,
  ChartOptions,
  CandlestickSeriesPartialOptions,
} from 'lightweight-charts';
import { ref, onMounted, onUnmounted, Ref } from 'vue';

export interface ChartConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  gridColor?: string;
  crosshairColor?: string;
  upColor?: string;
  downColor?: string;
  borderUpColor?: string;
  borderDownColor?: string;
  wickUpColor?: string;
  wickDownColor?: string;
}

const defaultConfig: ChartConfig = {
  backgroundColor: 'transparent',
  textColor: '#888',
  gridColor: '#e1e1e1',
  crosshairColor: '#758696',
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
};

export function useChart(containerRef: Ref<HTMLElement | null>, config: ChartConfig = {}) {
  const chart = ref<IChartApi | null>(null);
  const candlestickSeries = ref<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = ref<ISeriesApi<'Histogram'> | null>(null);

  const mergedConfig = { ...defaultConfig, ...config };

  function initChart() {
    if (!containerRef.value) return;

    const options: DeepPartial<ChartOptions> = {
      width: mergedConfig.width || containerRef.value.clientWidth,
      height: mergedConfig.height || 500,
      layout: {
        background: { type: ColorType.Solid, color: mergedConfig.backgroundColor! },
        textColor: mergedConfig.textColor!,
      },
      grid: {
        vertLines: { color: mergedConfig.gridColor! },
        horzLines: { color: mergedConfig.gridColor! },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: mergedConfig.crosshairColor!,
          width: 1,
          style: 3,
          labelBackgroundColor: mergedConfig.crosshairColor!,
        },
        horzLine: {
          color: mergedConfig.crosshairColor!,
          width: 1,
          style: 3,
          labelBackgroundColor: mergedConfig.crosshairColor!,
        },
      },
      rightPriceScale: {
        borderColor: mergedConfig.gridColor!,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: mergedConfig.gridColor!,
        timeVisible: true,
        secondsVisible: false,
      },
    };

    chart.value = createChart(containerRef.value, options);

    // 创建 K 线系列
    const candleOptions: DeepPartial<CandlestickSeriesPartialOptions> = {
      upColor: mergedConfig.upColor!,
      downColor: mergedConfig.downColor!,
      borderUpColor: mergedConfig.borderUpColor!,
      borderDownColor: mergedConfig.borderDownColor!,
      wickUpColor: mergedConfig.wickUpColor!,
      wickDownColor: mergedConfig.wickDownColor!,
    };

    candlestickSeries.value = chart.value.addCandlestickSeries(candleOptions);

    // 创建成交量系列
    volumeSeries.value = chart.value.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    chart.value.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });
  }

  function setData(data: CandlestickData<Time>[]) {
    if (!candlestickSeries.value || !volumeSeries.value) return;

    candlestickSeries.value.setData(data);

    const volumeData: HistogramData<Time>[] = data.map((d) => ({
      time: d.time,
      value: (d as any).volume || 0,
      color: d.close >= d.open ? '#26a69a80' : '#ef535080',
    }));

    volumeSeries.value.setData(volumeData);
  }

  function updateData(data: CandlestickData<Time>) {
    if (!candlestickSeries.value || !volumeSeries.value) return;

    candlestickSeries.value.update(data);

    volumeSeries.value.update({
      time: data.time,
      value: (data as any).volume || 0,
      color: data.close >= data.open ? '#26a69a80' : '#ef535080',
    });
  }

  function addMA(_period: number, color: string = '#2962FF') {
    if (!chart.value) return null;

    const maSeries = chart.value.addLineSeries({
      color,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    return maSeries;
  }

  function fitContent() {
    chart.value?.timeScale().fitContent();
  }

  function resize(width: number, height: number) {
    chart.value?.applyOptions({ width, height });
  }

  function destroy() {
    chart.value?.remove();
    chart.value = null;
    candlestickSeries.value = null;
    volumeSeries.value = null;
  }

  onMounted(() => {
    initChart();

    // 监听窗口大小变化
    const handleResize = () => {
      if (containerRef.value) {
        resize(containerRef.value.clientWidth, mergedConfig.height || 500);
      }
    };

    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    destroy();
  });

  return {
    chart,
    candlestickSeries,
    volumeSeries,
    initChart,
    setData,
    updateData,
    addMA,
    fitContent,
    resize,
    destroy,
  };
}
