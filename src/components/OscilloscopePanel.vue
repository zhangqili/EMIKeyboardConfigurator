<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, shallowRef, watch, computed } from 'vue';
import { NCard, NFlex, NSpace, NSwitch, NSelect, NButton, NSlider } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import * as apis from '../apis/api';
import { useMainStore } from '../store/main';
import { storeToRefs } from 'pinia';

import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkAreaComponent } from 'echarts/components';
import VChart from 'vue-echarts';

// 引入 LegendComponent 以便显示图例区分不同按键
use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkAreaComponent]);

const { t } = useI18n();
const store = useMainStore();
const { advancedKeys, themeName, oscilloscopeSelectedKeys, keymap } = storeToRefs(store);

// --- 状态控制 ---
const isPolling = ref(false);

// 生成 0~120 的按键选项供下拉框使用
const keyOptions = computed(()=>{
    return Array.from({ length: keymap.value[0] != undefined ? keymap.value[0].length : 0}, (_, i) => ({ label: `Key ${i}`, value: i }));
});

const windowSize = ref(8000); 
let latestTick = 0;
let isRenderPending = false;

// --- 数据缓存字典 ---
// 格式: { keyId: [[tick1, val1], [tick2, val2], ...] }
const rawDataCache: Record<number, [number, number][]> = {};
const valueDataCache: Record<number, [number, number][]> = {};

const stateAreasCache: Record<number, { start: number, end: number | null }[]> = {};
const lastStateCache: Record<number, boolean> = {};

// --- 图表配置 ---
const rawChartRef = ref<any>(null);
const valueChartRef = ref<any>(null);

// 提取公共配置项
const commonChartOptions = {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
        trigger: 'axis',
        axisPointer: { animation: false }
    },
    legend: { 
        show: true,
    },
    grid: { left: 60, right: 40, top: 40, bottom: 30 },
    xAxis: {
        type: 'value',
        scale: true,
        splitLine: { show: false },
        axisLabel: { formatter: (val: number) => val.toString() }
    }
};

const rawChartOption = shallowRef({
    ...commonChartOptions,
    yAxis: {
        type: 'value',
        name: 'Raw',
        splitLine: { show: true,}
    },
    series: []
});

const valueChartOption = shallowRef({
    ...commonChartOptions,
    yAxis: {
        type: 'value',
        name: 'Value',
        min: -0.1,
        max: 1.1,
        inverse: true, // 保持原有的反转逻辑
        splitLine: { show: true, }
    },
    series: []
});

// 当选择的按键发生变化时，清理被移除按键的缓存数据
watch(oscilloscopeSelectedKeys, (newKeys, oldKeys) => {
    const removedKeys = oldKeys.filter(k => !newKeys.includes(k));
    removedKeys.forEach(k => {
        delete rawDataCache[k];
        delete valueDataCache[k];
        delete stateAreasCache[k];
        delete lastStateCache[k];
    });
});

// --- 请求循环 ---
async function startRequestLoop() {
    isPolling.value = true;
    while (isPolling.value) {
        try {
            if (oscilloscopeSelectedKeys.value.length > 0) {
                apis.request_debug_at(oscilloscopeSelectedKeys.value);
            }
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => setTimeout(resolve, 1));
        //await new Promise(resolve => requestAnimationFrame(resolve));
    }
}

async function togglePolling(val: boolean) {
    if (val){
        await apis.start_debug();
        startRequestLoop();
    }
    else {
        await apis.stop_debug();
        isPolling.value = false;
    } 
}

// --- 数据同步与节流渲染 ---
function processDataSync(currentTick: number, updatedKeys: number[]) {
    const numericTick = Number(currentTick);
    latestTick = numericTick;
    const minTick = numericTick - windowSize.value;

    updatedKeys.forEach(keyId => {
        if (!oscilloscopeSelectedKeys.value.includes(keyId)) return;

        const targetKey = advancedKeys.value[keyId];
        if (targetKey) {
            if (!rawDataCache[keyId]) rawDataCache[keyId] = [];
            if (!valueDataCache[keyId]) valueDataCache[keyId] = [];
            if (!stateAreasCache[keyId]) stateAreasCache[keyId] = [];

            rawDataCache[keyId].push([numericTick, targetKey.raw]);
            valueDataCache[keyId].push([numericTick, targetKey.value]);

            // --- 状态边缘检测与区间记录 ---
            // 兼容 state 和 report_state 两种命名
            const isPressed = targetKey.state || (targetKey as any).report_state;
            const lastState = lastStateCache[keyId] || false;

            if (isPressed && !lastState) {
                // 刚刚按下：开启一个新的高亮区间（end 为 null 代表持续中）
                stateAreasCache[keyId].push({ start: numericTick, end: null });
            } else if (!isPressed && lastState) {
                // 刚刚松开：闭合最近的一个区间
                const areas = stateAreasCache[keyId];
                if (areas.length > 0 && areas[areas.length - 1].end === null) {
                    areas[areas.length - 1].end = numericTick;
                }
            }
            // 更新上一帧状态
            lastStateCache[keyId] = !!isPressed;

            // --- 滑动窗口清理旧数据 ---
            while (rawDataCache[keyId].length > 0 && rawDataCache[keyId][0][0] < minTick) {
                rawDataCache[keyId].shift();
            }
            while (valueDataCache[keyId].length > 0 && valueDataCache[keyId][0][0] < minTick) {
                valueDataCache[keyId].shift();
            }
            // 清理已完全移出窗口左侧的高亮区间
            while (stateAreasCache[keyId].length > 0) {
                const firstArea = stateAreasCache[keyId][0];
                if (firstArea.end !== null && firstArea.end < minTick) {
                    stateAreasCache[keyId].shift();
                } else {
                    break;
                }
            }
        }
    });
}

