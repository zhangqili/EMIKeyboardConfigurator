export type SpectrumSource = 'raw' | 'filtered_raw' | 'value';
export type SpectrumScale = 'db' | 'linear';

export type SpectrumPeakInfo = {
    id: number;
    frequency: number | null;
    magnitude: number | null;
    color: string;
    coverage: number;
    maxGapTicks: number;
    status: 'ready' | 'waiting';
};

export type SpectrumWindow = {
    values: number[];
    coverage: number;
    maxGapTicks: number;
};

export type SpectrumResult = {
    data: [number, number][];
    peakFrequency: number;
    peakMagnitude: number;
};

export const SPECTRUM_FALLBACK_SAMPLE_RATE_HZ = 8000;
export const SPECTRUM_ALLOWED_SAMPLE_RATES_HZ = [125, 250, 500, 1000, 2000, 4000, 8000] as const;
export const SPECTRUM_ESTIMATION_MIN_TICK_DELTA = 128;
export const SPECTRUM_ESTIMATION_MIN_INTERVAL_MS = 10;
export const SPECTRUM_ESTIMATION_MIN_RATE_HZ = 100;
export const SPECTRUM_ESTIMATION_MAX_RATE_HZ = 30000;
export const SPECTRUM_ESTIMATION_ALPHA = 0.18;
export const SPECTRUM_QUALITY_WARNING_THRESHOLD = 0.95;

export function formatFrequency(frequency: number): string {
    if (!Number.isFinite(frequency)) {
        return '-';
    }
    return frequency >= 1000
        ? `${(frequency / 1000).toFixed(2)} kHz`
        : `${frequency.toFixed(1)} Hz`;
}

export function formatFrequencyShort(value: number | string): string {
    const frequency = Number(value);
    if (!Number.isFinite(frequency)) {
        return '';
    }
    return frequency >= 1000
        ? `${(frequency / 1000).toFixed(frequency % 1000 === 0 ? 0 : 1)}k`
        : frequency.toFixed(0);
}

export function formatSampleRate(rate: number): string {
    if (!Number.isFinite(rate)) {
        return '-';
    }
    return rate >= 1000
        ? `${(rate / 1000).toFixed(2)} kHz`
        : `${rate.toFixed(0)} Hz`;
}

export function formatPercent(value: number): string {
    if (!Number.isFinite(value)) {
        return '-';
    }
    return `${(value * 100).toFixed(1)}%`;
}

export function formatSpectrumMagnitude(value: number, scale: SpectrumScale): string {
    if (!Number.isFinite(value)) {
        return '-';
    }
    return scale === 'db'
        ? `${value.toFixed(1)} dB`
        : value.toPrecision(4);
}

export function quantizeSpectrumSampleRate(rate: number): number {
    if (!Number.isFinite(rate)) {
        return SPECTRUM_FALLBACK_SAMPLE_RATE_HZ;
    }
    return SPECTRUM_ALLOWED_SAMPLE_RATES_HZ.reduce((best, candidate) => {
        return Math.abs(candidate - rate) < Math.abs(best - rate) ? candidate : best;
    }, SPECTRUM_ALLOWED_SAMPLE_RATES_HZ[0]);
}

