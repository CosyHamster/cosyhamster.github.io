/**
 * Minimal typed view of the Emscripten module produced by wasm/src/resampler.c.
 * Only the exported wrapper functions and the heap views we touch are listed.
 */
export interface LibSampleRateModule {
    _resampler_new(converterType: number, channels: number, errorPtr: number): number;
    _resampler_delete(state: number): void;
    _resampler_reset(state: number): number;
    _resampler_process(state: number, inPtr: number, inFrames: number, outPtr: number, outFrames: number, ratio: number, endOfInput: number, inUsedPtr: number, outGenPtr: number): number;
    _resampler_strerror(error: number): number;
    _resampler_is_valid_ratio(ratio: number): number;
    _malloc(size: number): number;
    _free(ptr: number): void;
    HEAP8: Int8Array;
    HEAP32: Int32Array;
    HEAPU8: Uint8Array;
    HEAPF32: Float32Array;
    UTF8ToString(ptr: number): string;
}
export type LibSampleRateModuleFactory = (overrides?: Record<string, unknown>) => Promise<LibSampleRateModule>;
