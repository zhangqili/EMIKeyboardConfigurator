<script setup lang="ts">
import { ref, computed } from 'vue';
import { NFlex, NButton, NIcon, NPopover, NInput, NScrollbar } from 'naive-ui';
import { PlusFilled as PlusIcon } from '@vicons/material';
import WorkspaceTab from './WorkspaceTab.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const isPopoverVisible = ref(false);
const searchQuery = ref('');

const props = defineProps<{
  tabs: any[];
  currentTab: string;
  availableDevices: any[];
}>();

const emit = defineEmits(['update:currentTab', 'close', 'add', 'reorder']);

// 实时过滤设备列表
const filteredDevices = computed(() => {
  if (!searchQuery.value) return props.availableDevices;
  const lowerQuery = searchQuery.value.toLowerCase();
  return props.availableDevices.filter(d => 
    d.label.toLowerCase().includes(lowerQuery)
  );
});

// 选择设备后触发事件，并重置面板状态
function handleSelect(key: string) {
  emit('add', key);
  isPopoverVisible.value = false;
  searchQuery.value = ''; // 清空搜索记录
}

const draggedTabIndex = ref<number | null>(null);
let dragLock = false; 

function handleDragStart(index: number, event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
  setTimeout(() => { draggedTabIndex.value = index; }, 0);
  
  document.addEventListener('dragover', handleGlobalDragOver);
}

function handleGlobalDragOver(event: DragEvent) {
  event.preventDefault(); 
  
  if (draggedTabIndex.value === null || dragLock) return;

  const clientX = event.clientX;
  const tabElements = document.querySelectorAll('.custom-tab-btn');
  let targetIndex = -1;

  tabElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) {
      targetIndex = index;
    }
  });

  if (targetIndex === -1 && tabElements.length > 0) {
    const lastRect = tabElements[tabElements.length - 1].getBoundingClientRect();
    const firstRect = tabElements[0].getBoundingClientRect();
    
    if (clientX > lastRect.right) targetIndex = props.tabs.length - 1;
    else if (clientX < firstRect.left) targetIndex = 0;
  }

  if (targetIndex !== -1 && targetIndex !== draggedTabIndex.value) {
    emit('reorder', draggedTabIndex.value, targetIndex);
    draggedTabIndex.value = targetIndex;

    dragLock = true;
    setTimeout(() => { dragLock = false; }, 150);
  }
}

function handleDragEnd() {
  draggedTabIndex.value = null; 
  dragLock = false; 
  document.removeEventListener('dragover', handleGlobalDragOver);
}
</script>

<template>
  <div class="tab-bar-layout">
    <n-flex :align="'center'" :wrap="false" style="gap: 6px; height: 40px;">
      
      <TransitionGroup name="tab-list" tag="div" class="tab-list-container" :class="{ 'is-dragging-mode': draggedTabIndex !== null }">
        <WorkspaceTab
          v-for="(tab, index) in tabs"
          :key="tab.id"
          :title="tab.title"
          :icon="availableDevices.find((d: any) => d.key === tab.deviceName)?.icon"
          :is-active="currentTab === tab.id"
          :is-dragging="draggedTabIndex === index"
          :status="tab.status"
          @mousedown="$emit('update:currentTab', tab.id)"
          @select="$emit('update:currentTab', tab.id)"
          @close="$emit('close', tab.id)"
          @dragstart="handleDragStart(index, $event)"
          @dragend="handleDragEnd"
        />

        <div key="add-button" class="add-btn-wrapper" style="cursor: default;">
          <n-popover 
            placement="bottom-start" 
            trigger="hover" 
            :show-arrow="false" 
            style="padding: 0; width: 220px;" 
            v-model:show="isPopoverVisible"
          >
            <template #trigger>
              <n-button circle size="large" quaternary :focusable="false" class="add-tab-btn">
                <template #icon><n-icon><PlusIcon /></n-icon></template>
              </n-button>
            </template>
            
            <div style="padding: 8px; border-bottom: 1px solid var(--n-border-color);">
              <n-input v-model:value="searchQuery" :placeholder="t('search')" size="small" clearable>
                <template #prefix>
                </template>
              </n-input>
            </div>
            
            <n-scrollbar style="max-height: 240px;">
              <n-empty v-if="filteredDevices.length === 0" style="padding: 12px; text-align: center; opacity: 0.5; font-size: 13px;">
              </n-empty>
              <div 
                v-else
                v-for="device in filteredDevices" 
                :key="device.key" 
                class="device-menu-item"
                @click="handleSelect(device.key)"
              >
                <div style="display: flex; align-items: center; justify-content: center; width: 24px; margin-right: 8px;">
                  <component v-if="device.icon" :is="device.icon" />
                </div>
                <span>{{ device.label }}</span>
              </div>
            </n-scrollbar>
          </n-popover>
        </div>
      </TransitionGroup>
      
    </n-flex>
  </div>
</template>

<style scoped>
/* 原有的布局和动画样式保持不变 */
.tab-bar-layout {
  flex: 0 0 auto;
  padding: 6px 8px;
  background-color: var(--n-color-embedded);
  border-bottom: 1px solid var(--n-border-color);
  overflow-x: auto;
}

.tab-bar-layout::-webkit-scrollbar {
  display: none;
}

.tab-list-container {
  display: flex;
  align-items: center;
  height: 40px;
}

.add-btn-wrapper {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.add-tab-btn {
  width: 32px;
  height: 32px;
}

/* 标签页添加、删除、重排动画 */
.tab-list-move,
.tab-list-enter-active,
.tab-list-leave-active {
  transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

.tab-list-enter-from,
.tab-list-leave-to {
  opacity: 0;
  max-width: 0px !important;
  min-width: 0px !important;
  padding-left: 0px !important;
  padding-right: 0px !important;
  margin-right: 0px !important;
  border-width: 0px !important;
  transform: scale(1);
}

.tab-list-container.is-dragging-mode > * {
  transition: none !important;
}

.device-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--n-text-color);
  font-size: 14px;
}

.device-menu-item:hover {
  background-color: rgba(128, 128, 128, 0.1);
}
</style>