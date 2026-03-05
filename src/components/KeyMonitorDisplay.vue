<script setup lang="ts">
import { NCard, NFlex } from 'naive-ui';
import KeyBadgeList, { type DisplayKey } from './KeyBadgeList.vue';

defineProps<{
    title?: string;
    tagType?: 'success' | 'info' | 'primary' | 'default' | 'warning' | 'error'; 
    pressed: DisplayKey[];
    released: DisplayKey[];
}>();
</script>

<template>
    <n-card 
        size="small" 
        :bordered="true"
    >
        <n-flex :size="8" style="min-height: 34px; align-items: center; position: relative;">
            
            <slot name="prefix"></slot>

            <div v-if="title" style="font-size: 14px; font-weight: bold; margin-right: 8px; color: #888;">
                {{ title }}
            </div>

            <span v-if="pressed.length === 0 && released.length === 0 && title" style="color: #666; font-size: 13px; font-style: italic;">
                无
            </span>

            <KeyBadgeList 
                :pressed="pressed" 
                :released="released" 
                :tag-type="tagType" 
            />

        </n-flex>
    </n-card>
</template>