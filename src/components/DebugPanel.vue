;''
<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref, provide, watch, shallowRef,triggerRef, h } from 'vue'
import { useMessage, darkTheme, useOsTheme, NConfigProvider, NSpace, NFlex, NTag } from 'naive-ui'
import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";
import type { DataTableColumns } from 'naive-ui'
import * as apis from '../apis/api';
import * as ekc from 'emi-keyboard-controller';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../store/main';

import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, PieChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    SingleAxisComponent,
    GridComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import { EChartsType, SeriesOption, LegendComponentOption } from 'echarts';
import { DebugDataItem } from '../apis/utils';
import KeyEditCell from './KeyEditCell.vue';

use([
    CanvasRenderer,
    LineChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    SingleAxisComponent,
    GridComponent
]);

const { t } = useI18n();
const store = useMainStore();
// 只取 switch 和 advancedKeys 用于显示
// 移除 chart_option 的响应式解构，我们只在初始化时用它
const { advancedKeys, debugSwitch, themeName, keyBinding, keyEvent, isVirtual, useKeymap } = storeToRefs(store);
// 手动非响应式获取初始配置，避免 watch 开销
const isPolling = ref(false);


async function startRequestLoop() {
    isPolling.value = true;
    while (isPolling.value) {
        try {
            // 只管发请求，不需要在这里等待返回值处理 UI
            await apis.request_debug();
        } catch (e) {
            console.error("Request disrupted:", e);
            await new Promise(resolve => setTimeout(resolve, 100)); // 错误退避
        }
        // 控制请求频率，可根据下位机性能调整
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
}

function stopRequestLoop() {
    isPolling.value = false;
}

async function handleChange(value: boolean) {
    if (value) {
        //await apis.start_debug();
        startRequestLoop();
    } else {
        //await apis.stop_debug();
        stopRequestLoop();
    }
}

let timer = 0;

// 表格列定义
const columns: DataTableColumns<ekc.IAdvancedKey> = [
    { title: t('debug_panel_index'), key: 'id', width: 40 },
    { title: t('debug_panel_state'), key: 'state', width: 40,
        render(row) {
            return h(
                NTag,
                {
                    // 按下时显示绿色(success)，松开时显示灰色(default)
                    type: row.state ? 'success' : 'default',
                    size: 'small',
                    bordered: false,
                    style: { width: '40px', justifyContent: 'center' }
                },
                { default: () => (row.state ? 'ON' : 'OFF') }
            )
        }
    },
    { title: t('debug_panel_report_state'), key: 'report_state', width: 40,
        render(row) {
            return h(
                NTag,
                {
                    type: row.report_state ? 'info' : 'default',
                    size: 'small',
                    bordered: false,
                    style: { width: '40px', justifyContent: 'center' }
                },
                { default: () => (row.report_state ? 'ON' : 'OFF') }
            )
        }
    },
    { title: t('debug_panel_raw'), key: 'raw', width: 100 },
    { title: t('debug_panel_value'), key: 'value', width: 100,
        render(row) {
            if (typeof row.value === 'number') {
                return row.value.toFixed(3);
            }
            return row.value;
        } },
]

const tableData = ref<any[]>([]);

const handleDebugDataUpdated = (event: Event) => {
    const customEvent = event as CustomEvent;
    const currentTick = customEvent.detail.tick;
    // 解构出当前数据包实际更新的按键数组
    const updatedKeys = customEvent.detail.updated_keys as number[];
    triggerRef(advancedKeys);
    const newTableData = [...tableData.value];
    
    // 2. 遍历本次真实收到更新的按键
    updatedKeys.forEach(id => {
        const rawKey = advancedKeys.value[id];
        if (rawKey) {
            newTableData[id] = {
                ...newTableData[id],
                state: rawKey.state,
                report_state: rawKey.report_state,
                raw: rawKey.raw,
                value: rawKey.value
            };
        }
    });
    
    // 3. 赋值回本地 ref，精准触发表格刷新
    tableData.value = newTableData;
};

onMounted(() => {
    tableData.value = advancedKeys.value.map((k, index) => ({
        id: index,
        state: k.state,
        report_state: k.report_state,
        raw: k.raw,
        value: k.value
    }));
    apis.addEventListener('updateDebugData', handleDebugDataUpdated);
});

onBeforeUnmount(() => {
    stopRequestLoop();
    apis.removeEventListener('updateDebugData', handleDebugDataUpdated);
});

</script>

<template>
    <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        <n-scrollbar>
        <n-flex vertical>

            <n-flex :align="'center'" :size="16" style="margin-bottom: 12px; flex-shrink: 0; ">
                <span>{{ t('debug_panel_enable_debug') }}</span>
                <n-switch v-model:value="debugSwitch" @update:value="handleChange"></n-switch>
                <n-divider vertical></n-divider>
                <div class="keyboard no-select" style="height: 54px; width: 54px;">
                    <KeyEditCell :width="1" :height="1" :x="0" :y="0" v-model:value="keyBinding"></KeyEditCell>
                </div>
                <n-input-number v-model:value="keyBinding"></n-input-number>
                <n-select 
                  v-model:value="keyEvent"
                  :options="[{ label: t('key_press') || 'Press', value: 3 }, { label: t('key_release') || 'Release', value: 1 }]"
                  style="width: 320px;"
                />
                <n-checkbox 
                  v-model:checked="isVirtual" 
                >
                    {{ t('debug_panel_is_virtual') }}
                </n-checkbox>
                <n-checkbox 
                  v-model:checked="useKeymap" 
                >
                    {{ t('debug_panel_use_keymap') }}
                </n-checkbox>
            </n-flex>
            <div style="flex: 1; min-height: 0;">
                <n-data-table :data="tableData" :columns="columns" :bordered="false" />
            </div>
        </n-flex>

        </n-scrollbar>
    </n-card>
</template>

<style scoped>
</style>