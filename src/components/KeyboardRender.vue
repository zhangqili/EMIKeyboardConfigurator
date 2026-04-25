<script setup lang="ts">
import { computed, ref, watch, type PropType } from "vue";
import { NRadioGroup, NRadioButton, NCard, NButton, NButtonGroup, NPopover, NFlex, NTooltip, NIcon} from "naive-ui";
import Key from "./Key.vue";
import * as kle from "@ijprest/kle-serial";
import { KeyConfig } from "@/apis/utils";
import LayoutSubSelector from "./LayoutSubSelector.vue";
import { useI18n } from "vue-i18n";
import {
  CropOutline,          // 框选
  BrushOutline,         // 滑动
  SwapHorizontalOutline // 反选当前选区 (交换)
} from '@vicons/ionicons5';
import {
  SelectAllFilled,
  DeselectFilled
} from '@vicons/material'
const { t } = useI18n();


const props = defineProps({
  keys: { type: Array as () => any[], required: true },
  layout_labels: { type: Array as () => any[], default: () => [] },
  mode: { 
    type: String as PropType<'none' | 'single' | 'multiple'>, 
    default: 'multiple' 
  }
});

const emit = defineEmits<{
  (e: 'select', id: number): void,
}>();

const selectedKeys = defineModel<number[]>("selectedKeys",{ 
  default:() => []
});

// 监听 mode 切换，当模式改变时清空已选中的按键
watch(() => props.mode, (newMode, oldMode) => {
  if (newMode !== oldMode) {
    selectedKeys.value = [];
  }
});

const usize = ref(54);

// 定义交互维度 
const selectionTool = ref<'marquee' | 'swipe'>('swipe'); // 选择工具
const booleanMode = ref<'new' | 'toggle' | 'add' | 'subtract'>('toggle'); // 选择模式

const minHeight = computed(() => {
  const maxY = props.keys.length > 0 ? Math.max(...props.keys.map((key : kle.Key) => key.y + key.height)) : 0;
  return `${(maxY) * usize.value}px`; 
});
const minWidth = computed(() => {
  const maxX = props.keys.length > 0 ? Math.max(...props.keys.map((key : kle.Key) => key.x + key.width)) : 0;
  return `${(maxX) * usize.value}px`; 
});


// 全选当前可见的所有按键
function selectAll() {
  selectedKeys.value = visibleKeys.value.map(k => k.id);
}

// 取消当前所有选择
function deselectAll() {
  selectedKeys.value = [];
}

// 反选当前可见区域的选区
function invertSelection() {
  const currentSet = new Set(selectedKeys.value);
  const newSelection: number[] = [];
  
  visibleKeys.value.forEach(k => {
    if (!currentSet.has(k.id)) {
      newSelection.push(k.id);
    }
  });
  
  selectedKeys.value = newSelection;
}

// ==========================================
// 核心事件分发逻辑
// ==========================================
function handleKeyMouseDown(event : MouseEvent, id: number) {
  if (event.button !== 0) return; 
  event.stopPropagation();
  event.preventDefault();
  
  emit('select', id);

  if (props.mode === 'none') return;
  if (props.mode === 'single') {
    selectedKeys.value = [id]; 
    return;
  }

  if (selectionTool.value === 'marquee') {
    startMarquee(event, id);
    return;
  }

  let newSelection = [...selectedKeys.value];

  if (booleanMode.value === 'new') {
    newSelection = [id]; 
  } else if (booleanMode.value === 'toggle') {
    if (newSelection.includes(id)) {
      newSelection = newSelection.filter(k => k !== id);
    } else {
      newSelection.push(id);
    }
  } else if (booleanMode.value === 'add') {
    if (!newSelection.includes(id)) newSelection.push(id);
  } else if (booleanMode.value === 'subtract') {
    newSelection = newSelection.filter(k => k !== id);
  }

  selectedKeys.value = newSelection; 
}

