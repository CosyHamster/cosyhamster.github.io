/**
 * Optional WASM asset URL overrides. Import from `@axonkit/libsamplerate-js/wasm-runtime`
 * when you host the `.wasm` / glue files at non-default paths; the main entry
 * does not export these.
 */
export { setWasmModuleFactory, setWasmUrl, setWasmGlueUrl } from './wasm/module';
