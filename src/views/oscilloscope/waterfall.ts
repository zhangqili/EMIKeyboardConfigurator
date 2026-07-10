import {
    SPECTRUM_QUALITY_WARNING_THRESHOLD,
    type SpectrumScale,
    type SpectrumSource
} from './spectrum';

/** Number of spectrum rows retained per second. */
export const WATERFALL_FRAME_RATE_HZ = 8;
/** Amount of time retained by the in-memory waterfall history. */
export const WATERFALL_HISTORY_SECONDS = 30;
/** Maximum number of rows retained by the in-memory waterfall history. */
export const WATERFALL_MAX_FRAMES = WATERFALL_FRAME_RATE_HZ * WATERFALL_HISTORY_SECONDS;
/** Smallest useful history capacity exposed by the waterfall controls. */
export const WATERFALL_MIN_BUFFER_FRAMES = WATERFALL_FRAME_RATE_HZ;
/** Largest history capacity exposed by the waterfall controls (five minutes). */
export const WATERFALL_MAX_BUFFER_FRAMES = WATERFALL_FRAME_RATE_HZ * 300;
/** Number of heatmap rows kept visible while live scrolling follows new data. */
export const WATERFALL_VISIBLE_ROWS = WATERFALL_FRAME_RATE_HZ * 8;
/** Number of horizontal frequency buckets rendered by the heatmap. */
export const WATERFALL_FREQUENCY_BUCKET_COUNT = 256;
/** Dynamic range used when calibrating a dB color scale. */
export const WATERFALL_DB_RANGE = 50;
/** Fixed tail windows exposed by the average-spectrum control. */
export const WATERFALL_AVERAGE_WINDOW_FRAME_COUNTS = [4, 8, 16, 32] as const;

export type WaterfallSpectrumPoint = readonly [frequency: number, magnitude: number];

/**
 * A self-contained spectrum snapshot.  The unaggregated bins are retained so
 * a user-selected row can later be shown in the regular, full-resolution
 * spectrum chart; bucketMagnitudes are only used by the heatmap.
 */
export type WaterfallFrame = {
    keyId: number;
    tick: number;
    sampleRateHz: number;
    fftSize: number;
    source: SpectrumSource;
    scale: SpectrumScale;
    coverage: number;
    maxGapTicks: number;
    fullMagnitudes: WaterfallSpectrumPoint[];
    bucketMagnitudes: number[];
};

export type WaterfallFrameInput = Omit<WaterfallFrame, 'bucketMagnitudes' | 'fullMagnitudes'> & {
    fullMagnitudes: readonly WaterfallSpectrumPoint[];
    bucketCount?: number;
};

export type WaterfallFrameConfiguration = Pick<WaterfallFrame, 'keyId' | 'sampleRateHz' | 'fftSize' | 'source' | 'scale'>;

export type WaterfallColorRange = {
    min: number;
    max: number;
};

export type WaterfallAverageWindow = 'all' | typeof WATERFALL_AVERAGE_WINDOW_FRAME_COUNTS[number];

export type WaterfallAverageSpectrum = {
    /** Full FFT-resolution frequency/magnitude points for the averaged curve. */
    data: WaterfallSpectrumPoint[];
    /** Number of compatible waterfall rows included in the average. */
    frameCount: number;
    /** Tick range covered by the included rows. */
    firstTick: number;
    lastTick: number;
    /** Shared analysis configuration used to form this curve. */
    configuration: WaterfallFrameConfiguration;
};

export type WaterfallAverageAccumulator = {
    /** Adds one captured row and drops the oldest rows beyond maxFrames. */
    append(frame: WaterfallFrame, maxFrames: number): void;
    /** Rebuilds the rolling sums after a non-append history change. */
    rebuild(history: readonly WaterfallFrame[]): void;
    /** Clears all retained contributions and configuration metadata. */
    clear(): void;
    /** Returns the current all-history or tail-window average without rescanning frames. */
    get(window: WaterfallAverageWindow): WaterfallAverageSpectrum | null;
};

type WaterfallAverageReference = {
    configuration: WaterfallFrameConfiguration;
    frequencies: number[];
};

type WaterfallAverageState = {
    powerSums: Float64Array;
    validCounts: Uint32Array;
};

