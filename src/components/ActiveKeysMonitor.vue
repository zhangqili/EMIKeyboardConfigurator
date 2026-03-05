<script setup lang="ts">
import { ref, watch } from 'vue';
import KeyMonitorDisplay from './KeyMonitorDisplay.vue';
import type { DisplayKey } from './KeyBadgeList.vue';

interface KeyData {
    id: number;
    state: boolean;
    report_state: boolean;
    [key: string]: any; 
}

const props = defineProps<{
    data: KeyData[];
}>();

// 扩展 DisplayKey 以记录硬件物理 ID
interface HardwareKeyRecord extends DisplayKey {
    id: number; 
}

const pressedKeys = ref<HardwareKeyRecord[]>([]);
const releasedKeys = ref<HardwareKeyRecord[]>([]);
let globalId = 0;

watch(() => props.data, (newData) => {
    if (!newData) return;

    const currentActiveIds = newData
        .filter(row => row.state || row.report_state)
        .map(row => row.id);

    // 1. 模拟 KeyUp
    for (let i = pressedKeys.value.length - 1; i >= 0; i--) {
        const tk = pressedKeys.value[i];
        if (!currentActiveIds.includes(tk.id)) {
            pressedKeys.value.splice(i, 1);
            
            tk.isFading = false;
            releasedKeys.value.unshift(tk);

            setTimeout(() => { tk.isFading = true; }, 20);
            const currentUuid = tk.uuid;
            setTimeout(() => {
                releasedKeys.value = releasedKeys.value.filter(k => k.uuid !== currentUuid);
            }, 500);
        }
    }

    // 2. 模拟 KeyDown
    currentActiveIds.forEach(id => {
        const isAlreadyPressed = pressedKeys.value.some(k => k.id === id);
        if (!isAlreadyPressed) {
            const ghostIndex = releasedKeys.value.findIndex(k => k.id === id);
            if (ghostIndex !== -1) {
                releasedKeys.value.splice(ghostIndex, 1);
            }

            pressedKeys.value.unshift({
                uuid: globalId++,
                id: id,
                label: `Key ${id}` // 组装硬件显示的文本
            });
        }
    });
}, { deep: true, immediate: true }); 
</script>

<template>
    <KeyMonitorDisplay 
        tag-type="success"
        :pressed="pressedKeys"
        :released="releasedKeys"
    />
</template>