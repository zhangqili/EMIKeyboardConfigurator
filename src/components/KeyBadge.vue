<script setup lang="ts">
import { NTag } from 'naive-ui';

defineProps<{
    label: string;
    type?: 'success' | 'info' | 'primary' | 'default' | 'warning' | 'error';
    // 明确定义按键的三种生命周期状态：按下、松开（残影初态）、渐出（残影消失）
    status?: 'pressed' | 'released' | 'fading'; 
}>();
</script>

<template>
    <n-tag 
        :type="type || 'default'" 
        :bordered="false"
        style="font-weight: bold;"
        :class="{
            'is-ghost': status === 'released' || status === 'fading',
            'is-fading': status === 'fading'
        }"
    >
        <slot>{{ label }}</slot>
    </n-tag>
</template>

<style scoped>
/* 压榨到极致的动画管理，只在松开和渐出状态时挂载动画类 */
.is-ghost {
    transition: opacity 0.4s ease-out;
    opacity: 0.5; /* 松开瞬间的基础透明度 */
}

.is-fading {
    opacity: 0;   /* 最终消失时的透明度 */
}
</style>