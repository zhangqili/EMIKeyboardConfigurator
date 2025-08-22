;''
<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref, provide, watch } from 'vue'
import { useMessage, darkTheme, useOsTheme, NConfigProvider, NSpace, NFlex } from 'naive-ui'
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
import VChart, { THEME_KEY } from 'vue-echarts';
import { EChartsType, SeriesOption, LegendComponentOption } from 'echarts';
import { DebugDataItem } from '../apis/utils';

use([
    CanvasRenderer,
    LineChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    SingleAxisComponent,
    GridComponent
]);

provide(THEME_KEY, 'dark');

const { t } = useI18n();
const store = useMainStore();
const { advanced_keys, debug_raw_chart_option,debug_value_chart_option,debug_switch } = storeToRefs(store);
let timer = 0;

interface AdvancedKey {
    no: number
    raw: number
    normalized: number
}

const columns: DataTableColumns<ekc.IAdvancedKey> = [
    {
        title: t('debug_panel_state'),
        key: 'state',
    },
    {
        title: t('debug_panel_raw'),
        key: 'raw',
    },
    {
        title: t('debug_panel_value'),
        key: 'value',
    },
]


function randomData(): DebugDataItem {
    now = now + oneSecond;
    value = advanced_keys.value[0].raw;
    return {
        name: now.toString(),
        value: [
            Date.now(),
            value
        ]
    };
}

let data: DebugDataItem[] = [];
let now = 1609459200000;
let oneSecond = 1;
let value = Math.random();

const chart = ref<EChartsType | null>(null)


function handleListeners() {
    debug_raw_chart_option.value.series.forEach((item, index) => {
        let data = (item.data as DebugDataItem[])
        if (data.length > 500) {
            data.shift();
        }
        data.push({
            name: Date.now().toString(),
            value: [
                Date.now(),
                advanced_keys.value[item.id as number].raw
            ]
        });
    });
    debug_value_chart_option.value.series.forEach((item, index) => {
        let data = (item.data as DebugDataItem[])
        if (data.length > 500) {
            data.shift();
        }
        data.push({
            name: Date.now().toString(),
            value: [
                Date.now(),
                advanced_keys.value[item.id as number].value
            ]
        });
    });
}

function handleChange(value: boolean) {
    if (value) {
        timer = setInterval(() => {
          apis.request_debug();
        }, 333);
    }
    else {
        if (timer > 0) {
            clearInterval(timer);
            timer = 0;
        }
    }
}


// 使用 watch 监听 advanced_keys 的变化
watch(advanced_keys, (newKeys) => {

    debug_raw_chart_option.value.series.forEach((item) => {
        const data = (item.data as DebugDataItem[]);
        if (data.length > 500) {
            data.shift();
        }
        const keyIndex = item.id as number;
        if (newKeys[keyIndex]) {
            data.push({
                name: Date.now().toString(),
                value: [Date.now(), newKeys[keyIndex].raw]
            });
        }
    });
    
    debug_value_chart_option.value.series.forEach((item) => {
        const data = (item.data as DebugDataItem[]);
        if (data.length > 500) {
            data.shift();
        }
        const keyIndex = item.id as number;
        if (newKeys[keyIndex]) {
            data.push({
                name: Date.now().toString(),
                value: [Date.now(), newKeys[keyIndex].value]
            });
        }
    });
}, { deep: true }); // 使用 deep watch 来侦听数组内部对象的变化


onBeforeUnmount(()=>{
    if (timer > 0) {
        clearInterval(timer);
        timer = 0;
    }
})

function clearCommand() {
    debug_raw_chart_option.value.series.forEach((item, index) => {
        item.data = [];
    });
    debug_value_chart_option.value.series.forEach((item, index) => {
        item.data = [];
    });
    debug_raw_chart_option.value.series = [];
    //debug_raw_chart_option.value.legend.data.length = 0;
    debug_value_chart_option.value.series = [];
    debug_raw_chart.value?.chart?.clear(); 
    debug_value_chart.value?.chart?.clear(); 
    //debug_value_chart_option.value.legend.data.length = 0;
}

const debug_raw_chart = ref<InstanceType<typeof VChart> | null>(null);
const debug_value_chart = ref<InstanceType<typeof VChart> | null>(null);

</script>

<template>
    <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        <n-scrollbar>
        <n-flex vertical>
            <n-flex>
                <div>{{ t('debug_panel_enable_debug') }}</div>
                <n-switch v-model:value="debug_switch" @update:value="handleChange"></n-switch>
            </n-flex>
            <n-flex>
                <n-button @click="clearCommand">{{ t('clear') }}</n-button>
            </n-flex>
            <n-flex>
                <n-tabs type="segment" animated>
                    <n-tab-pane name="raw_chart" :tab="t('debug_panel_raw')">
                        <v-chart ref="debug_raw_chart" :option="debug_raw_chart_option" class="chart" autoresize />
                    </n-tab-pane>
                    <n-tab-pane name="value_chart" :tab="t('debug_panel_value')">
                        <v-chart ref="debug_value_chart" :option="debug_value_chart_option" class="chart" autoresize />
                    </n-tab-pane>
                </n-tabs>
            </n-flex>
            <n-data-table :data="advanced_keys" :columns="columns" :bordered="false" />
            <!--         <n-collapse>
                <n-collapse-item title="Data table" name="0">
                </n-collapse-item>
            </n-collapse> -->
        </n-flex>

        </n-scrollbar>
    </n-card>
</template>

<style scoped>
.chart {
    height: 300px;
    background: white;
}
</style>