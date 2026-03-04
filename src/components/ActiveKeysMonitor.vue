<script setup lang="ts">
import { computed } from 'vue';
import { NCard, NFlex, NTag } from 'naive-ui';

// 定义传入的数据接口，只需要关心我们渲染所需的字段
interface KeyData {
    id: number;
    state: boolean;
    report_state: boolean;
    [key: string]: any; // 允许存在 raw, value 等其他字段
}

// 接收父组件传来的表格映射数据
const props = defineProps<{
    data: KeyData[];
}>();

// 实时筛选出处于按下状态的按键
const pressedKeys = computed(() => {
    if (!props.data) return [];
    return props.data.filter(row => row.state || row.report_state);
});
</script>

<template>
    <n-card 
        size="small" 
        :bordered="true"
    >
        <n-flex :size="8" style="min-height: 34px; align-items: center; position: relative;">

            <TransitionGroup name="fade">
                <n-tag 
                    v-for="key in pressedKeys" 
                    :key="key.id" 
                    type="success" 
                    size="large" 
                    :bordered="false"
                    style="font-weight: bold; font-size: 14px; border-radius: 6px;"
                >
                    Key {{ key.id }}
                </n-tag>
            </TransitionGroup>
        </n-flex>
    </n-card>
</template>

<style scoped>
/* 声明动画的持续时间和缓动曲线（使用平滑的 ease-out 替代弹跳，时间拉长到 0.4s） */
.fade-leave-active {
    transition: opacity 0.5s ease-out;
}

/* 离开的最终状态是完全透明 */
.fade-leave-to {
    opacity: 0;
}

/* 🚨 核心修改：我们彻底删除了 .pop-leave-active { position: absolute; } */
/* 这样，松开的按键在 0.4s 内会一直占据着原来的物理位置，直到完全透明消失后，
   右侧的元素才会瞬间补位。彻底杜绝了重叠和乱窜的现象！ */
</style>