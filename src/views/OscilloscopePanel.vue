<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, shallowRef, watch, computed, nextTick, inject, type Ref } from 'vue';
import { NButton, NCollapse, NCollapseItem, NIcon, NInputNumber, NSelect, NSwitch, NTooltip } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useMainStore } from '@/store/main';
import { storeToRefs } from 'pinia';
import { ClearAllOutlined, StraightenOutlined } from '@vicons/material';

import { connect, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { HeatmapChart, LineChart } from 'echarts/charts';
import { AxisPointerComponent, TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkAreaComponent, DataZoomComponent, MarkLineComponent, VisualMapComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import * as ekc from 'emi-keyboard-controller'
import { KeyConfig } from '@/apis/utils';
import { calculateStats } from './oscilloscope/analysis';
import {
    buildChartLayout,
    buildDigitalTrackData,
    formatStateHtml,
    getCacheValueAtTick,
    getDigitalTrackValue,
    type DigitalSample
} from './oscilloscope/chart';
import {
    SPECTRUM_ESTIMATION_ALPHA,
    SPECTRUM_ESTIMATION_MAX_RATE_HZ,
    SPECTRUM_ESTIMATION_MIN_INTERVAL_MS,
    SPECTRUM_ESTIMATION_MIN_RATE_HZ,
    SPECTRUM_ESTIMATION_MIN_TICK_DELTA,
    SPECTRUM_FALLBACK_SAMPLE_RATE_HZ,
    SPECTRUM_QUALITY_WARNING_THRESHOLD,
    buildUniformSpectrumWindow,
    calculateSpectrum,
    formatFrequency,
    formatFrequencyShort,
    formatPercent,
    formatSampleRate,
    formatSpectrumMagnitude,
    quantizeSpectrumSampleRate,
    type SpectrumPeakInfo,
    type SpectrumScale,
    type SpectrumSource
} from './oscilloscope/spectrum';
import {
    WATERFALL_AVERAGE_WINDOW_FRAME_COUNTS,
    WATERFALL_FRAME_RATE_HZ,
    WATERFALL_FREQUENCY_BUCKET_COUNT,
    WATERFALL_MAX_BUFFER_FRAMES,
    WATERFALL_MAX_FRAMES,
    WATERFALL_MIN_BUFFER_FRAMES,
    WATERFALL_VISIBLE_ROWS,
    appendWaterfallFrame,
    calibrateWaterfallColorRange,
    cloneWaterfallFrame,
    createWaterfallAverageAccumulator,
    createWaterfallFrame,
    isWaterfallCaptureReady,
    isWaterfallFrameCompatible,
    normalizeWaterfallBufferSize,
    resizeWaterfallHistory,
    shouldCaptureWaterfallFrame,
    type WaterfallAverageSpectrum,
    type WaterfallAverageWindow,
    type WaterfallColorRange,
    type WaterfallFrame
} from './oscilloscope/waterfall';

// 引入 LegendComponent 以便显示图例区分不同按键
use([CanvasRenderer, LineChart, HeatmapChart, AxisPointerComponent, TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkAreaComponent, DataZoomComponent, MarkLineComponent, VisualMapComponent]);

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

const oscilloscopeSelectedKeys = defineModel<number[]>("oscilloscopeSelectedKeys", {
    default: []
});
const selectedKeys = defineModel<number[]>("selectedKeys", {
    default: () => []
});
watch(oscilloscopeSelectedKeys, (newVal) => {
    selectedKeys.value = [...newVal];
}, { immediate: true, deep: true });
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
    scheduleSpectrumRender();
}
const isMeasuring = ref(false);
const measurePoints = ref<Record<number, {x: number, y: number}[]>>({ 0: [], 1: [] });
const hoverPoint = ref<{x: number, y: number, gridIndex: number} | null>(null);
const isHoveringPoint = ref(false);
const dragInfo = ref<{ gridIndex: number, pointIndex: number } | null>(null);
let isDraggingAction = false;       // 用于区分“点击”和“拖拽结束”，防止事件冲突

watch([isHoveringPoint, dragInfo], ([hovering, drag]) => {
    const chart = chartRef.value?.chart;
    if (chart) {
        const disabled = hovering || drag !== null;
        chart.setOption({
            dataZoom: [
                { id: 'dz-inside', disabled },
                { id: 'dz-y-inside-raw', disabled },
                { id: 'dz-y-inside-val', disabled }
            ]
        });
    }
});
async function toggleMeasureMode() {
    isMeasuring.value = !isMeasuring.value;
    
    // 如果开启测量时正在轮询，自动暂停波形以便于点击测量
    if (isMeasuring.value && isPolling.value) {
        await togglePolling(false);
    }
    
    // 关闭测量时清空画线
    if (!isMeasuring.value) {
        measurePoints.value = { 0: [], 1: [] };
        hoverPoint.value = null;
    }
    
    if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(renderCharts);
    }
}

// 1. 鼠标【按下】：检测是否点在了已有光标点上
function handleChartMouseDown(params: any) {
    if (!isMeasuring.value) return;
    const chart = chartRef.value?.chart;
    if (!chart) return;

    const pointInPixel = [params.offsetX, params.offsetY];
    let gridIndex = -1;
    if (chart.containPixel({ gridIndex: 0 }, pointInPixel)) gridIndex = 0;
    else if (chart.containPixel({ gridIndex: 1 }, pointInPixel)) gridIndex = 1;

    if (gridIndex === -1) return;

    const pts = measurePoints.value[gridIndex];
    const THRESHOLD = 15;
    for (let i = 0; i < pts.length; i++) {
        const ptPixel = chart.convertToPixel({ gridIndex }, [pts[i].x, pts[i].y]);
        if (Math.hypot(ptPixel[0] - pointInPixel[0], ptPixel[1] - pointInPixel[1]) < THRESHOLD) {
            dragInfo.value = { gridIndex, pointIndex: i };
            isDraggingAction = false; 
            return;
        }
    }
}

// 2. 鼠标【移动】：处理拖拽与悬停
function handleChartMouseMove(params: any) {
    if (!isMeasuring.value) return;
    const chart = chartRef.value?.chart;
    if (!chart) return;

    const pointInPixel = [params.offsetX, params.offsetY];

    // 场景 A：拖拽中
    if (dragInfo.value !== null) {
        isDraggingAction = true;
        const gridIndex = dragInfo.value.gridIndex;
        if (!chart.containPixel({ gridIndex }, pointInPixel)) return;

        const pointInGrid = chart.convertFromPixel({ gridIndex }, pointInPixel);
        measurePoints.value[gridIndex][dragInfo.value.pointIndex] = { x: pointInGrid[0], y: pointInGrid[1] };
        if (!isRenderPending) { isRenderPending = true; requestAnimationFrame(renderCharts); }
        return; 
    }

    let gridIndex = -1;
    if (chart.containPixel({ gridIndex: 0 }, pointInPixel)) gridIndex = 0;
    else if (chart.containPixel({ gridIndex: 1 }, pointInPixel)) gridIndex = 1;

    // 【新增】：检测是否悬停，更新给 Watcher 使用
    let foundHover = false;
    if (gridIndex !== -1) {
        const pts = measurePoints.value[gridIndex];
        for (let i = 0; i < pts.length; i++) {
            const ptPixel = chart.convertToPixel({ gridIndex }, [pts[i].x, pts[i].y]);
            if (Math.hypot(ptPixel[0] - pointInPixel[0], ptPixel[1] - pointInPixel[1]) < 15) {
                foundHover = true;
                break;
            }
        }
    }
    isHoveringPoint.value = foundHover;

    if (gridIndex === -1) {
        if (hoverPoint.value) { hoverPoint.value = null; requestAnimationFrame(renderCharts); }
        return;
    }

    // 场景 B：绘制悬浮点
    if (measurePoints.value[gridIndex].length < 2 && !foundHover) {
        const pointInGrid = chart.convertFromPixel({ gridIndex }, pointInPixel);
        hoverPoint.value = { x: pointInGrid[0], y: pointInGrid[1], gridIndex };
        if (!isRenderPending) { isRenderPending = true; requestAnimationFrame(renderCharts); }
    } else if (hoverPoint.value) {
        hoverPoint.value = null;
        if (!isRenderPending) { isRenderPending = true; requestAnimationFrame(renderCharts); }
    }   
}

// 3. 鼠标【抬起】：结束拖拽
function handleChartMouseUp() {
    if (dragInfo.value !== null) {
        dragInfo.value = null; 
        setTimeout(() => { isDraggingAction = false; }, 50);
        // (禁用恢复的工作已自动交给 watch 完成)
    }
}

// 4. 鼠标【点击】：放置或重置测量点
function handleChartClick(params: any) {
    if (!isMeasuring.value) return;
    if (isDraggingAction) return; // 【核心拦截】如果刚刚进行的是拖拽操作，则忽略此次点击！

    const chart = chartRef.value?.chart;
    if (!chart) return;

    const pointInPixel = [params.offsetX, params.offsetY];
    let gridIndex = -1;
    if (chart.containPixel({ gridIndex: 0 }, pointInPixel)) gridIndex = 0;
    else if (chart.containPixel({ gridIndex: 1 }, pointInPixel)) gridIndex = 1;

    if (gridIndex === -1) return;

    const pointInGrid = chart.convertFromPixel({ gridIndex }, pointInPixel);
    const pts = measurePoints.value[gridIndex];

    if (pts.length >= 2) {
        measurePoints.value[gridIndex] = [{ x: pointInGrid[0], y: pointInGrid[1] }];
    } else {
        measurePoints.value[gridIndex].push({ x: pointInGrid[0], y: pointInGrid[1] });
    }

    hoverPoint.value = null;
    if (!isRenderPending) { isRenderPending = true; requestAnimationFrame(renderCharts); }
}

const keyOptions = computed(() => {
    return Array.from({ length: keymap.value[0] != undefined ? keymap.value[0].length : 0 }, (_, i) => ({ label: `Key ${i}`, value: i }));
});

const windowSize = ref(8000);
let latestTick = 0;
let isRenderPending = false;
function scheduleChartRender() {
    if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(renderCharts);
    }
}
// --- 数据缓存字典 ---
// 格式: { keyId: [[tick1, val1], [tick2, val2], ...] }
const rawDataCache: Record<number, [number, number][]> = {};
const filteredRawDataCache: Record<number, [number, number][]> = {};
const valueDataCache: Record<number, [number, number][]> = {};
const stateDataCache: Record<number, DigitalSample[]> = {};
const reportStateDataCache: Record<number, DigitalSample[]> = {};

const stateAreasCache: Record<number, { start: number, end: number | null }[]> = {};
const lastStateCache: Record<number, boolean> = {};
const seriesCache: Record<string, any> = {};

const isSpectrumEnabled = ref(false);
const spectrumSource = ref<SpectrumSource>('filtered_raw');
const spectrumFftSize = ref(2048);
const spectrumScale = ref<SpectrumScale>('db');
const spectrumChartRef = ref<any>(null);
const spectrumPeakInfo = ref<SpectrumPeakInfo[]>([]);
const spectrumSampleRateHz = ref(SPECTRUM_FALLBACK_SAMPLE_RATE_HZ);
let spectrumRawSampleRateEstimateHz = SPECTRUM_FALLBACK_SAMPLE_RATE_HZ;
const isSpectrumSampleRateEstimated = ref(false);
const spectrumSettingsExpandedNames = ref<string[]>([]);
let isSpectrumRenderPending = false;
let spectrumRateAnchorTick: number | null = null;
let spectrumRateAnchorTimeMs: number | null = null;
let lastSpectrumRateTick: number | null = null;

type SpectrumView = 'spectrum' | 'waterfall';
type WaterfallDisplayMode = 'heatmap' | 'average';

