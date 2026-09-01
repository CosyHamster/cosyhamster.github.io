let modulePromise = null;
/**
 * Load (or return the cached) libsamplerate WASM module.
 */
function getWasmModule() {
    if (modulePromise)
        return modulePromise;
    modulePromise = (async () => {
        const factory = await loadFactory();
        // Always steer the glue's `.wasm` fetch to our resolved URL. Bundlers
        // (Vite/Rollup) rewrite the `new URL('./wasm/libsamplerate.wasm', import.meta.url)`
        // below to the emitted (hashed) asset; without locateFile the glue would
        // otherwise look for an unhashed sibling and 404.
        const wasmUrl = resolveDefaultWasmUrl();
        const overrides = {
            locateFile: (path) => (path.endsWith('.wasm') ? wasmUrl : path),
        };
        return factory(overrides);
    })();
    return modulePromise;
}
function resolveDefaultWasmUrl() {
    try {
        return new URL('./wasm/libsamplerate.wasm', import.meta.url).href;
    }
    catch {
        return './wasm/libsamplerate.wasm';
    }
}
async function loadFactory() {
    const glueUrl = resolveDefaultGlueUrl();
    try {
        // Indirect import so bundlers don't try to statically resolve the glue.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = await Function('u', 'return import(u)')(glueUrl);
        return mod.default || mod.createLibSampleRateModule || mod;
    }
    catch {
        throw new Error(`Failed to load libsamplerate WASM glue from "${glueUrl}". ` +
            'Make sure the WASM files are built (npm run build:wasm) and available at runtime. ' +
            'You can call setWasmGlueUrl() or setWasmModuleFactory() to provide a custom loader.');
    }
}
function resolveDefaultGlueUrl() {
    // In ESM, import.meta.url is the URL of THIS bundle file; the glue lives in a
    // sibling `wasm/` directory (see rollup copy target).
    try {
        return new URL('./wasm/libsamplerate.js', import.meta.url).href;
    }
    catch {
        return './wasm/libsamplerate.js';
    }
}

/**
 * Wraps a single libsamplerate `SRC_STATE` plus the reusable WASM heap buffers
 * used to shuttle interleaved float32 audio in and out. One instance per live
 * stream (channel count + input rate are fixed at construction).
 */
class SRC {
    constructor(module, statePtr, nChannels, inputSampleRate, outputSampleRate) {
        this.destroyed = false;
        // Reusable heap allocations (grown on demand).
        this.inPtr = 0;
        this.inBytes = 0;
        this.outPtr = 0;
        this.outBytes = 0;
        this.module = module;
        this.statePtr = statePtr;
        this._nChannels = nChannels;
        this._inputSampleRate = inputSampleRate;
        this._outputSampleRate = outputSampleRate;
        this.ratio = outputSampleRate / inputSampleRate;
        this.inUsedPtr = module._malloc(4);
        this.outGenPtr = module._malloc(4);
    }
    get nChannels() {
        return this._nChannels;
    }
    get inputSampleRate() {
        return this._inputSampleRate;
    }
    get outputSampleRate() {
        return this._outputSampleRate;
    }
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
    process(dataIn, dataOut = null, outLength = null) {
        if (this.destroyed)
            throw new Error('SRC instance already destroyed');
        const channels = this._nChannels;
        const inFrames = Math.floor(dataIn.length / channels);
        // Passthrough when rates match: libsamplerate would just copy anyway.
        if (this._inputSampleRate === this._outputSampleRate) {
            if (outLength)
                outLength.frames = inFrames;
            if (dataOut) {
                dataOut.set(dataIn.subarray(0, dataIn.length));
                return dataOut;
            }
            return dataIn;
        }
        const outFloats = dataOut ? dataOut.length : Math.ceil(dataIn.length * this.ratio) + channels;
        const outFrames = Math.floor(outFloats / channels);
        this.ensureIn(dataIn.length * 4);
        this.ensureOut(outFrames * channels * 4);
        // Copy input into the heap (re-read HEAPF32 after any malloc-induced growth).
        this.module.HEAPF32.set(dataIn, this.inPtr >> 2);
        const genFrames = this.runProcess(this.inPtr, inFrames, outFrames, false);
        if (outLength)
            outLength.frames = genFrames;
        const genFloats = genFrames * channels;
        const start = this.outPtr >> 2;
        const result = dataOut ?? new Float32Array(genFloats);
        result.set(this.module.HEAPF32.subarray(start, start + genFloats));
        return result;
    }
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
    flush() {
        if (this.destroyed)
            throw new Error('SRC instance already destroyed');
        if (this._inputSampleRate === this._outputSampleRate)
            return new Float32Array(0);
        const channels = this._nChannels;
        const drainFrames = 4096;
        this.ensureOut(drainFrames * channels * 4);
        // libsamplerate needs a non-NULL data_in pointer even with zero input
        // frames, otherwise the end-of-input drain stops short.
        this.ensureIn(channels * 4);
        const chunks = [];
        let totalFloats = 0;
        for (;;) {
            const genFrames = this.runProcess(this.inPtr, 0, drainFrames, true);
            if (genFrames <= 0)
                break;
            const genFloats = genFrames * channels;
            const start = this.outPtr >> 2;
            const chunk = new Float32Array(genFloats);
            chunk.set(this.module.HEAPF32.subarray(start, start + genFloats));
            chunks.push(chunk);
            totalFloats += genFloats;
        }
        if (chunks.length === 0)
            return new Float32Array(0);
        if (chunks.length === 1)
            return chunks[0];
        const out = new Float32Array(totalFloats);
        let off = 0;
        for (const c of chunks) {
            out.set(c, off);
            off += c.length;
        }
        return out;
    }
    /** Run one `src_process` call; returns produced frames per channel. */
    runProcess(inPtr, inFrames, outFrames, endOfInput) {
        const err = this.module._resampler_process(this.statePtr, inPtr, inFrames, this.outPtr, outFrames, this.ratio, endOfInput ? 1 : 0, this.inUsedPtr, this.outGenPtr);
        if (err !== 0) {
            const msg = this.module.UTF8ToString(this.module._resampler_strerror(err));
            throw new Error(`libsamplerate src_process failed: ${msg}`);
        }
        return this.module.HEAP32[this.outGenPtr >> 2];
    }
    /** Reset the internal filter state (e.g. on a stream discontinuity). */
    reset() {
        if (this.destroyed)
            return;
        this.module._resampler_reset(this.statePtr);
    }
    /** Free the WASM state and heap buffers. The instance is unusable afterwards. */
    destroy() {
        if (this.destroyed)
            return;
        this.destroyed = true;
        this.module._resampler_delete(this.statePtr);
        this.statePtr = 0;
        if (this.inPtr)
            this.module._free(this.inPtr);
        if (this.outPtr)
            this.module._free(this.outPtr);
        this.module._free(this.inUsedPtr);
        this.module._free(this.outGenPtr);
        this.inPtr = 0;
        this.outPtr = 0;
        this.inBytes = 0;
        this.outBytes = 0;
    }
    ensureIn(bytes) {
        if (this.inBytes >= bytes)
            return;
        if (this.inPtr)
            this.module._free(this.inPtr);
        this.inPtr = this.module._malloc(bytes);
        this.inBytes = bytes;
    }
    ensureOut(bytes) {
        if (this.outBytes >= bytes)
            return;
        if (this.outPtr)
            this.module._free(this.outPtr);
        this.outPtr = this.module._malloc(bytes);
        this.outBytes = bytes;
    }
}

