import type { LibSampleRateModule } from './libsamplerate-types';
/**
 * Wraps a single libsamplerate `SRC_STATE` plus the reusable WASM heap buffers
 * used to shuttle interleaved float32 audio in and out. One instance per live
 * stream (channel count + input rate are fixed at construction).
 */
export declare class SRC {
    private readonly module;
    private statePtr;
    private readonly _nChannels;
    private readonly _inputSampleRate;
    private readonly _outputSampleRate;
    private readonly ratio;
    private destroyed;
    private inPtr;
    private inBytes;
    private outPtr;
    private outBytes;
    private readonly inUsedPtr;
    private readonly outGenPtr;
    constructor(module: LibSampleRateModule, statePtr: number, nChannels: number, inputSampleRate: number, outputSampleRate: number);
    get nChannels(): number;
    get inputSampleRate(): number;
    get outputSampleRate(): number;
    /**
     * Feed one interleaved chunk through the converter (streaming `src_process`).
     *
     * Call repeatedly with successive chunks of a stream; the converter keeps its
     * internal filter state between calls, so the produced frame count per call is
     * approximate (it lags input by the filter delay and catches up over time).
     * When the stream ends, call {@link flush} to drain the buffered tail.
     *
     * @param dataIn interleaved float32 input, length = frames * nChannels
     * @param dataOut optional reusable output buffer; must hold ceil(ratio * frames) * nChannels + nChannels
     * @param outLength optional object that receives the produced frame count (per channel)
     * @returns the resampled interleaved float32. When `dataOut` is supplied it is
     *   returned as-is (full length); read `outLength.frames` for the valid range.
     *   When omitted, a fresh array sized to exactly the produced frames is returned.
     */
    process(dataIn: Float32Array, dataOut?: Float32Array | null, outLength?: {
        frames: number;
    } | null): Float32Array;
    /**
     * Signal end-of-input and drain every frame still held in the converter's
     * filter. Call once after the last {@link process} of a stream; the tail is a
     * few frames the SINC converters hold back due to their filter delay.
     *
     * Internally loops until the converter is empty and returns all remaining
     * output as a single fresh interleaved float32 array (empty when there is
     * nothing buffered, e.g. passthrough or already drained). The instance stays
     * usable — call {@link reset} before reusing it for a new stream.
     */
    flush(): Float32Array;
    /** Run one `src_process` call; returns produced frames per channel. */
    private runProcess;
    /** Reset the internal filter state (e.g. on a stream discontinuity). */
    reset(): void;
    /** Free the WASM state and heap buffers. The instance is unusable afterwards. */
    destroy(): void;
    private ensureIn;
    private ensureOut;
}
