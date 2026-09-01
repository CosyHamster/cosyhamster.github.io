import { SRC } from './src';
import { type ConverterTypeValue } from '../converter-type';
export type CreateOptions = {
    converterType?: ConverterTypeValue;
};
/**
 * Load the libsamplerate WASM module and return an SRC resampler.
 *
 * @param nChannels number of interleaved channels (1-128)
 * @param inputSampleRate source sample rate (1-192000)
 * @param outputSampleRate target sample rate (1-192000)
 * @param options optional converterType (default SRC_SINC_FASTEST)
 */
export declare function create(nChannels: number, inputSampleRate: number, outputSampleRate: number, options?: CreateOptions): Promise<SRC>;
