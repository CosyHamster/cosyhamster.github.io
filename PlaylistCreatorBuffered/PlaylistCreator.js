"use strict";
function importMediabunny() {
    return import("mediabunny").catch(e => {
        console.error("Mediabunny failed to import due to error", e);
        throw e;
    });
}
class ExpiredError extends Error {
    constructor(t = "Play ID changed") {
        super(t);
        this.name = "InputDisposedError";
    }
}
class Deque {
    size = 0;
    front = undefined;
    back = undefined;
    constructor() {
        // this.front = this.back = undefined;
    }
    addFront(value) {
        if (!this.front)
            this.front = this.back = { value };
        else
            this.front = this.front.next = { value, prev: this.front };
        ++this.size;
    }
    removeFront() {
        const value = this.peekFront();
        if (this.front === this.back)
            this.front = this.back = undefined;
        else
            (this.front = this.front.prev).next = undefined;
        --this.size;
        return value;
    }
    peekFront() {
        return this.front && this.front.value;
    }
    addBack(value) {
        if (!this.front)
            this.front = this.back = { value };
        else
            this.back = this.back.prev = { value, next: this.back };
        ++this.size;
    }
    removeBack() {
        let value = this.peekBack();
        if (this.front === this.back)
            this.front = this.back = undefined;
        else
            (this.back = this.back.next).back = undefined;
        --this.size;
        return value;
    }
    peekBack() {
        return this.back && this.back.value;
    }
}
class AudioDeque {
    size = 0;
    front = undefined;
    back = undefined;
    get length() {
        return this.size;
    }
    set length(_) {
        this.front = this.back = undefined;
        this.size = 0;
    }
    shift() {
        if (this.front) {
            const value = this.front.value;
            this.front = this.front.next;
            --this.size;
            return value;
        }
        return null;
    }
    push(value) {
        if (!this.front)
            this.front = this.back = { value };
        else
            this.back = this.back.next = { value };
        ++this.size;
    }
    *[Symbol.iterator]() {
        let ele = this.front;
        while (ele) {
            yield ele.value;
            ele = ele.next;
        }
    }
}
var ctx = new AudioContext();
var gainNode = ctx.createGain();
gainNode.connect(ctx.destination);
var resamplerNode;
// ctx.audioWorklet.addModule('../WebLooper/WebLooper.js').then(() => {
//     resamplerNode = new AudioWorkletNode(ctx, 'resampler');
//     resamplerNode.connect(gainNode);
//     gainNode.connect(ctx.destination);
// });
var currentNode = null;
var scheduledNodes = new AudioDeque();
var playRate = 1;
var isBuffering = true;
var isPlaying = false;
class AudioNode {
    node;
    timestamp;
    duration;
    startTimestamp;
    finished = false;
    constructor(node, timestamp, duration, startTimestamp) {
        this.node = node;
        this.timestamp = timestamp;
        this.duration = duration;
        this.startTimestamp = startTimestamp;
    }
}
function helper_beginPlayingSoundIndex(index) {
    setCurrentSong(sounds[index]);
    SoundManager.startTime = 0;
    SoundManager.stop();
    SoundManager.startPlaying();
}
function helper_resume() {
    SoundManager.resume();
}
function helper_pause() {
    SoundManager.pause();
}
function helper_stop() {
    SoundManager.stop();
}
function helper_seek(seconds) {
    SoundManager.setCurrentTime(SoundManager.getCurrentTime() + seconds);
}
function calculatePlayRateFromDetune(cents) {
    return Math.pow(2, cents / 1200);
}
function calculateDetuneFromPlayRate(rate) {
    return round6(1200 * Math.log2(rate));
}
function round6(num) {
    return Math.round(num * 1000000) / 1000000;
}
function replaceAudioContext(sampleRate) {
    const wasPlaying = isPlaying;
    SoundManager.pause();
    ctx.close();
    ctx = new AudioContext({ sampleRate: sampleRate });
    gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    if (wasPlaying)
        SoundManager.startPlaying();
    // ctx.audioWorklet.addModule('../WebLooper/WebLooper.js').then(() => {
    //     resamplerNode = new AudioWorkletNode(ctx, 'resampler');
    //     resamplerNode.connect(gainNode);
    //     gainNode.connect(ctx.destination);
    //     if(wasPlaying)
    //         SoundManager.startPlaying();
    // });
}
let cachedMediabunnyInternals = [null, null, null, null];
async function* resampledBufferIterator(bufferIterator, nChannels, inputSampleRate, currentID) {
    inputSampleRate *= playRate;
    const LibSampleRate = await import('@axonkit/libsamplerate-js'); //https://www.npmjs.com/package/@axonkit/libsamplerate-js
    let bufferFrameSize = ctx.sampleRate;
    let inBuffer = new Float32Array(Math.ceil(((ctx.sampleRate / inputSampleRate) * bufferFrameSize) * nChannels + nChannels));
    let outBuffer = new Float32Array(Math.ceil(((ctx.sampleRate / inputSampleRate) * bufferFrameSize) * nChannels + nChannels));
    const outLen = { frames: 0 };
    SoundManager.assertID(currentID);
    let src = null;
    try {
        let nextResult = (await bufferIterator.next());
        let currentTimestamp = nextResult.value.timestamp;
        src = await LibSampleRate.create(nChannels, inputSampleRate, ctx.sampleRate, { converterType: 0 }); //0 = SRC_SINC_BEST_QUALITY
        SoundManager.assertID(currentID);
        while (true) {
            let { buffer, timestamp, duration } = nextResult.value;
            // nextResult.value.buffer = ctx.createBuffer(nChannels, integerLength, ctx.sampleRate);
            // console.time("Retrieve from Mediabunny");
            nextResult = (await bufferIterator.next());
            // console.timeEnd("Retrieve from Mediabunny");
            SoundManager.assertID(currentID);
            // buffer = await rerenderBuffer(buffer, 0.5);
            let length = buffer.length;
            if (length > bufferFrameSize) {
                while (length > bufferFrameSize) {
                    bufferFrameSize *= 2;
                }
                inBuffer = new Float32Array(Math.ceil(((ctx.sampleRate / buffer.sampleRate) * bufferFrameSize) * nChannels + nChannels));
                outBuffer = new Float32Array(Math.ceil(((ctx.sampleRate / buffer.sampleRate) * bufferFrameSize) * nChannels + nChannels));
                console.warn("bufferFrameSize changed to: " + bufferFrameSize);
            }
            // let hasDiscontinuity = !nextResult.done && Math.floor((timestamp+duration)*1000000000000000)/1000000000000000 !== Math.floor((nextResult.value.timestamp)*1000000000000000)/1000000000000000;
            // if(hasDiscontinuity){
            //     console.warn("hasDiscontinuity");
            // }
            let hasDiscontinuity = false; //I cant figure it out rn. sorry...
            // console.time("Assemble Buffer");
            const data = inBuffer.subarray(0, nChannels * length);
            for (let i = 0; i < nChannels; i++) {
                const channel = buffer.getChannelData(i);
                for (let j = 0; j < length; j++) {
                    data[i + j * nChannels] = channel[j];
                }
            }
            // console.timeEnd("Assemble Buffer");
            // console.time("Process Buffer");
            let out = src.process(data, outBuffer, outLen);
            // console.timeEnd("Process Buffer");
            length = outLen.frames;
            if (length) {
                // console.time("Disassemble Buffer");
                out = out.subarray(0, length * nChannels);
                let outputBuffer = ctx.createBuffer(nChannels, length, ctx.sampleRate);
                for (let i = 0; i < nChannels; i++) {
                    const channel = outputBuffer.getChannelData(i);
                    for (let j = 0; j < length; j++) {
                        channel[j] = out[i + j * nChannels];
                    }
                }
                let outputDuration = length / outputBuffer.sampleRate * playRate;
                // console.timeEnd("Disassemble Buffer");
                yield { buffer: outputBuffer, timestamp: currentTimestamp, duration: outputDuration };
                currentTimestamp += outputDuration;
            }
            if ((nextResult.done || hasDiscontinuity) && (out = src.flush()).length) {
                // console.time("Flush Buffer");
                let length = out.length / nChannels;
                let outputBuffer = ctx.createBuffer(nChannels, length, ctx.sampleRate);
                for (let i = 0; i < nChannels; i++) {
                    const channel = outputBuffer.getChannelData(i);
                    for (let j = 0; j < length; j++) {
                        channel[j] = out[i + j * nChannels];
                    }
                }
                let outputDuration = length / outputBuffer.sampleRate * playRate;
                // console.timeEnd("Flush Buffer");
                yield { buffer: outputBuffer, timestamp: currentTimestamp, duration: outputDuration };
                currentTimestamp += outputDuration;
            }
            if (nextResult.done) {
                return;
            }
            if (hasDiscontinuity) {
                src.reset();
                currentTimestamp += nextResult.value.timestamp - timestamp + duration;
            }
        }
    }
    finally {
        if (src) {
            src.destroy();
        }
        await bufferIterator.return(undefined);
    }
}
class SoundManager {
    static playID = 0;
    static startTime = 0;
    static ctxStartTime = null;
    static ctxStartTimeDisplay = null;
    static startPlaying() {
        SoundManager.ctxStartTime = SoundManager.ctxStartTimeDisplay = null;
        let currentID = ++SoundManager.playID;
        isPlaying = true;
        if (playRate === 0)
            return;
        setIsBuffering(true);
        let bufferIterator = null;
        return importMediabunny().then(async (Mediabunny) => {
            try {
                SoundManager.assertID(currentID);
                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }
                let currentSong = sounds[currentSongIndex];
                let playbackTimeAtStart = SoundManager.startTime;
                while (true) {
                    let track, nChannels, inputSampleRate;
                    createMediabunnyInternals: {
                        if (cachedMediabunnyInternals[3] !== null) {
                            if (cachedMediabunnyInternals[3] === currentSong) {
                                [track, nChannels, inputSampleRate] = cachedMediabunnyInternals;
                                break createMediabunnyInternals;
                            }
                            else {
                                destroyCachedMediabunnyInternals();
                            }
                        }
                        let input = new Mediabunny.Input({ source: new Mediabunny.BlobSource(currentSong.file, { maxCacheSize: 1000 * 1000 * 20, useStreamReader: true }), formats: Mediabunny.ALL_FORMATS });
                        let success = await input.getPrimaryAudioTrack().then(async (audioTrack) => {
                            return Promise.all([audioTrack.getNumberOfChannels(), audioTrack.getSampleRate()]).then((values) => {
                                track = audioTrack;
                                [nChannels, inputSampleRate] = values;
                                cachedMediabunnyInternals = [audioTrack, nChannels, inputSampleRate, currentSong];
                                return true;
                            }).catch(e => {
                                displayError(e, e.message, currentSong.file.name);
                                return false;
                            });
                        }).catch(e => {
                            displayError(e, e.message, currentSong.file.name);
                            return false;
                        });
                        SoundManager.assertID(currentID);
                        if (!success) {
                            currentSong = sounds[(currentSong.currentIndex + (sounds.length + 1)) % sounds.length];
                            SoundManager.startTime = 0;
                            setCurrentSong(currentSong);
                            continue;
                        }
                    }
                    const sink = new Mediabunny.AudioBufferSink(track);
                    bufferIterator = sink.buffers(playbackTimeAtStart, Infinity);
                    // if(inputSampleRate !== ctx.sampleRate){
                    bufferIterator = resampledBufferIterator(bufferIterator, nChannels, inputSampleRate, currentID);
                    // }
                    let result = (await bufferIterator.next());
                    // if(result.done){index = currentSongIndex = REPEAT_BUTTON.checked ? index : (index+(sounds.length+1))%sounds.length; SoundManager.currentTime = 0; console.log("new current song: ", sounds[currentSongIndex]); setCurrentFileName(sounds[currentSongIndex].file.name); }
                    while (true) {
                        let { buffer, timestamp, duration } = result.value;
                        result = (await bufferIterator.next());
                        SoundManager.assertID(currentID);
                        const node = ctx.createBufferSource();
                        node.buffer = buffer;
                        // node.playbackRate.value = playRate;
                        node.connect(gainNode);
                        const ctxCurrentTime = ctx.currentTime;
                        if (SoundManager.ctxStartTime === null) { //playback had *just* started
                            SoundManager.ctxStartTime = SoundManager.ctxStartTimeDisplay = ctxCurrentTime;
                        }
                        else if (isBuffering) { //tried to shift buffers, but the next one was not available
                            SoundManager.ctxStartTime = SoundManager.ctxStartTimeDisplay = ctxCurrentTime;
                            playbackTimeAtStart = timestamp;
                        }
                        let startTimestamp = SoundManager.ctxStartTime + (timestamp - playbackTimeAtStart) / playRate;
                        startTimestamp = Math.round(ctx.sampleRate * startTimestamp) / ctx.sampleRate; // Round timestamp to the context's sample boundaries to prevent subsample audio glitches
                        let audioNode = new AudioNode(node, timestamp, duration, startTimestamp);
                        SoundManager.addNode(audioNode);
                        if (result.done) {
                            let nextSong = REPEAT_BUTTON.checked ? currentSong : sounds[(currentSong.currentIndex + (sounds.length + 1)) % sounds.length];
                            let nextCtxStartTime = startTimestamp + duration / playRate;
                            SoundManager.ctxStartTime = nextCtxStartTime;
                            if (currentSong !== nextSong) {
                                destroyCachedMediabunnyInternals();
                            }
                            currentSong = nextSong;
                            node.onended = () => {
                                audioNode.finished = true;
                                SoundManager.shiftQueuedNodes(nextSong);
                                SoundManager.ctxStartTimeDisplay = nextCtxStartTime;
                            };
                        }
                        else {
                            node.onended = () => {
                                audioNode.finished = true;
                                SoundManager.shiftQueuedNodes();
                            };
                        }
                        if (startTimestamp >= ctxCurrentTime) {
                            node.start(startTimestamp); // If the audio starts in the future, we just schedule it
                        }
                        else {
                            node.start(ctxCurrentTime, ctxCurrentTime - startTimestamp); // If it starts in the past, only play the audible section that remains from here
                        }
                        if (result.done) {
                            await bufferIterator.return(); //TODO: better clean up
                            playbackTimeAtStart = 0;
                            break;
                        }
                        // console.log("ctx.currentTime = " + ctx.currentTime);
                        // console.log("startTimestamp = " + startTimestamp);
                        if (startTimestamp - ctx.currentTime >= BUFFER_SECONDS.valueAsNumber) {
                            await new Promise((resolve, reject) => {
                                const id = setInterval(() => {
                                    // console.log("waiting before adding more buffers");
                                    if (currentID != SoundManager.playID) {
                                        reject(new ExpiredError());
                                    }
                                    if (startTimestamp - ctx.currentTime < BUFFER_SECONDS.valueAsNumber) {
                                        clearInterval(id);
                                        resolve();
                                    }
                                }, 100);
                            });
                        }
                    }
                }
            }
            catch (e) {
                if (!(e instanceof ExpiredError)) {
                    console.warn(e);
                }
                if (bufferIterator) {
                    await bufferIterator.return();
                }
            }
        });
    }
    static addNode(node) {
        setIsBuffering(false);
        if (!currentNode) {
            currentNode = node;
        }
        else {
            scheduledNodes.push(node);
        }
    }
    static reapplySoundAttributes() {
        SoundManager.reset();
    }
    static setPlayRate(rate) {
        if (isPlaying) {
            ++SoundManager.playID;
            SoundManager.startTime = SoundManager.getCurrentTime(); //setting playRate before calling this function breaks the calculation
            SoundManager.clear();
            playRate = rate;
            SoundManager.startPlaying();
        }
        else {
            playRate = rate;
        }
    }
    static setCurrentTime(time) {
        time = Math.max(Math.min(time, sounds[currentSongIndex].duration), 0);
        if (isPlaying) {
            ++SoundManager.playID;
            SoundManager.clear();
            SoundManager.startTime = time;
            SoundManager.startPlaying();
        }
        else {
            SoundManager.startTime = time;
        }
    }
    static reset() {
        ++SoundManager.playID;
        SoundManager.startTime = SoundManager.getCurrentTime();
        SoundManager.clear();
        SoundManager.startPlaying();
    }
    static pause() {
        ++SoundManager.playID;
        SoundManager.startTime = SoundManager.getCurrentTime();
        isPlaying = false;
        setIsBuffering(false);
        SoundManager.clear();
    }
    static stop() {
        ++SoundManager.playID;
        SoundManager.startTime = 0;
        isPlaying = false;
        setIsBuffering(false);
        SoundManager.clear();
        destroyCachedMediabunnyInternals();
    }
    /** Stops playback & clears scheduled buffers */
    static clear() {
        if (currentNode) {
            currentNode.node.onended = null;
            currentNode.node.stop();
            currentNode = null;
        }
        for (const audioNode of scheduledNodes) {
            audioNode.node.onended = null;
            audioNode.node.stop();
        }
        scheduledNodes.length = 0;
    }
    static resume() {
        SoundManager.startPlaying();
    }
    static shiftQueuedNodes(nextSong = null) {
        if (!isPlaying) {
            console.warn("shiftQueuedNodes but isPlaying is false");
        }
        let previousNode = currentNode;
        currentNode = scheduledNodes.shift();
        if (!currentNode) {
            changeStatus(StatusTexts.BUFFERING);
            setIsBuffering(true);
            if (nextSong !== null) {
                SoundManager.startTime = 0;
                setCurrentSong(nextSong);
            }
            else {
                SoundManager.startTime = (previousNode.timestamp + previousNode.duration);
            }
        }
        else if (nextSong !== null) {
            changeStatus(StatusTexts.PLAYING);
            SoundManager.startTime = 0;
            setCurrentSong(nextSong);
        }
        else {
            changeStatus(StatusTexts.PLAYING);
        }
    }
    static getCurrentTime() {
        if (!isPlaying) {
            return SoundManager.startTime;
        }
        else {
            if (isBuffering || !SoundManager.ctxStartTimeDisplay) {
                return SoundManager.startTime;
            }
            else {
                return (ctx.currentTime - SoundManager.ctxStartTimeDisplay) * playRate + SoundManager.startTime;
            }
        }
    }
    static assertID(id) {
        if (id != SoundManager.playID) {
            throw new ExpiredError();
        }
    }
}
function destroyCachedMediabunnyInternals() {
    if (cachedMediabunnyInternals[3]) {
        cachedMediabunnyInternals[3] = null; //song
        cachedMediabunnyInternals[0].input.dispose();
        cachedMediabunnyInternals[0] = null; //track
    }
}
function setCurrentSong(song) {
    currentSongIndex = song.currentIndex;
    setCurrentFileName(song.file.name);
    setActiveRow(song.currentRow.tableRow);
}
function removeCurrentSong() {
    currentSongIndex = null;
    setCurrentFileName("Playlist Creator");
    setActiveRow(null);
}
let codecs;
{ //Copied from howler.js
    const audioTest = new Audio();
    const mpegTest = !!audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');
    const aiffIsPlayable = !!(audioTest.canPlayType("audio/aiff") || audioTest.canPlayType("audio/x-aiff"));
    codecs = {
        mp3: !!((mpegTest || audioTest.canPlayType('audio/mp3;').replace(/^no$/, ''))),
        mpeg: mpegTest,
        opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
        ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
        oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
        wav: !!(audioTest.canPlayType('audio/wav; codecs="1"') || audioTest.canPlayType('audio/wav')).replace(/^no$/, ''),
        aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
        caf: !!audioTest.canPlayType('audio/x-caf;').replace(/^no$/, ''),
        m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        m4b: !!(audioTest.canPlayType('audio/x-m4b;') || audioTest.canPlayType('audio/m4b;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        weba: !!(audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')),
        webm: !!(audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')),
        dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ''),
        flac: !!(audioTest.canPlayType('audio/x-flac;') || audioTest.canPlayType('audio/flac;')).replace(/^no$/, ''),
        aif: aiffIsPlayable,
        aiff: aiffIsPlayable,
        aff: aiffIsPlayable
    };
}
function canPlay(extension) {
    return codecs[extension.replace(/^x-/, '')];
}
var storedWindow;
var curWin = window;
var curDoc = document;
const SITE_DEPRECATED = document.URL.toLowerCase().includes('codehs');
const NO_SERVICE_WORKER = document.URL.includes("127.0.0.1");
var ON_MOBILE;
//@ts-ignore
if (navigator.userAgentData) {
    ON_MOBILE = navigator.userAgentData.mobile;
}
else {
    //@ts-expect-error
    let userAgent = navigator.userAgent || navigator.vendor || window.opera;
    /* cspell: disable-next-line */
    ON_MOBILE = (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series([46])0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br([ev])w|bumb|bw-([nu])|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do([cp])o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly([-_])|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-([mpt])|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c([- _agpst])|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac([ \-\/])|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja([tv])a|jbro|jemu|jigs|kddi|keji|kgt([ \/])|klon|kpt |kwc-|kyo([ck])|le(no|xi)|lg( g|\/([klu])|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t([- ov])|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30([02])|n50([025])|n7(0([01])|10)|ne(([cm])-|on|tf|wf|wg|wt)|nok([6i])|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan([adt])|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c([-01])|47|mc|nd|ri)|sgh-|shar|sie([-m])|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel([im])|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c([- ])|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(userAgent.substring(0, 4)));
}
class SongTableRow {
    tableRow;
    constructor(tableRow) {
        if (tableRow) {
            this.tableRow = tableRow;
            return;
        }
        const row = curDoc.createElement('tr'); //PLAYLIST_VIEWER_TABLE.insertRow(PLAYLIST_VIEWER_TABLE.rows.length)
        const cell1 = row.insertCell(0);
        cell1.className = "songBorder";
        cell1.setAttribute("style", "display:flex;width:100%;");
        initializeRowEvents(row);
        const songNumber = curDoc.createElement('div');
        setAttributes(songNumber, {
            class: 'songNumber text',
        });
        const playButton = curDoc.createElement('label');
        playButton.style.flex = "flex: 0 1 auto;";
        playButton.setAttribute('class', 'smallplaypause playpause');
        const checkbox = curDoc.createElement('input');
        registerChangeEvent(checkbox, () => onClickSpecificPlaySong(checkbox));
        setAttributes(checkbox, {
            type: 'checkbox',
            class: 'smallplaypause playpause'
        });
        playButton.append(checkbox, curDoc.createElement('div'));
        const songName = curDoc.createElement('div');
        songName.setAttribute('class', 'songName scrollableText text');
        const fileSize = curDoc.createElement('div');
        fileSize.setAttribute('class', 'scrollableText fileSizeLabel');
        fileSize.addEventListener("contextmenu", onRightClickFileDisplay);
        cell1.append(songNumber, playButton, songName, fileSize);
        this.tableRow = row;
    }
    setSongName(fileName) {
        const songNameElement = this.tableRow.firstElementChild.querySelector(".scrollableText:nth-child(odd)");
        songNameElement.textContent = fileName;
        songNameElement.setAttribute('title', fileName);
    }
    updateRowSongNumber() {
        this.setRowSongNumber(this.tableRow.rowIndex);
    }
    setRowSongNumber(songNumber) {
        const songNumberElement = this.tableRow.firstElementChild.querySelector(".songNumber");
        songNumberElement.textContent = `${songNumber}. `;
    }
    updateFileInfoDisplay(bytes, duration) {
        const megabytes = getInMegabytes(bytes);
        const formattedDuration = new Time(duration).toString();
        this.setFileDisplay(formattedDuration, `${megabytes} MB`);
    }
    updateFileSizeDisplay(bytes) {
        const megabytes = getInMegabytes(bytes);
        this.setFileDisplay(`${megabytes} MB`, `${bytes} bytes`);
    }
    setFileDisplay(textContent, titleText) {
        const fileSizeDisplay = this.tableRow.firstElementChild.querySelector(".fileSizeLabel");
        fileSizeDisplay.textContent = textContent;
        fileSizeDisplay.setAttribute('title', titleText);
    }
    getPlaySongCheckbox() {
        return this.tableRow.firstElementChild.querySelector("input.playpause");
    }
    isRemoved() {
        return this.tableRow.parentNode == null;
    }
}
class Song {
    file;
    duration = null;
    currentRow;
    nativeIndex;
    currentIndex;
    constructor(file, nativeIndex, currentRow) {
        this.file = file;
        this.nativeIndex = nativeIndex;
        this.currentIndex = nativeIndex;
        this.currentRow = currentRow;
    }
    toString() {
        return this.file.name + ": " + this.duration;
    }
    updateDuration(duration) {
        this.duration = duration;
        this.updateFileInfoDisplay();
    }
    hasDuration() {
        return this.duration !== null;
    }
    updateFileInfoDisplay() {
        if (SHOW_LENGTHS.checked && this.hasDuration()) {
            this.currentRow.updateFileInfoDisplay(this.file.size, this.duration);
        }
        else {
            this.currentRow.updateFileSizeDisplay(this.file.size);
        }
    }
}
class RegistrableEvent {
    registeredCallbacks = [];
    register(func) {
        this.registeredCallbacks.push(func);
    }
    unregister(func) {
        this.registeredCallbacks.splice(this.registeredCallbacks.indexOf(func), 1);
    }
    clearAll() {
        this.registeredCallbacks = [];
    }
    callAllRegisteredFunctions(data) {
        for (let i = 0; i < this.registeredCallbacks.length; i++)
            this.registeredCallbacks[i](data);
    }
}
class KeyDownEventRegistrar extends RegistrableEvent {
    constructor() {
        super();
        this.attachToCurrentWindow();
    }
    register(func) {
        this.registeredCallbacks.push(func);
    }
    attachToCurrentWindow() {
        curWin.addEventListener('keydown', keyEvent => this.callAllRegisteredFunctions(keyEvent), { passive: false });
    }
}
/** Splits inputted seconds into hours, minutes, & seconds. toString() returns the time in digital format. */
class Time {
    seconds = 0;
    minutes = 0;
    hours = 0;
    constructor(seconds) {
        this.seconds = Time.numberToDigitalTimeString(Math.floor(seconds % 60));
        this.minutes = Math.floor(seconds / 60);
        this.hours = Math.floor(this.minutes / 60);
        this.minutes = Time.numberToDigitalTimeString(this.minutes - this.hours * 60);
        this.hours = Time.numberToDigitalTimeString(this.hours);
    }
    toString() {
        if (this.hours === '00')
            return `${this.minutes}:${this.seconds}`;
        return `${this.hours}:${this.minutes}:${this.seconds}`;
    }
    static numberToDigitalTimeString(number) {
        if (number <= 9)
            return `0${number}`;
        return `${number}`;
    }
}
class DataTransferItemGrabber {
    dataTransferItemList = [];
    files = [];
    activePromises = 0;
    filesCollected = 0;
    filesAdded = 0;
    phase = 0 /* PhaseType.COLLECTING */;
    /** @param dataTransferItemList this can be any array-like containing DataTransferItems or File / Directory entries (from DataTransferItem.webkitGetAsEntry()) */
    constructor(dataTransferItemList) {
        this.dataTransferItemList = dataTransferItemList;
    }
    async retrieveContents() {
        return new Promise(async (resolve) => {
            if (this.files.length > 0)
                resolve(this.files);
            let fileEntryArray = []; //collect all file entries that need to be scanned
            //@ts-ignore
            for (let i = 0; i < this.dataTransferItemList.length; i++)
                fileEntryArray.push(this.dataTransferItemList[i]?.webkitGetAsEntry?.() ?? this.dataTransferItemList[i]);
            await this.scanFilesInArray(fileEntryArray);
            this.phase = 1 /* PhaseType.RETRIEVING */;
            await new Promise((resolve) => {
                const waitForPromisesToResolve = (() => {
                    if (this.activePromises > 0) {
                        setTimeout(waitForPromisesToResolve, 5);
                    }
                    else {
                        resolve();
                    }
                });
                waitForPromisesToResolve();
            });
            this.phase = 2 /* PhaseType.FINISHED */;
            this.updateLoadingStatus();
            return resolve(this.files);
        });
    }
    async scanFilesInArray(fileEntries) {
        return new Promise(async (resolve) => {
            for (let i = 0; i < fileEntries.length; i++) {
                let webkitEntry = fileEntries[i];
                if (webkitEntry.isDirectory) {
                    let reader = webkitEntry.createReader();
                    await this.addFilesInDirectory(reader);
                }
                else if (webkitEntry.isFile) {
                    let index = this.filesCollected++;
                    this.files.push(null);
                    this.updateLoadingStatus();
                    let promise = this.getFile(webkitEntry);
                    promise.then(file => {
                        this.files[index] = file;
                        ++this.filesAdded;
                        this.updateLoadingStatus();
                    });
                    promise.finally(() => {
                        --this.activePromises;
                    });
                    ++this.activePromises;
                }
            }
            resolve();
        });
    }
    async addFilesInDirectory(reader) {
        return new Promise(async (resolve) => {
            let someFiles = await this.getSomeFilesInDirectory(reader);
            while (someFiles.length > 0) {
                await this.scanFilesInArray(someFiles);
                someFiles = await this.getSomeFilesInDirectory(reader);
            }
            return resolve(this.files);
        });
    }
    async getSomeFilesInDirectory(reader) {
        return new Promise(async (resolve) => {
            reader.readEntries(someFiles => {
                resolve(someFiles);
            }, error => {
                console.error(error, reader);
                resolve([]);
            });
        });
    }
    async getFile(fileEntry) {
        return new Promise(async (resolve) => {
            fileEntry.file(file => {
                resolve(file);
            });
        });
    }
    updateLoadingStatus() {
        switch (this.phase) {
            case 0 /* PhaseType.COLLECTING */: return changeStatus(`Collecting: (${this.filesCollected} files; ${this.filesAdded} processed)`);
            case 1 /* PhaseType.RETRIEVING */: return changeStatus(`Processed: ${this.filesAdded}/${this.filesCollected} files`);
            case 2 /* PhaseType.FINISHED */: return changeStatus(`Adding ${this.filesAdded} to the playlist... (this will lag)`);
        }
    }
}
var KEY_DOWN_EVENT = new KeyDownEventRegistrar();
var StatusTexts = {
    PLAYING: "Playing",
    PAUSED: "Paused",
    STOPPED: "Stopped",
    LOADING: "Loading",
    BUFFERING: "Buffering",
    DOWNLOADING: "Downloading File...",
    PROCESSING: "Processing...",
    RETRIEVING: "Retrieving Files...",
    COLLECTING: "Collecting Files..."
};
var RowColors = {
    PLAYING: "rgb(172, 172, 172)",
    SELECTING: "lightblue",
    NONE: ""
};
var MAIN_TABLE = document.body.querySelector(".mainTable"), PLAYLIST_VIEWER_TABLE = document.getElementById("Playlist_Viewer"), BUFFER_SECONDS = document.getElementById('bufferSeconds'), COMPACT_MODE_LINK_ELEMENT = document.getElementById('compactModeStyleLink'), COMPACT_MODE_TOGGLE = document.getElementById('compactMode'), SEEK_DURATION_NUMBER_INPUT = document.getElementById('seekDuration'), SEEK_DURATION_DISPLAY = document.getElementById("seekDurationDisplay"), SEEK_DISTANCE_PROPORTIONAL_CHECKBOX = document.getElementById('seekDistanceProportional'), SKIP_UNPLAYABLE_CHECKBOX = document.getElementById('skipUnplayable'), SHOW_LENGTHS = document.getElementById('showLengths'), TOGGLE_PIP_BUTTON = document.getElementById('enterPIP'), UPLOAD_BUTTON = document.getElementById('0input'), UPLOAD_DIRECTORY_BUTTON = document.getElementById('inputDirectory'), PLAY_RATE_RANGE = document.getElementById('0playRateSlider'), SETTINGS_POPUP = document.getElementById('settingsPage'), ERROR_POPUP = document.getElementById('errorPopup'), DEPRECATED_POPUP = document.getElementById('deprecatedPopup'), DIALOGS = [SETTINGS_POPUP, ERROR_POPUP, DEPRECATED_POPUP], ERROR_LIST = document.getElementById('errorList'), CONTEXT_MENU = document.getElementById('rightClickContextMenu'), MOBILE_CONTEXT_BUTTONS = document.getElementById("mobileContextButtons"), MOBILE_PLAYLIST_OPTIONS = document.getElementById('mobilePlaylistOptions'), 
// LOADING_GRAY = document.getElementById('loadingGray') as HTMLDivElement,
PROGRESS_BAR = document.getElementById('progress-bar'), HOVERED_TIME_DISPLAY = document.getElementById('hoveredTimeDisplay'), VOLUME_CHANGER = document.getElementById('0playVolume'), PLAY_RATE = document.getElementById('0playRate'), CENTS_CHECKBOX = document.getElementById('centsCheckbox'), PLAY_PAN = document.getElementById('0playPan'), SEEK_BACK = document.getElementById('seekBack'), 
// SEEK_FORWARD = document.getElementById('seekForward') as HTMLTableCellElement,
REPEAT_BUTTON = document.getElementById('repeatButton'), SHUFFLE_BUTTON = document.getElementById('shuffleButton'), MUTE_BUTTON = document.getElementById('0Mute'), PLAY_BUTTON = document.getElementById('playpause'), STATUS_TEXT = document.getElementById('0status'), CURRENT_FILE_NAME = document.getElementById('currentFileName'), POSITION_OF_SONG_DISPLAY = document.getElementById('firstDurationLabel'), DURATION_OF_SONG_DISPLAY = document.getElementById('secondDurationLabel'), DROPPING_FILE_OVERLAY = document.getElementById("dragOverDisplay");
var sounds = [];
var selectedRows = [];
var hoveredRowInDragAndDrop = null; //does not work with importing files, only when organizing added files
var skipSongQueued = false;
var currentSongIndex = null;
/* start */ (() => {
    if ("serviceWorker" in navigator && !NO_SERVICE_WORKER) {
        navigator.serviceWorker.register("../ServiceWorker.js");
    }
    registerDialogInertEvents();
    KEY_DOWN_EVENT.register(keyEvent => {
        if (keyEvent.key != "Tab" && keyEvent.key != "Shift" && keyEvent.key != "Ctrl" && keyEvent.key != "Alt" && keyEvent.key != "Enter")
            closeContextMenu();
        const target = keyEvent.target;
        if (target.closest("dialog") !== null)
            return;
        const keyLower = keyEvent.key.toLowerCase();
        const compressed = (Number(keyEvent.shiftKey) /*1*/) + (Number(keyEvent.ctrlKey) << 1 /*2*/) + (Number(keyEvent.altKey) << 2 /*4*/) + (Number(keyEvent.metaKey) << 3 /*8*/);
        if (compressed == 1) { //shift key only
            switch (keyLower) {
                case "n":
                    jumpSong(1);
                    keyEvent.preventDefault();
                    break;
                case "p":
                    jumpSong(-1);
                    keyEvent.preventDefault();
                    break;
            }
        }
        else if (compressed == 2) { //ctrl key only
            switch (keyLower) {
                case "a":
                    selectAll();
                    keyEvent.preventDefault();
                    break;
            }
            // } else if(compressed == 4){ //alt key only
            // } else if(compressed == 8){ //meta key only
        }
        else { //combination or none
            if (compressed == 0) {
                switch (keyLower) {
                    case "escape":
                        deselectAll();
                        PLAYLIST_VIEWER_TABLE.blur();
                        break;
                    case " ": //space
                    case "k":
                        PLAY_BUTTON.checked = !PLAY_BUTTON.checked;
                        togglePauseCurrentSong();
                        keyEvent.preventDefault();
                        break;
                    case "arrowleft":
                        if (!(keyEvent.target instanceof curWin.HTMLInputElement && keyEvent.target.inputMode === "numeric")) {
                            seek(-1);
                            keyEvent.preventDefault();
                        }
                        break;
                    case "arrowright":
                        if (!(keyEvent.target instanceof curWin.HTMLInputElement && keyEvent.target.inputMode === "numeric")) {
                            seek(1);
                            keyEvent.preventDefault();
                        }
                        break;
                    case "m":
                        MUTE_BUTTON.click();
                        break;
                    case "l":
                        REPEAT_BUTTON.click();
                        break;
                    case "s":
                        SHUFFLE_BUTTON.click();
                        break;
                }
            }
        }
    });
    requestAnimationFrame(onFrameStepped);
    // updateSongInfos();
    makeDocumentDroppable();
    // curDoc.addEventListener('touchend', (touchEvent: TouchEvent) => {
    //   if(touchEvent.touches == 1) {
    //     touchEvent.preventDefault();
    //     const rect = touchEvent.target.getBoundingClientRect();
    //     const mouseEvent = new MouseEvent("contextmenu", {
    //       bubbles: true,
    //       cancelable: false,
    //       view: window,
    //       button: 2,
    //       buttons: 0,
    //       clientX: rect.left,
    //       clientY: rect.top
    //     });
    //     touchEvent.target.dispatchEvent(mouseEvent);
    //     // openRowContextMenu(releasedTouch.clientX, releasedTouch.clientY, releasedTouch.target);
    //   }
    // });
    curDoc.addEventListener("beforeunload", function () {
        stopPlayingMusic();
        sounds = [];
    }, { passive: true });
    initContextMenu();
    registerClickEvent(CURRENT_FILE_NAME, () => PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1].scrollIntoView(false))();
    registerClickEvent('skipBack', () => jumpSong(-1))();
    registerClickEvent('skipForward', () => jumpSong())();
    registerClickEvent(SEEK_BACK, () => seek(-1))();
    registerClickEvent('seekForward', () => seek(1))();
    registerClickEvent('settingsButton', () => SETTINGS_POPUP.showModal())();
    registerClickEvent('exitSettingsButton', () => SETTINGS_POPUP.close())();
    registerClickEvent('exitErrorPopup', () => ERROR_POPUP.close())();
    registerClickEvent('exitDeprecatedPopup', () => DEPRECATED_POPUP.close())();
    registerKeyDownEvent(SEEK_BACK.nextElementSibling, () => PLAY_BUTTON.click());
    registerChangeEvent(PLAY_BUTTON, togglePauseCurrentSong);
    registerChangeEvent(COMPACT_MODE_TOGGLE, toggleCompactMode);
    registerChangeEvent(SHOW_LENGTHS, updateAllFileInfos);
    registerKeyDownEvent(MUTE_BUTTON.parentElement, () => MUTE_BUTTON.click());
    registerChangeEvent(MUTE_BUTTON, () => {
        if (MUTE_BUTTON.checked) {
            gainNode.gain.value = 0;
        }
        else {
            gainNode.gain.value = VOLUME_CHANGER.valueAsNumber;
        }
    });
    registerKeyDownEvent(REPEAT_BUTTON.labels[0], () => REPEAT_BUTTON.click());
    // registerChangeEvent(REPEAT_BUTTON, () => {
    //     const checked = REPEAT_BUTTON.checked;
    //     if(currentHowlExists()) sounds[currentSongIndex].howl.loop(checked);
    // });
    registerKeyDownEvent(SHUFFLE_BUTTON.labels[0], () => SHUFFLE_BUTTON.click());
    registerChangeEvent(SHUFFLE_BUTTON, () => handleShuffleButton(SHUFFLE_BUTTON.checked));
    registerChangeEvent(PLAY_RATE, () => onPlayRateUpdate(PLAY_RATE.valueAsNumber));
    registerInputEvent(PLAY_RATE_RANGE, () => { onPlayRateUpdate(PLAY_RATE_RANGE.valueAsNumber); });
    registerChangeEvent(CENTS_CHECKBOX, () => {
        if (CENTS_CHECKBOX.checked) {
            const rate = calculateDetuneFromPlayRate(PLAY_RATE.valueAsNumber);
            PLAY_RATE_RANGE.setAttribute("list", "commonCents");
            PLAY_RATE_RANGE.max = "2400";
            PLAY_RATE_RANGE.min = "-2400";
            PLAY_RATE.min = "";
            PLAY_RATE.setAttribute("value", "0");
            PLAY_RATE_RANGE.step = PLAY_RATE.step = "100";
            PLAY_RATE_RANGE.valueAsNumber = PLAY_RATE.valueAsNumber = rate;
        }
        else {
            const rate = calculatePlayRateFromDetune(PLAY_RATE.valueAsNumber);
            PLAY_RATE_RANGE.setAttribute("list", "commonVolumesAndRates");
            PLAY_RATE_RANGE.max = "2";
            PLAY_RATE_RANGE.min = PLAY_RATE.min = "0";
            PLAY_RATE.setAttribute("value", "1");
            PLAY_RATE_RANGE.step = PLAY_RATE.step = "0.01";
            PLAY_RATE_RANGE.valueAsNumber = PLAY_RATE.valueAsNumber = rate;
        }
    });
    registerChangeEvent(SEEK_DISTANCE_PROPORTIONAL_CHECKBOX, updateSeekDurationDisplay);
    registerKeyDownEvent(UPLOAD_BUTTON.labels[0].querySelector("img"), () => UPLOAD_BUTTON.click());
    registerChangeEvent(UPLOAD_BUTTON, () => importFiles(UPLOAD_BUTTON.files));
    registerChangeEvent(UPLOAD_DIRECTORY_BUTTON, () => importFiles(UPLOAD_DIRECTORY_BUTTON.files));
    registerInputEvent(PLAY_PAN, onPanningUpdate);
    registerInputEvent(VOLUME_CHANGER, onVolumeUpdate);
    initializeTableEvents();
    ERROR_POPUP.addEventListener("close", onCloseErrorPopup);
    SEEK_DURATION_NUMBER_INPUT.addEventListener('input', updateSeekDurationDisplay, { passive: true });
    PROGRESS_BAR.addEventListener('pointerenter', (pointer) => progressBarSeek(pointer, 1 /* ProgressBarSeekAction.DISPLAY_TIME */), { passive: true });
    PROGRESS_BAR.addEventListener('pointerdown', (pointer) => { if (pointer.button == 0)
        progressBarSeek(pointer, 0 /* ProgressBarSeekAction.SEEK_TO */); }, { passive: true });
    PROGRESS_BAR.addEventListener('pointermove', (pointer) => progressBarSeek(pointer, 1 /* ProgressBarSeekAction.DISPLAY_TIME */), { passive: true });
    PROGRESS_BAR.addEventListener('pointerleave', (pointer) => progressBarSeek(pointer, 2 /* ProgressBarSeekAction.STOP_DISPLAYING */), { passive: true });
    if ('documentPictureInPicture' in window) {
        registerClickEvent(TOGGLE_PIP_BUTTON, togglePictureInPicture);
    }
    else {
        TOGGLE_PIP_BUTTON.remove();
    }
    if (SITE_DEPRECATED)
        DEPRECATED_POPUP.showModal();
    SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked = true;
    SKIP_UNPLAYABLE_CHECKBOX.checked = true;
    if ("launchQueue" in window) {
        window.launchQueue.setConsumer(async (launchParams) => {
            if (launchParams.files.length) {
                await import("../Javascript/howler.js"); //this app is old and doesn't wait for module import to finish.
                Promise.allSettled(launchParams.files.filter(fsFile => fsFile.kind === "file").map(fsFile => fsFile.getFile())).then(results => {
                    addFiles(results.map(result => result?.value).filter(value => value));
                });
            }
        });
    }
    //END
})();
function makeDocumentDroppable() {
    curWin.addEventListener("dragover", (event) => {
        if (!onlyFiles(event.dataTransfer))
            return;
        event.preventDefault();
        DROPPING_FILE_OVERLAY.toggleAttribute("draggingOver", true);
        stopHighlightingRow();
    });
    curWin.addEventListener("dragleave", () => {
        DROPPING_FILE_OVERLAY.toggleAttribute("draggingOver", false);
        stopHighlightingRow();
    }, { passive: true });
    curWin.addEventListener("drop", (event) => {
        const dataTransfer = event.dataTransfer;
        if (!onlyFiles(dataTransfer))
            return;
        event.preventDefault();
        DROPPING_FILE_OVERLAY.toggleAttribute("draggingOver", false);
        stopHighlightingRow();
        importFiles(dataTransfer);
    });
}
function registerDialogInertEvents() {
    modifyDialogPrototype();
    DIALOGS.forEach(dialog => {
        dialog.addEventListener("close", () => {
            dialog.toggleAttribute("inert", true);
        });
    });
}
function modifyDialogPrototype() {
    const showModalFunction = curWin.HTMLDialogElement.prototype.showModal;
    curWin.HTMLDialogElement.prototype.showModal = function () {
        this.removeAttribute("inert");
        return showModalFunction.call(this);
    };
}
function onCloseErrorPopup() {
    let childElement;
    while ((childElement = ERROR_LIST.lastChild) != null) {
        ERROR_LIST.removeChild(childElement);
    }
}
/** Registers a click event which calls the specified function. Call the returned function to add a keyboard event. */
function registerClickEvent(element, func) {
    if (typeof element === 'string')
        element = curDoc.getElementById(element);
    element.addEventListener('click', func, { passive: true });
    return () => registerKeyDownEvent(element, func);
}
function registerKeyDownEvent(element, func, keyName = "Enter") {
    element.addEventListener('keydown', (keyEvent) => { if (keyEvent.key == keyName)
        func(keyEvent); }, { passive: true });
}
function registerChangeEvent(element, func) {
    if (typeof element === 'string')
        element = curDoc.getElementById(element);
    element.addEventListener('change', func, { passive: true });
}
function registerInputEvent(elem, func) {
    elem.addEventListener('input', func, { passive: true });
}
function toggleCompactMode() {
    COMPACT_MODE_LINK_ELEMENT.disabled = !COMPACT_MODE_TOGGLE.checked;
    rowHeight = (COMPACT_MODE_TOGGLE.checked) ? 23 + 1 : 55 + 1;
}
function onFrameStepped() {
    if (currentSongIndex !== null && sounds[currentSongIndex].duration !== null) {
        const songDuration = sounds[currentSongIndex].duration;
        const currentTime = SoundManager.getCurrentTime();
        const timeToSet = (currentTime / songDuration) * 100;
        if (Number.isFinite(timeToSet))
            setProgressBarPercentage(timeToSet);
        updateCurrentTimeDisplay(currentTime, songDuration);
    }
    // changeStatus(String(scheduledNodes.length)); //debug
    requestAnimationFrame(onFrameStepped);
}
function reapplySoundAttributes(howl) {
    howl.rate(parseFloat(PLAY_RATE.value));
    howl.volume(parseFloat(VOLUME_CHANGER.value));
    howl.mute(MUTE_BUTTON.checked);
    howl.stereo(parseFloat(PLAY_PAN.value));
}
function updateCurrentTimeDisplay(currentTime, songDurationInSeconds) {
    const songDurationFormatted = new Time(songDurationInSeconds).toString();
    if (DURATION_OF_SONG_DISPLAY.textContent != songDurationFormatted)
        DURATION_OF_SONG_DISPLAY.textContent = songDurationFormatted;
    POSITION_OF_SONG_DISPLAY.textContent = new Time(currentTime).toString();
}
function progressBarSeek(mouse, hoverType) {
    if (currentSongIndex === null || (mouse?.pointerType == "touch" && hoverType !== 0 /* ProgressBarSeekAction.SEEK_TO */) || hoverType === 2 /* ProgressBarSeekAction.STOP_DISPLAYING */) {
        HOVERED_TIME_DISPLAY.style.transform = "translate(-9999px, 0px)";
        return;
    }
    const offsetX = mouse.offsetX;
    const progressBarWidth = PROGRESS_BAR.clientWidth;
    const duration = sounds[currentSongIndex].duration;
    if (duration === null) {
        HOVERED_TIME_DISPLAY.style.transform = "translate(-9999px, 0px)";
        return;
    }
    let seekToTime = Math.max(offsetX * (duration / progressBarWidth), 0);
    switch (hoverType) {
        case (0 /* ProgressBarSeekAction.SEEK_TO */): {
            SoundManager.setCurrentTime(seekToTime);
            return;
        }
        case (1 /* ProgressBarSeekAction.DISPLAY_TIME */): {
            const progressBarDomRect = PROGRESS_BAR.getBoundingClientRect();
            HOVERED_TIME_DISPLAY.style.transform = `translate(${(mouse.x - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2)}px, ${progressBarDomRect.top - 20}px)`;
            HOVERED_TIME_DISPLAY.firstChild.textContent = new Time(seekToTime).toString();
            return;
        }
    }
}
/**
 * @param error The exception.
 * @param shortMessage A user-readable error message. If the error type is known, it will help to write this value out manually to better explain the error to the user.
 * @param errorCategory The category the error is contained in.
 */
