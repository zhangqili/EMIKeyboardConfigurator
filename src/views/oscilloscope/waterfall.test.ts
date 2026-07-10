import { describe, expect, it } from 'vitest';
import {
    WATERFALL_DB_RANGE,
    WATERFALL_MAX_BUFFER_FRAMES,
    WATERFALL_MAX_FRAMES,
    WATERFALL_MIN_BUFFER_FRAMES,
    aggregateWaterfallBuckets,
    appendWaterfallFrame,
    buildWaterfallAverageSpectrum,
    calibrateWaterfallColorRange,
    createWaterfallAverageAccumulator,
    createWaterfallFrame,
    getWaterfallCaptureIntervalTicks,
    normalizeWaterfallBufferSize,
    resizeWaterfallHistory,
    isWaterfallCaptureReady,
    isWaterfallFrameCompatible,
    shouldCaptureWaterfallFrame,
    type WaterfallAverageSpectrum,
    type WaterfallAverageWindow,
    type WaterfallFrame
} from './waterfall';

function makeFrame(overrides: Partial<WaterfallFrame> = {}): WaterfallFrame {
    return createWaterfallFrame({
        keyId: 2,
        tick: 1000,
        sampleRateHz: 8000,
        fftSize: 1024,
        source: 'filtered_raw',
        scale: 'db',
        coverage: 1,
        maxGapTicks: 0,
        fullMagnitudes: [
            [0, -90],
            [100, -30],
            [200, -60],
            [300, -40]
        ],
        ...overrides
    });
}

describe('waterfall capture cadence', () => {
    it('captures the first frame and then one row every round(Fs / 8) ticks', () => {
        expect(getWaterfallCaptureIntervalTicks(8000)).toBe(1000);
        expect(shouldCaptureWaterfallFrame(9000, null, 8000)).toBe(true);
        expect(shouldCaptureWaterfallFrame(9999, 9000, 8000)).toBe(false);
        expect(shouldCaptureWaterfallFrame(10000, 9000, 8000)).toBe(true);
    });

    it('allows the caller to start a new history after a tick rollback', () => {
        expect(shouldCaptureWaterfallFrame(50, 1000, 8000)).toBe(true);
        expect(shouldCaptureWaterfallFrame(50, 1000, 0)).toBe(false);
    });

    it('requires a stable sample-rate estimate and sufficient coverage', () => {
        expect(isWaterfallCaptureReady(false, 1)).toBe(false);
        expect(isWaterfallCaptureReady(true, 0.94)).toBe(false);
        expect(isWaterfallCaptureReady(true, 0.95)).toBe(true);
    });
});

describe('waterfall bucket aggregation', () => {
    it('preserves the highest narrow-band magnitude inside each bucket', () => {
        const magnitudes: [number, number][] = [
            [0, -90],
            [10, -12],
            [20, -75],
            [30, -40],
            [40, -55],
            [50, -5],
            [60, -50],
            [70, -60]
        ];

        expect(aggregateWaterfallBuckets(magnitudes, 4)).toEqual([-12, -40, -5, -50]);
    });

    it('uses NaN for a bucket with no usable magnitude', () => {
        const buckets = aggregateWaterfallBuckets([[0, Number.NaN]], 2);
        expect(buckets).toHaveLength(2);
        expect(buckets.every(Number.isNaN)).toBe(true);
    });
});