const ConverterType = {
    SRC_SINC_BEST_QUALITY: 0,
    SRC_SINC_MEDIUM_QUALITY: 1,
    SRC_SINC_FASTEST: 2,
    SRC_ZERO_ORDER_HOLD: 3,
    SRC_LINEAR: 4,
};

/**
 * Load the libsamplerate WASM module and return an SRC resampler.
 *
 * @param nChannels number of interleaved channels (1-128)
 * @param inputSampleRate source sample rate (1-192000)
 * @param outputSampleRate target sample rate (1-192000)
 * @param options optional converterType (default SRC_SINC_FASTEST)
 */
async function create(nChannels, inputSampleRate, outputSampleRate, options) {
    const converterType = options?.converterType ?? ConverterType.SRC_SINC_FASTEST;
    validate(nChannels, inputSampleRate, outputSampleRate, converterType);
    const module = await getWasmModule();
    const errPtr = module._malloc(4);
    const statePtr = module._resampler_new(converterType, nChannels, errPtr);
    const err = module.HEAP32[errPtr >> 2];
    module._free(errPtr);
    if (statePtr === 0) {
        const msg = module.UTF8ToString(module._resampler_strerror(err));
        throw new Error(`libsamplerate src_new failed: ${msg}`);
    }
    return new SRC(module, statePtr, nChannels, inputSampleRate, outputSampleRate);
}
function validate(nChannels, inputSampleRate, outputSampleRate, converterType) {
    if (!Number.isFinite(nChannels) || nChannels < 1 || nChannels > 128) {
        throw new Error(`invalid nChannels: ${nChannels}`);
    }
    if (!Number.isFinite(inputSampleRate) || inputSampleRate < 1 || inputSampleRate > 192000) {
        throw new Error(`invalid inputSampleRate: ${inputSampleRate}`);
    }
    if (!Number.isFinite(outputSampleRate) || outputSampleRate < 1 || outputSampleRate > 192000) {
        throw new Error(`invalid outputSampleRate: ${outputSampleRate}`);
    }
    if (converterType < ConverterType.SRC_SINC_BEST_QUALITY ||
        converterType > ConverterType.SRC_LINEAR) {
        throw new Error(`invalid converterType: ${converterType}`);
    }
}

export { ConverterType, SRC, create };
//# sourceMappingURL=index.mjs.map
