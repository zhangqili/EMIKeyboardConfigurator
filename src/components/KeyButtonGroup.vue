<script setup lang="ts">
import { NListItem, NThing, NButton, NFlex } from 'naive-ui';

// 接受父组件传来的配置
const props = defineProps<{
  id: string;
  title: string;
  // 以下为可选属性，如果传了 keys，就自动渲染按钮
  keys?: (string | number)[];
  activeFn?: (key: any) => boolean;
  labelFn?: (key: any) => string;
}>();

// 将点击事件抛回给父组件
const emit = defineEmits<{
  (e: 'click-key', key: any): void;
}>();
</script>

<template>
  <n-list-item :id="id">
    <n-thing :title="title">
      
      <slot name="header"></slot>

      <n-flex style="margin-top: 8px; gap: 8px;">
        
        <template v-if="keys && keys.length > 0">
          <n-button 
            v-for="k in keys" 
            :key="k"
            :type="activeFn && activeFn(k) ? 'primary' : 'default'"
            @click="emit('click-key', k)"
          >
            {{ labelFn ? labelFn(k) : k }}
          </n-button>
        </template>

        <slot></slot>

      </n-flex>
    </n-thing>
  </n-list-item>
</template>