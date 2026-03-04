;''
<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref, provide, watch, shallowRef,triggerRef } from 'vue'
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
import VChart from 'vue-echarts';
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

const { t } = useI18n();
const store = useMainStore();
// 只取 switch 和 advancedKeys 用于显示
// 移除 chart_option 的响应式解构，我们只在初始化时用它
const { advancedKeys, debugSwitch, themeName } = storeToRefs(store);
// 手动非响应式获取初始配置，避免 watch 开销
const rawOptionInitial = shallowRef(store.debugRawChartOption);
const valueOptionInitial = shallowRef(store.debugValueChartOption);
const isPolling = ref(false);
const TICK_WINDOW_SIZE = 40000;
let latestTick = 0;

function stopPolling() {
    isPolling.value = false;
}

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

function handleChange(value: boolean) {
    if (value) {
        startRequestLoop();
    } else {
        stopRequestLoop();
    }
}

let timer = 0;

// 表格列定义
const columns: DataTableColumns<ekc.IAdvancedKey> = [
    { title: t('debug_panel_state'), key: 'state', width: 80 },
    { title: t('debug_panel_raw'), key: 'raw', width: 100 },
    { title: t('debug_panel_value'), key: 'value', width: 100 },
]

// 关键优化 1：使用普通 JS 对象/数组存储高频数据，不要用 ref/reactive
// 这样 Vue 就不会去监听这些数据的 push/shift 操作
const localRawSeries: { [key: number]: DebugDataItem[] } = {};
const localValueSeries: { [key: number]: DebugDataItem[] } = {};

// 初始化本地数据缓存
const initLocalData = () => {
    store.debugRawChartOption.series.forEach((s: any) => {
        if (!localRawSeries[s.id]) localRawSeries[s.id] = [];
    });
    store.debugValueChartOption.series.forEach((s: any) => {
        if (!localValueSeries[s.id]) localValueSeries[s.id] = [];
    });
}
initLocalData();

// 获取 ECharts 实例引用
const rawChartRef = ref<any>(null);
const valueChartRef = ref<any>(null);

watch(
    () => store.debugRawChartOption.series.length, 
    () => {
        // 1. 为新加入的 ID 初始化本地数组缓存
        initLocalData();

        // 2. 必须告诉 ECharts 有新的 Series 定义加入了 (比如颜色、名字等配置)
        // 注意：这里只同步配置，数据会在定时器中通过 setOption 更新
        rawChartRef.value?.chart?.setOption({
            series: store.debugRawChartOption.series
        });
        valueChartRef.value?.chart?.setOption({
            series: store.debugValueChartOption.series
        });
    }
);

let isRenderPending = false;

// 独立的数据处理函数（同步执行，捕获即时状态）
function processDataSync(currentTick: number, updatedKeys: number[]) {
    const numericTick = Number(currentTick); 
    const tickStr = numericTick.toString();
    latestTick = numericTick; // 更新最新 tick 供渲染时使用
    const minTick = numericTick - TICK_WINDOW_SIZE; // 计算允许存在的最小 tick
    const keys = advancedKeys.value;

    updatedKeys.forEach(keyId => {
        // 判断当前按键是否存在于需要绘制的 raw 图表中
        const isRawTracking = store.debugRawChartOption.series.some((s: any) => s.id === keyId);
        if (isRawTracking && keys[keyId]) {
            const buffer = localRawSeries[keyId];
            if (buffer) {
                buffer.push({
                    name: tickStr,
                    value: [numericTick, keys[keyId].raw]
                });
                while (buffer.length > 0 && buffer[0].value[0] < minTick) {
                    buffer.shift();
                }
            }
        }

        // 判断当前按键是否存在于需要绘制的 value 图表中
        const isValTracking = store.debugValueChartOption.series.some((s: any) => s.id === keyId);
        if (isValTracking && keys[keyId]) {
            const buffer = localValueSeries[keyId];
            if (buffer) {
                buffer.push({
                    name: tickStr,
                    value: [numericTick, keys[keyId].value]
                });
                while (buffer.length > 0 && buffer[0].value[0] < minTick) {
                    buffer.shift();
                }
            }
        }
    });
}

