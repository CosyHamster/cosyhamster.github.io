import type { LibSampleRateModule, LibSampleRateModuleFactory } from './libsamplerate-types';
/**
 * Override the default WASM module factory. Call before create() to take effect.
 */
export declare function setWasmModuleFactory(factory: LibSampleRateModuleFactory): void;
/**
 * Override the default WASM binary (.wasm) URL.
 */
export declare function setWasmUrl(url: string): void;
/**
 * Override the URL of the Emscripten glue JS file (libsamplerate.js).
 * By default it is resolved relative to this bundle.
 */
export declare function setWasmGlueUrl(url: string): void;
/**
 * Load (or return the cached) libsamplerate WASM module.
 */
export declare function getWasmModule(): Promise<LibSampleRateModule>;