type WaterfallAverageEntry = {
    tick: number;
    frame: WaterfallFrame;
};

/**
 * Returns the number of debug ticks between two waterfall rows.  Sampling is
 * tick based rather than animation-frame based so rendering speed cannot add
 * duplicate history rows.
 */
export function getWaterfallCaptureIntervalTicks(sampleRateHz: number): number {
    if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
        return 0;
    }
    return Math.max(1, Math.round(sampleRateHz / WATERFALL_FRAME_RATE_HZ));
}

/**
 * Whether the newest tick should become a waterfall row.  A backwards tick is
 * intentionally considered capturable: callers clear the incompatible old
 * history, then can use the new stream's first valid spectrum immediately.
 */
export function shouldCaptureWaterfallFrame(
    tick: number,
    lastCapturedTick: number | null,
    sampleRateHz: number
): boolean {
    const intervalTicks = getWaterfallCaptureIntervalTicks(sampleRateHz);
    if (!Number.isFinite(tick) || intervalTicks <= 0) {
        return false;
    }
    if (lastCapturedTick === null || !Number.isFinite(lastCapturedTick)) {
        return true;
    }
    return tick < lastCapturedTick || tick - lastCapturedTick >= intervalTicks;
}

/**
 * Checks the two quality gates required before a spectrum may enter waterfall
 * history.  The caller owns sample-rate estimation and passes whether that
 * estimate is stable.
 */
export function isWaterfallCaptureReady(
    sampleRateEstimated: boolean,
    coverage: number,
    qualityThreshold = SPECTRUM_QUALITY_WARNING_THRESHOLD
): boolean {
    return sampleRateEstimated
        && Number.isFinite(coverage)
        && Number.isFinite(qualityThreshold)
        && coverage >= qualityThreshold;
}

/**
 * Aggregates uniformly spaced FFT bins into heatmap buckets.  Each bucket uses
 * its largest magnitude, preserving narrow-band spikes instead of averaging
 * them away. Empty/non-finite buckets are represented by NaN.
 */
export function aggregateWaterfallBuckets(
    fullMagnitudes: readonly WaterfallSpectrumPoint[],
    bucketCount = WATERFALL_FREQUENCY_BUCKET_COUNT
): number[] {
    const normalizedBucketCount = Math.max(1, Math.floor(bucketCount));
    const buckets = new Array<number>(normalizedBucketCount).fill(Number.NEGATIVE_INFINITY);
    if (fullMagnitudes.length === 0) {
        return buckets.fill(Number.NaN);
    }

    fullMagnitudes.forEach(([, magnitude], index) => {
        if (!Number.isFinite(magnitude)) {
            return;
        }
        const bucketIndex = Math.min(
            normalizedBucketCount - 1,
            Math.floor(index * normalizedBucketCount / fullMagnitudes.length)
        );
        buckets[bucketIndex] = Math.max(buckets[bucketIndex], magnitude);
    });

    return buckets.map(value => Number.isFinite(value) ? value : Number.NaN);
}

/**
 * Normalizes a UI-provided history capacity. The component still passes the
 * configured value to appendWaterfallFrame, while this helper lets a changed
 * buffer size trim the current history immediately and safely.
 */
export function normalizeWaterfallBufferSize(
    value: number | null | undefined,
    fallback = WATERFALL_MAX_FRAMES
): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(
        WATERFALL_MAX_BUFFER_FRAMES,
        Math.max(WATERFALL_MIN_BUFFER_FRAMES, Math.round(Number(value)))
    );
}

/** Returns a cloned tail of history without mutating its caller-owned rows. */
export function resizeWaterfallHistory(
    history: readonly WaterfallFrame[],
    maxFrames: number
): WaterfallFrame[] {
    const normalizedMaxFrames = Number.isFinite(maxFrames)
        ? Math.max(0, Math.floor(maxFrames))
        : 0;
    if (normalizedMaxFrames === 0) {
        return [];
    }
    return history.slice(-normalizedMaxFrames).map(cloneWaterfallFrame);
}

