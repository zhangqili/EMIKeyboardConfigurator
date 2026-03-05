<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { keyboardEventToHidCodeMap, keyCodeToKeyName } from "@/apis/utils"
import { storeToRefs } from 'pinia';
import { useMainStore } from '@/store/main';
import { useI18n } from 'vue-i18n';
import KeyBadgeList, { type DisplayKey } from './KeyBadgeList.vue';

const { t } = useI18n();
const store = useMainStore();
const { keyBinding, currentLayerIndex } = storeToRefs(store);

const modifierKeys = ref<string[]>([]);
const regularKey = ref<string>('NoEvent');
const modifierKeysList = ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'];

const mouseButtonMap: Record<number, number> = {
  0: 0, 1: 2, 2: 1, 3: 4, 4: 3, 
};

const props = defineProps<{ binding: number }>();
const emit = defineEmits(['update:binding']);

const isMouseAction = computed(() => regularKey.value?.startsWith('Mouse'));

const formatKeyName = (code: string | undefined) => {
  if (code?.startsWith('Mouse')) return code.replace(/([A-Z])/g, ' $1').trim(); 
  
  const modMap: Record<string, string> = {
    ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl',
    ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift',
    AltLeft: 'L-Alt', AltRight: 'R-Alt',
    MetaLeft: 'L-Win', MetaRight: 'R-Win',
  };
  if (code && modMap[code]) return modMap[code];

  const hid = keyboardEventToHidCodeMap[code || ''];
if (hid !== undefined && keyCodeToKeyName[hid as keyof typeof keyCodeToKeyName]) {
    return keyCodeToKeyName[hid as keyof typeof keyCodeToKeyName];
  }
  return (code || '').replace('Key', '').replace('Digit', '');
};

// 🚨 核心组装：把零散的按键状态转换为公共组件能够接收的数据流格式
const displayKeys = computed<DisplayKey[]>(() => {
  const keys: DisplayKey[] = [];
  
  // 1. 压入修饰键（蓝色）
  if (!isMouseAction.value) {
    modifierKeys.value.forEach((mod, index) => {
      keys.push({
        uuid: `mod_${index}`,
        label: formatKeyName(mod),
        type: 'info'
      });
    });
  }
  
  // 2. 压入主按键（根据状态动态变色）
  keys.push({
    uuid: 'main_reg',
    label: formatKeyName(regularKey.value),
    type: regularKey.value === 'NoEvent' ? 'default' : (isMouseAction.value ? 'primary' : 'success')
  });
  
  return keys;
});

const updateKeyBinding = () => {
  let binding = 0;
  modifierKeys.value.forEach((item) => {
    binding |= ((1 << (keyboardEventToHidCodeMap[item] & 0xF)) << 8)
  });
  
  const hidCode = keyboardEventToHidCodeMap[regularKey.value] || 0;
  emit('update:binding', binding | hidCode);
};

const MOUSE_COLLECTION = 0xA5;

const updateMouseBinding = (mouseKeycode: number, displayName: string) => {
  modifierKeys.value = []; 
  regularKey.value = displayName;
  const binding = (mouseKeycode << 8) | MOUSE_COLLECTION;
  emit('update:binding', binding);
};

// --- 原有的事件处理逻辑保持完全不变 ---
const handleKeyDown = (event: KeyboardEvent) => {
  event.preventDefault();
  const code = event.code;
  if (isMouseAction.value) regularKey.value = 'NoEvent';

  if (modifierKeysList.includes(code)) {
    if (!modifierKeys.value.includes(code)) modifierKeys.value.push(code);
  } else {
    regularKey.value = code;
  }
  updateKeyBinding();
};

const handleKeyUp = (event: KeyboardEvent) => {};

const handleMouseDown = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('button')) return; 
  event.preventDefault(); 
  const code = mouseButtonMap[event.button];
  if (code !== undefined) {
    const displayNames: Record<number, string> = { 0: 'MouseLeft', 1: 'MouseRight', 2: 'MouseMiddle', 3: 'MouseForward', 4: 'MouseBackward' };
    updateMouseBinding(code, displayNames[code]);
  }
};

const handleWheel = (event: WheelEvent) => {
  event.preventDefault(); 
  let mouseCode = -1;
  let name = '';
  if (event.deltaY < 0) { mouseCode = 5; name = 'MouseWheelUp'; } 
  else if (event.deltaY > 0) { mouseCode = 6; name = 'MouseWheelDown'; } 
  else if (event.deltaX < 0) { mouseCode = 7; name = 'MouseWheelLeft'; } 
  else if (event.deltaX > 0) { mouseCode = 8; name = 'MouseWheelRight'; }

  if (mouseCode !== -1) updateMouseBinding(mouseCode, name);
};

const handleMouseUp = (event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('button')) return;
  event.preventDefault();
};
const handleContextMenu = (event: Event) => { event.preventDefault(); };

function clear() {
  modifierKeys.value.length = 0;
  regularKey.value = "NoEvent";
  emit('update:binding', 0);
}

function handleMouseEnter() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('wheel', handleWheel, { passive: false });
}

function handleMouseLeave() {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('contextmenu', handleContextMenu);
  window.removeEventListener('wheel', handleWheel);
}

onBeforeUnmount(() => { handleMouseLeave(); });
</script>

<template>
  <div @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave" style="cursor: crosshair;">
    <n-flex vertical :size="12">
        
      <n-flex :size="8" align="center" style="min-height: 34px;">
        <n-button @click="clear" size="small" type="error" secondary>
          {{ t("clear") }}
        </n-button>
        <n-divider vertical style="margin: 0 4px;" />
        
        <KeyBadgeList 
          :pressed="displayKeys"
          :released="[]"
        />
      </n-flex>
      
      <n-card style="height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
        <span style="font-size: 14px;">{{ t('key_tracker_desc') }}</span>
      </n-card>
      
    </n-flex>
  </div>
</template>