function displayError(error, shortMessage, errorCategory) {
    console.error(error);
    errorCategory += ":";
    const songError = curDoc.createElement('dd');
    songError.textContent = error.name.concat(": ", shortMessage ?? error.message);
    songError.title = error.message;
    let insertInside = null;
    const children = ERROR_LIST.children;
    const length = children.length;
    for (let i = 0; i < length; i++) {
        if (children[i].firstChild.data == errorCategory) {
            insertInside = children[i];
            break;
        }
    }
    if (insertInside) {
        insertInside.appendChild(songError);
    }
    else {
        const songTitle = curDoc.createElement('dt');
        songTitle.textContent = errorCategory;
        songTitle.appendChild(songError);
        ERROR_LIST.appendChild(songTitle);
    }
    if (!ERROR_POPUP.open)
        ERROR_POPUP.showModal();
}
function seek(seekDirection) {
    if (currentSongIndex === null)
        return;
    const seekDuration = SEEK_DURATION_NUMBER_INPUT.valueAsNumber * seekDirection;
    const numToAdd = (SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked) ? seekDuration * obtainPlayRate() : seekDuration;
    const currentTime = SoundManager.getCurrentTime();
    SoundManager.setCurrentTime(currentTime + numToAdd);
}
async function importFiles(element) {
    if (element.constructor.name == "FileList") {
        addFiles(element);
    }
    else if (element instanceof curWin.DataTransfer) {
        let dataTransferItemList = element?.items;
        if (!dataTransferItemList || dataTransferItemList.length == 0)
            return;
        changeStatus(StatusTexts.RETRIEVING);
        let fileReceiver = new DataTransferItemGrabber(dataTransferItemList);
        addFiles(await fileReceiver.retrieveContents());
    }
}
async function addFiles(files /*FileList or File[]*/) {
    const songTableRows = [];
    const lengthBeforeBegin = sounds.length;
    let offsetBecauseOfSkipped = 0;
    changeStatus(`Importing ${files.length} Files...`);
    const Mediabunny = await importMediabunny();
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file)
            continue;
        const fileExtension = getFileExtension(file.name);
        if (SKIP_UNPLAYABLE_CHECKBOX.checked && !isValidExtension(fileExtension)) {
            const error = new TypeError(`The file ${file.name} failed to import because its extension ${fileExtension} is unsupported and cannot be played!`);
            displayError(error, `The file type '${fileExtension}' is unsupported.`, file.name);
            ++offsetBecauseOfSkipped;
            continue;
        }
        const nativeIndex = i + lengthBeforeBegin - offsetBecauseOfSkipped;
        const songRow = new SongTableRow();
        songRow.setSongName(file.name);
        songRow.updateFileSizeDisplay(file.size);
        songRow.setRowSongNumber(nativeIndex + 1);
        const song = new Song(file, nativeIndex, songRow);
        const input = new Mediabunny.Input({ source: new Mediabunny.BlobSource(file), formats: Mediabunny.ALL_FORMATS });
        input.getPrimaryAudioTrack().then(track => {
            if (!track) {
                console.warn(`Could not find an audio track in file ${file.name}`);
                return;
            }
            track.getDurationFromMetadata({ skipLiveWait: true }).then(async (duration) => {
                if (duration === null) {
                    duration = await track.computeDuration({
                        metadataOnly: true,
                        verifyKeyPackets: false,
                        skipLiveWait: true
                    });
                }
                song.updateDuration(duration);
            });
        }).catch(e => {
            console.warn(`Error reading track data from file ${file.name}`, e);
        });
        songTableRows.push(songRow.tableRow); //index (2nd parameter) is used to number the checkboxes
        sounds.push(song);
    }
    addRowsInPlaylistTable(songTableRows);
    changeStatus(`${files.length - offsetBecauseOfSkipped} files added!`);
    // updateAllFileInfos();
}
function addRowsInPlaylistTable(songTableRows) {
    const QUANTUM = 32768;
    const playlistTableBody = PLAYLIST_VIEWER_TABLE.tBodies[0];
    for (let i = 0; i < songTableRows.length; i += QUANTUM) {
        playlistTableBody.append(...songTableRows.slice(i, Math.min(i + QUANTUM, songTableRows.length)));
    }
}
function onPlayRateUpdate(newRate) {
    PLAY_RATE_RANGE.valueAsNumber = PLAY_RATE.valueAsNumber = newRate;
    SoundManager.setPlayRate(obtainPlayRate());
    updateSeekDurationDisplay();
}
function obtainPlayRate() {
    return (CENTS_CHECKBOX.checked) ? calculatePlayRateFromDetune(PLAY_RATE.valueAsNumber) : PLAY_RATE.valueAsNumber;
}
function onPanningUpdate() {
    // if(currentHowlExists()) //TODO: implement
    //     sounds[currentSongIndex].howl.stereo(Number(PLAY_PAN.value));
    PLAY_PAN.labels[0].textContent = `${Math.floor(Number(PLAY_PAN.value) * 100)}%`;
}
function onVolumeUpdate() {
    gainNode.gain.value = VOLUME_CHANGER.valueAsNumber;
    VOLUME_CHANGER.labels[0].textContent = `${Math.floor(VOLUME_CHANGER.valueAsNumber * 100)}%`;
}
function setIsBuffering(buffering) {
    isBuffering = buffering;
}
function updateSeekDurationDisplay() {
    const duration = SEEK_DURATION_NUMBER_INPUT.valueAsNumber;
    const playRate = (SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked) ? obtainPlayRate() : 1;
    if (duration < 1) {
        SEEK_DURATION_DISPLAY.textContent = `${(duration * playRate) * 1000} ms`;
    }
    else {
        SEEK_DURATION_DISPLAY.textContent = `${duration * playRate} sec`;
    }
}
function handleShuffleButton(enable) {
    if (enable) {
        // @ts-ignore
        shuffle();
    }
    else {
        unshuffle();
    }
}
// Source - https://stackoverflow.com/a/25984542
// Posted by cocco, modified by community. See post 'Timeline' for change history
// Retrieved 2026-09-01, License - CC BY-SA 3.0
//ts-ignore
function shuffle(b, c, d) {
    c = sounds.length;
    while (c) {
        b = Math.random() * c-- | 0;
        d = sounds[c];
        sounds[c] = sounds[b];
        sounds[b].currentIndex = c;
        sounds[b] = d;
        d.currentIndex = b;
        if (currentSongIndex === c) {
            currentSongIndex = b;
        }
        else if (currentSongIndex === b) {
            currentSongIndex = c;
        }
    }
    updateRowOrder();
}
function unshuffle() {
    let oldArr = sounds;
    sounds = new Array(oldArr.length).fill(null);
    for (let i = 0; i < oldArr.length; i++) {
        let sound = oldArr[i];
        sounds[sound.nativeIndex] = sound;
        sound.currentIndex = sound.nativeIndex;
    }
    if (currentSongIndex !== null) {
        currentSongIndex = oldArr[currentSongIndex].nativeIndex;
    }
    updateRowOrder();
}
function updateRowOrder() {
    const rows = [];
    for (let i = 0; i < sounds.length; i++) {
        sounds[i].currentIndex = i;
        rows.push(sounds[i].currentRow.tableRow);
    }
    const QUANTUM = 32768;
    const body = PLAYLIST_VIEWER_TABLE.tBodies[0];
    body.replaceChildren(body.children[0]);
    for (let i = 0; i < rows.length; i += QUANTUM) {
        body.append(...rows.slice(i, Math.min(i + QUANTUM, rows.length)));
    }
    updateSongNumberings();
}
function onClickSpecificPlaySong(checkbox) {
    const song = sounds[tryFindTableRowInParents(checkbox).rowIndex - 1];
    startOrUnloadSong(song, checkbox.checked);
}
function startOrUnloadSong(song, startPlaying) {
    if (startPlaying)
        startPlayingSpecificSong(song);
    else
        stopPlayingMusic();
}
function stopPlayingMusic() {
    PLAY_BUTTON.checked = false;
    SoundManager.stop();
    removeCurrentSong();
    setProgressBarPercentage(100);
    changeStatus(StatusTexts.STOPPED);
    if (DURATION_OF_SONG_DISPLAY.textContent != "00:00")
        DURATION_OF_SONG_DISPLAY.textContent = "00:00";
    if (POSITION_OF_SONG_DISPLAY.textContent != "00:00")
        POSITION_OF_SONG_DISPLAY.textContent = "00:00";
    if (HOVERED_TIME_DISPLAY.style.transform != "translate(-9999px, 0px)")
        HOVERED_TIME_DISPLAY.style.transform = "translate(-9999px, 0px)";
    PLAY_BUTTON.checked = false;
}
/**
 * @param percent A number from 0 to 100
 */