function handleKeyMouseEnter(event : MouseEvent, id: number) {
  if (event.buttons !== 1) return; 

  if (props.mode === 'none') {
    emit('select', id);
    return;
  }

  if (props.mode === 'single') {
    selectedKeys.value = [id];
    emit('select', id);
    return;
  }

  if (props.mode === 'multiple' && selectionTool.value === 'swipe') {
    let newSelection = [...selectedKeys.value];
    
    if (booleanMode.value === 'new' || booleanMode.value === 'add') {
      if (!newSelection.includes(id)) newSelection.push(id);
    } else if (booleanMode.value === 'toggle') {
      if (newSelection.includes(id)) {
        newSelection = newSelection.filter(k => k !== id);
      } else {
        newSelection.push(id);
      }
    } else if (booleanMode.value === 'subtract') {
      newSelection = newSelection.filter(k => k !== id);
    }

    selectedKeys.value = newSelection;
  }
}

function handleBackgroundMouseDown(event: MouseEvent) {
  if (event.button !== 0) return;
  event.preventDefault();

  if (props.mode === 'none') return;
  if (props.mode === 'single') {
    selectedKeys.value = []; 
    return;
  }

  if (selectionTool.value === 'marquee') {
    startMarquee(event, null);
  } else {
    if (booleanMode.value === 'new') {
      selectedKeys.value = [];
    }
  }
}

// ==========================================
// 框选 (Marquee) 核心逻辑
// ==========================================
const keyboardRef = ref<HTMLElement | null>(null);
const isMarquee = ref(false);
const startX = ref(0);
const startY = ref(0);
const currentX = ref(0);
const currentY = ref(0);

let preMarqueeSelection: number[] = []; 
let startKeyId: number | null = null;
const hasMoved = ref(false); 


function startMarquee(event: MouseEvent, id: number | null) {
  if (!keyboardRef.value) return;

  const rect = keyboardRef.value.getBoundingClientRect();
  startX.value = event.clientX - rect.left;
  startY.value = event.clientY - rect.top;
  currentX.value = startX.value;
  currentY.value = startY.value;

  isMarquee.value = true;
  hasMoved.value = false;
  startKeyId = id; 

  if (booleanMode.value === 'new') {
    preMarqueeSelection = [];
  } else {
    preMarqueeSelection = [...selectedKeys.value];
  }

  window.addEventListener('mousemove', onMarqueeMove);
  window.addEventListener('mouseup', onMarqueeUp);
}

function onMarqueeMove(event: MouseEvent) {
  if (!isMarquee.value || !keyboardRef.value) return;
  
  const rect = keyboardRef.value.getBoundingClientRect();
  currentX.value = event.clientX - rect.left;
  currentY.value = event.clientY - rect.top;

  if (Math.abs(currentX.value - startX.value) > 3 || Math.abs(currentY.value - startY.value) > 3) {
    hasMoved.value = true;
  }

  if (hasMoved.value) {
    calculateMarqueeSelection();
  }
}

function onMarqueeUp() {
  if (!hasMoved.value) {
    if (startKeyId !== null) {
      let newSelection = booleanMode.value === 'new' ? [] : [...preMarqueeSelection];
      
      if (booleanMode.value === 'new') {
        newSelection = [startKeyId];
      } else if (booleanMode.value === 'toggle') {
        if (newSelection.includes(startKeyId)) {
          newSelection = newSelection.filter(k => k !== startKeyId);
        } else {
          newSelection.push(startKeyId);
        }
      } else if (booleanMode.value === 'add') {
        if (!newSelection.includes(startKeyId)) newSelection.push(startKeyId);
      } else if (booleanMode.value === 'subtract') {
        newSelection = newSelection.filter(k => k !== startKeyId);
      }

      selectedKeys.value = newSelection;
    } else {
      if (booleanMode.value === 'new') {
        selectedKeys.value = [];
      }
    }
  }

  isMarquee.value = false;
  window.removeEventListener('mousemove', onMarqueeMove);
  window.removeEventListener('mouseup', onMarqueeUp);
}

