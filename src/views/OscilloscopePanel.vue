<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, shallowRef, watch, computed, nextTick, inject, type Ref } from 'vue';
import { NCard, NFlex, NSpace, NSwitch, NSelect, NButton, NSlider } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import * as apis from '@/apis/api';
import { useMainStore } from '@/store/main';
import { storeToRefs } from 'pinia';

import { connect, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkAreaComponent, DataZoomComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import * as ekc from 'emi-keyboard-controller'
import { KeyConfig } from '@/apis/utils';

// 引入 LegendComponent 以便显示图例区分不同按键
use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkAreaComponent, DataZoomComponent]);

const { t } = useI18n();
const store = useMainStore();
const { themeName } = storeToRefs(store);

interface KeyboardContext {
  keyboardKeys: Ref<KeyConfig[]>;
  advancedKeys: Ref<ekc.IAdvancedKey[]>;
  rgbConfigs: Ref<ekc.IRGBConfig[]>;
  keymap: Ref<number[][]>;
  dynamicKeys: Ref<ekc.IDynamicKey[]>;
  currentLayerIndex: Ref<number>;
  tabSelection: Ref<string | null>;
}

const { 
  advancedKeys,
  rgbConfigs, 
  keymap, 
  currentLayerIndex, 
  tabSelection,
  dynamicKeys
} = inject<KeyboardContext>('keyboardContext')!;

const props = defineProps<{
    controller: ekc.KeyboardController;
}>();

const oscilloscopeSelectedKeys = defineModel<number[]>("oscilloscopeSelectedKeys",{ 
  default: []
});

// --- 状态控制 ---
const isPolling = ref(false);
const hiddenKeys = ref<number[]>([]);
function toggleKeyVisibility(id: number) {
    if (hiddenKeys.value.includes(id)) {
        // 如果已被隐藏，则恢复显示
        hiddenKeys.value = hiddenKeys.value.filter(k => k !== id);
    } else {
        // 否则加入隐藏列表
        hiddenKeys.value.push(id);
    }
    // 强制触发一次图表重绘
    if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(renderCharts);
    }
}
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