describe('waterfall history', () => {
    it('retains the latest frames as a FIFO and does not mutate its inputs', () => {
        const first = makeFrame({ tick: 1 });
        const second = makeFrame({ tick: 2 });
        const third = makeFrame({ tick: 3 });
        const history = [first, second];
        const next = appendWaterfallFrame(history, third, 2);

        expect(next.map(frame => frame.tick)).toEqual([2, 3]);
        expect(history.map(frame => frame.tick)).toEqual([1, 2]);
        expect(next[1]).not.toBe(third);

        (third.fullMagnitudes[0] as [number, number])[1] = -1;
        expect(next[1].fullMagnitudes[0][1]).toBe(-90);
    });

    it('supports the fixed 240-row default history capacity', () => {
        let history: WaterfallFrame[] = [];
        for (let tick = 0; tick <= WATERFALL_MAX_FRAMES; tick++) {
            history = appendWaterfallFrame(history, makeFrame({ tick }));
        }

        expect(history).toHaveLength(WATERFALL_MAX_FRAMES);
        expect(history[0].tick).toBe(1);
        expect(history[history.length - 1]?.tick).toBe(WATERFALL_MAX_FRAMES);
    });

    it('resizes the current history immediately without mutating its input', () => {
        const history = [makeFrame({ tick: 1 }), makeFrame({ tick: 2 }), makeFrame({ tick: 3 })];
        const resized = resizeWaterfallHistory(history, 2);

        expect(resized.map(frame => frame.tick)).toEqual([2, 3]);
        expect(history.map(frame => frame.tick)).toEqual([1, 2, 3]);
        expect(resized[0]).not.toBe(history[1]);
    });

    it('normalizes UI buffer values to the supported range', () => {
        expect(normalizeWaterfallBufferSize(null)).toBe(WATERFALL_MAX_FRAMES);
        expect(normalizeWaterfallBufferSize(0)).toBe(WATERFALL_MIN_BUFFER_FRAMES);
        expect(normalizeWaterfallBufferSize(12.6)).toBe(13);
        expect(normalizeWaterfallBufferSize(WATERFALL_MAX_BUFFER_FRAMES + 1)).toBe(WATERFALL_MAX_BUFFER_FRAMES);
    });
});

function expectAverageSpectraToMatch(
    actual: WaterfallAverageSpectrum | null,
    expected: WaterfallAverageSpectrum | null
) {
    expect(actual?.frameCount).toBe(expected?.frameCount);
    expect(actual?.firstTick).toBe(expected?.firstTick);
    expect(actual?.lastTick).toBe(expected?.lastTick);
    expect(actual?.configuration).toEqual(expected?.configuration);
    expect(actual?.data).toHaveLength(expected?.data.length ?? 0);
    actual?.data.forEach(([frequency, magnitude], index) => {
        const expectedPoint = expected?.data[index];
        expect(frequency).toBe(expectedPoint?.[0]);
        if (Number.isNaN(expectedPoint?.[1])) {
            expect(magnitude).toBeNaN();
        } else {
            expect(magnitude).toBeCloseTo(expectedPoint?.[1] ?? Number.NaN, 10);
        }
    });
}

