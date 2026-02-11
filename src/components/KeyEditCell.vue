<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { NButton, NModal, NCard, NScrollbar } from 'naive-ui';
import KeySelector from './KeySelector.vue';
import { keyCodeToKeyName, keyCodeToStringLabels } from "../apis/utils"; // 假设你有这个工具

const props = defineProps<{
  value: number
}>();

const emit = defineEmits<{
  (e: 'update:value', value: number): void
}>();

const showModal = ref(false);
// 【关键】本地缓冲值，防止编辑中途触发父组件逻辑
const internalBinding = ref(0);

// 监听模态框开关状态来实现“打开加载，关闭保存”
watch(showModal, (isOpen) => {
  if (isOpen) {
    // 打开时：从 props 复制值到本地
    internalBinding.value = props.value;
  } else {
    // 关闭时：比较是否有变化，如果有，提交给父组件
    // 此时父组件才会收到信号，判断是删除还是添加
    if (internalBinding.value !== props.value) {
      emit('update:value', internalBinding.value);
    }
  }
});

const displayKeyName = computed(() => {
  const code = props.value & 0xFF;
  // 简单显示，建议使用你的 keyCodeToKeyName(code)
  return code === 0 ? "点击配置" : `Key: ${code}`;
});
</script>

<template>
  <div class="key-edit-cell" style="height: 54px;">
    <PlainKey :width="1" :height="1" :x=0
      :labels="keyCodeToStringLabels(props.value)"
      @click="showModal = true"></PlainKey>

    <n-modal 
      v-model:show="showModal"
      :mask-closable="true"
    >
      <n-card
        style="width: 900px; max-width: 95vw; height: 85vh; display: flex; flex-direction: column;"
        title="按键配置"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        content-style="padding: 0; display: flex; flex-direction: column; overflow: hidden;"
      >
        <template #header-extra>
           <n-button circle text @click="showModal = false" style="font-size: 20px;">✕</n-button>
        </template>

        <div style="flex: 1; overflow: hidden; padding: 12px;">
           <n-scrollbar>
            <KeyTracker v-model:binding="internalBinding"></KeyTracker>
            <n-divider></n-divider>
            <KeySelector v-model:binding="internalBinding" />
           </n-scrollbar>
        </div>

        <template #footer>
           <div style="display: flex; justify-content: flex-end;">
             <n-button type="primary" @click="showModal = false">完成</n-button>
           </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>