function setProgressBarPercentage(percent) {
    PROGRESS_BAR.value = percent;
    PROGRESS_BAR.style.setProperty("--percentage", String(percent) + '%');
    // PROGRESS_BAR.style.setProperty("--percentageRev", String((-percent)+100)+'%');
}
function startPlayingSpecificSong(song) {
    changeStatus(StatusTexts.BUFFERING);
    PLAY_BUTTON.checked = true;
    setCurrentSong(song);
    SoundManager.stop();
    SoundManager.startTime = 0;
    SoundManager.startPlaying();
}
function jumpSong(amount = 1) {
    if (currentSongIndex === null)
        return;
    const song = sounds[(currentSongIndex + (sounds.length + amount)) % sounds.length];
    setCurrentSong(song);
    SoundManager.stop();
    SoundManager.startTime = 0;
    SoundManager.startPlaying();
}
function togglePauseCurrentSong() {
    if (currentSongIndex === null) {
        PLAY_BUTTON.checked = !PLAY_BUTTON.checked;
        return;
    }
    if (PLAY_BUTTON.checked) {
        SoundManager.resume();
        changeStatus(StatusTexts.PLAYING);
    }
    else {
        SoundManager.pause();
        changeStatus(StatusTexts.PAUSED);
    }
}
// function refreshSongNames(){
//     for (let i = 0; i < sounds.length; i++) {
//         sounds[i].currentRow.setSongName(sounds[i].file.name);
//     }
// }
function setCurrentFileName(name) {
    if (CURRENT_FILE_NAME.textContent !== name) {
        CURRENT_FILE_NAME.textContent = name;
        CURRENT_FILE_NAME.setAttribute('title', name);
        curDoc.title = name;
    }
}
function precisionRound(number, precision) {
    const factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}