describe('waterfall average spectrum', () => {
    it('averages dB rows in the power domain rather than averaging dB values', () => {
        const first = makeFrame({ tick: 1, fullMagnitudes: [[0, 0], [100, -20]] });
        const second = makeFrame({ tick: 2, fullMagnitudes: [[0, 6.020599913279624], [100, -40]] });

        const average = buildWaterfallAverageSpectrum([first, second]);

        expect(average?.frameCount).toBe(2);
        expect(average?.firstTick).toBe(1);
        expect(average?.lastTick).toBe(2);
        expect(average?.data[0]?.[1]).toBeCloseTo(3.979400086720376, 8);
        expect(average?.data[1]?.[1]).toBeCloseTo(-22.967086218813385, 8);
    });

    it('returns RMS amplitudes for linear rows', () => {
        const first = makeFrame({
            tick: 1,
            scale: 'linear',
            fullMagnitudes: [[0, 1], [100, 0]]
        });
        const second = makeFrame({
            tick: 2,
            scale: 'linear',
            fullMagnitudes: [[0, 2], [100, 3]]
        });

        const average = buildWaterfallAverageSpectrum([first, second]);

        expect(average?.data[0]?.[1]).toBeCloseTo(Math.sqrt(2.5), 10);
        expect(average?.data[1]?.[1]).toBeCloseTo(Math.sqrt(4.5), 10);
    });

    it('uses the requested newest rows and immediately averages a partially filled window', () => {
        const history = [1, 2, 3, 4, 5].map(tick => makeFrame({
            tick,
            scale: 'linear',
            fullMagnitudes: [[0, tick]]
        }));

        const all = buildWaterfallAverageSpectrum(history, 'all');
        const lastFour = buildWaterfallAverageSpectrum(history, 4);
        const lastEight = buildWaterfallAverageSpectrum(history, 8);
        const lastSixteen = buildWaterfallAverageSpectrum(history, 16);
        const lastThirtyTwo = buildWaterfallAverageSpectrum(history, 32);

        expect(all?.frameCount).toBe(5);
        expect(all?.firstTick).toBe(1);
        expect(all?.data[0]?.[1]).toBeCloseTo(Math.sqrt(11), 10);
        expect(lastFour?.frameCount).toBe(4);
        expect(lastFour?.firstTick).toBe(2);
        expect(lastFour?.lastTick).toBe(5);
        expect(lastFour?.data[0]?.[1]).toBeCloseTo(Math.sqrt(13.5), 10);
        [lastEight, lastSixteen, lastThirtyTwo].forEach(average => {
            expect(average?.frameCount).toBe(5);
            expect(average?.firstTick).toBe(1);
            expect(average?.lastTick).toBe(5);
        });
    });

    it('keeps full FFT resolution, skips incompatible and bad values, and leaves inputs untouched', () => {
        const first = makeFrame({
            tick: 1,
            fullMagnitudes: [[0, -20], [10, -30], [20, -40], [30, -50]]
        });
        first.bucketMagnitudes = [999];
        const incompatibleKey = makeFrame({
            tick: 0,
            keyId: 3,
            fullMagnitudes: [[0, 20], [10, 20], [20, 20], [30, 20]]
        });
        const incompatibleFrequencyAxis = makeFrame({
            tick: 3,
            fullMagnitudes: [[0, 20], [11, 20], [20, 20], [30, 20]]
        });
        const last = makeFrame({
            tick: 4,
            fullMagnitudes: [[0, -20], [10, Number.NaN], [20, Number.POSITIVE_INFINITY], [30, -40]]
        });
        const history = [incompatibleKey, first, incompatibleFrequencyAxis, last];
        const snapshot = history.map(frame => ({
            ...frame,
            fullMagnitudes: frame.fullMagnitudes.map(point => [...point]),
            bucketMagnitudes: [...frame.bucketMagnitudes]
        }));

        const average = buildWaterfallAverageSpectrum(history);

        expect(average?.frameCount).toBe(2);
        expect(average?.data).toHaveLength(4);
        expect(average?.data[0]).toEqual([0, -20]);
        expect(average?.data[1]).toEqual([10, -30]);
        expect(average?.data[2]).toEqual([20, -40]);
        expect(average?.data[3]?.[1]).toBeCloseTo(-42.59637310505756, 8);
        expect(history).toEqual(snapshot);
    });

    it('ignores malformed frequency axes while respecting configuration stream boundaries', () => {
        const first = makeFrame({ tick: 1, fullMagnitudes: [[0, -40], [10, -20]] });
        const malformedAxis = makeFrame({ tick: 2, fullMagnitudes: [[0, -20], [11, -10]] });
        const later = makeFrame({ tick: 3, fullMagnitudes: [[0, -20], [10, -10]] });
        const malformedTrailingAxis = makeFrame({ tick: 4, fullMagnitudes: [[Number.NaN, -10], [10, -10]] });
        const history = [first, malformedAxis, later, malformedTrailingAxis];
        const accumulator = createWaterfallAverageAccumulator();
        history.forEach(frame => accumulator.append(frame, 8));

        const average = buildWaterfallAverageSpectrum(history);
        expect(average?.frameCount).toBe(2);
        expect(average?.firstTick).toBe(1);
        expect(average?.lastTick).toBe(3);
        expectAverageSpectraToMatch(accumulator.get('all'), average);

        const changedConfiguration = makeFrame({ tick: 5, keyId: 7, fullMagnitudes: [[0, -30], [10, -20]] });
        const returnedConfiguration = makeFrame({ tick: 6, fullMagnitudes: [[0, -10], [10, -10]] });
        const mixedHistory = [first, changedConfiguration, returnedConfiguration];
        const mixedAccumulator = createWaterfallAverageAccumulator();
        mixedHistory.forEach(frame => mixedAccumulator.append(frame, 8));

        expect(buildWaterfallAverageSpectrum(mixedHistory)?.frameCount).toBe(1);
        expectAverageSpectraToMatch(
            mixedAccumulator.get('all'),
            buildWaterfallAverageSpectrum(mixedHistory)
        );
    });

    it('keeps rolling sums equivalent to the pure calculation through FIFO, resize, and reset', () => {
        const accumulator = createWaterfallAverageAccumulator();
        const windows: WaterfallAverageWindow[] = ['all', 4, 8, 16, 32];
        let history: WaterfallFrame[] = [];

        for (let tick = 1; tick <= 6; tick++) {
            const frame = makeFrame({
                tick,
                fullMagnitudes: [[0, -80 + tick], [10, -40 + tick * 2]]
            });
            history = appendWaterfallFrame(history, frame, 4);
            accumulator.append(frame, 4);
            windows.forEach(window => {
                expectAverageSpectraToMatch(
                    accumulator.get(window),
                    buildWaterfallAverageSpectrum(history, window)
                );
            });
        }

        history = resizeWaterfallHistory(history, 2);
        accumulator.rebuild(history);
        windows.forEach(window => {
            expectAverageSpectraToMatch(
                accumulator.get(window),
                buildWaterfallAverageSpectrum(history, window)
            );
        });

        const changedConfiguration = makeFrame({
            tick: 100,
            keyId: 9,
            fullMagnitudes: [[0, -10], [10, -20]]
        });
        accumulator.clear();
        accumulator.append(changedConfiguration, 4);
        expectAverageSpectraToMatch(
            accumulator.get('all'),
            buildWaterfallAverageSpectrum([changedConfiguration])
        );
    });
});