const chartRef = ref<any>(null);
const chartOption = shallowRef({
    backgroundColor: 'transparent',
    animation: false,
    axisPointer: {
        link: [{ xAxisIndex: 'all' }]
    },
    tooltip: {
        trigger: 'axis',
        transitionDuration: 0, // 取消跟随鼠标的延迟动画
        axisPointer: { 
            type: 'line', 
            animation: false,
            lineStyle: { type: 'dashed', color: '#999' } // 鼠标虚线样式
        },
        formatter: (params: any[]) => {
            if (!params.length) return '';
            
            // 获取当前鼠标所在位置的 tick (X轴数值) 和数据索引
            const tick = params[0].value[0];
            const dataIndex = params[0].dataIndex;

            // 构建精美的提示框表格，新增 State 列
            let html = `<div style="font-size: 12px; color: #999; margin-bottom: 6px;">Tick: ${tick}</div>`;
            html += `<table style="width:100%; border-collapse: collapse; font-size: 13px; text-align: left;">`;
            html += `<tr>
                        <td style="padding-right:16px;"></td>
                        <td style="padding-right:16px; color:#888;">State</td> <td style="padding-right:16px; color:#888;">Raw</td>
                        <td style="color:#888;">Value</td>
                     </tr>`;

            // 遍历所有选中的按键，提取当前 tick 下的 State, Raw 和 Value
            oscilloscopeSelectedKeys.value.forEach((id, index) => {
                if (hiddenKeys.value.includes(id)) return;
                
                const color = lineColors[index % lineColors.length];
                let rawVal = '-';
                let valVal = '-';
                let isPressed = false; // 🚨 记录当前状态

                const rawCache = rawDataCache[id];
                const valCache = valueDataCache[id];
                const stateCache = stateAreasCache[id];

                // --- 1. 获取 Raw 和 Value 数据 ---
                // 极速匹配：利用 ECharts 给出的 dataIndex 直接从缓存中取值
                if (rawCache && rawCache[dataIndex] && rawCache[dataIndex][0] === tick) {
                    rawVal = rawCache[dataIndex][1].toString();
                } else if (rawCache) {
                    // 降级策略：如果索引错位，则回退到数组查找
                    const r = rawCache.find(d => d[0] === tick);
                    if (r) rawVal = r[1].toString();
                }

                if (valCache && valCache[dataIndex] && valCache[dataIndex][0] === tick) {
                    valVal = valCache[dataIndex][1].toFixed(4);
                } else if (valCache) {
                    const v = valCache.find(d => d[0] === tick);
                    if (v) valVal = v[1].toFixed(4);
                }

                // --- 2. 🚨 获取 State 状态 ---
                if (stateCache) {
                    // 判断当前的 tick 是否落在任何一个高亮区间内
                    isPressed = stateCache.some(area => 
                        tick >= area.start && (area.end === null || tick <= area.end)
                    );
                }

                // 状态的视觉样式：按下时显示绿色加粗的 ON，松开时显示灰色的 OFF
                const stateHtml = isPressed 
                    ? `<span style="color: #18a058; font-weight: bold;">ON</span>` 
                    : `<span style="color: #777;">OFF</span>`;

                html += `<tr>
                    <td style="padding-right:16px;">
                        <span style="display:inline-block; margin-right:6px; border-radius:50%; width:10px; height:10px; background-color:${color};"></span>
                        Key ${id}
                    </td>
                    <td style="padding-right:16px;">${stateHtml}</td> <td style="padding-right:16px; font-weight:bold;">${rawVal}</td>
                    <td style="font-weight:bold;">${valVal}</td>
                </tr>`;
            });

            html += `</table>`;
            return html;
        }
    },
    grid: [
        { left: 60, right: 40, top: '4%', height: '36%' },   // 上半部分 Raw
        { left: 60, right: 40, top: '44%', height: '36%' }   // 下半部分 Value
    ],
    xAxis: [
        {
            gridIndex: 0, // 绑定到上半部分
            type: 'value',
            scale: true,
            splitLine: { show: false },
            axisLabel: { show: false } // 隐藏上半部分的刻度数字，显得更简洁
        },
        {
            gridIndex: 1, // 绑定到下半部分
            type: 'value',
            scale: true,
            splitLine: { show: false },
            axisLabel: { formatter: (val: number) => val.toString() }
        }
    ],
    yAxis: [
        {
            gridIndex: 0,
            type: 'value',
            name: 'Raw',
            splitLine: { show: true }
        },
        {
            gridIndex: 1,
            type: 'value',
            name: 'Value',
            min: -0.1,
            max: 1.1,
            inverse: true,
            splitLine: { show: true }
        }
    ],
    dataZoom: [
        { id: 'dz-inside', type: 'inside', xAxisIndex: [0, 1] },
        { id: 'dz-slider', type: 'slider', xAxisIndex: [0, 1], bottom: 15, height: 24 } 
    ],
    series: []
});
const lineColors = ['#ff2291', '#ffd700', '#38538a', '#ff4637'];

// 当选择的按键发生变化时，清理被移除按键的缓存数据
watch(oscilloscopeSelectedKeys, (newKeys, oldKeys) => {
    const removedKeys = oldKeys.filter(k => !newKeys.includes(k));
    removedKeys.forEach(k => {
        delete rawDataCache[k];
        delete valueDataCache[k];
        delete stateAreasCache[k];
        delete lastStateCache[k];
        hiddenKeys.value = hiddenKeys.value.filter(id => id !== k);
    });
    if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(renderCharts);
    }
});

