<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useMonaco } from '../../composables/useMonaco';
import * as monaco from 'monaco-editor';

interface Props {
  modelValue: string;
  language?: string;
  theme?: 'vs-dark' | 'vs-light';
  readOnly?: boolean;
  height?: number | string;
  minimap?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  language: 'python',
  theme: 'vs-dark',
  readOnly: false,
  height: 400,
  minimap: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
  (e: 'save', value: string): void;
  (e: 'ready'): void;
}>();

const editorContainer = ref<HTMLElement | null>(null);

const {
  editor,
  isLoading,
  getValue,
  setValue,
  setLanguage,
  setTheme,
  setReadOnly,
  format,
  focus,
} = useMonaco(editorContainer, {
  language: props.language,
  theme: props.theme,
  readOnly: props.readOnly,
  minimap: props.minimap,
});

// 高度样式
const heightStyle = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`;
  }
  return props.height;
});

// 监听外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    const currentValue = getValue();
    if (newValue !== currentValue) {
      setValue(newValue);
    }
  }
);

// 监听语言变化
watch(
  () => props.language,
  (newLang) => {
    setLanguage(newLang);
  }
);

// 监听主题变化
watch(
  () => props.theme,
  (newTheme) => {
    setTheme(newTheme);
  }
);

// 监听只读状态变化
watch(
  () => props.readOnly,
  (newReadOnly) => {
    setReadOnly(newReadOnly);
  }
);

// 设置内容变化监听
onMounted(() => {
  // 等待编辑器初始化
  const unwatch = watch(editor, (newEditor) => {
    if (newEditor) {
      // 设置初始值
      setValue(props.modelValue);

      // 监听内容变化
      newEditor.onDidChangeModelContent(() => {
        const value = getValue();
        emit('update:modelValue', value);
        emit('change', value);
      });

      // 添加保存快捷键
      newEditor.addCommand(
        // Ctrl/Cmd + S
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          const value = getValue();
          emit('save', value);
        }
      );

      emit('ready');
      unwatch();
    }
  });
});

// 工具栏操作
function handleFormat() {
  format();
}

function handleUndo() {
  editor.value?.trigger('keyboard', 'undo', null);
}

function handleRedo() {
  editor.value?.trigger('keyboard', 'redo', null);
}

// 暴露方法
defineExpose({
  editor,
  getValue,
  setValue,
  format,
  focus,
});
</script>

<template>
  <div class="code-editor-wrapper">
    <!-- 工具栏 -->
    <div
      v-if="!readOnly"
      class="editor-toolbar flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700"
    >
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400">
          {{ language.toUpperCase() }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="handleUndo"
          class="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="撤销 (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          @click="handleRedo"
          class="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="重做 (Ctrl+Y)"
        >
          ↷
        </button>
        <button
          @click="handleFormat"
          class="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="格式化"
        >
          {}
        </button>
      </div>
    </div>

    <!-- 编辑器容器 -->
    <div class="editor-container relative" :style="{ height: heightStyle }">
      <!-- 加载状态 -->
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-gray-900 z-10"
      >
        <div class="text-gray-400">加载编辑器...</div>
      </div>

      <!-- Monaco Editor 容器 -->
      <div
        ref="editorContainer"
        class="w-full h-full"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.code-editor-wrapper {
  @apply w-full overflow-hidden rounded-lg border border-gray-700;
}

.editor-container {
  @apply w-full;
}

/* Monaco Editor 内部样式覆盖 */
:deep(.monaco-editor) {
  padding-top: 0;
}

:deep(.monaco-editor .margin) {
  background-color: #1e1e1e !important;
}

:deep(.monaco-editor .monaco-scrollable-element > .scrollbar > .slider) {
  background: rgba(255, 255, 255, 0.2) !important;
  border-radius: 4px;
}

:deep(.monaco-editor .monaco-scrollable-element > .scrollbar > .slider:hover) {
  background: rgba(255, 255, 255, 0.3) !important;
}
</style>
