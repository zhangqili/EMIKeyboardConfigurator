<script setup lang="ts">
import { ref } from 'vue';
import { NFlex, NDropdown, NButton, NIcon } from 'naive-ui';
import { PlusFilled as PlusIcon } from '@vicons/material';
import WorkspaceTab from './WorkspaceTab.vue'; // 引入你上一步封装的原子组件

// ==========================================
// 🚨 完全封装在内部的拖拽状态机 (全局 X 轴映射版)
// ==========================================
const draggedTabIndex = ref<number | null>(null);
let dragLock = false; 

// 接收父组件传来的 tabs 数据，我们需要用它的长度来做边界判定
const props = defineProps<{
  tabs: any[];
  currentTab: string;
  availableDevices: any[];
}>();
const emit = defineEmits(['update:currentTab', 'close', 'add', 'reorder']);

function handleDragStart(index: number, event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
  setTimeout(() => { draggedTabIndex.value = index; }, 0);
  
  // 🚨 核心魔法 1：拖拽开始时，瞬间向整个网页注入一个全屏的拖拽监听器！
  document.addEventListener('dragover', handleGlobalDragOver);
}

function handleGlobalDragOver(event: DragEvent) {
  // 必须阻止默认行为，这会让整个网页的鼠标都变成允许放置的样式（不再是禁止符号）
  event.preventDefault(); 
  
  if (draggedTabIndex.value === null || dragLock) return;

  const clientX = event.clientX; // 只提取鼠标的横坐标 X
  const tabElements = document.querySelectorAll('.custom-tab-btn');
  let targetIndex = -1;

  // 计算一：鼠标当前的 X 坐标落在哪个标签的范围内？
  tabElements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) {
      targetIndex = index;
    }
  });

  // 计算二：边缘无限制引力
  // 如果鼠标拉到了标签栏右边的空白区，甚至是屏幕的右下角，强行把标签吸附到最后面
  if (targetIndex === -1 && tabElements.length > 0) {
    const lastRect = tabElements[tabElements.length - 1].getBoundingClientRect();
    const firstRect = tabElements[0].getBoundingClientRect();
    
    if (clientX > lastRect.right) targetIndex = props.tabs.length - 1;
    else if (clientX < firstRect.left) targetIndex = 0;
  }

  // 执行交换汇报
  if (targetIndex !== -1 && targetIndex !== draggedTabIndex.value) {
    // 报告给 Main.vue，让它去真正地交换数组
    emit('reorder', draggedTabIndex.value, targetIndex);
    draggedTabIndex.value = targetIndex;

    // 继续维持 150ms 锁，防止因为鼠标抖动导致边缘鬼畜
    dragLock = true;
    setTimeout(() => { dragLock = false; }, 150);
  }
}

function handleDragEnd() {
  draggedTabIndex.value = null; 
  dragLock = false; 
  // 🚨 核心魔法 2：拖拽松手时，立刻撤销全屏监听，绝不浪费一点性能！
  document.removeEventListener('dragover', handleGlobalDragOver);
}
</script>

<template><div class="tab-bar-layout">
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
          @select="$emit('update:currentTab', tab.id)"
          @close="$emit('close', tab.id)"
          @dragstart="handleDragStart(index, $event)"
          @dragend="handleDragEnd"
        />

        <div key="add-button" class="add-btn-wrapper" style="cursor: default;">
          <n-dropdown trigger="hover" size="large" :options="availableDevices" @select="$emit('add', $event)" placement="bottom-start">
            <n-button circle size="large" quaternary :focusable="false" class="add-tab-btn">
              <template #icon><n-icon><PlusIcon /></n-icon></template>
            </n-button>
          </n-dropdown>
        </div>
      </TransitionGroup>
      
    </n-flex>
  </div>
</template>

<style scoped>
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

/* =========================================
   🚨 标签页添加、删除、重排动画
   ========================================= */
.tab-list-move,
.tab-list-enter-active,
.tab-list-leave-active {
  transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

/* 核心魔法：进入和离开时，把所有物理体积压到 0，实现柔和的挤出/缩回效果 */
.tab-list-enter-from,
.tab-list-leave-to {
  opacity: 0;
  max-width: 0px !important;
  min-width: 0px !important;
  padding-left: 0px !important;
  padding-right: 0px !important;
  margin-right: 0px !important;
  border-width: 0px !important;
  transform: scale(0.9);
}

.tab-list-container.is-dragging-mode > * {
  transition: none !important;
}
</style>