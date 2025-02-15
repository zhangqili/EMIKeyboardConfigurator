;''
<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref, provide } from 'vue'
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

interface AdvancedKey {
    no: number
    raw: number
    normalized: number
}

const columns: DataTableColumns<ekc.IAdvancedKey> = [
    {
        title: 'State',
        key: 'state',
    },
    {
        title: 'Raw Value',
        key: 'raw',
    },
    {
        title: 'Normalized Value',
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

var intervalId = 0;
function handleChange(value: boolean) {
    if (value) {
        apis.set_advanced_keys(advanced_keys.value);
        apis.start_debug();
        intervalId = setInterval(function () {
            handleListeners();
        }, 5);
    }
    else {
        clearInterval(intervalId);
        apis.stop_debug();
    }
}

onUnmounted(()=>{
    clearInterval(intervalId);
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
                <div>Enable Debug</div>
                <n-switch v-model:value="debug_switch" @update:value="handleChange"></n-switch>
            </n-flex>
            <n-flex>
                <n-button @click="clearCommand">Clear</n-button>
            </n-flex>
            <n-flex>
                <n-tabs type="segment" animated>
                    <n-tab-pane name="raw_chart" tab="Raw">
                        <v-chart ref="debug_raw_chart" :option="debug_raw_chart_option" class="chart" autoresize />
                    </n-tab-pane>
                    <n-tab-pane name="value_chart" tab="Normalized Value">
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