function calculateMarqueeSelection() {
  const boxLeft = Math.min(startX.value, currentX.value);
  const boxRight = Math.max(startX.value, currentX.value);
  const boxTop = Math.min(startY.value, currentY.value);
  const boxBottom = Math.max(startY.value, currentY.value);

  const newSelection = new Set(preMarqueeSelection);

  props.keys.forEach((key: any) => {
    const kLeft = key.x * usize.value;
    const kRight = (key.x + key.width) * usize.value;
    const kTop = key.y * usize.value;
    const kBottom = (key.y + key.height) * usize.value;

    let isOverlapping = false;

    if (boxLeft < kRight && boxRight > kLeft && boxTop < kBottom && boxBottom > kTop) {
      isOverlapping = true;
    }

    if (isOverlapping) {
      if (booleanMode.value === 'new' || booleanMode.value === 'add') {
        newSelection.add(key.id);
      } else if (booleanMode.value === 'toggle') {
        if (preMarqueeSelection.includes(key.id)) {
          newSelection.delete(key.id);
        } else {
          newSelection.add(key.id);
        }
      } else if (booleanMode.value === 'subtract') {
        newSelection.delete(key.id);
      }
    }
  });

  selectedKeys.value = Array.from(newSelection);
}

// ==========================================
// 其它逻辑
// ==========================================
const visibleKeys = computed(() => {
  return props.keys.filter((key: KeyConfig) => {
    if (key.layoutGroup != undefined) {
      return selectedIndices.value[key.layoutGroup.groupId] == key.layoutGroup.id;
    }
    else {
      return true;
    }
  });
});

const selectedIndices = ref<number[]>([]);

watch(() => props.layout_labels, (newLabels) => {
  if (newLabels) {
    selectedIndices.value = new Array(newLabels.length).fill(0);
  }
}, { immediate: true });

</script>

