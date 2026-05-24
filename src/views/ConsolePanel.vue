<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  NButton,
  NCard,
  NFlex,
  NIcon,
  NLog,
  NSwitch,
  NTooltip,
  useMessage,
  type LogInst
} from 'naive-ui';
import {
  ClearAllOutlined,
  ContentCopyOutlined,
  PauseOutlined,
  PlayArrowOutlined,
  TerminalOutlined,
  VerticalAlignBottomOutlined
} from '@vicons/material';
import * as ekc from 'emi-keyboard-controller';

const MAX_LOG_CHARS = 128 * 1024;
const LOG_FONT_SIZE = 13;
const LOG_LINE_HEIGHT = 1.35;
const MIN_LOG_ROWS = 8;

interface ConsoleDataDetail {
  text?: string;
  data?: Uint8Array | ArrayBuffer;
}

type ConsoleController = ekc.KeyboardController & {
  write_config?: () => Promise<void>;
};

const props = defineProps<{
  controller: ekc.KeyboardController;
}>();

const { t } = useI18n();
const message = useMessage();
const decoder = new TextDecoder();

const consoleText = ref('');
const pendingText = ref('');
const paused = ref(false);
const autoScroll = ref(true);
const logRows = ref(30);
const logRef = ref<LogInst | null>(null);
const logAreaRef = ref<HTMLElement | null>(null);

let resizeObserver: ResizeObserver | null = null;
let scrollScheduled = false;
let previousConsoleEnabled: boolean | null = null;

