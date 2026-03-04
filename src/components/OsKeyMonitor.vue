<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { NCard, NFlex, NTag } from 'naive-ui';

// 使用 Set 来存储当前按下的键，天然去重（防止长按时触发连续的 keydown）
const activeKeys = ref<Set<string>>(new Set());

const handleKeyDown = (e: KeyboardEvent) => {
    // 忽略单纯的修饰键长按时可能产生的重复事件
    if (e.repeat) return; 
    
    // 使用 e.code (如 'KeyA', 'ShiftLeft') 能够无视输入法，准确反映物理按键位置
    // 你也可以换成 e.key (如 'a', 'A', 'Shift') 来显示实际字符
    const keyName = e.code; 
    
    activeKeys.value.add(keyName);
    // 强制触发 Vue 响应式更新
    activeKeys.value = new Set(activeKeys.value);
};

const handleKeyUp = (e: KeyboardEvent) => {
    activeKeys.value.delete(e.code);
    activeKeys.value = new Set(activeKeys.value);
};

// 当窗口失去焦点时（比如用 Alt+Tab 切走），清空所有按键，防止幽灵按键残留
const handleBlur = () => {
    activeKeys.value.clear();
    activeKeys.value = new Set();
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', handleBlur);
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
                    v-for="key in activeKeys" 
                    :key="key" 
                    type="info" 
                    size="large" 
                    :bordered="false"
                    style="font-weight: bold; font-size: 14px; border-radius: 6px;"
                >
                    {{ key }}
                </n-tag>
            </TransitionGroup>
            
        </n-flex>
    </n-card>
</template>

<style scoped>
.fade-leave-active {
    transition: opacity 0.5s ease-out;
}

/* 离开的最终状态是完全透明 */
.fade-leave-to {
    opacity: 0;
}
</style>