<template>
  <div style="display: grid; place-items: center; position: relative; height: 100%;">
    <div v-if="props.mode === 'multiple'" class="toolbar-container" style="position: absolute; top: 16px; left: 16px; z-index: 100; display: flex; flex-direction: column; gap: 8px;">
      
      <n-radio-group v-model:value="selectionTool" size="medium">
        <n-radio-button value="swipe">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><BrushOutline /></n-icon></div>
            </template>
            {{ t('keyboard_render_tool_swipe') }}
          </n-tooltip>
        </n-radio-button>
        <n-radio-button value="marquee">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><CropOutline /></n-icon></div>
            </template>
            {{ t('keyboard_render_tool_marquee') }}
          </n-tooltip>
        </n-radio-button>
      </n-radio-group>
      
      <n-radio-group v-model:value="booleanMode" size="medium">
        <n-radio-button value="new">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper">
                <n-icon size="18">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="5" width="14" height="14" fill="currentColor"/>
                  </svg>
                </n-icon>
              </div>
            </template>
            {{ t('keyboard_render_mode_new') }}
          </n-tooltip>
        </n-radio-button>

        <n-radio-button value="toggle">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper">
                <n-icon size="18">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M4 4H16V16H4V4ZM8 8H20V20H8V8Z" fill="currentColor"/>
                  </svg>
                </n-icon>
              </div>
            </template>
            {{ t('keyboard_render_mode_toggle') }}
          </n-tooltip>
        </n-radio-button>

        <n-radio-button value="add">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper">
                <n-icon size="18">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M4 4h12v4h4v12h-12v-4h-4z"/>
                  </svg>
                </n-icon>
              </div>
            </template>
            {{ t('keyboard_render_mode_add') }}
          </n-tooltip>
        </n-radio-button>

        <n-radio-button value="subtract">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper">
                <n-icon size="18">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M4 4h12v4H8v8H4z"/>
                    <rect x="8" y="8" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                </n-icon>
              </div>
            </template>
            {{ t('keyboard_render_mode_subtract') }}
          </n-tooltip>
        </n-radio-button>
      </n-radio-group>

      <n-button-group size="medium">
        <n-button @click="selectAll">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><SelectAllFilled /></n-icon></div>
            </template>
            {{ t('keyboard_render_action_select_all') }}
          </n-tooltip>
        </n-button>

        <n-button @click="deselectAll">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><DeselectFilled /></n-icon></div>
            </template>
            {{ t('keyboard_render_action_clear') }}
          </n-tooltip>
        </n-button>

        <n-button @click="invertSelection">
          <n-tooltip trigger="hover" :animated="false" :keep-alive-on-hover="false">
            <template #trigger>
              <div class="icon-wrapper"><n-icon size="18"><SwapHorizontalOutline /></n-icon></div>
            </template>
            {{ t('keyboard_render_action_invert') }}
          </n-tooltip>
        </n-button>
      </n-button-group>

    </div>

    <n-card @mousedown="handleBackgroundMouseDown" 
      style="width: max-content;" 
      content-style="padding: 0px;" 
      :bordered="false"
    >
      <template #action>
          <div 
            ref="keyboardRef"
            class="keyboard no-select" 
            :style="{ 
              minHeight: minHeight, 
              minWidth: minWidth, 
              transition: 'all 0.5s ease',
              position: 'relative',
              overflow: 'visible'
            }"
          >
            <TransitionGroup name="list">
              <Key 
                v-for="(key, index) in visibleKeys" 
                @mousedown="(event : MouseEvent) => handleKeyMouseDown(event, key.id)" 
                @mouseenter="(event : MouseEvent) => handleKeyMouseEnter(event, key.id)" 
                :key="key.id" :x="key.x" :y="key.y"
                :width="key.width" :height="key.height" :rotation-x="key.rotation_x" :rotation-y="key.rotation_y"
                :rotation-angle="key.rotation_angle" :labels="key.labels" :id="key.id" :color="key.color" :index="index"
                :selected="selectedKeys.includes(key.id)" 
                
                :style="{
                  opacity: (selectedKeys.length === 0 || selectedKeys.includes(key.id)) ? 1 : 0.8,
                  transition: 'opacity 0.2s ease'
                }"
              />
            </TransitionGroup>

            <div 
              v-if="props.mode === 'multiple' && isMarquee && hasMoved"
              :style="{
                position: 'absolute',
                border: '1px solid #2980b9',
                backgroundColor: 'rgba(41, 128, 185, 0.2)',
                left: Math.min(startX, currentX) + 'px',
                top: Math.min(startY, currentY) + 'px',
                width: Math.abs(currentX - startX) + 'px',
                height: Math.abs(currentY - startY) + 'px',
                pointerEvents: 'none',
                zIndex: 999
              }"
            ></div>
          </div>
      </template>
    </n-card>

    <div 
      v-if="props.layout_labels && props.layout_labels.length > 0 && props.layout_labels[0].length != 0" 
      style="position: absolute; top: 16px; right: 16px; z-index: 10;"
    >
      <n-popover placement="bottom-end" trigger="hover" :show-arrow="false">
        <template #trigger>
          <n-button secondary>
            {{ t("keyboard_render_edit_layout") }}
          </n-button>
        </template>
        <div style="width: 240px;">
          <n-flex vertical>
            <LayoutSubSelector 
              v-for="(value, index) in props.layout_labels" 
              :key="index"
              v-model:selected-index="selectedIndices[index as number]" 
              :labels="value"
            />
          </n-flex>
        </div>
      </n-popover>
    </div>
  </div>
</template>

<style scoped>
.keyboard {
  background-color: transparent;
  padding: 0px;
}
.no-select {
  user-select: none;
  -webkit-user-select: none;
}
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
}
.list-leave-active {
  position: absolute;
}

.toolbar-container {
  pointer-events: none; 
}

.toolbar-container > * {
  pointer-events: auto; 
}

.toolbar-container :deep(.n-radio-button),
.toolbar-container :deep(.n-button) {
  width: 34px !important;
  height: 34px !important;
  padding: 0 !important;
  position: relative !important;
}

.toolbar-container :deep(.n-radio-button__content),
.toolbar-container :deep(.n-button__content) {
  padding: 0 !important;
  margin: 0 !important;
}

.icon-wrapper {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 0 !important;
}
</style>