// --- 请求循环 ---
async function startRequestLoop() {
    isPolling.value = true;
    while (isPolling.value) {
        try {
            if (oscilloscopeSelectedKeys.value.length > 0) {
                props.controller.request_debug_at(oscilloscopeSelectedKeys.value);
            }
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
}

async function togglePolling(val: boolean) {
    if (val){
        await props.controller.start_debug();
        startRequestLoop();
    }
    else {
        await props.controller.stop_debug();
        isPolling.value = false;
        if (!isRenderPending) {
            isRenderPending = true;
            requestAnimationFrame(renderCharts);
        }
    } 
}
watch(themeName, () => {
    // nextTick 确保 Vue-ECharts 已经完成了旧图表的销毁和新图表的挂载
    nextTick(() => {
        if (!isRenderPending) {
            isRenderPending = true;
            requestAnimationFrame(renderCharts);
        }
    });
});
// --- 数据同步与节流渲染 ---
function processDataSync(currentTick: number, updatedKeys: number[]) {
    const numericTick = Number(currentTick);
    latestTick = numericTick;
    const minHistoryTick = numericTick - windowSize.value;

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
            let rawDrop = 0;
            while (rawDataCache[keyId].length > rawDrop && rawDataCache[keyId][rawDrop][0] < minHistoryTick) {
                rawDrop++;
            }
            if (rawDrop > 0) rawDataCache[keyId].splice(0, rawDrop);

            let valDrop = 0;
            while (valueDataCache[keyId].length > valDrop && valueDataCache[keyId][valDrop][0] < minHistoryTick) {
                valDrop++;
            }
            if (valDrop > 0) valueDataCache[keyId].splice(0, valDrop);

            let stateDrop = 0;
            while (stateAreasCache[keyId].length > stateDrop) {
                const firstArea = stateAreasCache[keyId][stateDrop];
                if (firstArea.end !== null && firstArea.end < minHistoryTick) {
                    stateDrop++;
                } else {
                    break;
                }
            }
            if (stateDrop > 0) stateAreasCache[keyId].splice(0, stateDrop);
        }
    });
}

function renderCharts() {
    const maxTick = latestTick;
    const minTick = latestTick - windowSize.value;

    const currentLegendData = oscilloscopeSelectedKeys.value.map(id => `Key ${id}`);
    // 动态生成包含 markArea 的 Series (Raw)
    const rawSeries = oscilloscopeSelectedKeys.value.map((id, index) => {
        const color = lineColors[index % lineColors.length];
        const isHidden = hiddenKeys.value.includes(id);
        return {
            id: `raw_${id}`,
            name: `Key ${id}`,
            type: 'line',
            sampling: 'lttb',
            xAxisIndex: 0,
            yAxisIndex: 0,
            showSymbol: false,
            itemStyle: { color: color },
            data: isHidden ? [] : (rawDataCache[id] || []),
            markArea: isHidden ? undefined : {
                silent: true,
                itemStyle: { opacity: 0.25 },
                data: (stateAreasCache[id] || []).map(area => [
                    { xAxis: area.start },
                    { xAxis: area.end !== null ? area.end : maxTick } 
                ])
            }
        };
    });

    // 动态生成包含 markArea 的 Series (Value)
    const valueSeries = oscilloscopeSelectedKeys.value.map((id, index) => {
        const color = lineColors[index % lineColors.length];
        const isHidden = hiddenKeys.value.includes(id);
        return {
            id: `val_${id}`,
            name: `Key ${id}`,
            type: 'line',
            sampling: 'lttb',
            xAxisIndex: 1,
            yAxisIndex: 1,
            showSymbol: false,
            itemStyle: { color: color },
            data: isHidden ? [] : (valueDataCache[id] || []),
            markArea: isHidden ? undefined : {
                silent: true,
                itemStyle: { opacity: 0.25 },
                data: (stateAreasCache[id] || []).map(area => [
                    { xAxis: area.start },
                    { xAxis: area.end !== null ? area.end : maxTick }
                ])
            }
        };
    });

    const updateOption: any = {
        series: [...rawSeries, ...valueSeries],
        tooltip: {
            backgroundColor: themeName.value === 'dark' ? 'rgba(30, 30, 34, 0.7)' : 'rgba(255, 255, 255, 0.85)',

            borderColor: themeName.value === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
        }
    };

    if (isPolling.value) {
        updateOption.dataZoom = [
            { id: 'dz-inside', startValue: minTick, endValue: maxTick },
            { id: 'dz-slider', startValue: minTick, endValue: maxTick, bottom: 15, height: 24 }
        ];
        updateOption.xAxis = [
            { min: minTick, max: maxTick },
            { min: minTick, max: maxTick }
        ];
    } else {
        updateOption.xAxis = [
            { min: 'dataMin', max: 'dataMax' },
            { min: 'dataMin', max: 'dataMax' }
        ];
    }
    
    const chart = chartRef.value?.chart || chartRef.value;
    if (chart && typeof chart.setOption === 'function') {
        chart.setOption(updateOption, { replaceMerge: ['series'] }); 
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
    connect('osc_group');
    props.controller.addEventListener('updateDebugData', handleDebugDataUpdated);
});

