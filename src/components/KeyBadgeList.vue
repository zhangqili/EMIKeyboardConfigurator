<script setup lang="ts">
import KeyBadge from './KeyBadge.vue';

export interface DisplayKey {
    uuid: number | string; 
    label: string;
    type?: 'success' | 'info' | 'primary' | 'default' | 'warning' | 'error'; 
    isFading?: boolean;
}

defineProps<{
    tagType?: 'success' | 'info' | 'primary' | 'default' | 'warning' | 'error'; 
    pressed: DisplayKey[];
    released: DisplayKey[];
}>();
</script>

<template>
    <KeyBadge 
        v-for="item in pressed" 
        :key="'p_' + item.uuid" 
        :label="item.label"
        :type="item.type || tagType"
        status="pressed"
    />

    <KeyBadge 
        v-for="item in released" 
        :key="'r_' + item.uuid" 
        :label="item.label"
        :type="item.type || tagType"
        :status="item.isFading ? 'fading' : 'released'"
    />
</template>