const formattedLogSize = computed(() => formatSize(consoleText.value.length));

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KiB`;
}

function trimToLimit(text: string): string {
  if (text.length <= MAX_LOG_CHARS) return text;
  return text.slice(text.length - MAX_LOG_CHARS);
}

function decodeConsoleData(detail: ConsoleDataDetail | undefined): string {
  if (!detail) return '';
  if (typeof detail.text === 'string') return detail.text;
  if (detail.data instanceof Uint8Array) return decoder.decode(detail.data);
  if (detail.data instanceof ArrayBuffer) return decoder.decode(new Uint8Array(detail.data));
  return '';
}

function requestScrollToBottom(force = false) {
  if ((!force && !autoScroll.value) || scrollScheduled) return;
  scrollScheduled = true;
  void nextTick(() => {
    scrollScheduled = false;
    logRef.value?.scrollTo({ position: 'bottom', silent: true });
  });
}

function appendConsoleText(text: string) {
  if (!text) return;
  consoleText.value = trimToLimit(consoleText.value + text);
  requestScrollToBottom();
}

const handleConsoleData: EventListener = (event: Event) => {
  const detail = (event as CustomEvent<ConsoleDataDetail>).detail;
  const text = decodeConsoleData(detail);
  if (!text) return;

  if (paused.value) {
    pendingText.value = trimToLimit(pendingText.value + text);
    return;
  }

  appendConsoleText(text);
};

function clearLog() {
  consoleText.value = '';
  pendingText.value = '';
  requestScrollToBottom(true);
}

async function copyLog() {
  const text = consoleText.value + pendingText.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    message.success(t('console_panel_copy_success'));
  } catch {
    message.error(t('console_panel_copy_failed'));
  }
}

async function setKeyboardConsoleEnabled(enabled: boolean, rememberPrevious = false) {
  const controller = props.controller as ConsoleController;
  const config = controller.get_config();
  if (rememberPrevious) {
    previousConsoleEnabled = config.console;
  }
  if (config.console === enabled) return;

  config.console = enabled;
  controller.set_config(config);
  await controller.write_config?.();
}

function togglePause() {
  paused.value = !paused.value;
  if (!paused.value && pendingText.value) {
    const text = pendingText.value;
    pendingText.value = '';
    appendConsoleText(text);
  }
}

function handleAutoScrollUpdate(value: boolean) {
  autoScroll.value = value;
  if (value) requestScrollToBottom(true);
}

function updateLogRows() {
  const height = logAreaRef.value?.clientHeight ?? 0;
  if (height <= 0) return;
  logRows.value = Math.max(MIN_LOG_ROWS, Math.floor(height / (LOG_FONT_SIZE * LOG_LINE_HEIGHT)));
}

onMounted(() => {
  props.controller.addEventListener('consoleData', handleConsoleData);
  void setKeyboardConsoleEnabled(true, true).catch(() => {
    message.error(t('console_panel_enable_failed'));
  });
  void nextTick(() => {
    updateLogRows();
    if (typeof ResizeObserver !== 'undefined' && logAreaRef.value) {
      resizeObserver = new ResizeObserver(updateLogRows);
      resizeObserver.observe(logAreaRef.value);
    }
  });
  window.addEventListener('resize', updateLogRows);
});

onBeforeUnmount(() => {
  props.controller.removeEventListener('consoleData', handleConsoleData);
  if (previousConsoleEnabled !== null) {
    void setKeyboardConsoleEnabled(previousConsoleEnabled).catch(() => {
      message.error(t('console_panel_disable_failed'));
    });
  }
  resizeObserver?.disconnect();
  window.removeEventListener('resize', updateLogRows);
});
</script>

<template>
  <n-card class="console-panel" content-style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
    <template #header>
      <div class="console-header">
        <div class="console-title">
          <n-icon size="18">
            <TerminalOutlined />
          </n-icon>
          <span>{{ t('main_tabs_console') }}</span>
          <span class="console-meta">{{ formattedLogSize }}</span>
          <span v-if="pendingText.length > 0" class="console-meta pending">
            {{ t('console_panel_pending', { count: pendingText.length }) }}
          </span>
        </div>

        <n-flex align="center" :wrap="false" :size="8">
          <div class="auto-scroll-control">
            <span>{{ t('console_panel_auto_scroll') }}</span>
            <n-switch size="small" :value="autoScroll" @update:value="handleAutoScrollUpdate" />
          </div>

          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <n-button quaternary circle size="small" @click="requestScrollToBottom(true)">
                <template #icon>
                  <n-icon><VerticalAlignBottomOutlined /></n-icon>
                </template>
              </n-button>
            </template>
            {{ t('console_panel_scroll_bottom') }}
          </n-tooltip>

          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <n-button quaternary circle size="small" :type="paused ? 'primary' : 'default'" @click="togglePause">
                <template #icon>
                  <n-icon>
                    <PlayArrowOutlined v-if="paused" />
                    <PauseOutlined v-else />
                  </n-icon>
                </template>
              </n-button>
            </template>
            {{ paused ? t('console_panel_resume') : t('console_panel_pause') }}
          </n-tooltip>

          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <n-button quaternary circle size="small" @click="copyLog">
                <template #icon>
                  <n-icon><ContentCopyOutlined /></n-icon>
                </template>
              </n-button>
            </template>
            {{ t('console_panel_copy') }}
          </n-tooltip>

          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <n-button quaternary circle size="small" @click="clearLog">
                <template #icon>
                  <n-icon><ClearAllOutlined /></n-icon>
                </template>
              </n-button>
            </template>
            {{ t('clear') }}
          </n-tooltip>
        </n-flex>
      </div>
    </template>

    <div ref="logAreaRef" class="console-log-area">
      <n-log
        ref="logRef"
        :log="consoleText"
        :rows="logRows"
        :font-size="LOG_FONT_SIZE"
        :line-height="LOG_LINE_HEIGHT"
        trim
      />
    </div>
  </n-card>
</template>

<style scoped>
.console-panel {
  height: 100%;
}

.console-panel :deep(.n-card__content) {
  min-height: 0;
}

.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.console-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-weight: 600;
}

.console-meta {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.62;
  white-space: nowrap;
}

.console-meta.pending {
  color: var(--n-info-color);
  opacity: 1;
}

.auto-scroll-control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  white-space: nowrap;
}

.console-log-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.console-log-area :deep(.n-log) {
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  width: 100%;
}

.console-log-area :deep(pre) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
