<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { NLog, NButton, NSpace, NCard, NCheckbox } from 'naive-ui';
import type { LogInst } from 'naive-ui'; // 引入官方的实例类型
import { useI18n } from "vue-i18n";

const props = defineProps<{
  logs: string;
}>();

const emit = defineEmits(['clear']);
const { t } = useI18n();

const autoScroll = ref(true);
// 用于获取 n-log 的 DOM/组件实例
const logInstRef = ref<LogInst | null>(null);

// 监听从父组件传进来的 logs 数据变化
watch(
  () => props.logs,
  () => {
    if (autoScroll.value && props.logs) {
      nextTick(() => {
        logInstRef.value?.scrollTo({ position: 'bottom', silent: true });
      });
    }
  }
);

// 导出日志功能
const exportLogs = () => {
  const blob = new Blob([props.logs], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `keyboard_logs_${new Date().getTime()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <n-card 
    style="height: 100%; display: flex; flex-direction: column;" 
    content-style="flex: 1; display: flex; flex-direction: column; padding: 12px; min-height: 0; overflow: hidden;"
    :bordered="false"
  >
    <template #header>
      <n-space align="center" justify="space-between" style="width: 100%;">
        <span>{{ t('main_tabs_console') || '控制台日志' }}</span>
        <n-space>
          <n-checkbox v-model:checked="autoScroll">自动滚动</n-checkbox>
          <n-button secondary @click="exportLogs">导出</n-button>
          <n-button secondary type="error" @click="emit('clear')">清空</n-button>
        </n-space>
      </n-space>
    </template>

    <div style="flex: 1; min-height: 0; padding: 8px; overflow: hidden; display: flex; flex-direction: column;">
      <n-log
        ref="logInstRef"
        :log="logs"
        trim
        language="bash"
        highlight
        style="flex: 1; height: 100%;"
      />
    </div>
  </n-card>
</template>