function createWaterfallAverageReference(frame: WaterfallFrame): WaterfallAverageReference | null {
    if (frame.fullMagnitudes.length === 0) {
        return null;
    }

    const frequencies = frame.fullMagnitudes.map(([frequency]) => frequency);
    if (!frequencies.every(Number.isFinite)) {
        return null;
    }

    return {
        configuration: getWaterfallFrameConfiguration(frame),
        frequencies
    };
}

function getWaterfallFrameConfiguration(frame: WaterfallFrame): WaterfallFrameConfiguration {
    return {
        keyId: frame.keyId,
        sampleRateHz: frame.sampleRateHz,
        fftSize: frame.fftSize,
        source: frame.source,
        scale: frame.scale
    };
}

function isWaterfallAverageFrameCompatible(
    frame: WaterfallFrame,
    reference: WaterfallAverageReference
): boolean {
    return isWaterfallFrameCompatible(frame, reference.configuration)
        && frame.fullMagnitudes.length === reference.frequencies.length
        && frame.fullMagnitudes.every(([frequency], index) => frequency === reference.frequencies[index]);
}

function createWaterfallAverageState(binCount: number): WaterfallAverageState {
    return {
        powerSums: new Float64Array(binCount),
        validCounts: new Uint32Array(binCount)
    };
}

function magnitudeToAveragePower(magnitude: number, scale: SpectrumScale): number {
    if (!Number.isFinite(magnitude) || (scale === 'linear' && magnitude < 0)) {
        return Number.NaN;
    }

    const power = scale === 'db'
        ? Math.pow(10, magnitude / 10)
        : magnitude * magnitude;
    return Number.isFinite(power) ? power : Number.NaN;
}

function addWaterfallFrameToAverageState(
    state: WaterfallAverageState,
    frame: WaterfallFrame,
    scale: SpectrumScale,
    direction: 1 | -1
) {
    frame.fullMagnitudes.forEach(([, magnitude], index) => {
        const power = magnitudeToAveragePower(magnitude, scale);
        if (!Number.isFinite(power)) {
            return;
        }

        if (direction === 1) {
            state.powerSums[index] += power;
            state.validCounts[index] += 1;
            return;
        }

        if (state.validCounts[index] === 0) {
            return;
        }
        state.powerSums[index] = Math.max(0, state.powerSums[index] - power);
        state.validCounts[index] -= 1;
    });
}

function selectWaterfallAverageFrames(
    frames: readonly WaterfallFrame[],
    window: WaterfallAverageWindow
): readonly WaterfallFrame[] {
    if (window === 'all') {
        return frames;
    }
    return frames.slice(-window);
}

/**
 * Uses the final contiguous configuration segment as one physical stream.
 * Within that stream the first usable frequency axis becomes the reference,
 * so a later malformed row cannot displace the otherwise valid average.
 */
function selectWaterfallAverageEntries(
    frames: readonly WaterfallFrame[],
    window: WaterfallAverageWindow
): { reference: WaterfallAverageReference; entries: WaterfallAverageEntry[] } | null {
    const selectedFrames = selectWaterfallAverageFrames(frames, window);
    const latestFrame = selectedFrames[selectedFrames.length - 1];
    if (!latestFrame) {
        return null;
    }

    const finalConfiguration = getWaterfallFrameConfiguration(latestFrame);
    let segmentStart = selectedFrames.length - 1;
    while (
        segmentStart > 0
        && isWaterfallFrameCompatible(selectedFrames[segmentStart - 1], finalConfiguration)
    ) {
        segmentStart -= 1;
    }

    let reference: WaterfallAverageReference | null = null;
    for (let index = segmentStart; index < selectedFrames.length; index++) {
        reference = createWaterfallAverageReference(selectedFrames[index]);
        if (reference) {
            break;
        }
    }
    if (!reference) {
        return null;
    }

    const entries: WaterfallAverageEntry[] = [];
    for (let index = segmentStart; index < selectedFrames.length; index++) {
        const frame = selectedFrames[index];
        if (isWaterfallAverageFrameCompatible(frame, reference)) {
            entries.push({ tick: frame.tick, frame });
        }
    }

    return { reference, entries };
}

