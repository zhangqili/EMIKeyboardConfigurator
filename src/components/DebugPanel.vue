;''
<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import { useMessage, darkTheme, useOsTheme, NConfigProvider, NSpace, NFlex } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import type { DataTableColumns } from 'naive-ui'
import * as apis from '../apis/api';
import * as ekc from 'emi-keyboard-controller';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';

const { t } = useI18n();
const store = useMainStore();
const {advanced_keys} = storeToRefs(store);


interface AdvancedKey{
    no: number
    raw: number
    normalized: number
}

const columns : DataTableColumns<ekc.IAdvancedKey> = [
    {
        title : 'State',
        key : 'state',
    },
    {
        title : 'Raw Value',
        key : 'raw',
    },
    {
        title : 'Normalized Value',
        key : 'value',
    },
]

onMounted(()=>{
    apis.start_debug();
    //console.log("onMounted");
})

onUnmounted(()=>{
    apis.stop_debug();
    //console.log("onUnmounted");
})

</script>

<template>
    <n-space vertical>
        <n-data-table :data="advanced_keys" :columns="columns" :bordered="false" />
<!--         <n-collapse>
            <n-collapse-item title="Data table" name="0">
            </n-collapse-item>
        </n-collapse> -->
    </n-space>
</template>

<style></style>