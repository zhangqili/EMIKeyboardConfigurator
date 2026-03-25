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
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkAreaComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import * as ekc from 'emi-keyboard-controller'
import { KeyConfig } from '@/apis/utils';

// 引入 LegendComponent 以便显示图例区分不同按键
use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkAreaComponent, DataZoomComponent, MarkLineComponent]);

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
            type: 'cross',
            animation: false,
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
                let isPressed = false; // 记录当前状态

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

                // --- 2. 获取 State 状态 ---
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
        { left: 60, right: 40, top: '4%', bottom: '52%' },   // 上半部分 Raw
        { left: 60, right: 40, top: '50%', bottom: 55 }   // 下半部分 Value
    ],
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
        }
    ],
    dataZoom: [
        // --- X 轴缩放 (原有) ---
        {
            id: 'dz-inside', 
            type: 'inside', 
            xAxisIndex: [0, 1],
            zoomOnMouseWheel: 'ctrl',
            moveOnMouseWheel: false,
            filterMode: 'none'
        },
        {
            id: 'dz-slider', 
            type: 'slider', 
            xAxisIndex: [0, 1], 
            bottom: 15,
            height: 20,              // 稍微调窄一点，看起来更精致
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
            right: 15, 
            top: '4%',
            bottom: '52%',
            width: 16,               // 调窄垂直滚动条
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
            right: 15, 
            top: '50%', 
            bottom: 55,
            width: 16,               // 调窄垂直滚动条
            filterMode: 'none',
            showDataShadow: false,   // 【核心】：关闭背景波形
            showDetail: false,       // 关闭文字提示
        }
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
    if (isPolling.value && newKeys.length > 0) {
        props.controller.request_debug_at(newKeys);
    }
    if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(renderCharts);
    }
});