function changeStatus(status) { STATUS_TEXT.textContent = status; }
function onlyFiles(dataTransfer) { return dataTransfer.types.length == 1 && dataTransfer.types[0] === 'Files'; }
function isValidExtension(extension) { return canPlay(extension); }
//@ts-ignore
function setAttributes(element, attrs) { for (const key in attrs)
    element.setAttribute(key, attrs[key]); }
// @ts-ignore
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function getInMegabytes(bytes) { return (bytes / 1_048_576).toFixed(2); }
function getFileExtension(fileName) { return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(); }
/*            TABLE INTERACTION FUNCTIONS             */
var longTapTimer = null;
var longTapping = false;
function initializeTableEvents() {
    PLAYLIST_VIEWER_TABLE.addEventListener("keyup", (keyEvent) => {
        if (keyEvent.key == "Tab") {
            if (selectedRows.length == 0 && PLAYLIST_VIEWER_TABLE.rows.length > 1)
                selectRow(PLAYLIST_VIEWER_TABLE.rows[1]);
            if (selectedRows[0])
                scrollRowIntoView(selectedRows[0]);
        }
    });
    PLAYLIST_VIEWER_TABLE.addEventListener("keydown", selectionLogicForKeyboard);
    PLAYLIST_VIEWER_TABLE.addEventListener('click', onSingleClick, { passive: true });
    PLAYLIST_VIEWER_TABLE.addEventListener('dblclick', onDoubleClick, { passive: true });
    PLAYLIST_VIEWER_TABLE.addEventListener("contextmenu", onPlayListRightClick);
    initializeTouchTableEvents();
}
function initializeTouchTableEvents() {
    PLAYLIST_VIEWER_TABLE.addEventListener('touchstart', function (event) {
        longTapping = false;
        if (event.touches.length > 1 || (event.target.classList.contains("fileSizeLabel"))) {
            cancelLongTapTimer();
        }
        else {
            // @ts-ignore
            longTapTimer = setTimeout(onLongTap, 425, event);
        }
    }, { passive: true });
    PLAYLIST_VIEWER_TABLE.addEventListener('touchmove', function (_) {
        cancelLongTapTimer();
    }, { passive: true });
    PLAYLIST_VIEWER_TABLE.addEventListener('touchend', function (event) {
        cancelLongTapTimer();
        if (longTapping) {
            event.preventDefault(); //prevent default click events from running
            event.stopImmediatePropagation();
        }
        longTapping = false;
    }, { passive: false });
    document.getElementById("mobileDeselectRows").addEventListener("click", deselectAll);
    document.getElementById("moreOptionsSelectedRows").addEventListener("click", spawnRowContextMenuMobile);
}
function cancelLongTapTimer() {
    if (longTapTimer !== null) {
        clearTimeout(longTapTimer);
        longTapTimer = null;
    }
}
function onLongTap(event) {
    longTapTimer = null;
    longTapping = true;
    navigator?.vibrate?.(50);
    const target = event.target;
    const row = findValidTableRow(target);
    if (row) {
        onSelectRowMobile(row);
    }
}
function spawnRowContextMenuMobile(mouseEvent) {
    if (!contextMenuOpen()) {
        mouseEvent.stopPropagation();
        spawnRowContextMenu(mouseEvent.clientX, 30, false);
    }
}
function onSelectRowMobile(row) {
    if (isSelected(row)) {
        deselectRow(selectedRows.indexOf(row));
        updateMobilePlaylistOptions();
    }
    else {
        selectRow(row);
        showMobilePlaylistOptions();
    }
}
function showMobilePlaylistOptions() {
    updateMobilePlaylistOptions_internal();
    MOBILE_PLAYLIST_OPTIONS.toggleAttribute("data-active", true);
}
function updateMobilePlaylistOptions_internal() {
    MOBILE_PLAYLIST_OPTIONS.querySelector("#mobileSelectStatus").textContent = String(selectedRows.length) + " selected";
    const contextOptions = getPlaylistContextOptions();
    const contextButtons = [];
    for (const child of MOBILE_CONTEXT_BUTTONS.children) {
        for (let i = 0; i < contextOptions.length; i++) {
            if (child.alt == contextOptions[i].text) {
                contextOptions[i] = child;
                break;
            }
        }
    }
    for (const option of contextOptions) {
        if (option instanceof HTMLImageElement) {
            contextButtons.push(option);
            continue;
        }
        const icon = option.icon;
        if (icon == null)
            continue;
        const button = document.createElement("img");
        button.className = "clickableButton";
        button.style.borderRadius = "8px";
        button.style.width = "30px";
        button.style.height = "30px";
        button.src = icon;
        button.alt = option.text;
        button.title = option.text;
        button.addEventListener("click", option.action);
        contextButtons.push(button);
    }
    MOBILE_CONTEXT_BUTTONS.replaceChildren(...contextButtons);
}
function updateMobilePlaylistOptions() {
    if (selectedRows.length === 0) {
        hideMobilePlaylistOptions();
    }
    else {
        updateMobilePlaylistOptions_internal();
    }
}
function hideMobilePlaylistOptions() {
    MOBILE_PLAYLIST_OPTIONS.toggleAttribute("data-active", false);
}
function initializeRowEvents(row) {
    if (ON_MOBILE)
        return; //none of these work on mobile. ill need a polyfill or something
    row.setAttribute('draggable', "true");
    row.addEventListener('dragstart', (event) => {
        if (onlyFiles(event.dataTransfer))
            return;
        if (!selectedRows.includes(row)) {
            deselectAll();
            selectRow(row);
        }
        event.dataTransfer.clearData();
        for (const selectedRow of selectedRows) {
            event.dataTransfer.items.add(sounds[selectedRow.rowIndex - 1].file);
        }
        event.dataTransfer.setData("text/draggingAction", "action:reorganizingPlaylist");
        whileDraggingRows(event);
    });
    row.addEventListener('dragover', (event) => {
        event.preventDefault(); //required to make rows allowed drop targets
        whileDraggingRows(event);
    });
    row.addEventListener('drop', onDropRow);
}
var activeRow = null;
function setActiveRow(row) {
    const previouslyActiveRow = activeRow;
    activeRow = row;
    if (previouslyActiveRow && previouslyActiveRow !== row) {
        previouslyActiveRow.firstElementChild.querySelector("input.playpause").checked = false;
        updateRowColor(previouslyActiveRow); //activeRow.style.backgroundColor = RowColors.NONE;
    }
    if (row) {
        row.firstElementChild.querySelector("input.playpause").checked = true;
        updateRowColor(row);
    }
}
function updateRowColor(row) {
    if (row.hasAttribute("data-selected")) {
        row.style.backgroundColor = RowColors.SELECTING;
        return;
    }
    if (activeRow == row) {
        row.style.backgroundColor = RowColors.PLAYING;
        return;
    }
    row.style.backgroundColor = RowColors.NONE;
}
function whileDraggingRows(event) {
    if (onlyFiles(event.dataTransfer))
        return;
    stopHighlightingRow();
    let hoveredElement = findValidTableRow(event.target);
    if (!hoveredElement) {
        return;
    }
    hoveredRowInDragAndDrop = hoveredElement;
    hoveredRowInDragAndDrop.style.borderBottomColor = "blue";
    event.stopPropagation();
}
function onDropRow(event) {
    if (event.dataTransfer.getData("text/draggingAction") != "action:reorganizingPlaylist")
        return;
    stopHighlightingRow();
    sortSelectedRows();
    let row = event.target;
    if (!rowValid(row)) {
        row = tryFindTableRowInParents(row);
        if (!rowValid(row))
            return;
    }
    moveSelectedSongs(row.rowIndex - 1);
    event.stopPropagation();
    event.preventDefault();
}
function stopHighlightingRow() {
    if (hoveredRowInDragAndDrop != null) {
        hoveredRowInDragAndDrop.style.borderBottomColor = "";
        hoveredRowInDragAndDrop.style.borderTopColor = "";
    }
}
function onSingleClick(mouseEvent) {
    let row = findValidTableRow(mouseEvent.target);
    if (row == null)
        return;
    if (mouseEvent instanceof curWin.PointerEvent && mouseEvent.pointerType != "mouse") {
        if (selectedRows.length !== 0 || mouseEvent.ctrlKey) {
            onSelectRowMobile(row);
        }
        return;
    }
    if (mouseEvent.ctrlKey) {
        if (isSelected(row)) {
            deselectRow(selectedRows.indexOf(row));
            updateMobilePlaylistOptions();
            return;
        }
    }
    else if (mouseEvent.shiftKey && selectedRows.length != 0) {
        sortSelectedRows();
        let startingIndex = selectedRows[selectedRows.length - 1].rowIndex;
        const endingIndex = row.rowIndex;
        if (endingIndex > startingIndex) {
            for (let i = startingIndex + 1; i < endingIndex; i++)
                selectRow(PLAYLIST_VIEWER_TABLE.rows[i]);
        }
        else {
            startingIndex = selectedRows[0].rowIndex;
            for (let i = startingIndex - 1; i > endingIndex; i--)
                selectRow(PLAYLIST_VIEWER_TABLE.rows[i]);
        }
        updateMobilePlaylistOptions();
    }
    else {
        deselectAll();
    }
    selectRow(row);
    updateMobilePlaylistOptions();
}
function isSelected(row) { return row.hasAttribute("data-selected"); }
function scrollRowIntoView(row) {
    //@ts-ignore
    if (row.scrollIntoViewIfNeeded) {
        //@ts-ignore
        row.scrollIntoViewIfNeeded();
    }
    else {
        row.scrollIntoView({ behavior: "instant", block: "nearest" });
    }
}
function selectRow(row) {
    row = findValidTableRow(row);
    if (!row || isSelected(row))
        return;
    row.toggleAttribute("data-selected", true);
    updateRowColor(row);
    selectedRows.push(row);
    scrollRowIntoView(row);
}
function onDoubleClick(mouseEvent) {
    if (selectedRows.length > 1) {
        return;
    }
    deselectAll();
    let row = findValidTableRow(mouseEvent.target);
    if (row)
        playRow(row);
}
/**
 * @param removeIndex {number} the row index from selectedRows array to remove.
 * @param removeFromArray Whether to remove the index from the array.
 */