const spectrumView = ref<SpectrumView>('spectrum');
const waterfallChartRef = ref<any>(null);
const waterfallAnalysisKey = ref<number | null>(null);
const waterfallFrames = shallowRef<WaterfallFrame[]>([]);
const waterfallColorRange = ref<WaterfallColorRange | null>(null);
const selectedWaterfallFrame = shallowRef<WaterfallFrame | null>(null);
const isWaterfallPaused = ref(false);
const isWaterfallAutoScroll = ref(true);
const isWaterfallWaitingForQuality = ref(false);
const waterfallDisplayMode = ref<WaterfallDisplayMode>('heatmap');
const waterfallAverageWindow = ref<WaterfallAverageWindow>('all');
const waterfallBufferSize = ref(WATERFALL_MAX_FRAMES);
const waterfallAverageAccumulator = createWaterfallAverageAccumulator();
const waterfallAverageSpectrum = shallowRef<WaterfallAverageSpectrum | null>(null);
let lastWaterfallCaptureTick: number | null = null;
let isWaterfallRenderPending = false;

const spectrumSourceOptions = computed(() => [
    { label: t('oscilloscope_panel_spectrum_source_filtered_raw'), value: 'filtered_raw' },
    { label: t('oscilloscope_panel_spectrum_source_raw'), value: 'raw' },
    { label: t('oscilloscope_panel_spectrum_source_value'), value: 'value' }
]);

const spectrumFftSizeOptions = [
    { label: '512', value: 512 },
    { label: '1024', value: 1024 },
    { label: '2048', value: 2048 },
    { label: '4096', value: 4096 }
];

const spectrumScaleOptions = computed(() => [
    { label: t('oscilloscope_panel_spectrum_scale_db'), value: 'db' },
    { label: t('oscilloscope_panel_spectrum_scale_linear'), value: 'linear' }
]);

const waterfallAnalysisKeyOptions = computed(() => {
    return oscilloscopeSelectedKeys.value.map(id => ({ label: `Key ${id}`, value: id }));
});