async function togglePolling(val: boolean) {
    if (val) {
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

    // 设定一个缓冲余量，避免频繁触发数组重构 (额外保留 500 个点)
    const bufferLimit = windowSize.value + 500;

    updatedKeys.forEach(keyId => {
        if (!oscilloscopeSelectedKeys.value.includes(keyId)) return;

        const targetKey = advancedKeys.value[keyId];
        if (targetKey) {
            if (!rawDataCache[keyId]) rawDataCache[keyId] = [];
            if (!valueDataCache[keyId]) valueDataCache[keyId] = [];
            if (!stateAreasCache[keyId]) stateAreasCache[keyId] = [];

            // 追加新数据
            rawDataCache[keyId].push([numericTick, targetKey.raw]);
            valueDataCache[keyId].push([numericTick, targetKey.value]);

            // --- 状态边缘检测与区间记录 ---
            const isPressed = targetKey.state || (targetKey as any).report_state;
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

            if (valueDataCache[keyId].length > bufferLimit) {
                valueDataCache[keyId] = valueDataCache[keyId].slice(-windowSize.value);
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
const seriesCache: Record<string, any> = {};

function renderCharts() {
    const maxTick = latestTick;
    const minTick = latestTick - windowSize.value;

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
                id: rawId, name: `Key ${id}`, type: 'line', xAxisIndex: 0, yAxisIndex: 0,
                showSymbol: false, itemStyle: { color }, lineStyle: { width: 1 },
                //sampling: 'lttb', // 开启降采样，极大地提升高频数据渲染性能
            };
        }
        seriesCache[rawId].data = isHidden ? [] : rawDataCache[id];
        seriesCache[rawId].markArea = isHidden ? undefined : { silent: true, itemStyle: { opacity: 0.25 }, data: markAreaData };
        seriesData.push(seriesCache[rawId]);

        // 复用或创建 Value Series
        const valId = `val_${id}`;
        if (!seriesCache[valId]) {
            seriesCache[valId] = {
                id: valId, name: `Key ${id}`, type: 'line', xAxisIndex: 1, yAxisIndex: 1,
                showSymbol: false, itemStyle: { color }, lineStyle: { width: 1 },
                //sampling: 'lttb', // 开启降采样
            };
        }
        seriesCache[valId].data = isHidden ? [] : valueDataCache[id];
        seriesCache[valId].markArea = isHidden ? undefined : { silent: true, itemStyle: { opacity: 0.25 }, data: markAreaData };
        seriesData.push(seriesCache[valId]);
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
        series: seriesData,
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
    // 使用纯净的引用更新，关闭不需要的过度动画
    if (chart && typeof chart.setOption === 'function') {
        chart.setOption(updateOption, {
            replaceMerge: ['series'],
            lazyUpdate: true // 让 ECharts 决定最佳的更新时机
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
    for (const key in seriesCache) delete seriesCache[key];
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
                <n-input-number v-model:value="windowSize" :min="8000" :step="8000" />
            </n-flex>

            <n-button @click="clearWaveform">{{ t('clear') }}</n-button>
            
            <n-button :type="isMeasuring ? 'info' : 'default'" @click="toggleMeasureMode">
                {{ isMeasuring ? t('oscilloscope_panel_exit_measuring') : t('oscilloscope_panel_measuring_tool') }}
            </n-button>
            
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

        <div style="position: relative; flex: 1; width: 100%; height: 100%;">
            
            <div v-if="isMeasuring && measurePoints[0].length === 2"
                 :style="{
                     position: 'absolute', top: '16px', left: '80px', zIndex: 10, pointerEvents: 'none',
                     background: themeName === 'dark' ? 'rgba(30, 30, 34, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                     border: themeName === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                     padding: '8px 12px', borderRadius: '6px', backdropFilter: 'blur(4px)',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                 }">
                 <div :style="{ fontSize: '12px', color: themeName === 'dark' ? '#999' : '#666', marginBottom: '6px' }">Raw Measurement</div>
                 <div :style="{ fontSize: '13px', color: themeName === 'dark' ? '#eee' : '#333' }">
                     ΔX: <span style="font-weight:bold; color:#00e5ff">{{ Math.abs(measurePoints[0][1].x - measurePoints[0][0].x).toFixed(0) }}</span> Ticks
                 </div>
                 <div :style="{ fontSize: '13px', color: themeName === 'dark' ? '#eee' : '#333' }">
                     ΔY: <span style="font-weight:bold; color:#ffaa00">{{ Math.abs(measurePoints[0][1].y - measurePoints[0][0].y).toFixed(0) }}</span>
                 </div>
            </div>

            <div v-if="isMeasuring && measurePoints[1].length === 2"
                 :style="{
                     position: 'absolute', top: '52%', left: '80px', zIndex: 10, pointerEvents: 'none',
                     background: themeName === 'dark' ? 'rgba(30, 30, 34, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                     border: themeName === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                     padding: '8px 12px', borderRadius: '6px', backdropFilter: 'blur(4px)',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                 }">
                 <div :style="{ fontSize: '12px', color: themeName === 'dark' ? '#999' : '#666', marginBottom: '6px' }">Value Measurement</div>
                 <div :style="{ fontSize: '13px', color: themeName === 'dark' ? '#eee' : '#333' }">
                     ΔX: <span style="font-weight:bold; color:#00e5ff">{{ Math.abs(measurePoints[1][1].x - measurePoints[1][0].x).toFixed(0) }}</span> Ticks
                 </div>
                 <div :style="{ fontSize: '13px', color: themeName === 'dark' ? '#eee' : '#333' }">
                     ΔY: <span style="font-weight:bold; color:#ffaa00">{{ Math.abs(measurePoints[1][1].y - measurePoints[1][0].y).toFixed(3) }}</span>
                 </div>
            </div>

            <v-chart ref="chartRef" :theme="themeName" :option="chartOption" :update-options="{ replaceMerge: ['series'] }"
                @zr:click="handleChartClick"
                @zr:mousedown="handleChartMouseDown"
                @zr:mousemove="handleChartMouseMove"
                @zr:mouseup="handleChartMouseUp"
                autoresize 
                :style="{ 
                    cursor: isMeasuring ? (isHoveringPoint || dragInfo !== null ? 'move' : 'crosshair') : 'default', 
                    width: '100%', height: '100%' 
                }" />
        </div>
    </n-card>
</template>