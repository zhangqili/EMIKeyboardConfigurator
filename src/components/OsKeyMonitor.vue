<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import KeyMonitorDisplay from './KeyMonitorDisplay.vue';
import type { DisplayKey } from './KeyBadgeList.vue';

// 扩展 DisplayKey 接口以记录系统键值特有的 code 属性，方便查找
interface OsKeyRecord extends DisplayKey {
    code: string; 
}

const pressedKeys = ref<OsKeyRecord[]>([]);
const releasedKeys = ref<OsKeyRecord[]>([]);
let globalId = 0; 

const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return; 
    const ghostIndex = releasedKeys.value.findIndex(k => k.code === e.code);
    if (ghostIndex !== -1) {
        releasedKeys.value.splice(ghostIndex, 1);
    }
    
    if (!pressedKeys.value.some(k => k.code === e.code)) {
        pressedKeys.value.unshift({
            uuid: globalId++,
            code: e.code,
            label: e.code // 直接显示 code
        });
    }
};

const handleKeyUp = (e: KeyboardEvent) => {
    const index = pressedKeys.value.findIndex(k => k.code === e.code);
    if (index !== -1) {
        const keyRecord = pressedKeys.value[index];
        pressedKeys.value.splice(index, 1);

        keyRecord.isFading = false;
        releasedKeys.value.unshift(keyRecord); 
        
        setTimeout(() => { keyRecord.isFading = true; }, 20);
        setTimeout(() => {
            releasedKeys.value = releasedKeys.value.filter(k => k.uuid !== keyRecord.uuid);
        }, 500);
    }
};

const handleBlur = () => {
    pressedKeys.value.forEach(keyRecord => {
        keyRecord.isFading = false;
        releasedKeys.value.unshift(keyRecord);
        
        setTimeout(() => { keyRecord.isFading = true; }, 20);
        setTimeout(() => {
            releasedKeys.value = releasedKeys.value.filter(k => k.uuid !== keyRecord.uuid);
        }, 500);
    });
    pressedKeys.value = [];
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
    <KeyMonitorDisplay 
        tag-type="info"
        :pressed="pressedKeys"
        :released="releasedKeys"
    />
</template>