const waterfallBufferDuration = computed(() => {
    const seconds = waterfallBufferSize.value / WATERFALL_FRAME_RATE_HZ;
    return `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
});

const waterfallAverageWindowOptions = computed(() => [
    {
        label: t('oscilloscope_panel_waterfall_average_all_buffer'),
        value: 'all' as const
    },
    ...WATERFALL_AVERAGE_WINDOW_FRAME_COUNTS.map(count => ({
        label: t('oscilloscope_panel_waterfall_average_recent_frames', { count }),
        value: count
    }))
]);

// --- 图表配置 ---

const chartRef = ref<any>(null);
const spectrumOption = shallowRef({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
        trigger: 'axis',
        transitionDuration: 0,
        showDelay: 0,
        hideDelay: 0,
        confine: true,
        position: positionTooltipAtCursor,
        axisPointer: { type: 'line', snap: true, animation: false },
        formatter: spectrumTooltipFormatter
    },
    grid: { left: 56, right: 18, top: 8, bottom: 26 },
    xAxis: {
        type: 'value',
        name: 'Hz',
        min: 0,
        max: SPECTRUM_FALLBACK_SAMPLE_RATE_HZ / 2,
        splitLine: { show: false },
        axisLabel: { formatter: formatFrequencyShort }
    },
    yAxis: {
        type: 'value',
        name: 'dB',
        scale: true,
        splitLine: { show: true }
    },
    series: []
});
const waterfallOption = shallowRef<any>({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
        trigger: 'item',
        transitionDuration: 0,
        showDelay: 0,
        hideDelay: 0,
        confine: true,
        position: positionTooltipAtCursor,
        axisPointer: { animation: false },
        formatter: waterfallTooltipFormatter
    },
    grid: { left: 64, right: 78, top: 12, bottom: 28 },
    xAxis: {
        type: 'category',
        data: [],
        name: 'Hz',
        splitLine: { show: false }
    },
    yAxis: {
        type: 'category',
        data: [],
        name: 'Tick',
        splitLine: { show: false }
    },
    visualMap: {
        type: 'continuous',
        min: 0,
        max: 1,
        calculable: false,
        orient: 'vertical',
        right: 6,
        top: 'center',
        seriesIndex: 0
    },
    series: []
});
const oscilloscopeShellRef = ref<HTMLElement | null>(null);
const chartPanelRef = ref<HTMLElement | null>(null);
let chartResizeObserver: ResizeObserver | null = null;

function getChartHeight(): number {
    const chart = chartRef.value?.chart || chartRef.value;
    if (chart && typeof chart.getHeight === 'function') {
        return chart.getHeight();
    }
    return chartPanelRef.value?.clientHeight || 480;
}

function preventBrowserZoomOnCtrlWheel(event: WheelEvent) {
    if (event.ctrlKey) {
        event.preventDefault();
    }
}

function getStateTrackCount(): number {
    return Math.max(2, oscilloscopeSelectedKeys.value.length * 2);
}

function formatStateTrackLabel(value: number | string): string {
    const numericValue = Number(value);
    const trackIndex = Math.round(numericValue);
    if (!Number.isFinite(numericValue) || Math.abs(numericValue - trackIndex) > 0.001) {
        return '';
    }
    const keyIndex = Math.floor(trackIndex / 2);
    const keyId = oscilloscopeSelectedKeys.value[keyIndex];
    if (keyId === undefined) {
        return '';
    }
    return trackIndex % 2 === 0 ? `K${keyId} S` : `K${keyId} R`;
}

const initialChartLayout = buildChartLayout();
const chartOption = shallowRef({
    backgroundColor: 'transparent',
    animation: false,
    axisPointer: {
        link: [{ xAxisIndex: 'all' }]
    },
    tooltip: {
        trigger: 'axis',
        transitionDuration: 0, // 取消跟随鼠标的延迟动画
        showDelay: 0,
        hideDelay: 0,
        axisPointer: {
            type: 'cross',
            animation: false,
        },
        formatter: (params: any[]) => {
            if (!params.length) return '';

            // 获取当前鼠标所在位置的 tick (X轴数值) 和数据索引
            const firstPoint = params.find(param => Array.isArray(param.value));
            if (!firstPoint) return '';
            const tick = Number(firstPoint.value[0]);
            const dataIndex = typeof firstPoint.dataIndex === 'number' ? firstPoint.dataIndex : undefined;

            // 构建精美的提示框表格
            let html = `<div style="font-size: 12px; color: #999; margin-bottom: 6px;">Tick: ${tick}</div>`;
            html += `<table style="width:100%; border-collapse: collapse; font-size: 13px; text-align: left;">`;
            html += `<tr>
                        <td style="padding-right:16px;"></td>
                        <td style="padding-right:16px; color:#888;">State</td>
                        <td style="padding-right:16px; color:#888;">Report State</td>
                        <td style="padding-right:16px; color:#888;">Raw</td>
                        <td style="padding-right:16px; color:#18a058;">Filtered</td> <td style="color:#888;">Value</td>
                     </tr>`;
            // 遍历所有选中的按键，提取当前 tick 下的 State, Report State, Raw 和 Value
            oscilloscopeSelectedKeys.value.forEach((id, index) => {
                if (hiddenKeys.value.includes(id)) return;

                const color = lineColors[index % lineColors.length];

                const rawCache = rawDataCache[id];
                const fRawCache = filteredRawDataCache[id];
                const valCache = valueDataCache[id];
                const raw = getCacheValueAtTick(rawCache, tick, dataIndex);
                const filteredRaw = getCacheValueAtTick(fRawCache, tick, dataIndex);
                const value = getCacheValueAtTick(valCache, tick, dataIndex);
                const state = getCacheValueAtTick(stateDataCache[id], tick, dataIndex);
                const reportState = getCacheValueAtTick(reportStateDataCache[id], tick, dataIndex);
                const rawVal = raw === null ? '-' : raw.toString();
                const filteredRawVal = filteredRaw === null ? '-' : filteredRaw.toFixed(2);
                const valVal = value === null ? '-' : value.toFixed(4);

                    html += `<tr>
                    <td style="padding-right:16px;">
                        <span style="display:inline-block; margin-right:6px; width:10px; height:10px; background-color:${color};"></span>
                        Key ${id}
                    </td>
                    <td style="padding-right:16px;">${formatStateHtml(state)}</td>
                    <td style="padding-right:16px;">${formatStateHtml(reportState)}</td>
                    <td style="padding-right:16px; font-weight:bold; color:#aaa;">${rawVal}</td> <td style="padding-right:16px; font-weight:bold;">${filteredRawVal}</td> <td style="font-weight:bold;">${valVal}</td>
                </tr>`;
            });

            html += `</table>`;
            return html;
        }
    },
    grid: initialChartLayout.grids,
    xAxis: [
        {
            gridIndex: 0, // 绑定到上半部分
            type: 'value',
            scale: true,
            splitLine: { show: false },
            axisLabel: { show: false },
            axisPointer: {
                label: { show: false } 
            }
        },
        {
            gridIndex: 1, // 绑定到下半部分
            type: 'value',
            scale: true,
            splitLine: { show: false },
            axisLabel: { show: false },
            axisPointer: {
                label: { show: false }
            }
        },
        {
            gridIndex: 2, // 绑定到底部 State 图
            type: 'value',
            scale: true,
            splitLine: { show: false },
            axisLine: { onZero: false },
            axisLabel: { formatter: (val: number) => val.toString() }
        }
    ],
    yAxis: [
        {
            gridIndex: 0,
            type: 'value',
            name: 'Raw',
            splitLine: { show: true },
            min: 0, // 强制底部物理边缘等于当前视图内的最小数据值
            max: 'dataMax'  // 强制顶部物理边缘等于当前视图内的最大数据值
        },
        {
            gridIndex: 1,
            type: 'value',
            name: 'Value',
            min: -0.1,
            max: 1.1,
            inverse: true,
            splitLine: { show: true }
        },
        {
            gridIndex: 2,
            type: 'value',
            name: 'State',
            min: -0.5,
            max: getStateTrackCount() - 0.5,
            minInterval: 1,
            maxInterval: 1,
            splitLine: { show: false },
            axisTick: { show: false },
            axisLabel: { formatter: formatStateTrackLabel }
        }
    ],
    dataZoom: [
        // --- X 轴缩放 (原有) ---
        {
            id: 'dz-inside', 
            type: 'inside', 
            xAxisIndex: [0, 1, 2],
            zoomOnMouseWheel: 'ctrl',
            moveOnMouseWheel: false,
            filterMode: 'none'
        },
        {
            id: 'dz-slider', 
            type: 'slider', 
            xAxisIndex: [0, 1, 2],
            bottom: initialChartLayout.xSlider.bottom,
            height: initialChartLayout.xSlider.height,
            filterMode: 'none',
            showDataShadow: false,   // 【核心】：关闭滚动条里的背景波形
            showDetail: false,       // 关闭两端的文字提示
            handleSize: '100%',                      // 让拖拽手柄填满高度
        },
// --- Y 轴交互逻辑: 上半部分 Raw ---
        { 
            id: 'dz-y-inside-raw', 
            type: 'inside', 
            yAxisIndex: 0,
            zoomOnMouseWheel: 'alt',  // 按住 Alt 缩放 Y 轴
            moveOnMouseWheel: 'shift',  // 【新增】显式禁止 Y 轴响应普通滚轮平移，防止与 X 轴平移冲突
            filterMode: 'none'
        },
        { 
            id: 'dz-y-slider-raw', 
            type: 'slider', 
            yAxisIndex: 0, 
            right: initialChartLayout.rawYSlider.right,
            top: initialChartLayout.rawYSlider.top,
            height: initialChartLayout.rawYSlider.height,
            width: initialChartLayout.rawYSlider.width,
            filterMode: 'none',
            showDataShadow: false,   // 【核心】：关闭背景波形
            showDetail: false,       // 关闭文字提示
        },

        // --- Y 轴交互逻辑: 下半部分 Value ---
        { 
            id: 'dz-y-inside-val', 
            type: 'inside', 
            yAxisIndex: 1,
            zoomOnMouseWheel: 'alt',  
            moveOnMouseWheel: 'shift',  
            filterMode: 'none'
        },
        { 
            id: 'dz-y-slider-val', 
            type: 'slider', 
            yAxisIndex: 1, 
            right: initialChartLayout.valueYSlider.right,
            top: initialChartLayout.valueYSlider.top,
            height: initialChartLayout.valueYSlider.height,
            width: initialChartLayout.valueYSlider.width,
            filterMode: 'none',
            showDataShadow: false,   // 【核心】：关闭背景波形
            showDetail: false,       // 关闭文字提示
        }
    ],
    series: []
});
const lineColors = ['#ff2291', '#ffd700', '#38538a', '#ff4637'];

const selectedKeyLegend = computed(() => {
    return oscilloscopeSelectedKeys.value.map((id, index) => ({
        id,
        color: lineColors[index % lineColors.length],
        hidden: hiddenKeys.value.includes(id)
    }));
});

function getKeyColor(id: number): string {
    const index = oscilloscopeSelectedKeys.value.indexOf(id);
    return lineColors[(index >= 0 ? index : 0) % lineColors.length];
}

function getSpectrumCache(keyId: number): [number, number][] | undefined {
    if (spectrumSource.value === 'raw') {
        return rawDataCache[keyId];
    }
    if (spectrumSource.value === 'value') {
        return valueDataCache[keyId];
    }
    return filteredRawDataCache[keyId];
}

function resetSpectrumSampleRateEstimator(resetRate = true) {
    spectrumRateAnchorTick = null;
    spectrumRateAnchorTimeMs = null;
    lastSpectrumRateTick = null;
    isSpectrumSampleRateEstimated.value = false;
    if (resetRate) {
        spectrumRawSampleRateEstimateHz = SPECTRUM_FALLBACK_SAMPLE_RATE_HZ;
        spectrumSampleRateHz.value = SPECTRUM_FALLBACK_SAMPLE_RATE_HZ;
    }
}

function updateSpectrumSampleRateEstimate(tick: number) {
    if (!isSpectrumEnabled.value || !Number.isFinite(tick)) {
        return;
    }

    const now = performance.now();
    if (lastSpectrumRateTick !== null && tick < lastSpectrumRateTick) {
        resetSpectrumSampleRateEstimator();
    } else if (lastSpectrumRateTick !== null && tick === lastSpectrumRateTick) {
        return;
    }

    lastSpectrumRateTick = tick;
    if (spectrumRateAnchorTick === null || spectrumRateAnchorTimeMs === null) {
        spectrumRateAnchorTick = tick;
        spectrumRateAnchorTimeMs = now;
        return;
    }

    const tickDelta = tick - spectrumRateAnchorTick;
    const timeDeltaMs = now - spectrumRateAnchorTimeMs;
    if (tickDelta < SPECTRUM_ESTIMATION_MIN_TICK_DELTA || timeDeltaMs < SPECTRUM_ESTIMATION_MIN_INTERVAL_MS) {
        return;
    }

    const estimatedRate = tickDelta * 1000 / timeDeltaMs;
    if (estimatedRate >= SPECTRUM_ESTIMATION_MIN_RATE_HZ && estimatedRate <= SPECTRUM_ESTIMATION_MAX_RATE_HZ) {
        spectrumRawSampleRateEstimateHz = isSpectrumSampleRateEstimated.value
            ? spectrumRawSampleRateEstimateHz * (1 - SPECTRUM_ESTIMATION_ALPHA) + estimatedRate * SPECTRUM_ESTIMATION_ALPHA
            : estimatedRate;
        spectrumSampleRateHz.value = quantizeSpectrumSampleRate(spectrumRawSampleRateEstimateHz);
        isSpectrumSampleRateEstimated.value = true;
    }

    spectrumRateAnchorTick = tick;
    spectrumRateAnchorTimeMs = now;
}

function spectrumTooltipFormatter(params: any[]) {
    if (!Array.isArray(params) || params.length === 0) {
        return '';
    }
    const firstPoint = params.find(param => Array.isArray(param.value));
    if (!firstPoint) {
        return '';
    }

    const frequency = Number(firstPoint.value[0]);
    let html = `<div style="font-size: 12px; color: #999; margin-bottom: 6px;">${formatFrequency(frequency)}</div>`;
    html += '<table style="width:100%; border-collapse: collapse; font-size: 13px; text-align: left;">';
    params.forEach(param => {
        if (!Array.isArray(param.value)) {
            return;
        }
        html += `<tr>
            <td style="padding-right:16px;">
                <span style="display:inline-block; margin-right:6px; width:10px; height:10px; background-color:${param.color};"></span>
                ${param.seriesName}
            </td>
            <td style="font-weight:bold;">${formatSpectrumMagnitude(Number(param.value[1]), spectrumScale.value)}</td>
        </tr>`;
    });
    html += '</table>';
    return html;
}

function positionTooltipAtCursor(point: number[], _params: any, _dom: any, _rect: any, size: any): [number, number] {
    const cursorX = Array.isArray(point) ? Number(point[0]) : 0;
    const cursorY = Array.isArray(point) ? Number(point[1]) : 0;
    const [contentWidth = 0, contentHeight = 0] = size?.contentSize ?? [];
    const [viewWidth = Number.POSITIVE_INFINITY, viewHeight = Number.POSITIVE_INFINITY] = size?.viewSize ?? [];
    return [
        Math.max(8, Math.min(cursorX + 12, viewWidth - contentWidth - 8)),
        Math.max(8, Math.min(cursorY + 12, viewHeight - contentHeight - 8))
    ];
}

function getWaterfallBucketRange(frame: WaterfallFrame, bucketIndex: number): [number, number] {
    const binCount = frame.fullMagnitudes.length;
    if (binCount === 0 || frame.bucketMagnitudes.length === 0) {
        return [0, frame.sampleRateHz / 2];
    }

    const bucketCount = frame.bucketMagnitudes.length;
    const startIndex = Math.min(binCount - 1, Math.floor(bucketIndex * binCount / bucketCount));
    const endIndex = Math.min(binCount - 1, Math.max(startIndex, Math.ceil((bucketIndex + 1) * binCount / bucketCount) - 1));
    return [
        frame.fullMagnitudes[startIndex]?.[0] ?? 0,
        frame.fullMagnitudes[endIndex]?.[0] ?? frame.sampleRateHz / 2
    ];
}

function formatWaterfallTooltip(frame: WaterfallFrame, startFrequency: number, endFrequency: number, magnitude: number) {
    const frequencyRange = startFrequency === endFrequency
        ? formatFrequency(startFrequency)
        : `${formatFrequency(startFrequency)} – ${formatFrequency(endFrequency)}`;
    return `<div style="font-size:12px; color:#999; margin-bottom:6px;">Key ${frame.keyId} · ${t('oscilloscope_panel_waterfall_tick')} ${frame.tick}</div>
        <table style="border-collapse:collapse; font-size:13px; text-align:left;">
            <tr><td style="padding-right:14px; color:#888;">${t('oscilloscope_panel_waterfall_frequency_range')}</td><td style="font-weight:bold;">${frequencyRange}</td></tr>
            <tr><td style="padding-right:14px; color:#888;">${frame.scale === 'db' ? 'dB' : t('oscilloscope_panel_spectrum_scale_linear')}</td><td style="font-weight:bold;">${formatSpectrumMagnitude(magnitude, frame.scale)}</td></tr>
            <tr><td style="padding-right:14px; color:#888;">${t('oscilloscope_panel_spectrum_quality')}</td><td>${formatPercent(frame.coverage)}</td></tr>
            <tr><td style="padding-right:14px; color:#888;">${t('oscilloscope_panel_spectrum_gap')}</td><td>${frame.maxGapTicks}t</td></tr>
        </table>`;
}

function formatWaterfallAverageTooltip(
    average: WaterfallAverageSpectrum,
    frequency: number,
    magnitude: number
) {
    const scale = average.configuration.scale;
    return `<div style="font-size:12px; color:#999; margin-bottom:6px;">Key ${average.configuration.keyId} · ${t('oscilloscope_panel_waterfall_tick')} ${average.firstTick} – ${average.lastTick} · ${t('oscilloscope_panel_waterfall_average_frame_count', { count: average.frameCount })}</div>
        <table style="border-collapse:collapse; font-size:13px; text-align:left;">
            <tr><td style="padding-right:14px; color:#888;">Hz</td><td style="font-weight:bold;">${formatFrequency(frequency)}</td></tr>
            <tr><td style="padding-right:14px; color:#888;">${scale === 'db' ? 'dB' : t('oscilloscope_panel_spectrum_scale_linear')}</td><td style="font-weight:bold;">${formatSpectrumMagnitude(magnitude, scale)}</td></tr>
        </table>`;
}

function waterfallTooltipFormatter(params: any) {
    const point = Array.isArray(params)
        ? params.find(param => Array.isArray(param?.value))
        : params;
    const value = point?.value;
    if (!Array.isArray(value)) {
        return '';
    }

    if (point?.seriesType === 'line' && waterfallDisplayMode.value === 'average') {
        const average = waterfallAverageSpectrum.value;
        const frequency = Number(value[0]);
        const magnitude = Number(value[1]);
        if (!average || !Number.isFinite(frequency) || !Number.isFinite(magnitude)) {
            return '';
        }
        return formatWaterfallAverageTooltip(average, frequency, magnitude);
    }

    const bucketIndex = Number(value[0]);
    const frameIndex = Number(value[1]);
    const magnitude = Number(value[2]);
    const frame = waterfallFrames.value[frameIndex];
    if (!frame || !Number.isFinite(bucketIndex) || !Number.isFinite(magnitude)) {
        return '';
    }

    const [startFrequency, endFrequency] = getWaterfallBucketRange(frame, bucketIndex);
    return formatWaterfallTooltip(frame, startFrequency, endFrequency, magnitude);
}

function refreshWaterfallAverageSpectrum() {
    waterfallAverageSpectrum.value = waterfallAverageAccumulator.get(waterfallAverageWindow.value);
}

function resetWaterfallHistory() {
    waterfallFrames.value = [];
    waterfallAverageAccumulator.clear();
    waterfallAverageSpectrum.value = null;
    waterfallColorRange.value = null;
    selectedWaterfallFrame.value = null;
    isWaterfallWaitingForQuality.value = false;
    isWaterfallAutoScroll.value = true;
    lastWaterfallCaptureTick = null;
    scheduleWaterfallRender();
}

function clearWaterfallHistory() {
    resetWaterfallHistory();
}

function resetWaterfallColorScale() {
    waterfallColorRange.value = null;
    selectedWaterfallFrame.value = null;
    scheduleWaterfallRender();
    scheduleSpectrumRender();
}

function returnToLiveSpectrum() {
    selectedWaterfallFrame.value = null;
    scheduleSpectrumRender();
}

function scheduleWaterfallRender() {
    if (!isSpectrumEnabled.value || isWaterfallRenderPending) {
        return;
    }
    isWaterfallRenderPending = true;
    requestAnimationFrame(() => {
        isWaterfallRenderPending = false;
        renderWaterfallChart();
    });
}

function renderWaterfallChart() {
    const frames = waterfallFrames.value;
    const latestFrame = frames[frames.length - 1];
    const averageSpectrum = waterfallAverageSpectrum.value;
    const bucketCount = latestFrame?.bucketMagnitudes.length || WATERFALL_FREQUENCY_BUCKET_COUNT;
    const colorRange = waterfallColorRange.value;
    const axisColor = themeName.value === 'dark' ? '#aeb8c8' : '#596579';
    const splitLineColor = themeName.value === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(30, 38, 52, 0.1)';
    const tooltip = {
        backgroundColor: themeName.value === 'dark' ? 'rgba(30, 30, 34, 0.88)' : 'rgba(255, 255, 255, 0.94)',
        borderColor: themeName.value === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        transitionDuration: 0,
        showDelay: 0,
        hideDelay: 0,
        confine: true,
        position: positionTooltipAtCursor,
        axisPointer: { type: 'line', snap: true, animation: false },
        formatter: waterfallTooltipFormatter
    };

    const option: any = waterfallDisplayMode.value === 'average'
        ? buildWaterfallAverageOption(averageSpectrum, latestFrame, axisColor, splitLineColor, tooltip)
        : buildWaterfallHeatmapOption(frames, latestFrame, bucketCount, colorRange, axisColor, splitLineColor, tooltip);

    waterfallOption.value = {
        ...waterfallOption.value,
        ...option
    };
    const chart = waterfallChartRef.value?.chart || waterfallChartRef.value;
    if (chart && typeof chart.setOption === 'function') {
        chart.setOption(option, {
            replaceMerge: ['series', 'xAxis', 'yAxis', 'visualMap', 'dataZoom'],
            lazyUpdate: true
        });
    }
}

function buildWaterfallHeatmapOption(
    frames: WaterfallFrame[],
    latestFrame: WaterfallFrame | undefined,
    bucketCount: number,
    colorRange: WaterfallColorRange | null,
    axisColor: string,
    splitLineColor: string,
    tooltip: any
) {
    const heatmapData: [number, number, number][] = [];
    frames.forEach((frame, frameIndex) => {
        frame.bucketMagnitudes.forEach((magnitude, bucketIndex) => {
            if (Number.isFinite(magnitude)) {
                heatmapData.push([bucketIndex, frameIndex, magnitude]);
            }
        });
    });
    const firstVisibleFrame = frames[Math.max(0, frames.length - WATERFALL_VISIBLE_ROWS)];
    const followLatest = isWaterfallAutoScroll.value && firstVisibleFrame && latestFrame;

    return {
        tooltip: {
            ...tooltip,
            trigger: 'item'
        },
        xAxis: {
            type: 'category',
            data: Array.from({ length: bucketCount }, (_, index) => index),
            name: 'Hz',
            nameTextStyle: { color: axisColor },
            axisLine: { lineStyle: { color: splitLineColor } },
            axisLabel: {
                color: axisColor,
                interval: Math.max(0, Math.floor(bucketCount / 6) - 1),
                formatter: (value: number | string) => {
                    if (!latestFrame) return '';
                    const [startFrequency, endFrequency] = getWaterfallBucketRange(latestFrame, Number(value));
                    return formatFrequencyShort((startFrequency + endFrequency) / 2);
                }
            },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'category',
            data: frames.map(frame => frame.tick),
            name: t('oscilloscope_panel_waterfall_tick'),
            inverse: true,
            nameTextStyle: { color: axisColor },
            axisLine: { lineStyle: { color: splitLineColor } },
            axisLabel: {
                color: axisColor,
                interval: Math.max(0, Math.floor(Math.max(frames.length, 1) / 6) - 1)
            },
            splitLine: { show: false }
        },
        dataZoom: [
            {
                id: 'waterfall-y-inside',
                type: 'inside',
                yAxisIndex: 0,
                filterMode: 'none',
                ...(followLatest ? { startValue: firstVisibleFrame.tick, endValue: latestFrame.tick } : {})
            },
            {
                id: 'waterfall-y-slider',
                type: 'slider',
                yAxisIndex: 0,
                right: 64,
                top: 14,
                bottom: 28,
                width: 10,
                filterMode: 'none',
                showDataShadow: false,
                showDetail: false,
                ...(followLatest ? { startValue: firstVisibleFrame.tick, endValue: latestFrame.tick } : {})
            }
        ],
        visualMap: {
            type: 'continuous',
            min: colorRange?.min ?? 0,
            max: colorRange?.max ?? 1,
            calculable: false,
            orient: 'vertical',
            right: 6,
            top: 'center',
            textStyle: { color: axisColor },
            borderColor: splitLineColor,
            seriesIndex: 0,
            inRange: {
                color: ['#2c105c', '#274b9f', '#1f9e89', '#73d055', '#fde725']
            }
        },
        series: [{
            id: 'waterfall',
            name: t('oscilloscope_panel_spectrum_view_waterfall'),
            type: 'heatmap',
            data: heatmapData,
            progressive: 20000,
            animation: false,
            emphasis: { itemStyle: { borderColor: themeName.value === 'dark' ? '#ffffff' : '#111827', borderWidth: 1 } }
        }]
    };
}

function buildWaterfallAverageOption(
    averageSpectrum: WaterfallAverageSpectrum | null,
    latestFrame: WaterfallFrame | undefined,
    axisColor: string,
    splitLineColor: string,
    tooltip: any
) {
    const configuration = averageSpectrum?.configuration ?? latestFrame;
    return {
        tooltip: {
            ...tooltip,
            trigger: 'axis',
            axisPointer: { type: 'line', snap: true, animation: false }
        },
        xAxis: {
            type: 'value',
            name: 'Hz',
            min: 0,
            max: configuration?.sampleRateHz ? configuration.sampleRateHz / 2 : undefined,
            nameTextStyle: { color: axisColor },
            axisLine: { lineStyle: { color: splitLineColor } },
            axisLabel: { color: axisColor, formatter: formatFrequencyShort },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: configuration?.scale === 'db' ? 'dB' : '',
            scale: true,
            nameTextStyle: { color: axisColor },
            axisLine: { lineStyle: { color: splitLineColor } },
            axisLabel: { color: axisColor },
            splitLine: { show: true, lineStyle: { color: splitLineColor } }
        },
        dataZoom: [],
        visualMap: { show: false },
        series: averageSpectrum ? [{
            id: 'waterfall-average',
            name: t('oscilloscope_panel_waterfall_display_average'),
            type: 'line',
            data: averageSpectrum.data,
            showSymbol: false,
            connectNulls: false,
            animation: false,
            lineStyle: { width: 1.5, color: '#14b8a6' },
            emphasis: { focus: 'series', lineStyle: { width: 2 } }
        }] : []
    };
}

function captureWaterfallFrame(currentTick: number, updatedKeys: number[]) {
    const keyId = waterfallAnalysisKey.value;
    if (!isSpectrumEnabled.value || isWaterfallPaused.value || keyId === null || !updatedKeys.includes(keyId)) {
        return;
    }

    const sampleRateHz = spectrumSampleRateHz.value || SPECTRUM_FALLBACK_SAMPLE_RATE_HZ;
    const configuration = {
        keyId,
        sampleRateHz,
        fftSize: spectrumFftSize.value,
        source: spectrumSource.value,
        scale: spectrumScale.value
    };
    const firstFrame = waterfallFrames.value[0];
    if (firstFrame && !isWaterfallFrameCompatible(firstFrame, configuration)) {
        resetWaterfallHistory();
    }

    if (!shouldCaptureWaterfallFrame(currentTick, lastWaterfallCaptureTick, sampleRateHz)) {
        return;
    }
    // Consume this capture interval even when the window is not ready, avoiding
    // repeated FFT work for every debug event during an invalid interval.
    lastWaterfallCaptureTick = currentTick;

    const spectrumWindow = buildUniformSpectrumWindow(getSpectrumCache(keyId), currentTick, spectrumFftSize.value);
    if (!spectrumWindow || !isWaterfallCaptureReady(isSpectrumSampleRateEstimated.value, spectrumWindow.coverage)) {
        isWaterfallWaitingForQuality.value = true;
        return;
    }

    const spectrum = calculateSpectrum(spectrumWindow.values, sampleRateHz, spectrumFftSize.value, spectrumScale.value);
    if (!spectrum) {
        isWaterfallWaitingForQuality.value = true;
        return;
    }

    const frame = createWaterfallFrame({
        ...configuration,
        tick: currentTick,
        coverage: spectrumWindow.coverage,
        maxGapTicks: spectrumWindow.maxGapTicks,
        fullMagnitudes: spectrum.data
    });
    waterfallFrames.value = appendWaterfallFrame(waterfallFrames.value, frame, waterfallBufferSize.value);
    waterfallAverageAccumulator.append(frame, waterfallBufferSize.value);
    refreshWaterfallAverageSpectrum();
    isWaterfallWaitingForQuality.value = false;
    if (waterfallColorRange.value === null) {
        waterfallColorRange.value = calibrateWaterfallColorRange(frame);
    }
    scheduleWaterfallRender();
}

function handleWaterfallClick(params: any) {
    if (waterfallDisplayMode.value !== 'heatmap' || params?.componentType !== 'series' || !Array.isArray(params.value)) {
        return;
    }
    const frameIndex = Number(params.value[1]);
    const frame = waterfallFrames.value[frameIndex];
    if (!frame) {
        return;
    }

    selectedWaterfallFrame.value = cloneWaterfallFrame(frame);
    isWaterfallPaused.value = true;
    spectrumView.value = 'spectrum';
    nextTick(scheduleSpectrumRender);
}

function buildSpectrumSeries() {
    const selectedFrame = selectedWaterfallFrame.value;
    if (selectedFrame) {
        const color = getKeyColor(selectedFrame.keyId);
        let peakFrequency = 0;
        let peakMagnitude = Number.NEGATIVE_INFINITY;
        selectedFrame.fullMagnitudes.forEach(([frequency, magnitude], index) => {
            if (index > 0 && magnitude > peakMagnitude) {
                peakFrequency = frequency;
                peakMagnitude = magnitude;
            }
        });
        spectrumPeakInfo.value = [{
            id: selectedFrame.keyId,
            frequency: Number.isFinite(peakFrequency) ? peakFrequency : null,
            magnitude: Number.isFinite(peakMagnitude) ? peakMagnitude : null,
            color,
            coverage: selectedFrame.coverage,
            maxGapTicks: selectedFrame.maxGapTicks,
            status: selectedFrame.fullMagnitudes.length > 0 ? 'ready' : 'waiting'
        }];
        return [{
            id: 'spectrum-waterfall-selection',
            name: `Key ${selectedFrame.keyId} · Tick ${selectedFrame.tick}`,
            type: 'line',
            showSymbol: false,
            data: selectedFrame.fullMagnitudes,
            itemStyle: { color },
            lineStyle: { width: 1, color },
            emphasis: { focus: 'series' }
        }];
    }

    const peaks: SpectrumPeakInfo[] = [];
    const series: any[] = [];
    const fftSize = spectrumFftSize.value;
    const sampleRateHz = spectrumSampleRateHz.value || SPECTRUM_FALLBACK_SAMPLE_RATE_HZ;

    oscilloscopeSelectedKeys.value.forEach((id, index) => {
        if (hiddenKeys.value.includes(id)) {
            return;
        }

        const color = lineColors[index % lineColors.length];
        const cache = getSpectrumCache(id);
        const spectrumWindow = buildUniformSpectrumWindow(cache, latestTick, fftSize);
        if (!spectrumWindow) {
            peaks.push({
                id,
                frequency: null,
                magnitude: null,
                color,
                coverage: 0,
                maxGapTicks: fftSize,
                status: 'waiting'
            });
            return;
        }

        const spectrum = calculateSpectrum(spectrumWindow.values, sampleRateHz, fftSize, spectrumScale.value);
        if (!spectrum) {
            peaks.push({
                id,
                frequency: null,
                magnitude: null,
                color,
                coverage: spectrumWindow.coverage,
                maxGapTicks: spectrumWindow.maxGapTicks,
                status: 'waiting'
            });
            return;
        }

        peaks.push({
            id,
            frequency: spectrum.peakFrequency,
            magnitude: spectrum.peakMagnitude,
            color,
            coverage: spectrumWindow.coverage,
            maxGapTicks: spectrumWindow.maxGapTicks,
            status: 'ready'
        });
        series.push({
            id: `spectrum_${id}`,
            name: `Key ${id}`,
            type: 'line',
            showSymbol: false,
            data: spectrum.data,
            itemStyle: { color },
            lineStyle: { width: 1, color },
            emphasis: { focus: 'series' }
        });
    });

    spectrumPeakInfo.value = peaks;
    return series;
}

function renderSpectrumChart() {
    if (!isSpectrumEnabled.value) {
        spectrumPeakInfo.value = [];
        return;
    }

    const series = buildSpectrumSeries();
    const selectedFrame = selectedWaterfallFrame.value;
    const sampleRateHz = selectedFrame?.sampleRateHz || spectrumSampleRateHz.value || SPECTRUM_FALLBACK_SAMPLE_RATE_HZ;
    const scale = selectedFrame?.scale || spectrumScale.value;
    const option: any = {
        tooltip: {
            show: true,
            trigger: 'axis',
            triggerOn: 'mousemove|click',
            backgroundColor: themeName.value === 'dark' ? 'rgba(30, 30, 34, 0.82)' : 'rgba(255, 255, 255, 0.92)',
            borderColor: themeName.value === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            transitionDuration: 0,
            showDelay: 0,
            hideDelay: 0,
            confine: true,
            position: positionTooltipAtCursor,
            axisPointer: { show: true, type: 'line', snap: true, animation: false },
            formatter: spectrumTooltipFormatter
        },
        xAxis: {
            min: 0,
            max: sampleRateHz / 2,
            axisLabel: { formatter: formatFrequencyShort }
        },
        yAxis: {
            name: scale === 'db' ? 'dB' : '',
            scale: true
        },
        series
    };

    spectrumOption.value = {
        ...spectrumOption.value,
        ...option
    };

    const chart = spectrumChartRef.value?.chart || spectrumChartRef.value;
    if (chart && typeof chart.setOption === 'function') {
        chart.setOption(option, {
            replaceMerge: ['series'],
            lazyUpdate: true
        });
    }
}

function scheduleSpectrumRender() {
    if (!isSpectrumEnabled.value) {
        spectrumPeakInfo.value = [];
        return;
    }
    if (!isSpectrumRenderPending) {
        isSpectrumRenderPending = true;
        requestAnimationFrame(() => {
            isSpectrumRenderPending = false;
            renderSpectrumChart();
        });
    }
}

// 当选择的按键发生变化时，清理被移除按键的缓存数据
watch(oscilloscopeSelectedKeys, (newKeys, oldKeys) => {
    const removedKeys = oldKeys.filter(k => !newKeys.includes(k));
    removedKeys.forEach(k => {
        delete rawDataCache[k];
        delete filteredRawDataCache[k]
        delete valueDataCache[k];
        delete stateDataCache[k];
        delete reportStateDataCache[k];
        delete stateAreasCache[k];
        delete lastStateCache[k];
        [`raw_${k}`, `f_raw_${k}`, `val_${k}`, `state_${k}`, `report_state_${k}`].forEach(id => {
            delete seriesCache[id];
        });
        hiddenKeys.value = hiddenKeys.value.filter(id => id !== k);
    });
    if (isPolling.value && newKeys.length > 0) {
        props.controller.request_debug_at(newKeys);
    }
    if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(renderCharts);
    }
    scheduleSpectrumRender();
});

watch(oscilloscopeSelectedKeys, newKeys => {
    if (waterfallAnalysisKey.value === null || !newKeys.includes(waterfallAnalysisKey.value)) {
        waterfallAnalysisKey.value = newKeys[0] ?? null;
    }
}, { immediate: true });

watch(waterfallAnalysisKey, () => {
    resetWaterfallHistory();
});

watch(isSpectrumEnabled, enabled => {
    resetSpectrumSampleRateEstimator();
    resetWaterfallHistory();
    if (!enabled) {
        spectrumPeakInfo.value = [];
        spectrumSettingsExpandedNames.value = [];
        return;
    }
    nextTick(scheduleSpectrumRender);
});

watch([spectrumSource, spectrumFftSize, spectrumScale], () => {
    resetWaterfallHistory();
    nextTick(() => {
        scheduleSpectrumRender();
        scheduleWaterfallRender();
    });
});

watch(spectrumSampleRateHz, sampleRateHz => {
    const firstFrame = waterfallFrames.value[0];
    if (firstFrame && firstFrame.sampleRateHz !== sampleRateHz) {
        resetWaterfallHistory();
    }
});

watch(waterfallBufferSize, value => {
    const normalizedSize = normalizeWaterfallBufferSize(value);
    if (normalizedSize !== value) {
        waterfallBufferSize.value = normalizedSize;
        return;
    }
    waterfallFrames.value = resizeWaterfallHistory(waterfallFrames.value, normalizedSize);
    waterfallAverageAccumulator.rebuild(waterfallFrames.value);
    refreshWaterfallAverageSpectrum();
    scheduleWaterfallRender();
});

watch(waterfallAverageWindow, () => {
    refreshWaterfallAverageSpectrum();
    scheduleWaterfallRender();
});

watch([waterfallDisplayMode, isWaterfallAutoScroll], () => {
    scheduleWaterfallRender();
});

function handleWaterfallDataZoom() {
    if (waterfallDisplayMode.value === 'heatmap') {
        isWaterfallAutoScroll.value = false;
    }
}

watch(spectrumView, view => {
    nextTick(() => {
        if (view === 'waterfall') {
            renderWaterfallChart();
        } else {
            renderSpectrumChart();
        }
    });
});

async function togglePolling(val: boolean) {
    if (val) {
        resetSpectrumSampleRateEstimator();
        await props.controller.start_debug();
        if (oscilloscopeSelectedKeys.value.length > 0) {
            props.controller.request_debug_at(oscilloscopeSelectedKeys.value);
        }
    }
    else {
        await props.controller.stop_debug();
        isPolling.value = false;
        if (!isRenderPending) {
            isRenderPending = true;
            requestAnimationFrame(renderCharts);
        }
        scheduleSpectrumRender();
    }
}
watch(themeName, () => {
    // nextTick 确保 Vue-ECharts 已经完成了旧图表的销毁和新图表的挂载
    nextTick(() => {
        if (!isRenderPending) {
            isRenderPending = true;
            requestAnimationFrame(renderCharts);
        }
        scheduleSpectrumRender();
        scheduleWaterfallRender();
    });
});
// --- 数据同步与节流渲染 ---
function processDataSync(currentTick: number, updatedKeys: number[]) {
    const numericTick = Number(currentTick);
    if (numericTick < latestTick) {
        resetSpectrumSampleRateEstimator();
        resetWaterfallHistory();
    }
    latestTick = numericTick;
    const minHistoryTick = numericTick - windowSize.value;

    // 设定一个缓冲余量，避免频繁触发数组重构 (额外保留 500 个点)
    const bufferLimit = windowSize.value + 500;

    updatedKeys.forEach(keyId => {
        if (!oscilloscopeSelectedKeys.value.includes(keyId)) return;

        const targetKey = advancedKeys.value[keyId];
        if (targetKey) {
            if (!rawDataCache[keyId]) rawDataCache[keyId] = [];
            if (!filteredRawDataCache[keyId]) filteredRawDataCache[keyId] = [];
            if (!valueDataCache[keyId]) valueDataCache[keyId] = [];
            if (!stateDataCache[keyId]) stateDataCache[keyId] = [];
            if (!reportStateDataCache[keyId]) reportStateDataCache[keyId] = [];
            if (!stateAreasCache[keyId]) stateAreasCache[keyId] = [];

            // 追加新数据
            rawDataCache[keyId].push([numericTick, targetKey.raw]);
            filteredRawDataCache[keyId].push([numericTick, targetKey.filtered_raw ?? targetKey.raw]);
            valueDataCache[keyId].push([numericTick, targetKey.value]);
            const stateValue: 0 | 1 = targetKey.state ? 1 : 0;
            const reportStateValue: 0 | 1 = targetKey.report_state ? 1 : 0;
            stateDataCache[keyId].push([numericTick, stateValue]);
            reportStateDataCache[keyId].push([numericTick, reportStateValue]);

            // --- 状态边缘检测与区间记录 ---
            const isPressed = stateValue === 1 || reportStateValue === 1;
            const lastState = lastStateCache[keyId] || false;

            if (isPressed && !lastState) {
                stateAreasCache[keyId].push({ start: numericTick, end: null });
            } else if (!isPressed && lastState) {
                const areas = stateAreasCache[keyId];
                if (areas.length > 0 && areas[areas.length - 1].end === null) {
                    areas[areas.length - 1].end = numericTick;
                }
            }
            lastStateCache[keyId] = !!isPressed;

            // --- 性能优化：批量截断数组 (Amortized Slicing) ---
            // 只有当数组长度超过 bufferLimit 时，才进行一次截断操作
            if (rawDataCache[keyId].length > bufferLimit) {
                // 直接保留最后 windowSize 个元素，这是最高效的 JS 数组截断方式
                rawDataCache[keyId] = rawDataCache[keyId].slice(-windowSize.value);
            }
            if (filteredRawDataCache[keyId].length > bufferLimit) {
                filteredRawDataCache[keyId] = filteredRawDataCache[keyId].slice(-windowSize.value);
            }
            if (valueDataCache[keyId].length > bufferLimit) {
                valueDataCache[keyId] = valueDataCache[keyId].slice(-windowSize.value);
            }
            if (stateDataCache[keyId].length > bufferLimit) {
                stateDataCache[keyId] = stateDataCache[keyId].slice(-windowSize.value);
            }
            if (reportStateDataCache[keyId].length > bufferLimit) {
                reportStateDataCache[keyId] = reportStateDataCache[keyId].slice(-windowSize.value);
            }

            // stateAreas 同样进行批量清理
            if (stateAreasCache[keyId].length > 50) { // markArea 通常不会太多，稍微堆积一点再清理
                stateAreasCache[keyId] = stateAreasCache[keyId].filter(area =>
                    area.end === null || area.end >= minHistoryTick
                );
            }
        }
    });
}
function renderCharts() {
    const maxTick = latestTick;
    const minTick = latestTick - windowSize.value;
    const layout = buildChartLayout(getChartHeight());
    const stateTrackCount = getStateTrackCount();

    const seriesData: any[] = [];

    oscilloscopeSelectedKeys.value.forEach((id, index) => {
        const color = lineColors[index % lineColors.length];
        const isHidden = hiddenKeys.value.includes(id);

        const markAreaData = isHidden ? [] : (stateAreasCache[id] || []).map(area => [
            { xAxis: area.start },
            { xAxis: area.end !== null ? area.end : maxTick }
        ]);

        // 复用或创建 Raw Series
        const rawId = `raw_${id}`;
        if (!seriesCache[rawId]) {
            seriesCache[rawId] = {
                id: rawId, name: `Raw ${id}`, type: 'line', xAxisIndex: 0, yAxisIndex: 0,
                showSymbol: false, 
                itemStyle: { color }, 
                lineStyle: { width: 1, type: 'dashed', opacity: 0.35 }, // 虚线 + 半透明
                //sampling: 'lttb',
            };
        }
        seriesCache[rawId].itemStyle.color = color;
        seriesCache[rawId].lineStyle.color = color;
        seriesCache[rawId].data = isHidden ? [] : rawDataCache[id];
        seriesCache[rawId].markArea = undefined;
        //seriesCache[rawId].markArea = isHidden ? undefined : { silent: true, itemStyle: { opacity: 0.25 }, data: markAreaData };
        seriesData.push(seriesCache[rawId]);

        const fRawId = `f_raw_${id}`;
        if (!seriesCache[fRawId]) {
            seriesCache[fRawId] = {
                id: fRawId, name: `Filtered ${id}`, type: 'line', xAxisIndex: 0, yAxisIndex: 0,
                showSymbol: false, 
                itemStyle: { color }, 
                lineStyle: { width: 1, opacity: 1 }, // 实线，略粗
            };
        }
        seriesCache[fRawId].itemStyle.color = color;
        seriesCache[fRawId].lineStyle.color = color;
        seriesCache[fRawId].data = isHidden ? [] : filteredRawDataCache[id];
        seriesCache[fRawId].markArea = isHidden ? undefined : { silent: true, itemStyle: { opacity: 0.25 }, data: markAreaData };
        seriesData.push(seriesCache[fRawId]);

        // 复用或创建 Value Series
        const valId = `val_${id}`;
        if (!seriesCache[valId]) {
            seriesCache[valId] = {
                id: valId, name: `Key ${id}`, type: 'line', xAxisIndex: 1, yAxisIndex: 1,
                showSymbol: false, itemStyle: { color }, lineStyle: { width: 1 },
                //sampling: 'lttb', // 开启降采样
            };
        }
        seriesCache[valId].itemStyle.color = color;
        seriesCache[valId].lineStyle.color = color;
        seriesCache[valId].data = isHidden ? [] : valueDataCache[id];
        seriesCache[valId].markArea = isHidden ? undefined : { silent: true, itemStyle: { opacity: 0.25 }, data: markAreaData };
        seriesData.push(seriesCache[valId]);

        const stateBase = getDigitalTrackValue(index, 0, 0);
        const stateId = `state_${id}`;
        if (!seriesCache[stateId]) {
            seriesCache[stateId] = {
                id: stateId,
                name: `State ${id}`,
                type: 'line',
                step: 'end',
                xAxisIndex: 2,
                yAxisIndex: 2,
                showSymbol: false,
                itemStyle: { color },
                lineStyle: { width: 1, color },
            };
        }
        seriesCache[stateId].itemStyle.color = color;
        seriesCache[stateId].lineStyle.color = color;
        seriesCache[stateId].areaStyle = { color, opacity: 0.25, origin: stateBase };
        seriesCache[stateId].data = isHidden ? [] : buildDigitalTrackData(stateDataCache[id], index, 0);
        seriesData.push(seriesCache[stateId]);

        const reportStateBase = getDigitalTrackValue(index, 1, 0);
        const reportStateId = `report_state_${id}`;
        if (!seriesCache[reportStateId]) {
            seriesCache[reportStateId] = {
                id: reportStateId,
                name: `Report ${id}`,
                type: 'line',
                step: 'end',
                xAxisIndex: 2,
                yAxisIndex: 2,
                showSymbol: false,
                itemStyle: { color },
                lineStyle: { width: 1, type: 'dashed', color },
            };
        }
        seriesCache[reportStateId].itemStyle.color = color;
        seriesCache[reportStateId].lineStyle.color = color;
        seriesCache[reportStateId].areaStyle = { color, opacity: 0.25, origin: reportStateBase };
        
        seriesCache[reportStateId].data = isHidden ? [] : buildDigitalTrackData(reportStateDataCache[id], index, 1);
        seriesData.push(seriesCache[reportStateId]);
    });
    if (isMeasuring.value) {
        [0, 1].forEach(grid => {
            const fixedPts = measurePoints.value[grid];
            
            // 组装要绘制的点（包括固定点和当前鼠标的临时跟随点）
            const renderPts = [...fixedPts];
            if (fixedPts.length === 1 && hoverPoint.value?.gridIndex === grid) {
                renderPts.push({ x: hoverPoint.value.x, y: hoverPoint.value.y });
            }

            if (renderPts.length === 0) return;

            const measureSeries: any = {
                id: `measure_series_${grid}`,
                name: 'Measure',
                type: 'line',
                xAxisIndex: grid,
                yAxisIndex: grid,
                symbol: 'path://M-1,-1 L1,1 M1,-1 L-1,1', // 准星形状
                symbolSize: 16,
                tooltip: { show: false },
                // 【核心修复 2】：为两个点分配不同的原点颜色 (青色 和 橙色)
                data: renderPts.map((p, i) => ({
                    value: [p.x, p.y],
                    itemStyle: { color: i === 0 ? '#00e5ff' : '#ffaa00' } 
                })),
                markLine: {
                    silent: true, animation: false, symbol: ['none', 'none'],
                    label: { show: false }, // 彻底关闭画布内的文字渲染
                    data: []
                },
                z: 999 
            };

            // 用 xAxis 和 yAxis 画出纵贯全局的十字线！
            renderPts.forEach((p, index) => {
                const color = index === 0 ? '#00e5ff' : '#ffaa00';
                measureSeries.markLine.data.push(
                    { xAxis: p.x, lineStyle: { type: 'dashed', width: 1, color } },
                    { yAxis: p.y, lineStyle: { type: 'dashed', width: 1, color } }
                );
            });
            seriesData.push(measureSeries);
        });
    }
    const updateOption: any = {
        grid: layout.grids,
        yAxis: [
            { min: 0, max: 'dataMax' },
            { min: -0.1, max: 1.1 },
            {
                min: -0.5,
                max: stateTrackCount - 0.5,
                axisLabel: { formatter: formatStateTrackLabel }
            }
        ],
        dataZoom: [
            {
                id: 'dz-inside',
                xAxisIndex: [0, 1, 2],
                ...(isPolling.value ? { startValue: minTick, endValue: maxTick } : {})
            },
            {
                id: 'dz-slider',
                xAxisIndex: [0, 1, 2],
                bottom: layout.xSlider.bottom,
                height: layout.xSlider.height,
                ...(isPolling.value ? { startValue: minTick, endValue: maxTick } : {})
            },
            {
                id: 'dz-y-slider-raw',
                right: layout.rawYSlider.right,
                top: layout.rawYSlider.top,
                height: layout.rawYSlider.height,
                width: layout.rawYSlider.width
            },
            {
                id: 'dz-y-slider-val',
                right: layout.valueYSlider.right,
                top: layout.valueYSlider.top,
                height: layout.valueYSlider.height,
                width: layout.valueYSlider.width
            }
        ],
        series: seriesData,
        tooltip: {
            backgroundColor: themeName.value === 'dark' ? 'rgba(30, 30, 34, 0.7)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: themeName.value === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            transitionDuration: 0,
            showDelay: 0,
            hideDelay: 0,
            axisPointer: { type: 'cross', animation: false },
        }
    };

    if (isPolling.value) {
        updateOption.xAxis = [
            { min: minTick, max: maxTick },
            { min: minTick, max: maxTick },
            { min: minTick, max: maxTick }
        ];
    } else {
        updateOption.xAxis = [
            { min: 'dataMin', max: 'dataMax' },
            { min: 'dataMin', max: 'dataMax' },
            { min: 'dataMin', max: 'dataMax' }
        ];
    }

    const chart = chartRef.value?.chart || chartRef.value;
    // 使用纯净的引用更新，关闭不需要的过度动画
    if (chart && typeof chart.setOption === 'function') {
        chart.setOption(updateOption, {
            replaceMerge: ['series'],
            lazyUpdate: true // 让 ECharts 决定最佳的更新时机
        });
    }

    if (isSpectrumEnabled.value) {
        renderSpectrumChart();
    }

    isRenderPending = false;
}
// --- 事件监听 ---
const handleDebugDataUpdated = (event: Event) => {
    const customEvent = event as CustomEvent;
    const currentTick = customEvent.detail.tick;
    const updatedKeys = customEvent.detail.updated_keys as number[];

    updateSpectrumSampleRateEstimate(Number(currentTick));
    processDataSync(currentTick, updatedKeys);
    captureWaterfallFrame(Number(currentTick), updatedKeys);

    if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(renderCharts);
    }
};

onMounted(() => {
    connect('osc_group');
    props.controller.addEventListener('updateDebugData', handleDebugDataUpdated);
    oscilloscopeShellRef.value?.addEventListener('wheel', preventBrowserZoomOnCtrlWheel, {
        passive: false,
        capture: true
    });
    if (chartPanelRef.value && typeof ResizeObserver !== 'undefined') {
        chartResizeObserver = new ResizeObserver(() => scheduleChartRender());
        chartResizeObserver.observe(chartPanelRef.value);
    }
});

onBeforeUnmount(() => {
    chartResizeObserver?.disconnect();
    chartResizeObserver = null;
    oscilloscopeShellRef.value?.removeEventListener('wheel', preventBrowserZoomOnCtrlWheel, true);
    if (isPolling.value) {
        props.controller.stop_debug();
    }
    isPolling.value = false;
    props.controller.removeEventListener('updateDebugData', handleDebugDataUpdated);
    selectedKeys.value = [];
});

function clearWaveform() {
    resetSpectrumSampleRateEstimator();
    resetWaterfallHistory();
    oscilloscopeSelectedKeys.value.forEach(id => {
        if (rawDataCache[id]) rawDataCache[id].length = 0;
        if (filteredRawDataCache[id]) filteredRawDataCache[id].length = 0;
        if (valueDataCache[id]) valueDataCache[id].length = 0;
        if (stateDataCache[id]) stateDataCache[id].length = 0;
        if (reportStateDataCache[id]) reportStateDataCache[id].length = 0;
        if (stateAreasCache[id]) stateAreasCache[id].length = 0; // 新增清理
        if (lastStateCache[id]) lastStateCache[id] = false;     // 新增清理
    });
    for (const key in seriesCache) delete seriesCache[key];
    // 强制清理视图
    if (chartRef.value?.chart) {
        const emptySeries = oscilloscopeSelectedKeys.value.flatMap(id => [
            { id: `raw_${id}`, data: [] },
            { id: `f_raw_${id}`, data: [] },
            { id: `val_${id}`, data: [] },
            { id: `state_${id}`, data: [] },
            { id: `report_state_${id}`, data: [] }
        ]);
        chartRef.value.chart.setOption({ series: emptySeries }, { replaceMerge: ['series'] });
    }
    renderSpectrumChart();
}

// 监听 measurePoints，自动计算 Raw 和 Value 两个图表的统计结果
const rawAnalysisStats = computed(() => {
    if (!isMeasuring.value || measurePoints.value[0].length !== 2) return null;
    return calculateStats(rawDataCache, oscilloscopeSelectedKeys.value, hiddenKeys.value, measurePoints.value[0]);
});

const valAnalysisStats = computed(() => {
    if (!isMeasuring.value || measurePoints.value[1].length !== 2) return null;
    return calculateStats(valueDataCache, oscilloscopeSelectedKeys.value, hiddenKeys.value, measurePoints.value[1]);
});

const rawAnalysisEntries = computed(() => {
    return Object.entries(rawAnalysisStats.value ?? {}).map(([id, stats]) => ({
        id: Number(id),
        stats
    }));
});

const valAnalysisEntries = computed(() => {
    return Object.entries(valAnalysisStats.value ?? {}).map(([id, stats]) => ({
        id: Number(id),
        stats
    }));
});
</script>

<template>
    <div ref="oscilloscopeShellRef" class="oscilloscope-shell" :class="{ 'is-dark': themeName === 'dark' }">
        <div class="scope-toolbar">
            <div class="toolbar-main">
                <label class="debug-control">
                    <span class="control-label">{{ t('oscilloscope_panel_enable_debug') }}</span>
                    <n-switch v-model:value="isPolling" size="small" @update:value="togglePolling" />
                </label>

                <n-select
                    v-model:value="oscilloscopeSelectedKeys"
                    class="key-select"
                    multiple
                    clearable
                    size="small"
                    :max-selected-count="4"
                    :max-tag-count="4"
                    :options="keyOptions"
                    placeholder="Select keys"
                />

                <label class="window-control">
                    <span class="control-label">{{ t('oscilloscope_panel_buffer_length') }}</span>
                    <n-input-number
                        v-model:value="windowSize"
                        class="window-input"
                        size="small"
                        :min="8000"
                        :step="8000"
                        :show-button="true"
                    />
                </label>

                <label class="spectrum-control">
                    <span class="control-label">{{ t('oscilloscope_panel_spectrum') }}</span>
                    <n-switch v-model:value="isSpectrumEnabled" size="small" />
                </label>

                <div class="toolbar-actions">
                    <n-tooltip trigger="hover">
                        <template #trigger>
                            <n-button size="small" circle quaternary :disabled="oscilloscopeSelectedKeys.length === 0" @click="clearWaveform">
                                <template #icon>
                                    <n-icon><ClearAllOutlined /></n-icon>
                                </template>
                            </n-button>
                        </template>
                        {{ t('clear') }}
                    </n-tooltip>

                    <n-tooltip trigger="hover">
                        <template #trigger>
                            <n-button size="small" circle secondary :type="isMeasuring ? 'info' : 'default'" @click="toggleMeasureMode">
                                <template #icon>
                                    <n-icon><StraightenOutlined /></n-icon>
                                </template>
                            </n-button>
                        </template>
                        {{ isMeasuring ? t('oscilloscope_panel_exit_measuring') : t('oscilloscope_panel_measuring_tool') }}
                    </n-tooltip>
                </div>

                <div v-if="selectedKeyLegend.length > 0" class="key-legend">
                    <button
                        v-for="item in selectedKeyLegend"
                        :key="item.id"
                        class="legend-chip"
                        :class="{ 'is-hidden': item.hidden }"
                        :style="{ '--key-color': item.color }"
                        type="button"
                        @click="toggleKeyVisibility(item.id)"
                    >
                        <span class="legend-dot"></span>
                        <span class="legend-label">Key {{ item.id }}</span>
                    </button>
                </div>
            </div>
        </div>

        <div ref="chartPanelRef" class="chart-panel">
            <div v-if="isMeasuring && measurePoints[0].length === 2" class="measurement-panel measurement-panel--raw">
                <div class="measurement-title">Raw Measurement & Analysis</div>
                <div class="measurement-deltas">
                    <span>ΔX: <b class="delta-x">{{ Math.abs(measurePoints[0][1].x - measurePoints[0][0].x).toFixed(0) }}</b> Ticks</span>
                    <span>ΔY: <b class="delta-y">{{ Math.abs(measurePoints[0][1].y - measurePoints[0][0].y).toFixed(0) }}</b></span>
                </div>
                <div v-if="rawAnalysisEntries.length > 0" class="analysis-list">
                    <div
                        v-for="entry in rawAnalysisEntries"
                        :key="entry.id"
                        class="analysis-row"
                        :style="{ borderLeftColor: getKeyColor(entry.id) }"
                    >
                        <div class="analysis-key">Key {{ entry.id }}</div>
                        <div class="analysis-values">
                            <span class="metric metric-vpp" title="Peak-to-Peak Noise">Vpp: <b>{{ entry.stats.vpp.toFixed(0) }}</b></span>
                            <span class="metric metric-rms" title="Root Mean Square Noise">RMS: <b>{{ entry.stats.rms.toFixed(2) }}</b></span>
                            <span class="metric metric-step" title="Max Step Noise">Max Δ: <b>{{ entry.stats.maxDelta.toFixed(0) }}</b></span>
                            <span class="metric metric-cf" title="Crest Factor">CF: <b>{{ entry.stats.crestFactor.toFixed(2) }}</b></span>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="isMeasuring && measurePoints[1].length === 2" class="measurement-panel measurement-panel--value">
                <div class="measurement-title">Value Measurement & Analysis</div>
                <div class="measurement-deltas">
                    <span>ΔX: <b class="delta-x">{{ Math.abs(measurePoints[1][1].x - measurePoints[1][0].x).toFixed(0) }}</b> Ticks</span>
                    <span>ΔY: <b class="delta-y">{{ Math.abs(measurePoints[1][1].y - measurePoints[1][0].y).toFixed(3) }}</b></span>
                </div>
                <div v-if="valAnalysisEntries.length > 0" class="analysis-list">
                    <div
                        v-for="entry in valAnalysisEntries"
                        :key="entry.id"
                        class="analysis-row"
                        :style="{ borderLeftColor: getKeyColor(entry.id) }"
                    >
                        <div class="analysis-key">Key {{ entry.id }}</div>
                        <div class="analysis-values">
                            <span class="metric metric-vpp" title="Peak-to-Peak Noise">Vpp: <b>{{ entry.stats.vpp.toFixed(4) }}</b></span>
                            <span class="metric metric-rms" title="Root Mean Square Noise">RMS: <b>{{ entry.stats.rms.toFixed(4) }}</b></span>
                            <span class="metric metric-step" title="Max Step Noise">Max Δ: <b>{{ entry.stats.maxDelta.toFixed(4) }}</b></span>
                            <span class="metric metric-cf" title="Crest Factor">CF: <b>{{ entry.stats.crestFactor.toFixed(2) }}</b></span>
                        </div>
                    </div>
                </div>
            </div>

            <v-chart ref="chartRef" :theme="themeName" :option="chartOption" :update-options="{ replaceMerge: ['series'] }"
                class="scope-chart"
                @zr:click="handleChartClick"
                @zr:mousedown="handleChartMouseDown"
                @zr:mousemove="handleChartMouseMove"
                @zr:mouseup="handleChartMouseUp"
                autoresize 
                :style="{ 
                    cursor: isMeasuring ? (isHoveringPoint || dragInfo !== null ? 'move' : 'crosshair') : 'default', 
                }" />
        </div>

        <div
            v-if="isSpectrumEnabled"
            class="spectrum-panel"
            :class="{
                'is-settings-open': spectrumSettingsExpandedNames.length > 0,
                'is-waterfall': spectrumView === 'waterfall'
            }"
        >
            <n-collapse v-model:expanded-names="spectrumSettingsExpandedNames" class="spectrum-settings">
                <n-collapse-item name="settings" :title="t('oscilloscope_panel_spectrum_settings')">
                    <div class="spectrum-settings-grid">
                        <label class="spectrum-setting-control">
                            <span class="control-label">{{ t('oscilloscope_panel_spectrum_source') }}</span>
                            <n-select
                                v-model:value="spectrumSource"
                                class="spectrum-source-select"
                                size="small"
                                :options="spectrumSourceOptions"
                            />
                        </label>
                        <label class="spectrum-setting-control">
                            <span class="control-label">{{ t('oscilloscope_panel_spectrum_fft_size') }}</span>
                            <n-select
                                v-model:value="spectrumFftSize"
                                class="spectrum-size-select"
                                size="small"
                                :options="spectrumFftSizeOptions"
                            />
                        </label>
                        <label class="spectrum-setting-control">
                            <span class="control-label">{{ t('oscilloscope_panel_spectrum_scale') }}</span>
                            <n-select
                                v-model:value="spectrumScale"
                                class="spectrum-scale-select"
                                size="small"
                                :options="spectrumScaleOptions"
                            />
                        </label>
                        <label v-if="spectrumView === 'waterfall'" class="spectrum-setting-control waterfall-buffer-control">
                            <span class="control-label">{{ t('oscilloscope_panel_waterfall_buffer_frames') }}</span>
                            <n-input-number
                                v-model:value="waterfallBufferSize"
                                class="waterfall-buffer-input"
                                size="small"
                                :min="WATERFALL_MIN_BUFFER_FRAMES"
                                :max="WATERFALL_MAX_BUFFER_FRAMES"
                                :step="WATERFALL_FRAME_RATE_HZ"
                                :show-button="true"
                            />
                            <span class="waterfall-buffer-duration">{{ waterfallBufferDuration }}</span>
                        </label>
                    </div>
                </n-collapse-item>
            </n-collapse>
            <div class="spectrum-header">
                <span class="spectrum-title">{{ t('oscilloscope_panel_spectrum') }}</span>
                <div class="spectrum-view-switch" role="group" :aria-label="t('oscilloscope_panel_spectrum')">
                    <n-button
                        size="tiny"
                        :type="spectrumView === 'spectrum' ? 'primary' : 'default'"
                        @click="spectrumView = 'spectrum'"
                    >
                        {{ t('oscilloscope_panel_spectrum_view_spectrum') }}
                    </n-button>
                    <n-button
                        size="tiny"
                        :type="spectrumView === 'waterfall' ? 'primary' : 'default'"
                        @click="spectrumView = 'waterfall'"
                    >
                        {{ t('oscilloscope_panel_spectrum_view_waterfall') }}
                    </n-button>
                </div>
                <span class="spectrum-rate" :class="{ 'is-estimating': !isSpectrumSampleRateEstimated }">
                    {{ t('oscilloscope_panel_spectrum_sample_rate') }} {{ formatSampleRate(spectrumSampleRateHz) }}
                </span>
                <n-button
                    v-if="selectedWaterfallFrame"
                    size="tiny"
                    tertiary
                    @click="returnToLiveSpectrum"
                >
                    {{ t('oscilloscope_panel_waterfall_return_live') }}
                </n-button>
                <div class="spectrum-peaks">
                    <span
                        v-for="peak in spectrumPeakInfo"
                        :key="peak.id"
                        class="spectrum-peak"
                        :class="{
                            'is-warning': peak.status === 'ready' && peak.coverage < SPECTRUM_QUALITY_WARNING_THRESHOLD,
                            'is-waiting': peak.status === 'waiting'
                        }"
                        :style="{ '--key-color': peak.color }"
                    >
                        <span class="spectrum-peak-dot"></span>
                        <template v-if="peak.status === 'ready' && peak.frequency !== null">
                            Key {{ peak.id }} {{ t('oscilloscope_panel_spectrum_peak') }} {{ formatFrequency(peak.frequency) }}
                            · {{ t('oscilloscope_panel_spectrum_quality') }} {{ formatPercent(peak.coverage) }}
                            · {{ t('oscilloscope_panel_spectrum_gap') }} {{ peak.maxGapTicks }}t
                        </template>
                        <template v-else>
                            Key {{ peak.id }} {{ t('oscilloscope_panel_spectrum_waiting') }}
                        </template>
                    </span>
                    <span v-if="spectrumPeakInfo.length === 0" class="spectrum-empty">
                        {{ t('oscilloscope_panel_spectrum_waiting') }}
                    </span>
                </div>
            </div>
            <template v-if="spectrumView === 'spectrum'">
                <v-chart
                    ref="spectrumChartRef"
                    :theme="themeName"
                    :option="spectrumOption"
                    :update-options="{ replaceMerge: ['series'] }"
                    class="spectrum-chart"
                    autoresize
                />
            </template>
            <template v-else>
                <div class="waterfall-toolbar">
                    <label class="waterfall-key-control">
                        <span class="control-label">{{ t('oscilloscope_panel_waterfall_analysis_key') }}</span>
                        <n-select
                            v-model:value="waterfallAnalysisKey"
                            class="waterfall-key-select"
                            size="tiny"
                            :options="waterfallAnalysisKeyOptions"
                            :disabled="waterfallAnalysisKeyOptions.length === 0"
                        />
                    </label>
                    <div class="waterfall-display-control" role="group" :aria-label="t('oscilloscope_panel_waterfall_display_mode')">
                        <span class="control-label">{{ t('oscilloscope_panel_waterfall_display_mode') }}</span>
                        <n-button
                            size="tiny"
                            :type="waterfallDisplayMode === 'heatmap' ? 'primary' : 'default'"
                            @click="waterfallDisplayMode = 'heatmap'"
                        >
                            {{ t('oscilloscope_panel_waterfall_display_heatmap') }}
                        </n-button>
                        <n-button
                            size="tiny"
                            :type="waterfallDisplayMode === 'average' ? 'primary' : 'default'"
                            @click="waterfallDisplayMode = 'average'"
                        >
                            {{ t('oscilloscope_panel_waterfall_display_average') }}
                        </n-button>
                    </div>
                    <label v-if="waterfallDisplayMode === 'average'" class="waterfall-average-control">
                        <span class="control-label">{{ t('oscilloscope_panel_waterfall_average_range') }}</span>
                        <n-select
                            v-model:value="waterfallAverageWindow"
                            class="waterfall-average-select"
                            size="tiny"
                            :options="waterfallAverageWindowOptions"
                        />
                    </label>
                    <label v-if="waterfallDisplayMode === 'heatmap'" class="waterfall-scroll-control">
                        <span class="control-label">{{ t('oscilloscope_panel_waterfall_auto_scroll') }}</span>
                        <n-switch v-model:value="isWaterfallAutoScroll" size="small" />
                    </label>
                    <div class="waterfall-actions">
                        <n-button size="tiny" @click="isWaterfallPaused = !isWaterfallPaused">
                            {{ isWaterfallPaused ? t('oscilloscope_panel_waterfall_resume') : t('oscilloscope_panel_waterfall_pause') }}
                        </n-button>
                        <n-button size="tiny" @click="clearWaterfallHistory">
                            {{ t('oscilloscope_panel_waterfall_clear_history') }}
                        </n-button>
                        <n-button v-if="waterfallDisplayMode === 'heatmap'" size="tiny" @click="resetWaterfallColorScale">
                            {{ t('oscilloscope_panel_waterfall_reset_scale') }}
                        </n-button>
                    </div>
                    <span v-if="waterfallDisplayMode === 'average'" class="waterfall-status">
                        {{ waterfallAverageSpectrum
                            ? t('oscilloscope_panel_waterfall_average_frame_count', { count: waterfallAverageSpectrum.frameCount })
                            : t('oscilloscope_panel_waterfall_average_waiting') }}
                        <template v-if="waterfallAverageSpectrum && isWaterfallWaitingForQuality">
                            · {{ t('oscilloscope_panel_waterfall_waiting_quality') }}
                        </template>
                    </span>
                    <span v-else-if="waterfallFrames.length === 0 || isWaterfallWaitingForQuality" class="waterfall-status">
                        {{ t('oscilloscope_panel_waterfall_waiting_quality') }}
                    </span>
                </div>
                <v-chart
                    ref="waterfallChartRef"
                    :theme="themeName"
                    :option="waterfallOption"
                    :update-options="{ replaceMerge: ['series'] }"
                    class="waterfall-chart"
                    autoresize
                    @click="handleWaterfallClick"
                    @datazoom="handleWaterfallDataZoom"
                />
            </template>
        </div>
    </div>
</template>

<style scoped>
.oscilloscope-shell {
    height: 100%;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-x: hidden;
    color: #20242c;
}

.oscilloscope-shell.is-dark {
    color: #d9dee8;
}

.scope-toolbar {
    flex: 0 0 auto;
    padding: 6px 8px;
    overflow-x: auto;
    scrollbar-width: thin;
    border: 1px solid rgba(30, 38, 52, 0.1);
    background: rgba(255, 255, 255, 0.78);
}

.is-dark .scope-toolbar {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(24, 27, 34, 0.78);
}

.toolbar-main {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px 8px;
    align-items: center;
    min-width: 0;
}

.debug-control,
.window-control,
.spectrum-control {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 28px;
}

.control-label {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.key-select {
    min-width: 180px;
    flex: 1 1 260px;
}

.window-input {
    width: 108px;
}

.spectrum-source-select {
    width: 128px;
}

.spectrum-size-select {
    width: 82px;
}

.spectrum-scale-select {
    width: 82px;
}

.toolbar-actions {
    display: inline-flex;
    justify-content: flex-end;
    gap: 4px;
}

.key-legend {
    margin-left: auto;
    display: flex;
    flex: 0 1 auto;
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: 4px;
    overflow-x: auto;
    min-width: 120px;
    scrollbar-width: thin;
}

.legend-chip {
    flex: 0 0 auto;
    height: 24px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 7px;
    color: inherit;
    border: 1px solid rgba(30, 38, 52, 0.12);
    background: rgba(255, 255, 255, 0.62);
    cursor: pointer;
    user-select: none;
    transition: border-color 0.16s ease, background-color 0.16s ease, opacity 0.16s ease;
}

.is-dark .legend-chip {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
}

.legend-chip:hover {
    border-color: var(--key-color);
    background: color-mix(in srgb, var(--key-color) 10%, transparent);
}

.legend-chip.is-hidden {
    opacity: 0.54;
}

.legend-dot {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border: 2px solid var(--key-color);
    background: var(--key-color);
}

.legend-chip.is-hidden .legend-dot {
    background: transparent;
}

.legend-label {
    font-size: 12px;
    line-height: 1;
}

.legend-chip.is-hidden .legend-label {
    text-decoration: line-through;
}

.chart-panel {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    border: 1px solid rgba(30, 38, 52, 0.1);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(247, 249, 252, 0.52));
}

.is-dark .chart-panel {
    border-color: rgba(255, 255, 255, 0.09);
    background: linear-gradient(180deg, rgba(21, 24, 30, 0.78), rgba(16, 18, 23, 0.62));
}

.scope-chart {
    width: 100%;
    height: 100%;
}

.spectrum-panel {
    flex: 0 0 160px;
    min-height: 132px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(30, 38, 52, 0.1);
    background: rgba(255, 255, 255, 0.74);
}

.spectrum-panel.is-settings-open {
    flex-basis: 216px;
}

.spectrum-panel.is-waterfall {
    flex-basis: 300px;
    min-height: 260px;
}

.spectrum-panel.is-waterfall.is-settings-open {
    flex-basis: 356px;
}

.is-dark .spectrum-panel {
    border-color: rgba(255, 255, 255, 0.09);
    background: rgba(20, 23, 29, 0.76);
}

.spectrum-settings {
    flex: 0 0 auto;
    border-bottom: 1px solid rgba(30, 38, 52, 0.1);
}

.is-dark .spectrum-settings {
    border-bottom-color: rgba(255, 255, 255, 0.09);
}

.spectrum-settings :deep(.n-collapse-item) {
    margin: 0;
}

.spectrum-settings :deep(.n-collapse-item__header) {
    padding: 3px 8px;
    font-size: 12px;
}

.spectrum-settings :deep(.n-collapse-item__content-inner) {
    padding: 0 8px 7px;
}

.spectrum-settings-grid {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
}

.spectrum-setting-control {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.spectrum-header {
    flex: 0 0 28px;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 0 8px;
    border-bottom: 1px solid rgba(30, 38, 52, 0.1);
}

.spectrum-view-switch {
    display: inline-flex;
    flex: 0 0 auto;
    gap: 2px;
}

.spectrum-view-switch :deep(.n-button) {
    padding-right: 7px;
    padding-left: 7px;
}

.is-dark .spectrum-header {
    border-bottom-color: rgba(255, 255, 255, 0.09);
}

.spectrum-title {
    flex: 0 0 auto;
    font-size: 12px;
    font-weight: 700;
    color: #697386;
}

.is-dark .spectrum-title {
    color: #9aa4b5;
}

.spectrum-rate {
    flex: 0 0 auto;
    font-size: 12px;
    color: #4f5b6d;
    white-space: nowrap;
}

.spectrum-rate.is-estimating {
    color: #8a93a3;
}

.is-dark .spectrum-rate {
    color: #b8c0cc;
}

.is-dark .spectrum-rate.is-estimating {
    color: #8892a3;
}

.spectrum-peaks {
    min-width: 0;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: thin;
}

.spectrum-peak,
.spectrum-empty {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #3b4351;
    white-space: nowrap;
}

.is-dark .spectrum-peak,
.is-dark .spectrum-empty {
    color: #c2cad8;
}

.spectrum-empty {
    color: #8a93a3;
}

.spectrum-peak.is-warning {
    color: #c87500;
}

.is-dark .spectrum-peak.is-warning {
    color: #f0a020;
}

.spectrum-peak.is-waiting {
    color: #8a93a3;
}

.spectrum-peak-dot {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    background: var(--key-color);
}

.spectrum-chart {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
}

.waterfall-toolbar {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    min-height: 30px;
    padding: 4px 8px;
    border-bottom: 1px solid rgba(30, 38, 52, 0.1);
}

.is-dark .waterfall-toolbar {
    border-bottom-color: rgba(255, 255, 255, 0.09);
}

.waterfall-key-control,
.waterfall-display-control,
.waterfall-average-control,
.waterfall-scroll-control,
.waterfall-actions {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.waterfall-key-select {
    width: 104px;
}

.waterfall-average-select {
    width: 142px;
}

.waterfall-buffer-control {
    gap: 5px;
}

.waterfall-buffer-input {
    width: 112px;
}

.waterfall-buffer-duration {
    color: #8a93a3;
    font-size: 12px;
    white-space: nowrap;
}

.waterfall-actions {
    flex-wrap: wrap;
}

.waterfall-status {
    min-width: 0;
    flex: 1 1 160px;
    overflow: hidden;
    color: #8a93a3;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.waterfall-chart {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
}

.measurement-panel {
    position: absolute;
    left: 72px;
    z-index: 10;
    min-width: min(360px, calc(100% - 104px));
    max-width: min(560px, calc(100% - 104px));
    padding: 12px;
    pointer-events: none;
    border: 1px solid rgba(30, 38, 52, 0.12);
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
    backdrop-filter: blur(10px);
}

.is-dark .measurement-panel {
    border-color: rgba(255, 255, 255, 0.11);
    background: rgba(26, 29, 36, 0.9);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
}

.measurement-panel--raw {
    top: 16px;
}

.measurement-panel--value {
    top: calc(50% + 16px);
}

.measurement-title {
    padding-bottom: 6px;
    margin-bottom: 8px;
    color: #697386;
    border-bottom: 1px solid rgba(30, 38, 52, 0.12);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
}

.is-dark .measurement-title {
    color: #9aa4b5;
    border-bottom-color: rgba(255, 255, 255, 0.12);
}

.measurement-deltas {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin-bottom: 10px;
    font-size: 13px;
}

.delta-x {
    color: #007c89;
}

.delta-y {
    color: #c76a00;
}

.analysis-list {
    display: grid;
    gap: 8px;
}

.analysis-row {
    padding-left: 8px;
    border-left: 2px solid;
}

.analysis-key {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 700;
}

.analysis-values {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 12px;
}

.metric-vpp {
    color: #d03050;
}

.metric-rms {
    color: #18a058;
}

.metric-step {
    color: #c04b8e;
}

.metric-cf {
    color: #c87500;
}

@media (max-width: 960px) {
    .toolbar-main {
        min-width: max-content;
    }

    .key-select,
    .window-input {
        width: auto;
    }

    .spectrum-source-select,
    .spectrum-size-select,
    .spectrum-scale-select {
        width: auto;
        min-width: 86px;
    }

    .toolbar-actions {
        justify-content: flex-start;
    }

    .spectrum-panel {
        flex-basis: 140px;
    }

    .spectrum-panel.is-settings-open {
        flex-basis: 220px;
    }

    .spectrum-panel.is-waterfall {
        flex-basis: 260px;
        min-height: 230px;
    }

    .spectrum-panel.is-waterfall.is-settings-open {
        flex-basis: 340px;
    }

    .waterfall-toolbar {
        align-items: flex-start;
        flex-wrap: wrap;
    }

    .waterfall-status {
        flex-basis: 100%;
    }

    .measurement-panel {
        left: 56px;
        min-width: min(320px, calc(100% - 80px));
        max-width: calc(100% - 80px);
    }
}
</style>
