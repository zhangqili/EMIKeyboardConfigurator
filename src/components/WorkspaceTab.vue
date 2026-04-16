<script setup lang="ts">
import { NFlex, NButton, NIcon } from 'naive-ui';

defineProps<{
  title: string;
  icon?: any;
  isActive: boolean;
  isDragging: boolean;
  closable?: boolean;
  status?: 'disconnected' | 'connected' | 'ready';
}>();

defineEmits(['select', 'close', 'dragstart', 'dragend']);
</script>

<template>
  <div 
    class="custom-tab-btn"
    :class="{ 
      'is-active': isActive,
      'is-dragging': isDragging,
      'status-ready': status === 'ready',
      'status-connected': status === 'connected',
      'no-close': !closable
    }"
    draggable="true"
    @dragstart="$emit('dragstart', $event)"
    @dragend="$emit('dragend', $event)"
    @click="$emit('select')" 
    @mousedown.middle.prevent 
    @auxclick.middle.stop="closable &&$emit('close')"
  >
    <n-flex :align="'center'" :wrap="false" style="gap: 8px; pointer-events: none;">
      
      <component v-if="icon" :is="icon" />
      <span>{{ title }}</span>

      <div 
        v-if="closable"
        draggable="true" 
        @dragstart.prevent.stop 
        style="pointer-events: auto; display: flex; align-items: center;"
      >
        <n-button circle quaternary :size="'tiny'" @click.stop="$emit('close')" :focusable=false>
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z"/></svg>
            </n-icon>
          </template>
        </n-button>
      </div>
      
    </n-flex>
  </div>
</template>

<style scoped>
/* 这里存放原 Main.vue 里的 custom-tab-btn 所有样式 */
.custom-tab-btn {
  display: inline-flex;
  align-items: center;
  height: 38px;
  padding: 0 4px 0 12px;
  margin-right: 6px;
  max-width: 300px;
  border-radius: 4px;
  background-color: transparent;
  color: var(--n-text-color);
  cursor: default;
  user-select: none;
  overflow: hidden;
  flex-shrink: 0;
  white-space: nowrap;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.custom-tab-btn:hover { background-color: rgba(128, 128, 128, 0.1); }
.custom-tab-btn.is-active { background-color: rgba(128, 128, 128, 0.2); }

.custom-tab-btn.status-connected { color: #f0a020; } 
/* 选中时才显示浅黄色背景 */
.custom-tab-btn.status-connected.is-active { background-color: rgba(240, 160, 32, 0.1); } 
/* 悬浮时的加深反馈 */
.custom-tab-btn.status-connected:hover { background-color: rgba(240, 160, 32, 0.15); } 

.custom-tab-btn.status-ready { color: #18a058; } 
/* 选中时才显示浅绿色背景 */
.custom-tab-btn.status-ready.is-active { background-color: rgba(24, 160, 88, 0.1); } 
/* 悬浮时的加深反馈 */
.custom-tab-btn.status-ready:hover { background-color: rgba(24, 160, 88, 0.15); }

/* 拖拽时的幽灵外观：不需要加 transition: none，因为外层已经去掉了动画 */
.custom-tab-btn.is-dragging {
  opacity: 0.3 !important;
  /* 绝对禁止它播放任何动画！让它在底层瞬间交换位置，绝不鬼畜 */
  transition: none !important; 
  /* 防止在移动时遮挡鼠标指针触发多余事件 */
  pointer-events: none !important;
}
.custom-tab-btn {
  padding: 0 12px; 
}

.custom-tab-btn:not(.no-close) {
  padding: 0 4px 0 12px;
}
</style>