function buildWaterfallAverageFromState(
    reference: WaterfallAverageReference,
    state: WaterfallAverageState,
    entries: readonly WaterfallAverageEntry[]
): WaterfallAverageSpectrum | null {
    if (entries.length === 0) {
        return null;
    }

    let hasUsableMagnitude = false;
    const data = reference.frequencies.map((frequency, index) => {
        const sampleCount = state.validCounts[index];
        if (sampleCount === 0) {
            return [frequency, Number.NaN] as WaterfallSpectrumPoint;
        }

        hasUsableMagnitude = true;
        const meanPower = state.powerSums[index] / sampleCount;
        const magnitude = reference.configuration.scale === 'db'
            ? 10 * Math.log10(Math.max(meanPower, Number.MIN_VALUE))
            : Math.sqrt(meanPower);
        return [frequency, magnitude] as WaterfallSpectrumPoint;
    });

    if (!hasUsableMagnitude) {
        return null;
    }

    return {
        data,
        frameCount: entries.length,
        firstTick: entries[0].tick,
        lastTick: entries[entries.length - 1].tick,
        configuration: { ...reference.configuration }
    };
}

/**
 * Produces one full-resolution average spectrum from compatible retained
 * rows. dB values are converted to power before averaging; linear values are
 * returned as RMS amplitudes. This function never mutates the supplied rows.
 */
export function buildWaterfallAverageSpectrum(
    frames: readonly WaterfallFrame[],
    window: WaterfallAverageWindow = 'all'
): WaterfallAverageSpectrum | null {
    const selected = selectWaterfallAverageEntries(frames, window);
    if (!selected) {
        return null;
    }

    const state = createWaterfallAverageState(selected.reference.frequencies.length);
    selected.entries.forEach(entry => {
        addWaterfallFrameToAverageState(state, entry.frame, selected.reference.configuration.scale, 1);
    });

    return buildWaterfallAverageFromState(selected.reference, state, selected.entries);
}

/**
 * Maintains all-history and fixed-tail power sums as waterfall rows arrive.
 * It avoids rescanning up to five minutes of FFT rows for each 8 Hz update;
 * callers rebuild only after a non-append history change such as resize.
 */
export function createWaterfallAverageAccumulator(): WaterfallAverageAccumulator {
    let reference: WaterfallAverageReference | null = null;
    let entries: WaterfallAverageEntry[] = [];
    let allState: WaterfallAverageState | null = null;
    let windowStates = new Map<number, WaterfallAverageState>();

    const clear = () => {
        reference = null;
        entries = [];
        allState = null;
        windowStates = new Map<number, WaterfallAverageState>();
    };

    const initialize = (frame: WaterfallFrame) => {
        reference = createWaterfallAverageReference(frame);
        if (!reference) {
            return;
        }
        allState = createWaterfallAverageState(reference.frequencies.length);
        windowStates = new Map(
            WATERFALL_AVERAGE_WINDOW_FRAME_COUNTS.map(window => [
                window,
                createWaterfallAverageState(reference!.frequencies.length)
            ])
        );
    };

    const append = (frame: WaterfallFrame, maxFrames: number) => {
        const normalizedMaxFrames = Number.isFinite(maxFrames)
            ? Math.max(0, Math.floor(maxFrames))
            : 0;
        if (normalizedMaxFrames === 0) {
            clear();
            return;
        }

        if (!reference || !allState) {
            initialize(frame);
        } else if (!isWaterfallFrameCompatible(frame, reference.configuration)) {
            clear();
            initialize(frame);
        } else if (!isWaterfallAverageFrameCompatible(frame, reference)) {
            return;
        }

        if (!reference || !allState || !isWaterfallAverageFrameCompatible(frame, reference)) {
            return;
        }

        const previousLength = entries.length;
        entries.push({ tick: frame.tick, frame });
        addWaterfallFrameToAverageState(allState, frame, reference.configuration.scale, 1);

        WATERFALL_AVERAGE_WINDOW_FRAME_COUNTS.forEach(window => {
            const state = windowStates.get(window);
            if (!state) {
                return;
            }
            addWaterfallFrameToAverageState(state, frame, reference!.configuration.scale, 1);
            if (previousLength >= window) {
                const leavingWindow = entries[previousLength - window];
                if (leavingWindow) {
                    addWaterfallFrameToAverageState(state, leavingWindow.frame, reference!.configuration.scale, -1);
                }
            }
        });

        if (entries.length <= normalizedMaxFrames) {
            return;
        }

        const evicted = entries.shift();
        if (!evicted) {
            return;
        }
        addWaterfallFrameToAverageState(allState, evicted.frame, reference.configuration.scale, -1);
        WATERFALL_AVERAGE_WINDOW_FRAME_COUNTS.forEach(window => {
            if (previousLength >= window) {
                return;
            }
            const state = windowStates.get(window);
            if (state) {
                addWaterfallFrameToAverageState(state, evicted.frame, reference!.configuration.scale, -1);
            }
        });
    };

    const rebuild = (history: readonly WaterfallFrame[]) => {
        clear();
        const maxFrames = history.length;
        history.forEach(frame => append(frame, maxFrames));
    };

    const get = (window: WaterfallAverageWindow): WaterfallAverageSpectrum | null => {
        if (!reference || !allState) {
            return null;
        }

        const selectedEntries = window === 'all' ? entries : entries.slice(-window);
        const state = window === 'all' ? allState : windowStates.get(window);
        return state ? buildWaterfallAverageFromState(reference, state, selectedEntries) : null;
    };

    return { append, rebuild, clear, get };
}

