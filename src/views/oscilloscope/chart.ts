export type DigitalSample = [number, 0 | 1];

export const DIGITAL_TRACK_AMPLITUDE = 0.32;

const GRID_LEFT = 60;
const GRID_RIGHT = 40;
const CHART_TOP_PADDING = 12;
const GRID_GAP = 8;
const X_SLIDER_BOTTOM = 12;
const X_SLIDER_HEIGHT = 22;
const X_AXIS_LABEL_RESERVE = 26;
const STATE_GRID_TARGET_HEIGHT = 72;
const STATE_GRID_MIN_HEIGHT = 48;
const MIN_WAVE_GRID_HEIGHT = 36;

export function buildChartLayout(chartHeight: number = 480) {
    const compact = chartHeight < 260;
    const topPadding = compact ? 6 : CHART_TOP_PADDING;
    const gridGap = compact ? 4 : GRID_GAP;
    const sliderBottom = compact ? 8 : X_SLIDER_BOTTOM;
    const sliderHeight = compact ? 18 : X_SLIDER_HEIGHT;
    const axisReserve = compact ? 20 : X_AXIS_LABEL_RESERVE;
    const availableHeight = Math.max(
        0,
        chartHeight - topPadding - sliderBottom - sliderHeight - axisReserve - gridGap * 2
    );
    const enoughForPreferredState = availableHeight >= STATE_GRID_MIN_HEIGHT + MIN_WAVE_GRID_HEIGHT * 2;
    const preferredStateHeight = Math.min(
        STATE_GRID_TARGET_HEIGHT,
        Math.max(STATE_GRID_MIN_HEIGHT, availableHeight - MIN_WAVE_GRID_HEIGHT * 2)
    );
    const stateHeight = enoughForPreferredState ? preferredStateHeight : STATE_GRID_MIN_HEIGHT;
    const waveHeight = Math.max(1, (availableHeight - stateHeight) / 2);
    const rawTop = topPadding;
    const valueTop = rawTop + waveHeight + gridGap;
    const stateTop = valueTop + waveHeight + gridGap;

    return {
        grids: [
            { left: GRID_LEFT, right: GRID_RIGHT, top: rawTop, height: waveHeight },
            { left: GRID_LEFT, right: GRID_RIGHT, top: valueTop, height: waveHeight },
            { left: GRID_LEFT, right: GRID_RIGHT, top: stateTop, height: stateHeight }
        ],
        rawYSlider: { right: 15, top: rawTop, height: waveHeight, width: 16 },
        valueYSlider: { right: 15, top: valueTop, height: waveHeight, width: 16 },
        xSlider: { bottom: sliderBottom, height: sliderHeight }
    };
}

export function getDigitalTrackValue(keyIndex: number, trackOffset: number, value: 0 | 1): number {
    return keyIndex * 2 + trackOffset + (value ? DIGITAL_TRACK_AMPLITUDE : -DIGITAL_TRACK_AMPLITUDE);
}

export function buildDigitalTrackData(samples: DigitalSample[] | undefined, keyIndex: number, trackOffset: number): [number, number][] {
    if (!samples) {
        return [];
    }
    return samples.map(([tick, value]) => [tick, getDigitalTrackValue(keyIndex, trackOffset, value)]);
}

export function getCacheValueAtTick(cache: [number, number][] | undefined, tick: number, dataIndex?: number): number | null {
    if (!cache) {
        return null;
    }
    if (dataIndex !== undefined && cache[dataIndex] && cache[dataIndex][0] === tick) {
        return cache[dataIndex][1];
    }
    const found = cache.find(d => d[0] === tick);
    return found ? found[1] : null;
}

export function formatStateHtml(value: number | null): string {
    if (value === null) {
        return '<span style="color: #777;">-</span>';
    }
    return value
        ? '<span style="color: #18a058; font-weight: bold;">ON</span>'
        : '<span style="color: #777;">OFF</span>';
}
