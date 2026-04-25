/**
 * Monaco Editor 封装
 */
import { ref, onMounted, onUnmounted, Ref } from 'vue';
import * as monaco from 'monaco-editor';

export interface EditorConfig {
  language?: string;
  theme?: string;
  readOnly?: boolean;
  minimap?: boolean;
  fontSize?: number;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  wordWrap?: 'on' | 'off' | 'bounded' | 'wordWrapColumn';
  tabSize?: number;
  automaticLayout?: boolean;
}

const defaultConfig: EditorConfig = {
  language: 'python',
  theme: 'vs-dark',
  readOnly: false,
  minimap: false,
  fontSize: 14,
  lineNumbers: 'on',
  wordWrap: 'on',
  tabSize: 4,
  automaticLayout: true,
};

export function useMonaco(
  containerRef: Ref<HTMLElement | null>,
  config: EditorConfig = {}
) {
  const editor = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
  const isLoading = ref(true);

  const mergedConfig = { ...defaultConfig, ...config };

  // Python 语言配置
  function configurePythonLanguage() {
    // 注册 Python 补全提供者
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // 量化交易常用函数和变量
        const suggestions: monaco.languages.CompletionItem[] = [
          // 上下文对象
          {
            label: 'context',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'context',
            documentation: '策略上下文对象',
            range,
          },
          {
            label: 'context.symbol',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: 'context.symbol',
            documentation: '当前交易标的',
            range,
          },
          {
            label: 'context.portfolio',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: 'context.portfolio',
            documentation: '投资组合',
            range,
          },
          {
            label: 'context.order',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'context.order(symbol, quantity)',
            documentation: '下单函数',
            range,
          },

          // 内置函数
          {
            label: 'initialize',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'def initialize(context):\n\t"""初始化策略配置"""\n\t${1:pass}',
            documentation: '策略初始化函数',
            range,
          },
          {
            label: 'handle_data',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'def handle_data(context, data):\n\t"""每个交易周期执行的策略逻辑"""\n\t${1:pass}',
            documentation: '数据处理函数',
            range,
          },
          {
            label: 'before_trading_start',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'def before_trading_start(context, data):\n\t"""开盘前执行"""\n\t${1:pass}',
            documentation: '开盘前执行函数',
            range,
          },
          {
            label: 'after_trading_end',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'def after_trading_end(context, data):\n\t"""收盘后执行"""\n\t${1:pass}',
            documentation: '收盘后执行函数',
            range,
          },

          // 数据访问
          {
            label: 'data.history',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'data.history(symbol, fields, bar_count)',
            documentation: '获取历史数据',
            range,
          },
          {
            label: 'data.current',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'data.current(symbol, field)',
            documentation: '获取当前数据',
            range,
          },

          // 技术指标
          {
            label: 'SMA',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'SMA(data, period)',
            documentation: '简单移动平均线',
            range,
          },
          {
            label: 'EMA',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'EMA(data, period)',
            documentation: '指数移动平均线',
            range,
          },
          {
            label: 'RSI',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'RSI(data, period)',
            documentation: '相对强弱指数',
            range,
          },
          {
            label: 'MACD',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'MACD(data, fast_period, slow_period, signal_period)',
            documentation: 'MACD 指标',
            range,
          },
          {
            label: 'BBANDS',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'BBANDS(data, period, std_dev)',
            documentation: '布林带',
            range,
          },

          // 常用代码片段
          {
            label: 'snippet:ma_cross',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              '# 双均线交叉策略',
              'def initialize(context):',
              '\tcontext.symbol = "${1:AAPL}"',
              '\tcontext.fast_period = ${2:10}',
              '\tcontext.slow_period = ${3:20}',
              '',
              'def handle_data(context, data):',
              '\tprices = data.history(context.symbol, "close", context.slow_period + 1)',
              '\tfast_ma = prices[-context.fast_period:].mean()',
              '\tslow_ma = prices[-context.slow_period:].mean()',
              '',
              '\tposition = context.portfolio.positions.get(context.symbol, 0)',
              '',
              '\tif fast_ma > slow_ma and position == 0:',
              '\t\tcontext.order(context.symbol, 100)',
              '\telif fast_ma < slow_ma and position > 0:',
              '\t\tcontext.order(context.symbol, -position)',
              '$0',
            ].join('\n'),
            documentation: '双均线交叉策略模板',
            range,
          },
        ];

        return { suggestions };
      },
    });
  }

  function initEditor() {
    if (!containerRef.value) return;

    // 配置 Python 语言
    configurePythonLanguage();

    // 设置主题
    monaco.editor.defineTheme('quant-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'function', foreground: 'DCDCAA' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2d2d2d',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#ffffff',
      },
    });

    // 创建编辑器
    editor.value = monaco.editor.create(containerRef.value, {
      language: mergedConfig.language,
      theme: mergedConfig.theme === 'vs-dark' ? 'quant-dark' : mergedConfig.theme,
      readOnly: mergedConfig.readOnly,
      minimap: { enabled: mergedConfig.minimap },
      fontSize: mergedConfig.fontSize,
      lineNumbers: mergedConfig.lineNumbers,
      wordWrap: mergedConfig.wordWrap,
      tabSize: mergedConfig.tabSize,
      automaticLayout: mergedConfig.automaticLayout,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      padding: { top: 16 },
      folding: true,
      foldingHighlight: true,
      showFoldingControls: 'mouseover',
      bracketPairColorization: { enabled: true },
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      formatOnPaste: true,
      formatOnType: true,
    });

    isLoading.value = false;

    // 快捷键绑定
    editor.value.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // 触发保存事件
      editor.value?.getAction('editor.action.formatDocument')?.run();
    });
  }

  function getValue(): string {
    return editor.value?.getValue() || '';
  }

  function setValue(value: string): void {
    editor.value?.setValue(value);
  }

  function setLanguage(language: string): void {
    const model = editor.value?.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  }

  function setTheme(theme: string): void {
    monaco.editor.setTheme(theme);
  }

  function setReadOnly(readOnly: boolean): void {
    editor.value?.updateOptions({ readOnly });
  }

  function format(): Promise<void> {
    return editor.value?.getAction('editor.action.formatDocument')?.run() || Promise.resolve();
  }

  function focus(): void {
    editor.value?.focus();
  }

  function resize(): void {
    editor.value?.layout();
  }

  function destroy(): void {
    editor.value?.dispose();
    editor.value = null;
  }

  onMounted(() => {
    initEditor();
  });

  onUnmounted(() => {
    destroy();
  });

  return {
    editor,
    isLoading,
    initEditor,
    getValue,
    setValue,
    setLanguage,
    setTheme,
    setReadOnly,
    format,
    focus,
    resize,
    destroy,
  };
}