function renderCharts() {
    const maxTick = latestTick;
    const minTick = latestTick - windowSize.value;

    const currentLegendData = oscilloscopeSelectedKeys.value.map(id => `Key ${id}`);
    // 动态生成包含 markArea 的 Series (Raw)
    const rawSeries = oscilloscopeSelectedKeys.value.map((id, index) => {
        return {
            id: `raw_${id}`,
            name: `Key ${id}`,
            type: 'line',
            showSymbol: false,
            data: rawDataCache[id] || [],
            // 添加高亮标域
            markArea: {
                silent: true, // 忽略鼠标交互
                itemStyle: { opacity: 0.25 },
                data: (stateAreasCache[id] || []).map(area => [
                    { xAxis: area.start },
                    // 如果按键还没松开，就高亮到画面的最右边
                    { xAxis: area.end !== null ? area.end : maxTick } 
                ])
            }
        };
    });

    // 动态生成包含 markArea 的 Series (Value)
    const valueSeries = oscilloscopeSelectedKeys.value.map((id, index) => {
        return {
            id: `val_${id}`,
            name: `Key ${id}`,
            type: 'line',
            showSymbol: false,
            data: valueDataCache[id] || [],
            // 下方图表也同步高亮
            markArea: {
                silent: true,
                itemStyle: { opacity: 0.25 },
                data: (stateAreasCache[id] || []).map(area => [
                    { xAxis: area.start },
                    { xAxis: area.end !== null ? area.end : maxTick }
                ])
            }
        };
    });

    const rawChart = rawChartRef.value?.chart || rawChartRef.value;
    if (rawChart && typeof rawChart.setOption === 'function') {
        rawChart.setOption({
            legend: { ...rawChartOption.value.legend, data: currentLegendData },
            xAxis: { min: minTick, max: maxTick },
            series: rawSeries
        });
    }

    const valueChart = valueChartRef.value?.chart || valueChartRef.value;
    if (valueChart && typeof valueChart.setOption === 'function') {
        valueChart.setOption({
            legend: { ...valueChartOption.value.legend, data: currentLegendData },
            xAxis: { min: minTick, max: maxTick },
            series: valueSeries
        });
    }
    
    isRenderPending = false;
}

// --- 事件监听 ---
const handleDebugDataUpdated = (event: Event) => {
    const customEvent = event as CustomEvent;
    const currentTick = customEvent.detail.tick;
    const updatedKeys = customEvent.detail.updated_keys as number[];

    processDataSync(currentTick, updatedKeys);

    if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(renderCharts);
    }
};

onMounted(() => {
    apis.addEventListener('updateDebugData', handleDebugDataUpdated);
});

onBeforeUnmount(() => {
    isPolling.value = false;
    apis.removeEventListener('updateDebugData', handleDebugDataUpdated);
});

function clearWaveform() {
    oscilloscopeSelectedKeys.value.forEach(id => {
        if (rawDataCache[id]) rawDataCache[id].length = 0;
        if (valueDataCache[id]) valueDataCache[id].length = 0;
        if (stateAreasCache[id]) stateAreasCache[id].length = 0; // 新增清理
        if (lastStateCache[id]) lastStateCache[id] = false;     // 新增清理
    });
    
    // 强制清理视图
    if (rawChartRef.value?.chart) {
        rawChartRef.value.chart.setOption({ 
            series: oscilloscopeSelectedKeys.value.map(id => ({ id: `raw_${id}`, data: [] })) 
        });
    }
    if (valueChartRef.value?.chart) {
        valueChartRef.value.chart.setOption({ 
            series: oscilloscopeSelectedKeys.value.map(id => ({ id: `val_${id}`, data: [] })) 
        });
    }
}
</script>

<template>
    <n-card style="height: 100%; display: flex; flex-direction: column;"
        content-style="flex: 1; display: flex; flex-direction: column;">

        <n-flex align="center" :size="16" style="flex-shrink: 0;">
            <div>{{ t('oscilloscope_panel_enable_debug') }}</div>
            <n-switch v-model:value="isPolling" @update:value="togglePolling">

            </n-switch>

            <n-select v-model:value="oscilloscopeSelectedKeys" multiple :max-selected-count="4" :options="keyOptions"
                style="min-width: 260px; max-width: 400px; flex: 1;" placeholder="Select keys" />

            <n-flex align="center" :size="8" :wrap="false">
                <span style="white-space: nowrap;">{{ t('oscilloscope_panel_duration') }}</span>
                <n-input-number  v-model:value="windowSize" :min="500" :step="500"/>
            </n-flex>

            <n-button @click="clearWaveform">{{ t('clear') }}</n-button>

        </n-flex>

        <v-chart ref="rawChartRef" :theme="themeName" :option="rawChartOption"
            :update-options="{ replaceMerge: ['series'] }" autoresize style="width: 100%; height: 100%;  flex: 1" />

        <v-chart ref="valueChartRef" :theme="themeName" :option="valueChartOption"
            :update-options="{ replaceMerge: ['series'] }" autoresize style="width: 100%; height: 100%; flex: 1" />
    </n-card>
</template>