describe('waterfall color calibration and configuration', () => {
    it('locks a dB range to the first frame peak minus 50 dB', () => {
        const range = calibrateWaterfallColorRange(makeFrame());
        expect(range).toEqual({ min: -30 - WATERFALL_DB_RANGE, max: -30 });
    });

    it('uses zero to the first linear peak for a linear scale', () => {
        const frame = makeFrame({
            scale: 'linear',
            fullMagnitudes: [[0, 0.1], [10, 0.8]]
        });
        expect(calibrateWaterfallColorRange(frame)).toEqual({ min: 0, max: 0.8 });
    });

    it('does not consider changed analysis settings compatible', () => {
        const frame = makeFrame();
        expect(isWaterfallFrameCompatible(frame, {
            keyId: 2,
            sampleRateHz: 8000,
            fftSize: 1024,
            source: 'filtered_raw',
            scale: 'db'
        })).toBe(true);
        expect(isWaterfallFrameCompatible(frame, {
            keyId: 3,
            sampleRateHz: 8000,
            fftSize: 1024,
            source: 'filtered_raw',
            scale: 'db'
        })).toBe(false);
        expect(isWaterfallFrameCompatible(frame, {
            keyId: 2,
            sampleRateHz: 4000,
            fftSize: 1024,
            source: 'filtered_raw',
            scale: 'db'
        })).toBe(false);
        expect(isWaterfallFrameCompatible(frame, {
            keyId: 2,
            sampleRateHz: 8000,
            fftSize: 2048,
            source: 'filtered_raw',
            scale: 'db'
        })).toBe(false);
    });
});
