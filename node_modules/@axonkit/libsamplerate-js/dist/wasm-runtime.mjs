/**
 * Override the default WASM module factory. Call before create() to take effect.
 */
function setWasmModuleFactory(factory) {
}
/**
 * Override the default WASM binary (.wasm) URL.
 */
function setWasmUrl(url) {
}
/**
 * Override the URL of the Emscripten glue JS file (libsamplerate.js).
 * By default it is resolved relative to this bundle.
 */
function setWasmGlueUrl(url) {
}

export { setWasmGlueUrl, setWasmModuleFactory, setWasmUrl };
//# sourceMappingURL=wasm-runtime.mjs.map