// 独立的图表渲染函数（异步执行，一帧只画一次）
function renderCharts() {
// 固定的横轴起止点
    const maxTick = latestTick;
    const minTick = latestTick - TICK_WINDOW_SIZE;

    const rawSeriesUpdate = store.debugRawChartOption.series.map((s: any) => ({
        id: s.id,
        type: 'line',
        data: localRawSeries[s.id]
    }));

    const valueSeriesUpdate = store.debugValueChartOption.series.map((s: any) => ({
        id: s.id,
        type: 'line',
        data: localValueSeries[s.id]
    }));

    if (rawChartRef.value?.chart) {
        rawChartRef.value.chart.setOption({ 
            xAxis: { min: minTick, max: maxTick },
            series: rawSeriesUpdate 
        });
    }
    if (valueChartRef.value?.chart) {
        valueChartRef.value.chart.setOption({ 
            xAxis: { min: minTick, max: maxTick },
            series: valueSeriesUpdate 
        });
    }
    
    isRenderPending = false;
}

const handleDebugDataUpdated = (event: Event) => {
    const customEvent = event as CustomEvent;
    const currentTick = customEvent.detail.tick;
    // 解构出当前数据包实际更新的按键数组
    const updatedKeys = customEvent.detail.updated_keys as number[];
    
    triggerRef(advancedKeys);
    
    // 把 updatedKeys 传进去，拒绝连坐
    processDataSync(currentTick, updatedKeys);
    
    if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(renderCharts); // renderCharts 保持之前的逻辑不变即可
    }
};

onMounted(() => {
    apis.addEventListener('updateDebugData', handleDebugDataUpdated);
});

onBeforeUnmount(() => {
    stopRequestLoop();
    apis.removeEventListener('updateDebugData', handleDebugDataUpdated);
});

function clearCommand() {
    store.debugRawChartOption.series.length = 0;
    store.debugValueChartOption.series.length = 0;

    for (const key in localRawSeries) delete localRawSeries[key];
    for (const key in localValueSeries) delete localValueSeries[key];
    
    if (rawChartRef.value?.chart) {
        rawChartRef.value.chart.setOption(store.debugRawChartOption, true);
    }
    if (valueChartRef.value?.chart) {
        valueChartRef.value.chart.setOption(store.debugValueChartOption, true);
    }
}

</script>

<template>
    <n-card style="height: 100%;" content-style="flex: 1; display: flex; flex-direction: column; overflow-y: auto;">
        <n-scrollbar>
        <n-flex vertical>
            <n-flex>
                <div>{{ t('debug_panel_enable_debug') }}</div>
                <n-switch v-model:value="debugSwitch" @update:value="handleChange"></n-switch>
                <n-button @click="clearCommand">{{ t('clear') }}</n-button>
            </n-flex>
            
            <n-tabs type="segment" animated style="flex-shrink: 0;">
                <n-tab-pane name="raw_chart" :tab="t('debug_panel_raw')">
                    <v-chart ref="rawChartRef" :theme="themeName" :option="rawOptionInitial" class="chart" autoresize />
                </n-tab-pane>
                <n-tab-pane name="value_chart" :tab="t('debug_panel_value')">
                    <v-chart ref="valueChartRef" :theme="themeName" :option="valueOptionInitial" class="chart" autoresize />
                </n-tab-pane>
            </n-tabs>

            <div style="flex: 1; min-height: 0;">
                <n-data-table :data="advancedKeys" :columns="columns" :bordered="false" />
            </div>
        </n-flex>

        </n-scrollbar>
    </n-card>
</template>

<style scoped>
.chart {
    height: 300px;
    /*background: white;*/
}
</style>