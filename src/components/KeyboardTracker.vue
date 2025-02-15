<script setup lang="ts">
import { ref } from 'vue';
import {keyboardEventToHidCodeMap} from "../apis/utils"
import { onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';

const store = useMainStore();
const {key_binding, current_layer} = storeToRefs(store);

const modifierKeys = ref<string[]>([]);
const regularKey = ref<string>();
const modifierKeysList = ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'];

const props = defineProps<{ binding: number }>();
const emit = defineEmits(['update:binding']);

const handleKeyDown = (event: KeyboardEvent) => {
  const code = event.code;

  if (modifierKeysList.includes(code)) {
    // 将修饰符键添加到修饰符列表
    if (!modifierKeys.value.includes(code)) {
      modifierKeys.value.push(code);
    }
  } else {
    regularKey.value = code;
  }
  
  var binding = 0;
  modifierKeys.value.forEach((item) =>
  {
    binding |= ((1 << (keyboardEventToHidCodeMap[item] & 0xF)) << 8 )
  })
  emit('update:binding', binding | keyboardEventToHidCodeMap[code]);
};

const handleKeyUp = (event: KeyboardEvent) => {
  const code = event.code;

  if (modifierKeysList.includes(code)) {
    //modifierKeys.value = modifierKeys.value.filter(key => key !== code);
  } else {
    regularKey.value = regularKey.value;
  }
};

function clear()
{
    modifierKeys.value.length = 0;
    regularKey.value = "NoEvent";
    emit('update:binding', 0);
}

function handleMouseEnter() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}

function handleMouseLeave() {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
}
// 监听键盘事件

// 清理事件监听器
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});
</script>

<template>
  <div @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <n-flex vertical>
      <div>
        <n-button @click="clear">Clear</n-button>
        <n-button strong secondary v-for="(key, index) in modifierKeys">
          {{ key }}
        </n-button>
        <n-button strong secondary>{{ regularKey || 'NoEvent' }}</n-button>
      </div>
      <n-card style="height: 100px;">
        Press any key here
      </n-card>
    </n-flex>
  </div>
</template>

<style scoped>
h3 {
  margin-bottom: 5px;
  font-size: 1.2rem;
}
p {
  margin: 0;
  font-size: 1rem;
}
</style>