export function buildUniformSpectrumWindow(samples: [number, number][] | undefined, endTick: number, size: number): SpectrumWindow | null {
    if (!samples || samples.length === 0 || !Number.isFinite(endTick)) {
        return null;
    }

    const startTick = endTick - size + 1;
    const interpolationPoints: [number, number][] = [];
    const actualTicks: number[] = [];
    let previousPoint: [number, number] | null = null;
    let nextPoint: [number, number] | null = null;

    const pushPoint = (point: [number, number]) => {
        const lastPoint = interpolationPoints[interpolationPoints.length - 1];
        if (lastPoint && lastPoint[0] === point[0]) {
            interpolationPoints[interpolationPoints.length - 1] = point;
        } else {
            interpolationPoints.push(point);
        }
    };

    for (const [tick, value] of samples) {
        if (tick < startTick) {
            previousPoint = [tick, value];
            continue;
        }
        if (tick <= endTick) {
            const point: [number, number] = [tick, value];
            const lastActualTick = actualTicks[actualTicks.length - 1];
            if (lastActualTick === tick) {
                pushPoint(point);
            } else {
                actualTicks.push(tick);
                pushPoint(point);
            }
            continue;
        }
        nextPoint = [tick, value];
        break;
    }

    if (previousPoint) {
        interpolationPoints.unshift(previousPoint);
    }
    if (nextPoint) {
        pushPoint(nextPoint);
    }
    if (interpolationPoints.length === 0) {
        return null;
    }

    const firstPoint = interpolationPoints[0];
    const lastPoint = interpolationPoints[interpolationPoints.length - 1];
    if (firstPoint[0] > startTick || lastPoint[0] < endTick) {
        return null;
    }

    const values: number[] = [];
    let pointIndex = 0;
    for (let tick = startTick; tick <= endTick; tick++) {
        while (pointIndex + 1 < interpolationPoints.length && interpolationPoints[pointIndex + 1][0] < tick) {
            pointIndex++;
        }

        const left = interpolationPoints[pointIndex];
        const right = interpolationPoints[pointIndex + 1] ?? left;
        if (left[0] === tick || left[0] === right[0]) {
            values.push(left[1]);
        } else if (right[0] === tick) {
            values.push(right[1]);
        } else {
            const ratio = (tick - left[0]) / (right[0] - left[0]);
            values.push(left[1] + (right[1] - left[1]) * ratio);
        }
    }

    let maxGapTicks = 0;
    let previousTick = startTick - 1;
    actualTicks.forEach(tick => {
        maxGapTicks = Math.max(maxGapTicks, tick - previousTick - 1);
        previousTick = tick;
    });
    maxGapTicks = Math.max(maxGapTicks, endTick - previousTick);

    return {
        values,
        coverage: actualTicks.length / size,
        maxGapTicks
    };
}

export function calculateSpectrum(values: number[], sampleRateHz: number, fftSize: number, scaleMode: SpectrumScale): SpectrumResult | null {
    if (values.length < fftSize) {
        return null;
    }

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const real = new Array<number>(fftSize);
    const imag = new Array<number>(fftSize).fill(0);
    let windowSum = 0;

    for (let i = 0; i < fftSize; i++) {
        const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
        real[i] = (values[i] - mean) * windowValue;
        windowSum += windowValue;
    }

    runRadix2Fft(real, imag);

    const nyquistIndex = fftSize / 2;
    const data: [number, number][] = [];
    let peakFrequency = 0;
    let peakMagnitude = Number.NEGATIVE_INFINITY;

    for (let bin = 0; bin <= nyquistIndex; bin++) {
        const frequency = bin * sampleRateHz / fftSize;
        const scale = (bin === 0 || bin === nyquistIndex) ? 1 / windowSum : 2 / windowSum;
        const linearMagnitude = Math.hypot(real[bin], imag[bin]) * scale;
        const magnitude = scaleMode === 'db'
            ? 20 * Math.log10(Math.max(linearMagnitude, 1e-12))
            : linearMagnitude;

        data.push([frequency, magnitude]);
        if (bin > 0 && magnitude > peakMagnitude) {
            peakMagnitude = magnitude;
            peakFrequency = frequency;
        }
    }

    return {
        data,
        peakFrequency,
        peakMagnitude: Number.isFinite(peakMagnitude) ? peakMagnitude : 0
    };
}

function runRadix2Fft(real: number[], imag: number[]) {
    const n = real.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) {
            j ^= bit;
        }
        j ^= bit;
        if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
    }

    for (let len = 2; len <= n; len <<= 1) {
        const angle = -2 * Math.PI / len;
        const wLenReal = Math.cos(angle);
        const wLenImag = Math.sin(angle);
        for (let i = 0; i < n; i += len) {
            let wReal = 1;
            let wImag = 0;
            for (let j = 0; j < len / 2; j++) {
                const evenIndex = i + j;
                const oddIndex = evenIndex + len / 2;
                const oddReal = real[oddIndex] * wReal - imag[oddIndex] * wImag;
                const oddImag = real[oddIndex] * wImag + imag[oddIndex] * wReal;
                real[oddIndex] = real[evenIndex] - oddReal;
                imag[oddIndex] = imag[evenIndex] - oddImag;
                real[evenIndex] += oddReal;
                imag[evenIndex] += oddImag;
                const nextWReal = wReal * wLenReal - wImag * wLenImag;
                wImag = wReal * wLenImag + wImag * wLenReal;
                wReal = nextWReal;
            }
        }
    }
}