/** Builds an immutable-by-convention snapshot from the current FFT output. */
export function createWaterfallFrame(input: WaterfallFrameInput): WaterfallFrame {
    const fullMagnitudes = input.fullMagnitudes.map(([frequency, magnitude]) => [frequency, magnitude] as WaterfallSpectrumPoint);
    return {
        keyId: input.keyId,
        tick: input.tick,
        sampleRateHz: input.sampleRateHz,
        fftSize: input.fftSize,
        source: input.source,
        scale: input.scale,
        coverage: input.coverage,
        maxGapTicks: input.maxGapTicks,
        fullMagnitudes,
        bucketMagnitudes: aggregateWaterfallBuckets(fullMagnitudes, input.bucketCount)
    };
}

/** Returns a deep enough clone for an independent history snapshot. */
export function cloneWaterfallFrame(frame: WaterfallFrame): WaterfallFrame {
    return {
        ...frame,
        fullMagnitudes: frame.fullMagnitudes.map(([frequency, magnitude]) => [frequency, magnitude] as WaterfallSpectrumPoint),
        bucketMagnitudes: [...frame.bucketMagnitudes]
    };
}

/**
 * Appends a snapshot without mutating the previous history or the supplied
 * frame, then trims it as a FIFO ring buffer would.
 */
export function appendWaterfallFrame(
    history: readonly WaterfallFrame[],
    frame: WaterfallFrame,
    maxFrames = WATERFALL_MAX_FRAMES
): WaterfallFrame[] {
    const normalizedMaxFrames = Math.max(0, Math.floor(maxFrames));
    if (normalizedMaxFrames === 0) {
        return [];
    }
    const nextHistory = [...history, cloneWaterfallFrame(frame)];
    return nextHistory.length > normalizedMaxFrames
        ? nextHistory.slice(nextHistory.length - normalizedMaxFrames)
        : nextHistory;
}

/**
 * Tests whether a retained row has the same physical frequency mapping and
 * analysis settings as the currently selected waterfall stream.
 */
export function isWaterfallFrameCompatible(
    frame: WaterfallFrame,
    configuration: WaterfallFrameConfiguration
): boolean {
    return frame.keyId === configuration.keyId
        && frame.sampleRateHz === configuration.sampleRateHz
        && frame.fftSize === configuration.fftSize
        && frame.source === configuration.source
        && frame.scale === configuration.scale;
}

/**
 * Calibrates the color scale from a first valid row.  The UI keeps this range
 * locked until the user explicitly resets it or invalidates the history.
 */
export function calibrateWaterfallColorRange(frame: WaterfallFrame): WaterfallColorRange | null {
    const finiteMagnitudes = frame.bucketMagnitudes.filter(Number.isFinite);
    if (finiteMagnitudes.length === 0) {
        return null;
    }

    const peakMagnitude = Math.max(...finiteMagnitudes);
    if (frame.scale === 'db') {
        return {
            min: peakMagnitude - WATERFALL_DB_RANGE,
            max: peakMagnitude
        };
    }

    return {
        min: 0,
        max: Math.max(peakMagnitude, Number.EPSILON)
    };
}