onBeforeUnmount(() => {
    isPolling.value = false;
    props.controller.removeEventListener('updateDebugData', handleDebugDataUpdated);
});

function clearWaveform() {
    oscilloscopeSelectedKeys.value.forEach(id => {
        if (rawDataCache[id]) rawDataCache[id].length = 0;
        if (valueDataCache[id]) valueDataCache[id].length = 0;
        if (stateAreasCache[id]) stateAreasCache[id].length = 0; // 新增清理
        if (lastStateCache[id]) lastStateCache[id] = false;     // 新增清理
    });
    
    // 强制清理视图
    if (chartRef.value?.chart) {
        const emptySeries = oscilloscopeSelectedKeys.value.flatMap(id => [
            { id: `raw_${id}`, data: [] },
            { id: `val_${id}`, data: [] }
        ]);
        chartRef.value.chart.setOption({ series: emptySeries }, { replaceMerge: ['series'] });
    }
}
</script>

<template>
    <n-card style="height: 100%; display: flex; flex-direction: column;"
        content-style="flex: 1; display: flex; flex-direction: column;">

        <n-flex :align="'center'" :size="16" style="flex-shrink: 0;">
            <div>{{ t('oscilloscope_panel_enable_debug') }}</div>
            <n-switch v-model:value="isPolling" @update:value="togglePolling">

            </n-switch>

            <n-select v-model:value="oscilloscopeSelectedKeys" multiple :max-selected-count="4" :options="keyOptions"
                style="min-width: 260px; max-width: 400px; flex: 1;" placeholder="Select keys" />

            <n-flex :align="'center'" :size="8" :wrap="false">
                <span style="white-space: nowrap;">{{ t('oscilloscope_panel_buffer_length') }}</span>
                <n-input-number  v-model:value="windowSize" :min="8000" :step="8000"/>
            </n-flex>

            <n-button @click="clearWaveform">{{ t('clear') }}</n-button>
            <div style="margin-left: auto; display: flex; gap: 16px; align-items: center; padding-right: 12px;">
                <div v-for="(id, index) in oscilloscopeSelectedKeys" :key="id" 
                     style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;"
                     @click="toggleKeyVisibility(id)">

                    <div :style="{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: hiddenKeys.includes(id) ? 'transparent' : lineColors[index % lineColors.length],
                        border: `2px solid ${lineColors[index % lineColors.length]}`,
                        transition: 'background-color 0.2s'
                    }"></div>

                    <span :style="{ 
                        color: hiddenKeys.includes(id) ? '#777' : (themeName === 'dark' ? '#ccc' : '#333'), 
                        fontSize: '13px',
                        textDecoration: hiddenKeys.includes(id) ? 'line-through' : 'none',
                        transition: 'color 0.2s'
                    }">Key {{ id }}</span>
                </div>
            </div>
        </n-flex>

        <v-chart 
            ref="chartRef" 
            :theme="themeName" 
            :option="chartOption"
            :update-options="{ replaceMerge: ['series'] }" 
            autoresize 
            style="width: 100%; height: 100%; flex: 1" 
        />
    </n-card>
</template>