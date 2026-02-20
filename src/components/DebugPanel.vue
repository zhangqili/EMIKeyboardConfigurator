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
// 只取 switch 和 advancedKeys 用于显示
// 移除 chart_option 的响应式解构，我们只在初始化时用它
const { advancedKeys, debugSwitch } = storeToRefs(store);
// 手动非响应式获取初始配置，避免 watch 开销
const rawOptionInitial = shallowRef(store.debugRawChartOption);
const valueOptionInitial = shallowRef(store.debugValueChartOption);
const isPolling = ref(false);

async function startAdaptivePolling() {
    isPolling.value = true;
    console.log("start pollinh");
    while (isPolling.value) {
        const start = performance.now();
        
        try {
            // 1. 发起全量请求
            // 因为我们在 controller 里用了 Promise.all，这行代码会等到 16 个包全部回来才继续
            await apis.request_debug();
            triggerRef(advancedKeys);
            
            // 2. 数据全部到位，只更新一次 UI
            // 使用 requestAnimationFrame 避免在不可见时浪费资源
            requestAnimationFrame(() => {
                updateCharts();
            });

            // 3. 性能监控 (可选)
            const cost = performance.now() - start;
            console.log(`Frame cost: ${cost.toFixed(2)}ms, FPS: ${(1000/cost).toFixed(0)}`);
            
        } catch (e) {
            console.error("Polling disrupted:", e);
            // 出错时稍微缓一缓，避免死循环卡死浏览器
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}
function stopPolling() {
    isPolling.value = false;
}

function handleChange(value: boolean) {
    if (value) {
        startAdaptivePolling();
    } else {
        stopPolling();
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

function updateCharts() {
    const nowStr = Date.now().toString();
    const timestamp = Date.now();
    const keys = advancedKeys.value;

    // 辅助函数：只处理数据，不触碰 Vue 响应式对象
    const processData = (localBuffer: any, keyName: 'raw' | 'value') => {
        const newSeriesData: any[] = [];
        
        // 遍历所有需要显示的系列
        store.debugRawChartOption.series.forEach((seriesConfig: any, index: number) => {
            const keyId = seriesConfig.id as number;
            
            // 确保该 key 存在
            if (keys[keyId]) {
                const buffer = localBuffer[keyId];
                if (!buffer) return;

                // 纯数组操作，极快
                if (buffer.length > 500) buffer.shift();
                
                buffer.push({
                    name: nowStr,
                    value: [timestamp, keys[keyId][keyName]]
                });

                // 构造 ECharts 增量更新所需的 series 对象
                // 注意：这里我们只更新 data 字段，复用 store 里的其他配置
                newSeriesData.push({
                    data: buffer 
                });
            }
        });
        return newSeriesData;
    };

    const rawSeriesUpdate = processData(localRawSeries, 'raw');
    const valueSeriesUpdate = processData(localValueSeries, 'value');

    if (rawChartRef.value?.chart) {
        rawChartRef.value.chart.setOption({ series: rawSeriesUpdate });
    }
    if (valueChartRef.value?.chart) {
        valueChartRef.value.chart.setOption({ series: valueSeriesUpdate });
    }
}

onBeforeUnmount(() => {
    stopPolling();
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
                    <v-chart ref="rawChartRef" :option="rawOptionInitial" class="chart" autoresize />
                </n-tab-pane>
                <n-tab-pane name="value_chart" :tab="t('debug_panel_value')">
                    <v-chart ref="valueChartRef" :option="valueOptionInitial" class="chart" autoresize />
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