function deselectRow(removeIndex, removeFromArray = true) {
    const row = selectedRows[removeIndex];
    row.toggleAttribute("data-selected", false);
    updateRowColor(row);
    if (removeFromArray)
        selectedRows.splice(removeIndex, 1);
}
function deselectAll() {
    for (let i = 0; i < selectedRows.length; i++)
        deselectRow(i, false);
    selectedRows = [];
    hideMobilePlaylistOptions();
}
function selectInterval() {
    sortSelectedRows();
    if (selectedRows.length < 2)
        return;
    const startRowIndex = selectedRows[0].rowIndex + 1;
    const endRowIndex = selectedRows.at(-1).rowIndex;
    const rows = PLAYLIST_VIEWER_TABLE.rows;
    for (let i = startRowIndex; i < endRowIndex; i++) {
        selectRow(rows[i]);
    }
    updateMobilePlaylistOptions();
}
function selectAll() {
    const rows = PLAYLIST_VIEWER_TABLE.rows;
    if (rows.length <= 1)
        return;
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        row.toggleAttribute("data-selected", true);
        updateRowColor(row);
    }
    selectedRows = Array.prototype.slice.call(rows, 1);
    updateMobilePlaylistOptions();
    PLAYLIST_VIEWER_TABLE.focus({ focusVisible: true });
}
function playRow(row) {
    row = findValidTableRow(row);
    const song = sounds[row.rowIndex - 1];
    const playSongCheckbox = song.currentRow.getPlaySongCheckbox();
    startOrUnloadSong(song, (playSongCheckbox.checked = !playSongCheckbox.checked));
}
function deleteSelectedSongs() {
    const tableBody = PLAYLIST_VIEWER_TABLE.firstElementChild;
    for (let i = 0; i < selectedRows.length; i++) {
        const index = selectedRows[i].rowIndex - 1;
        if (index === currentSongIndex) {
            stopPlayingMusic();
            // setProgressBarPercentage(0);
        }
        else if (currentSongIndex !== null && currentSongIndex > index) {
            --currentSongIndex;
        }
        tableBody.removeChild(selectedRows[i]);
        for (let i = 0; i < sounds.length; i++) {
            const myNativeIndex = sounds[index].nativeIndex;
            if (sounds[i].nativeIndex > myNativeIndex) {
                --sounds[i].nativeIndex;
            }
            if (sounds[i].currentIndex > index) {
                --sounds[i].currentIndex;
            }
        }
        sounds.splice(index, 1);
    }
    deselectAll();
    updateSongNumberings();
}
function moveSelectedSongs(toIndex) {
    const tableBody = PLAYLIST_VIEWER_TABLE.firstElementChild;
    for (let i = selectedRows.length - 1; i >= 0; i--) {
        const index = selectedRows[i].rowIndex - 1;
        const movedSong = sounds.splice(index, 1)[0];
        if (toIndex > index) {
            if (!SHUFFLE_BUTTON.checked) {
                for (const song of sounds) {
                    if (song.nativeIndex > index && song.nativeIndex <= toIndex) {
                        song.nativeIndex--;
                    }
                }
            }
            sounds.splice(toIndex, 0, movedSong);
            tableBody.insertBefore(selectedRows[i], tableBody.children[toIndex + 2]);
        }
        else {
            if (!SHUFFLE_BUTTON.checked) {
                for (const song of sounds) {
                    if (song.nativeIndex >= toIndex && song.nativeIndex < index) {
                        song.nativeIndex++;
                    }
                }
            }
            sounds.splice(toIndex, 0, movedSong);
            tableBody.insertBefore(selectedRows[i], tableBody.children[toIndex + 1]);
        }
        if (index === currentSongIndex) {
            currentSongIndex = toIndex;
        }
    }
    for (let i = 0; i < sounds.length; i++)
        sounds[i].currentIndex = i;
    deselectAll();
    updateSongNumberings();
}
function selectionLogicForKeyboard(keyboardEvent) {
    if (selectedRows.length == 0)
        return;
    switch (keyboardEvent.key) {
        case "ArrowUp": return arrowSelection(keyboardEvent, -1);
        case "ArrowDown": return arrowSelection(keyboardEvent, 1);
        case "Backspace":
        case "Delete": return deleteSongsFromKeyboard(keyboardEvent);
        case "Space":
        case "Enter": return startPlayingFromKeyboard(keyboardEvent);
    }
}
var indexScrollDirection = 0;
function arrowSelection(keyboardEvent, indexIncrement) {
    keyboardEvent.preventDefault();
    sortSelectedRows();
    if (!keyboardCanInteract(keyboardEvent))
        return;
    if (keyboardEvent.shiftKey) {
        if (selectedRows.length == 1)
            indexScrollDirection = Math.sign(indexIncrement);
        if (Math.sign(indexScrollDirection) == Math.sign(indexIncrement)) {
            let row;
            if (indexIncrement > 0) {
                row = PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + indexIncrement];
            }
            else {
                row = PLAYLIST_VIEWER_TABLE.rows[selectedRows[0].rowIndex + indexIncrement];
            }
            if (row)
                selectRow(row);
        }
        else {
            if (indexIncrement > 0) {
                deselectRow(0);
            }
            else {
                deselectRow(selectedRows.length - 1);
            }
        }
    }
    else {
        const oneElement = PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + indexIncrement];
        if (!rowValid(oneElement))
            return;
        deselectAll();
        selectRow(oneElement);
    }
}
function deleteSongsFromKeyboard(keyboardEvent) { if (keyboardCanInteract(keyboardEvent))
    deleteSelectedSongs(); }
