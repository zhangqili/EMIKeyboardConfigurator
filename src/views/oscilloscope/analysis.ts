export type MeasurementStats = {
    vpp: number;
    rms: number;
    mean: number;
    count: number;
    maxDelta: number;
    crestFactor: number;
};

export function calculateStats(
    cache: Record<number, [number, number][]>,
    selectedKeys: number[],
    hiddenKeys: number[],
    pts: { x: number; y: number }[]
): Record<number, MeasurementStats> | null {
    if (pts.length !== 2) {
        return null;
    }

    const startX = Math.min(pts[0].x, pts[1].x);
    const endX = Math.max(pts[0].x, pts[1].x);
    const stats: Record<number, MeasurementStats> = {};

    selectedKeys.forEach(id => {
        if (hiddenKeys.includes(id)) {
            return;
        }
        const data = cache[id];
        if (!data || data.length === 0) {
            return;
        }

        const rangeValues = data
            .filter(d => d[0] >= startX && d[0] <= endX)
            .map(d => d[1]);

        if (rangeValues.length === 0) {
            return;
        }

        const max = Math.max(...rangeValues);
        const min = Math.min(...rangeValues);
        const vpp = max - min;
        const sum = rangeValues.reduce((a, b) => a + b, 0);
        const mean = sum / rangeValues.length;
        const variance = rangeValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rangeValues.length;
        const rms = Math.sqrt(variance);

        let maxDelta = 0;
        for (let i = 1; i < rangeValues.length; i++) {
            const delta = Math.abs(rangeValues[i] - rangeValues[i - 1]);
            if (delta > maxDelta) {
                maxDelta = delta;
            }
        }

        let maxDeviation = 0;
        for (let i = 0; i < rangeValues.length; i++) {
            const dev = Math.abs(rangeValues[i] - mean);
            if (dev > maxDeviation) {
                maxDeviation = dev;
            }
        }
        const crestFactor = rms > 0 ? maxDeviation / rms : 0;

        stats[id] = { vpp, rms, mean, count: rangeValues.length, maxDelta, crestFactor };
    });

    return stats;
}
