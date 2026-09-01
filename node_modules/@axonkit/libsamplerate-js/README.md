# @axonkit/libsamplerate-js

Audio sample-rate conversion for the browser, backed by a WebAssembly build of
[libsamplerate](https://github.com/libsndfile/libsamplerate).

Unlike most libsamplerate ports, this package ships the WASM as a **separate
`.wasm` file with a tiny (~9 KB) JS glue** instead of a ~2 MB base64 blob inlined
into JS. The `.wasm` is fetched on demand, so it never bloats your main bundle.

## Install

```bash
npm install @axonkit/libsamplerate-js
```

## Usage

```typescript
import { create, ConverterType } from '@axonkit/libsamplerate-js';

// 2 channels, 44100 Hz -> 48000 Hz
const src = await create(2, 44100, 48000, {
  converterType: ConverterType.SRC_SINC_FASTEST,
});

// dataIn: interleaved Float32Array (length = frames * channels)
const out = src.process(dataIn); // fresh Float32Array sized to produced frames

src.destroy();
```

`process()` is **streaming** — it wraps libsamplerate's `src_process`. Call it
repeatedly with successive chunks of a stream and the converter keeps its filter
state between calls. Because of the filter delay the frames produced per call are
approximate and catch up over the stream, so drive loops by input, not output.
When the stream ends, call `flush()` once to drain the buffered tail, and call
`reset()` after a discontinuity (seek, new file, gap) so state doesn't leak.

### Complete, runnable example

Save as `demo.mjs` and run `node demo.mjs` — the WASM works in Node, browsers and
workers alike:

```javascript
import { create, ConverterType } from '@axonkit/libsamplerate-js';

const inRate = 44100;
const outRate = 48000;
const channels = 1;

// A 440 Hz sine, 1 second, fed in 10 ms chunks to exercise the streaming path.
const total = inRate;
const signal = new Float32Array(total);
for (let i = 0; i < total; i++) {
  signal[i] = Math.sin((2 * Math.PI * 440 * i) / inRate) * 0.5;
}

const src = await create(channels, inRate, outRate, {
  converterType: ConverterType.SRC_SINC_BEST_QUALITY,
});

const outBuf = new Float32Array(8192 * channels); // reused across calls
const outLen = { frames: 0 };
const chunk = Math.round(inRate * 0.01); // 441 frames
let produced = 0;

for (let off = 0; off < total; off += chunk) {
  const end = Math.min(off + chunk, total);
  src.process(signal.subarray(off, end), outBuf, outLen);
  produced += outLen.frames;
  // outBuf.subarray(0, outLen.frames * channels) holds this call's output.
}

// Drain the tail still buffered inside the converter's filter.
produced += src.flush().length / channels;

src.destroy();

console.log(`in : ${total} frames @ ${inRate} Hz`);
console.log(`out: ${produced} frames @ ${outRate} Hz`);
console.log(`expected ~${Math.round((total * outRate) / inRate)} frames`);
```

Expected output:

```
in : 44100 frames @ 44100 Hz
out: 48000 frames @ 48000 Hz
expected ~48000 frames
```

### Reusing an output buffer (zero-alloc hot path)

For real-time use, pass a preallocated `dataOut` and read the valid range from
`outLength.frames`. The returned array is `dataOut` itself, at full length:

```typescript
const outBuffer = new Float32Array(4096 * channels);
const outLength = { frames: 0 };
src.process(dataIn, outBuffer, outLength);
const valid = outBuffer.subarray(0, outLength.frames * channels);
```

### API

| Export | Description |
|--------|-------------|
| `create(nChannels, inputSampleRate, outputSampleRate, options?)` | Load WASM and return a resampler (`Promise<SRC>`) |
| `SRC` | Resampler instance class |
| `ConverterType` | Quality / algorithm constants |
| `CreateOptions` | `{ converterType?: ConverterTypeValue }` |
| `ConverterTypeValue` | `0 \| 1 \| 2 \| 3 \| 4` |

**`SRC` instance**

| Member | Description |
|--------|-------------|
| `nChannels`, `inputSampleRate`, `outputSampleRate` | Read-only configuration |
| `process(dataIn, dataOut?, outLength?)` | Streaming resample of one interleaved chunk (`src_process`); `outLength.frames` receives produced frames per channel |
| `flush()` | Drain the converter's remaining tail at end-of-stream; returns the leftover interleaved output as a fresh `Float32Array` |
| `reset()` | Clear filter state on a stream discontinuity |
| `destroy()` | Free WASM state and heap buffers |

**`ConverterType`**

| Constant | libsamplerate name |
|----------|-------------------|
| `SRC_SINC_BEST_QUALITY` (0) | Highest quality sinc |
| `SRC_SINC_MEDIUM_QUALITY` (1) | Medium quality sinc |
| `SRC_SINC_FASTEST` (2) | Fastest sinc (default) |
| `SRC_ZERO_ORDER_HOLD` (3) | Zero-order hold |
| `SRC_LINEAR` (4) | Linear interpolation |

See [libsamplerate converter docs](http://libsndfile.github.io/libsamplerate/api_misc.html#converters).

**Validation:** `nChannels` 1–128, sample rates 1–192000 Hz. Invalid values throw before WASM is invoked.

### Package exports

Main entry (`@axonkit/libsamplerate-js`):

- `create`, `SRC`, `ConverterType`
- Types: `CreateOptions`, `ConverterTypeValue`

Subpaths:

- `@axonkit/libsamplerate-js/wasm-runtime` — glue URL overrides (see below)
- `@axonkit/libsamplerate-js/wasm/*` — shipped `.js` / `.wasm` assets

### WASM asset URL overrides (optional)

Not re-exported from the main entry. Use the subpath when you host the `.wasm` /
glue yourself (CDN, static server, bundler `?url` imports):

```typescript
import { setWasmUrl, setWasmGlueUrl } from '@axonkit/libsamplerate-js/wasm-runtime';

setWasmGlueUrl('/static/wasm/libsamplerate.js');
setWasmUrl('/static/wasm/libsamplerate.wasm');
```

Also available: `setWasmModuleFactory`.

## License

Wrapper: MIT. [libsamplerate](https://github.com/libsndfile/libsamplerate) is 2-clause BSD.