function startPlayingFromKeyboard(keyboardEvent) {
    if (!keyboardCanInteract(keyboardEvent) || selectedRows.length !== 1)
        return;
    keyboardEvent.preventDefault();
    playRow(selectedRows[0]);
    // deselectAll();
}
function tryFindTableRowInParents(element) {
    return element.closest('tr');
}
function updateSongNumberings() {
    for (const song of sounds) {
        song.currentRow.updateRowSongNumber();
    }
}
async function updateAllFileInfos() {
    for (const song of sounds) {
        song.updateFileInfoDisplay();
    }
}
function rowValid(row) { return row?.constructor?.name == "HTMLTableRowElement" && row != PLAYLIST_VIEWER_TABLE.rows[0] && row.closest('table') == PLAYLIST_VIEWER_TABLE; }
function findValidTableRow(topLevelElement) {
    if (rowValid(topLevelElement))
        return topLevelElement;
    else {
        topLevelElement = tryFindTableRowInParents(topLevelElement);
        if (rowValid(topLevelElement))
            return topLevelElement;
        else
            return null;
    }
}
function sortSelectedRows() { selectedRows.sort((a, b) => a.rowIndex - b.rowIndex); }
function keyboardCanInteract(keyEvent) {
    const target = keyEvent.target;
    return !(target instanceof curWin.HTMLInputElement) && target.closest("dialog") === null;
}
async function togglePictureInPicture() {
    TOGGLE_PIP_BUTTON.disabled = true;
    if (storedWindow == null)
        await enterPictureInPicture();
    else
        exitPictureInPicture();
    TOGGLE_PIP_BUTTON.disabled = false;
}
async function enterPictureInPicture() {
    // @ts-ignore
    storedWindow = await documentPictureInPicture.requestWindow({ width: 450, height: 450, disallowReturnToOpener: false, preferInitialWindowPlacement: false });
    curWin = storedWindow;
    curDoc = storedWindow.document;
    moveElementsToDocument(document, storedWindow.document);
    storedWindow.addEventListener('pagehide', exitPictureInPicture, true);
    KEY_DOWN_EVENT.attachToCurrentWindow();
    makeDocumentDroppable();
    modifyDialogPrototype();
    initContextMenu();
}
function exitPictureInPicture() {
    moveElementsToDocument(storedWindow.document, document);
    storedWindow.removeEventListener('pagehide', exitPictureInPicture, true);
    storedWindow.close();
    storedWindow = null;
    curWin = window;
    curDoc = document;
}
function moveElementsToDocument(oldDoc, newDoc) {
    newDoc.head.append(...oldDoc.head.children);
    newDoc.body.append(...oldDoc.body.children);
    DIALOGS.forEach(dialog => dialog.close()); //Dialogs lose their state when transferring and become glitched
}
/*                       CONTEXT MENU                      */
function onRightClickFileDisplay(mouseEvent) {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    return spawnContextMenu(mouseEvent.clientX, mouseEvent.clientY, [{ text: (SHOW_LENGTHS.checked) ? "Show File Sizes" : "Show Sound Lengths", action: () => SHOW_LENGTHS.dispatchEvent(new MouseEvent('click')) }], false);
}
function onPlayListRightClick(mouseEvent) {
    if (mouseEvent instanceof curWin.PointerEvent && mouseEvent.pointerType != "mouse") {
        mouseEvent.preventDefault();
        return;
    }
    const row = findValidTableRow(mouseEvent.target);
    if (row !== null) {
        if (!selectedRows.includes(row)) {
            deselectAll();
            selectRow(row);
        }
    }
    else if (selectedRows.length == 0) {
        return;
    }
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    spawnRowContextMenu(mouseEvent.clientX, mouseEvent.clientY, true);
}
function spawnRowContextMenu(clientX, clientY, showDefaultOptions) {
    const contextOptions = getPlaylistContextOptions();
    spawnContextMenu(clientX, clientY, contextOptions, showDefaultOptions);
}
function getPlaylistContextOptions() {
    const contextOptions = [];
    if (selectedRows.length == 1) {
        if (currentSongIndex != selectedRows[0].rowIndex - 1) {
            contextOptions.push({ text: "Play", icon: "../Icons/play-button-arrowhead-svgrepo-com.svg", action: () => { playRow(selectedRows[0]); deselectAll(); } });
        }
        else {
            contextOptions.push({ text: "Stop", icon: "../Icons/pause-alt-svgrepo-com.svg", action: () => { playRow(selectedRows[0]); deselectAll(); } });
        }
    }
    contextOptions.push({ text: "Delete", action: deleteSelectedSongs, icon: "../Icons/TrashCan.svg" });
    if (selectedRows.length !== PLAYLIST_VIEWER_TABLE.rows.length - 1) {
        if (selectedRows.length >= 2)
            contextOptions.push({ text: "Select Interval", action: selectInterval });
        contextOptions.push({ text: "Select All", action: selectAll });
    }
    return contextOptions;
}
function initContextMenu() {
    curDoc.addEventListener('contextmenu', (pointerEvent) => {
        switch (pointerEvent.target.getAttribute('data-onRightClick')) {
            case "uploadFileMenu": {
                pointerEvent.preventDefault();
                return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [
                    { text: "Upload Files", icon: "../Icons/UploadIcon.svg", action: () => UPLOAD_BUTTON.dispatchEvent(new MouseEvent('click')) },
                    { text: "Upload Folder", icon: "../Icons/UploadIcon.svg", action: () => UPLOAD_DIRECTORY_BUTTON.dispatchEvent(new MouseEvent('click')) }
                ], false);
            }
            case "quickSettings": {
                pointerEvent.preventDefault();
                const options = [];
                if ("documentPictureInPicture" in curWin)
                    options.push({ text: "Toggle PIP (WIP)", action: () => TOGGLE_PIP_BUTTON.dispatchEvent(new MouseEvent('click')) });
                return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, options, true);
            }
            case "volumeBoost": {
                pointerEvent.preventDefault();
                return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [
                    { text: (VOLUME_CHANGER.max == "1") ? "INCREASE VOLUME LIMIT" : "DECREASE VOLUME LIMIT", action: () => {
                            if (VOLUME_CHANGER.max == "1") {
                                VOLUME_CHANGER.max = "10";
                            }
                            else {
                                VOLUME_CHANGER.max = "1";
                                VOLUME_CHANGER.valueAsNumber = Math.min(VOLUME_CHANGER.valueAsNumber, 1);
                                onVolumeUpdate();
                            }
                        } }
                ], false);
            }
            default: {
                // return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [], true);
            }
        }
    });
    registerClickEvent(curDoc, (mouseEvent) => {
        closeContextMenu();
        if (mouseEvent.target == curDoc.querySelector("html") || mouseEvent.target == curDoc.body)
            deselectAll();
    });
}
function spawnContextMenu(clientX, clientY, contextOptions, showDefaultOptions) {
    let childElement;
    while ((childElement = CONTEXT_MENU.lastChild) != null) {
        CONTEXT_MENU.removeChild(childElement);
    }
    if (showDefaultOptions) {
        contextOptions = contextOptions.concat([
            { text: COMPACT_MODE_TOGGLE.checked ? "Disable Compact Mode" : "Enable Compact Mode", action: () => { COMPACT_MODE_TOGGLE.dispatchEvent(new MouseEvent('click')); } }
        ]);
    }
    const contextButtons = [];
    for (let i = 0; i < contextOptions.length; i++) {
        const contextOption = contextOptions[i];
        const contextButton = curDoc.createElement('div');
        contextButton.setAttribute('class', 'contextOption');
        contextButton.tabIndex = 1;
        if (i < contextOptions.length - 1)
            contextButton.style.borderBottomWidth = "1px";
        contextButton.addEventListener('click', (event) => { if (CONTEXT_MENU.hasAttribute('open'))
            contextOption.action(event); closeContextMenu(); });
        contextButton.addEventListener('keyup', (event) => { if (event.key == 'Enter' && CONTEXT_MENU.hasAttribute('open')) {
            contextOption.action(event);
            closeContextMenu();
        } });
        contextButton.addEventListener("keydown", contextButtonScroll, { passive: false });
        if (contextOption.icon) {
            const contextIcon = curDoc.createElement('img');
            contextIcon.setAttribute('class', 'contextIcon');
            contextIcon.src = contextOption.icon;
            contextButton.append(contextIcon, contextOption.text);
        }
        else {
            contextButton.textContent = contextOption.text;
        }
        contextButtons.push(contextButton);
    }
    CONTEXT_MENU.append(...contextButtons);
    CONTEXT_MENU.style.height = 'max-content'; //`${contextButtons.length * 29}px`;
    let leftOffset = clientX + 2, downOffset = clientY + 2;
    const viewportWidth = curDoc.documentElement.clientWidth, viewportHeight = curDoc.documentElement.clientHeight, contextMenuRect = CONTEXT_MENU.getBoundingClientRect();
    if (leftOffset + contextMenuRect.width > viewportWidth) {
        leftOffset = viewportWidth - contextMenuRect.width;
    }
    if (downOffset + contextMenuRect.height > viewportHeight) {
        downOffset = viewportHeight - contextMenuRect.height;
    }
    CONTEXT_MENU.style.left = `${leftOffset}px`;
    CONTEXT_MENU.style.top = `${downOffset}px`;
    CONTEXT_MENU.toggleAttribute('open', true);
    if (contextButtons[0])
        contextButtons[0].focus({ focusVisible: true });
}
function contextButtonScroll(keyboardEvent) {
    let contextButton;
    switch (keyboardEvent.key) {
        case "ArrowDown":
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
            contextButton = keyboardEvent.currentTarget;
            let nextButton = contextButton.nextElementSibling;
            if (nextButton == null) {
                nextButton = contextButton.parentElement.firstElementChild;
            }
            nextButton.focus();
            break;
        case "ArrowUp":
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
            contextButton = keyboardEvent.currentTarget;
            let prevButton = contextButton.previousElementSibling;
            if (prevButton == null) {
                prevButton = contextButton.parentElement.lastElementChild;
            }
            prevButton.focus();
            break;
    }
}
function contextMenuOpen() { return CONTEXT_MENU.hasAttribute('open'); }
function closeContextMenu() { CONTEXT_MENU.toggleAttribute('open', false); CONTEXT_MENU.style.height = '0'; }
//# sourceMappingURL=PlaylistCreator.js.map