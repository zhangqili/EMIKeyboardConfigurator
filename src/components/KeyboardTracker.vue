<script setup lang="ts">
import { ref } from 'vue';
import {keyboardEventToHidCodeMap} from "../apis/utils"

const modifierKeys = ref<string[]>([]);
const regularKey = ref<string>();
const modifierKeysList = ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'];

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
}

// 监听键盘事件
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// 清理事件监听器
import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});
</script>

<template>
  <div>
    <n-button @click="clear">Clear</n-button>
    <div>
      <n-button strong secondary v-for="(key, index) in modifierKeys">
        {{ key }}
      </n-button>
      <n-button strong secondary>{{ regularKey || 'NoEvent' }}</n-button>
    </div>
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
