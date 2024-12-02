;''
<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import { useMessage, darkTheme, useOsTheme, NConfigProvider, NSpace, NFlex } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import type { DataTableColumns } from 'naive-ui'
import * as apis from '../apis/api';

const { t } = useI18n();

const mode = ref<number | null>(0);

interface AdvancedKey{
    no: number
    raw: number
    normalized: number
}

const columns : DataTableColumns<AdvancedKey> = [
    {
        title : 'Key',
        key : 'key',
    },
    {
        title : 'Raw Value',
        key : 'raw',
    },
    {
        title : 'Normalized Value',
        key : 'normalized',
    },
]

onMounted(()=>{
    apis.start_debug();
    apis.receive_data_in_background();
    console.log("onMounted");
})

onUnmounted(()=>{
    apis.stop_debug();
    console.log("onUnmounted");
})

</script>

<template>
    <n-space vertical>
        <n-collapse>
            <n-collapse-item title="Data table" name="0">
                <n-data-table :columns="columns" :bordered="false" />
            </n-collapse-item>
        </n-collapse>
    </n-space>
</template>

<style></style>