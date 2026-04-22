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

// 注意：这里我们定义 add 事件会传递两个参数 (name, mode)
const emit = defineEmits(['update:currentTab', 'close', 'add', 'reorder']);

// 实时过滤设备列表
const filteredDevices = computed(() => {
  if (!searchQuery.value) return props.availableDevices;
  const lowerQuery = searchQuery.value.toLowerCase();
  return props.availableDevices.filter(d => 
    d.label.toLowerCase().includes(lowerQuery)
  );
});

function handleSelect(key: string, mode: 'authorize' | 'demo') {
  emit('add', key, mode);
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
          :closable="tab.isDemo"  
          @mousedown="$emit('update:currentTab', tab.id)"
          @select="$emit('update:currentTab', tab.id)"
          @close="$emit('close', tab.id)"
          @dragstart="handleDragStart(index, $event)"
          @dragend="handleDragEnd"
        />

        <div key="add-button" class="add-btn-wrapper" style="cursor: default;">
          <n-popover 
            placement="bottom-start" 
            trigger="click" 
            :show-arrow="false" 
            style="padding: 0; width: 240px;" 
            v-model:show="isPopoverVisible"
          >
            <template #trigger>
              <n-button circle size="large" quaternary :focusable="false" class="add-tab-btn">
                <template #icon><n-icon><PlusIcon /></n-icon></template>
              </n-button>
            </template>
            
            <div style="padding: 8px; border-bottom: 1px solid var(--n-border-color);">
              <n-input v-model:value="searchQuery" :placeholder="t('search')" size="small" clearable />
            </div>
            
            <n-scrollbar style="max-height: 240px;">
              <n-empty v-if="filteredDevices.length === 0" style="padding: 12px; text-align: center; opacity: 0.5; font-size: 13px;">
              </n-empty>
              
              <div 
                v-else
                v-for="device in filteredDevices" 
                :key="device.key" 
                class="device-menu-item"
              >
                <div class="device-info">
                  <div class="device-icon-wrapper">
                    <component v-if="device.icon" :is="device.icon" />
                  </div>
                  <span class="device-name">{{ device.label }}</span>
                </div>
                
                <div class="device-actions">
                  <n-button size="tiny" type="primary" secondary @click.stop="handleSelect(device.key, 'authorize')">
                    {{ t('authorize') }}
                  </n-button>
                  <n-button size="tiny" secondary @click.stop="handleSelect(device.key, 'demo')">
                    {{ t('demo') }}
                  </n-button>
                </div>
              </div>

            </n-scrollbar>
          </n-popover>
        </div>
      </TransitionGroup>
      
    </n-flex>
  </div>
</template>

<style scoped>
/* 保持原有布局样式... */
.tab-bar-layout { flex: 0 0 auto; padding: 6px 8px; background-color: var(--n-color-embedded); border-bottom: 1px solid var(--n-border-color); overflow-x: auto; }
.tab-bar-layout::-webkit-scrollbar { display: none; }
.tab-list-container { display: flex; align-items: center; height: 40px; }
.add-btn-wrapper { display: flex; align-items: center; flex-shrink: 0; }
.add-tab-btn { width: 32px; height: 32px; }

.tab-list-move, .tab-list-enter-active, .tab-list-leave-active { transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1); }
.tab-list-enter-from, .tab-list-leave-to { opacity: 0; max-width: 0px !important; min-width: 0px !important; padding-left: 0px !important; padding-right: 0px !important; margin-right: 0px !important; border-width: 0px !important; transform: scale(1); }
.tab-list-container.is-dragging-mode > * { transition: none !important; }
/* 核心改动区：绝对定位悬浮 + 动态 Padding 过渡 */
.device-menu-item {
  position: relative; /* 为按钮的绝对定位提供参考系 */
  display: flex;
  align-items: center;
  padding: 8px 12px;
  color: var(--n-text-color);
  font-size: 14px;
}

.device-menu-item:hover {
  background-color: rgba(128, 128, 128, 0.1);
}

/* 核心改动区：极简 Flex 自适应布局 */
.device-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  color: var(--n-text-color);
  font-size: 14px;
  cursor: default; /* 提升鼠标悬浮时的交互感 */
}

.device-menu-item:hover {
  background-color: rgba(128, 128, 128, 0.1);
}

/* 文字信息容器 */
.device-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0; /* 允许 flex 子元素内部截断 */
}

/* 保护图标不被长文字挤压变形 */
.device-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  margin-right: 8px;
  flex-shrink: 0; 
}

/* 名字过长时显示省略号 */
.device-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 按钮组默认完全隐藏，不占空间 */
.device-actions {
  display: none;
  gap: 6px;
  flex-shrink: 0; /* 绝对保证按钮完整显示，不被长文字挤压 */
  margin-left: 8px; /* 悬浮时，给左侧的省略号留出呼吸空间 */
}

/* 悬浮时瞬间显示按钮，Flexbox 自动计算宽度，多语言完美自适应！ */
.device-menu-item:hover .device-actions {
  display: flex;
}
</style>