import { describe, expect, it } from 'vitest';
import { calculateSpectrum } from './spectrum';

describe('calculateSpectrum', () => {
    it('reports the expected FFT-bin peak for every supported FFT size', () => {
        const sampleRateHz = 8192;
        const frequencyHz = 512;
        [512, 1024, 2048, 4096].forEach(fftSize => {
            const values = Array.from(
                { length: fftSize },
                (_, index) => Math.sin(2 * Math.PI * frequencyHz * index / sampleRateHz)
            );
            const spectrum = calculateSpectrum(values, sampleRateHz, fftSize, 'db');

            expect(spectrum).not.toBeNull();
            expect(spectrum?.peakFrequency).toBeCloseTo(frequencyHz, 8);
        });
    });
});
