// import("../Javascript/mp4box.all.js").catch((error) => {
// 	console.warn(error);
// 	let howlerScript = document.createElement('script');
// 	howlerScript.src = "../Javascript/mp4box.all.js";
// 	document.head.appendChild(howlerScript);
// });
import * as MP4Box from "../Javascript/mp4box.all.js";

/** Splits inputted seconds into hours, minutes, & seconds. toString() returns the time in digital format.
  * @param {number} seconds */
function secondsToTimestamp(seconds) {
	let secondString = numberToDigitalTimeString(Math.floor(seconds % 60))

	let minuteString = Math.floor(seconds / 60)
	let hourString = Math.floor(minuteString / 60)
	minuteString = numberToDigitalTimeString(minuteString - hourString * 60);
	hourString = numberToDigitalTimeString(hourString);

	if(hourString === "00") return `${minuteString}:${secondString}`;
	return `${hourString}:${minuteString}:${secondString}`;
}
function numberToDigitalTimeString(number) {
	return String(number).padStart(2, "0");
}

/** @type HTMLCanvasElement */
const screenshotCanvas = document.createElement("canvas");
const screenshotCanvasCtx = screenshotCanvas.getContext("2d");

const BUFFER_SIZE = 1024*1024*15;
const MOE = 0.015;
var inert = false;
/** @type HTMLDivElement */ const VIDEO_TITLE_DISPLAY = document.getElementById("videoTitle");
/** @type HTMLDivElement */ const LOADING_OVERLAY = document.getElementById("loadingFR");
/** @type HTMLProgressElement */ const LOADING_PERCENTAGE = document.getElementById("loadingPercentage");
/** @type HTMLInputElement */ const FILE_UPLOAD = document.getElementById("upload");
/** @type HTMLSpanElement */ const CURRENT_TIME_INPUT = document.getElementById("firstDurationLabel");
/** @type HTMLSpanElement */ const COLOR_CONTAINER = document.getElementById("inputColorContainer");
/** @type HTMLDivElement */ const MEDIA_TIME_INPUT = document.getElementById("mediaTimeInput");
/** @type HTMLSpanElement */ const FRAME_INPUT = document.getElementById("frameNumber");
/** @type HTMLInputElement */ const FRAME_RATE_INPUT = document.getElementById("videoFrameRate");
/** @type RegExp */ const NUMBERS_ONLY_REGEX = /[^\d.]/g;
/** @type RegExp */ const TIME_ONLY_REGEX = /[^\d:.]/g;
/** @type HTMLVideoElement */ const video = document.getElementById("video");
/** @type string */ let videoSrc = null;
/** @type string */ let saveVideoNamePrefix = "";
/** @type number */ var currentMediaTime = 0;
/** @type FrameSeeking */ var frameSeek = null;
/** @type {(frameCount:number) => void} */ var frameRateDeterminedCallback = null;

/** @type Window */ var storedWindow;
/** @type Window */ var curWin = window;
/** @type Document */ var curDoc = document;

/** @type HTMLDivElement */ const LOOP_BAR_TRACK = document.getElementById("loopBarTrack");
/** @type HTMLDivElement */ const LOOP_START_BAR = document.getElementById("drag1");
/** @type HTMLDivElement */ const LOOP_END_BAR = document.getElementById("drag2");

/** @type HTMLAnchorElement */ const DOWNLOAD_BUTTON = document.getElementById("downloadFrame");
/** @type HTMLDivElement */ const UI = document.getElementById("ui");
/** @type HTMLDivElement */ const PLAY_BUTTON = document.getElementById("playButton");
/** @type HTMLInputElement */ const VOLUME_SLIDER = document.getElementById("volumeSlider");
/** @type HTMLImageElement */ const VOLUME_ICON = document.getElementById("volumeIcon");
/** @type HTMLDivElement */ const PLAY_BAR = document.getElementsByClassName("playbar")[0];
/** @type HTMLDivElement */ const HOVERED_TIME_DISPLAY = document.getElementById('hoveredTimeDisplay');
/** @type HTMLDivElement */ const SKIP_FORWARD = document.getElementById("skipForward");
/** @type HTMLDivElement */ const SKIP_BACKWARD = document.getElementById("skipBackward");
/** @type HTMLDivElement */ const SEEK_BACKWARD = document.getElementById('seekBackward');
/** @type HTMLDivElement */ const SEEK_FORWARD = document.getElementById('seekForward');

// Source - https://stackoverflow.com/a/60055110
// Posted by trincot, modified by community. See post 'Timeline' for change history
// Retrieved 2026-03-18, License - CC BY-SA 4.0
class Deque {
	constructor() {
		this.front = this.back = undefined;
	}
	addFront(value) {
		if (!this.front) this.front = this.back = { value };
		else this.front = this.front.next = { value, prev: this.front };
	}
	removeFront() {
		const value = this.peekFront();
		if (this.front === this.back) this.front = this.back = undefined;
		else (this.front = this.front.prev).next = undefined;
		return value;
	}
	peekFront() {
		return this.front && this.front.value;
	}
	addBack(value) {
		if(!this.front) this.front = this.back = { value };
		else this.back = this.back.prev = { value, next: this.back };
	}
	removeBack() {
		let value = this.peekBack();
		if (this.front === this.back) this.front = this.back = undefined;
		else (this.back = this.back.next).back = undefined;
		return value;
	}
	peekBack() {
		return this.back && this.back.value;
	}
}

function setup(){
	// setButtonsDisabled(true);
	registerClickEvent(PLAY_BUTTON.parentElement, togglePause)();
	registerClickEvent(SEEK_BACKWARD, () => seek(-1))();
	registerClickEvent(SEEK_FORWARD, () => seek(1))();
	// registerClickEvent(SKIP_BACKWARD, () => {
	// 	setButtonsDisabled(true);
	// 	video.pause();
	// 	video.addEventListener("seeked", () => {
	// 		setButtonsDisabled(false);
	// 	}, {once: true});
	// 	skipBackward();
	// })();
	// registerClickEvent(SKIP_FORWARD, () => {
	// 	if(video.ended) return;
	// 	video.pause();
	// 	setButtonsDisabled(true);
	// 	skipForward();
	// })();
	registerClickEvent(SKIP_BACKWARD, () => {
		frameSeek.backward();
	})();
	registerClickEvent(SKIP_FORWARD, () => {
		frameSeek.forward();
	})();
	registerInputEvent(VOLUME_SLIDER, () => {
		const value = VOLUME_SLIDER.valueAsNumber;
		VOLUME_SLIDER.setAttribute("data-value", value);
		video.volume = value;
	});
	registerClickEvent(DOWNLOAD_BUTTON, (event) => {
		screenshotCanvasCtx.drawImage(video, 0, 0);
		DOWNLOAD_BUTTON.href = screenshotCanvas.toDataURL("image/png");
		DOWNLOAD_BUTTON.download = `${saveVideoNamePrefix}_videoframe_${round1(frameSeek.calcFrameNumber(currentMediaTime))}.png`;
	})();
	registerKeyDownEvent(FILE_UPLOAD.labels[0], () => FILE_UPLOAD.click());

	video.requestVideoFrameCallback(onVideoFrame);

	// if("documentPictureInPicture" in curWin) {
	// 	registerClickEvent(TOGGLE_PIP_BUTTON, togglePictureInPicture);
	// 	[].push({ text: "Toggle PIP (WIP)", action: () => TOGGLE_PIP_BUTTON.dispatchEvent(new MouseEvent('click')) });
	// }
}

function togglePause(){
	if(video.paused)
		video.play();
	else
		video.pause();
}

/** @param seekDirection number */
function seek(seekDirection){
	const newTime = Math.min(Math.max(currentMediaTime+(5 * seekDirection), 0), video.duration);
	currentMediaTime = newTime;
	video.currentTime = newTime+MOE;
	frameSeek.onSeekedManually(newTime);
}

/** @param {File} file */
function uploadFile(file){
	setButtonsDisabled(true);
	video.pause();
	if(videoSrc){
		URL.revokeObjectURL(videoSrc);
		frameSeek.destroy();
	}

	const separationIndex = file.name.lastIndexOf('.');
	VIDEO_TITLE_DISPLAY.textContent = separationIndex != -1 ? file.name.substring(0, separationIndex) : file.name;
	saveVideoNamePrefix = VIDEO_TITLE_DISPLAY.textContent.substring(0, 28);

	videoSrc = URL.createObjectURL(file);
	LOADING_OVERLAY.toggleAttribute("data-active", true);

	console.log(function(){return frameSeek});
	console.time("loadFR");
	getVideoFrameTimes(file).then(([timeStamps, keyframeTimestamps]) => {
		frameSeek = new FrameSeekingModern(timeStamps, keyframeTimestamps);
		loadVideoPlayer();
	}).catch((error) => {
		console.log("MP4Box error: ", error);
		waitForFrameRate().then(loadVideoPlayer);
		frameSeek = new FrameSeekingFallback(videoSrc);
	});
}

function waitForFrameRate(){
	return new Promise(resolve => {
		frameRateDeterminedCallback = resolve;
	});
}

function loadVideoPlayer(){
	console.timeEnd("loadFR");
	video.addEventListener("loadeddata", () => {
		screenshotCanvas.width = video.videoWidth;
		screenshotCanvas.height = video.videoHeight;
		setButtonsDisabled(false);
		LOADING_OVERLAY.toggleAttribute("data-active", false);
	}, {passive: true, once: true});
	video.src = videoSrc;
}

class FrameSeeking {
	/** @type number */ frameRate = 0;
	/** @type AB */ ab;
	/** @type boolean */ abEnabled;

	enableAB(){}

	disableAB(){}

	toggleAB(){}

	destroyAB(){}


	queueStartFrameSeek(timeProvider, delay){}

	startFrameSeek(time){}

	stopFrameSeek(){}

	destroy(){}

	onSeekedManually(newTime){}

	forward(){}

	backward(){}

	getSeekDataFromProgress(progress){}

	calcMediaTimeAtFrame(frameNumber){}

	getFrameNumber(mediaTime){}

	calcFrameNumber(mediaTime){}

	videoIsEnded(mediaTime){}

	incrementAPosition(){}

	decrementAPosition(){}

	setAMediaTime(mediaTime){}

	incrementBPosition(){}

	decrementBPosition(){}

	setBMediaTime(mediaTime){}
}

class FrameSeekingModern extends FrameSeeking {
	/** @type number[] */ timestamps;
	/** @type number[] */ keyframeTimestamps;

	/** @param timestamps {number[]}
	 * @param keyframeTimestamps {number[]} */
	constructor(timestamps, keyframeTimestamps) {
		super();
		let prevVal = null;
		this.timestamps = timestamps.sort((a,b) => a-b).filter(val => {const oldVal = prevVal; prevVal = val; return val != oldVal; }, this);

		prevVal = null;
		this.keyframeTimestamps = keyframeTimestamps.sort((a,b) => a-b).filter(val => {const oldVal = prevVal; prevVal = val; return val != oldVal; }, this);
		// console.log("Frame timestamps (seconds):", this.timestamps);
		// console.log("Frame keyframe timestamps (seconds):", this.keyframeTimestamps);
		this.determineFrameRate(15, this.timestamps.length-5);
	}

	determineFrameRate(startIndex,endIndex){
		let accumulation = 0
		for(let i = startIndex+1; i < endIndex; i++){
			accumulation += this.timestamps[i] - this.timestamps[i-1];
		}

		const framesProcessed = endIndex-startIndex-1;
		if(!accumulation || !framesProcessed)
			return;
		this.frameRate = 1/(accumulation/framesProcessed);
		FRAME_RATE_INPUT.valueAsNumber = this.frameRate;
	}

	enableAB(){
		frameSeek.ab ??= new AB(0, video.duration, 0, this.timestamps[this.timestamps.length-1]);
		document.body.style.setProperty("--abLoopDisplay", "block");
		this.abEnabled = true;
	}

	disableAB(){
		document.body.style.setProperty("--abLoopDisplay", "none");
		this.abEnabled = false;
	}

	toggleAB() {
		if(this.abEnabled){
			this.disableAB();
		} else if(video.duration){
			this.enableAB();
		}
	}

	destroyAB(){
		document.body.style.setProperty("--abLoopDisplay", "none");
		LOOP_START_BAR.style.setProperty("--progress", "0%");
		LOOP_END_BAR.style.setProperty("--progress", "100%");
		this.abEnabled = false;
		this.ab = null;
	}


	destroy() {
		this.destroyAB();
		this.frameRate = null;
	}

	onSeekedManually(newTime) {
		timeUpdateUnofficial();
	}

	forward(){
		if(!video.paused){ video.pause(); return; }
		const currentFrameNumber = binarySearchLenient(this.timestamps, currentMediaTime);
		const nextMediaTime = this.timestamps?.[currentFrameNumber+1];
		if(nextMediaTime){
			currentMediaTime = nextMediaTime;
			video.currentTime = nextMediaTime+MOE;
			this.onSeekedManually(nextMediaTime+MOE);
		}
	}

	backward(){
		if(!video.paused){ video.pause(); return; }
		const currentFrameNumber = binarySearchLenient(this.timestamps, currentMediaTime);
		const prevMediaTime = this.timestamps?.[currentFrameNumber-1];
		if(prevMediaTime){
			currentMediaTime = prevMediaTime;
			video.currentTime = prevMediaTime+MOE;
			this.onSeekedManually(prevMediaTime+MOE);
		}
	}

	getSeekDataFromProgress(progress){
		const index = binarySearchLenient(this.timestamps, progress*video.duration);
		return [this.timestamps[index], index];
	}

	calcMediaTimeAtFrame(frameNumber){
		return this.timestamps[frameNumber];
	}

	getFrameNumber(mediaTime){
		return binarySearch(this.timestamps, mediaTime);
	}

	calcFrameNumber(mediaTime){
		return binarySearchLenient(this.timestamps, mediaTime);
	}

	videoIsEnded(mediaTime){
		return round4(mediaTime) >= round4(this.timestamps[this.timestamps.length-1]);
	}

	incrementAPosition(){
		const frameNumber = this.ab.loopBeginFrameNumber+1;
		if(frameNumber > this.ab.loopEndFrameNumber){
			return [null, null];
		}

		const mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		this.ab.loopBeginMediaTime = mediaTime;
		this.ab.loopBeginFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	decrementAPosition(){
		const frameNumber = this.ab.loopBeginFrameNumber-1;
		if(frameNumber < 0){
			return [null, null];
		}

		const mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		this.ab.loopBeginMediaTime = mediaTime;
		this.ab.loopBeginFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	setAMediaTime(mediaTime){
		let frameNumber = this.calcFrameNumber(mediaTime);
		mediaTime = this.timestamps[clamp(frameNumber, 0, this.timestamps.length-1)];
		if(mediaTime > this.ab.loopEndMediaTime){
			mediaTime = this.ab.loopEndMediaTime;
			frameNumber = this.calcFrameNumber(mediaTime);
		}
		this.ab.loopBeginMediaTime = mediaTime;
		this.ab.loopBeginFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	incrementBPosition(){
		const frameNumber = this.ab.loopEndFrameNumber+1;
		if(frameNumber == this.timestamps.length){
			return [null, null];
		}

		const mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		this.ab.loopEndMediaTime = mediaTime;
		this.ab.loopEndFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	decrementBPosition(){
		const frameNumber = this.ab.loopEndFrameNumber-1;
		if(frameNumber < this.ab.loopBeginFrameNumber){
			return [null, null];
		}

		const mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		this.ab.loopEndMediaTime = mediaTime;
		this.ab.loopEndFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	setBMediaTime(mediaTime){
		let frameNumber = this.calcFrameNumber(mediaTime);
		mediaTime = this.timestamps[clamp(frameNumber, 0, this.timestamps.length-1)];
		if(mediaTime < this.ab.loopBeginMediaTime){
			mediaTime = this.ab.loopBeginMediaTime;
			frameNumber = this.calcFrameNumber(mediaTime);
		}
		this.ab.loopEndMediaTime = mediaTime;
		this.ab.loopEndFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}
}

class FrameSeekingFallback extends FrameSeeking {
	/** @type ForwardFrameSeek */ forwardFrameSeek;
	/** @type BackwardFrameSeek */ backwardFrameSeek;
	/** @type FrameRateSeek */ frameRateSeek;
	/** @type number */ finalMediaTime = null;
	timeoutID = null;

	constructor(src) {
		super();
		this.forwardFrameSeek = new ForwardFrameSeek(src);
		this.backwardFrameSeek = new BackwardFrameSeek(src);
		this.frameRateSeek = new FrameRateSeek(src);
	}

	enableAB(){
		frameSeek.ab ??= new AB(0, video.duration);
		document.body.style.setProperty("--abLoopDisplay", "block");
		this.abEnabled = true;
	}

	disableAB(){
		document.body.style.setProperty("--abLoopDisplay", "none");
		this.abEnabled = false;
	}

	destroyAB(){
		document.body.style.setProperty("--abLoopDisplay", "none");
		LOOP_START_BAR.style.setProperty("--progress", "0%");
		LOOP_END_BAR.style.setProperty("--progress", "100%");
		this.abEnabled = false;
		this.ab = null;
	}

	toggleAB() {
		if(this.abEnabled){
			this.disableAB();
		} else if(video.duration){
			this.enableAB();
		}
	}


	queueStartFrameSeek(timeProvider, delay){
		this.timeoutID = setTimeout(() => {
			this.startFrameSeek(timeProvider());
		}, delay);
	}

	startFrameSeek(time) {
		this.forwardFrameSeek.beginExecutor(time);
		this.backwardFrameSeek.beginExecutor(time);
	}

	stopFrameSeek() {
		clearTimeout(this.timeoutID);
		this.timeoutID = null;
		this.forwardFrameSeek.stopExecutor();
		this.backwardFrameSeek.stopExecutor();
	}

	destroy() {
		this.stopFrameSeek();
		this.forwardFrameSeek.destroy();
		this.backwardFrameSeek.destroy();
		this.frameRateSeek.destroy();
		this.destroyAB();
		this.frameRate = null;
		this.finalMediaTime = null;
	}

	onSeekedManually(newTime) {
		if(video.paused){
			this.stopFrameSeek();
			this.forwardFrameSeek.beginExecutor(newTime);
			this.backwardFrameSeek.beginExecutor(newTime);
		}

		timeUpdateUnofficial();
	}

	forward(){
		if(!video.paused){ video.pause(); return; }
		let nextMediaTime = this.forwardFrameSeek.popLeftMediaTime();
		if(nextMediaTime === currentMediaTime) nextMediaTime = this.forwardFrameSeek.popLeftMediaTime();
		if(nextMediaTime){
			this.backwardFrameSeek.addLeftMediaTime(currentMediaTime);
			currentMediaTime = nextMediaTime;
			video.currentTime = nextMediaTime+MOE; //add a slight amount to avoid rounding errors with the previous frame
			timeUpdateUnofficial();
		}
	}

	backward(){
		if(!video.paused){ video.pause(); return; }
		let prevMediaTime = this.backwardFrameSeek.popLeftMediaTime();
		if(prevMediaTime === currentMediaTime) prevMediaTime = this.forwardFrameSeek.popLeftMediaTime();
		if(prevMediaTime){
			this.forwardFrameSeek.addLeftMediaTime(currentMediaTime);
			currentMediaTime = prevMediaTime;
			video.currentTime = prevMediaTime+MOE; //add a slight amount to avoid rounding errors with the previous frame
			timeUpdateUnofficial();
		} else if(round1(this.calcFrameNumber(currentMediaTime)) == 1 && video.currentTime != 0){
			this.forwardFrameSeek.addLeftMediaTime(currentMediaTime);
			currentMediaTime = 0;
			video.currentTime = 0;
			timeUpdateUnofficial();
		} else if(!BackwardFrameSeek.ACTIVE){
			if(this.forwardFrameSeek.getLeftMediaTime() !== currentMediaTime){
				this.forwardFrameSeek.addLeftMediaTime(currentMediaTime);
				video.currentTime = currentMediaTime-MOE;

				const currentFrameNumber = Number(FRAME_INPUT.textContent);
				timeUpdateUnofficial();
				FRAME_INPUT.textContent = String(currentFrameNumber-1);
			}
		}
	}

	getSeekDataFromProgress(progress){
		const frameNumber = Math.floor(round1(this.calcFrameNumber(progress*video.duration)));
		const mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		return [mediaTime, frameNumber];
	}

	calcMediaTimeAtFrame(frameNumber){
		return frameNumber/this.frameRate;
	}

	getFrameNumber(mediaTime){
		return this.calcFrameNumber(mediaTime);
	}

	calcFrameNumber(mediaTime){
		return mediaTime*this.frameRate;
	}

	videoIsEnded(mediaTime){
		return round4(mediaTime) >= round4(this.finalMediaTime);
	}

	incrementAPosition(){
		const frameNumber = round1(this.calcFrameNumber(this.ab.loopBeginMediaTime))+1;
		const mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		if(mediaTime > this.ab.loopEndMediaTime){
			return [null, null];
		}
		this.ab.loopBeginMediaTime = mediaTime;
		this.ab.loopBeginFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	decrementAPosition(){
		const frameNumber = round1(frameSeek.calcFrameNumber(frameSeek.ab.loopBeginMediaTime))-1;
		const mediaTime = frameSeek.calcMediaTimeAtFrame(frameNumber);
		if(mediaTime < 0){
			return [null, null];
		}
		this.ab.loopBeginMediaTime = mediaTime;
		this.ab.loopBeginFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	setAMediaTime(mediaTime){
		let frameNumber = Math.floor(round1(this.calcFrameNumber(mediaTime)));
		mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		if(mediaTime > this.ab.loopEndMediaTime){
			mediaTime = this.ab.loopEndMediaTime;
			frameNumber = round1(this.calcFrameNumber(mediaTime));
		}
		this.ab.loopBeginMediaTime = mediaTime;
		return [mediaTime, frameNumber];
	}

	incrementBPosition(){
		const frameNumber = round1(this.calcFrameNumber(this.ab.loopEndMediaTime))+1;
		const mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		if(mediaTime > video.duration){
			return [null, null];
		}
		this.ab.loopEndMediaTime = mediaTime;
		this.ab.loopEndFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	decrementBPosition(){
		const frameNumber = round1(this.calcFrameNumber(this.ab.loopEndMediaTime))-1;
		const mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		if(mediaTime < this.ab.loopBeginMediaTime){
			return [null, null];
		}
		this.ab.loopEndMediaTime = mediaTime;
		this.ab.loopEndFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	setBMediaTime(mediaTime){
		let frameNumber = Math.floor(round1(this.calcFrameNumber(mediaTime)));
		mediaTime = this.calcMediaTimeAtFrame(frameNumber);
		if(mediaTime < this.ab.loopBeginMediaTime){
			mediaTime = this.ab.loopBeginMediaTime;
			frameNumber = round1(this.calcFrameNumber(mediaTime));
		}
		this.ab.loopEndMediaTime = mediaTime;
		return [mediaTime, frameNumber];
	}
}

class FrameSeek {
	/** @type number | null */ queuedMediaTime = null;
	/** @type number | null */ requestID = null;
	/** @type FrameSeekAbortController */ abortController = null;
	/** @type HTMLVideoElement */ instVideo = null;
	mediaTimes = new Deque();
	constructor(src) {
		this.firstFrameCallback = this.firstFrameCallback.bind(this);
		this.frameCallback = this.frameCallback.bind(this);
		this.onExecutorAborted = this.onExecutorAborted.bind(this);
		this.instVideo = document.createElement("video");
		this.instVideo.muted = true;
		this.instVideo.src = src;
	}

	beginExecutor(mediaTime){
		if(!this.abortController){
			this.abortController = new FrameSeekAbortController();
			this.queuedMediaTime = null;
			this.executor(mediaTime);
		} else {
			this.queuedMediaTime = mediaTime;
		}
	}

	stopExecutor(){
		if(this.abortController){
			this.abortController.abort();
		}
		this.queuedMediaTime = null;
	}

	destroy(){

	}

	executor(mediaTime){
		console.log(this.toString() + " executor");
		this.requestID = this.instVideo.requestVideoFrameCallback(this.firstFrameCallback);
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	firstFrameCallback(now, metadata) {}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	frameCallback(now, metadata) {}

	addRightMediaTime(mediaTime){}

	popLeftMediaTime(){
		return this.mediaTimes.removeBack();
	}

	addLeftMediaTime(mediaTime){
		this.mediaTimes.addBack(mediaTime);
	}

	getLeftMediaTime(mediaTime){
		return this.mediaTimes.peekBack();
	}

	onExecutorAborted() {
		this.instVideo.pause();
		this.mediaTimes = new Deque();
		new Promise(resolve => setTimeout(resolve, 255)).then(() => {
			console.log(this.toString() + " aborted");
			this.abortController = null;
			if(this.queuedMediaTime !== null){
				this.beginExecutor(this.queuedMediaTime);
			}
		}); //provide the video time to rest
	}
}

class ForwardFrameSeek extends FrameSeek {
	constructor(src) {
		super(src);
		this.onVideoEnded = this.onVideoEnded.bind(this);
		this.instVideo.addEventListener("ended",this.onVideoEnded,{passive:true});
	}

	beginExecutor(mediaTime){
		if(frameSeek.videoIsEnded(mediaTime)) return;
		if(!this.abortController){
			this.abortController = new FrameSeekAbortController();
			this.queuedMediaTime = null;
			this.executor(mediaTime);
		} else {
			this.queuedMediaTime = mediaTime;
		}
	}

	stopExecutor(){
		if(this.abortController){
			this.abortController.abort();
		}
		this.queuedMediaTime = null;
	}

	destroy(){
		this.instVideo.removeEventListener("ended",this.onVideoEnded,{passive:true});
		this.instVideo.cancelVideoFrameCallback(this.requestID);
		this.abortController = null;
	}


	executor(mediaTime) {
		super.executor(mediaTime);
		if(round4(this.instVideo.currentTime) === round4(mediaTime))
			this.instVideo.currentTime = mediaTime+MOE;
		else
			this.instVideo.currentTime = mediaTime;
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	firstFrameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		if(frameSeek.videoIsEnded(metadata.mediaTime)){
			this.abortController.callback = () => {this.instVideo.load(); this.onExecutorAborted();}; //guard against the video freezing due to chrome bug
		}
		this.addRightMediaTime(metadata.mediaTime);
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.instVideo.playbackRate = Math.max(0.0625*(60/frameSeek.frameRate), 0.0625); //goes faster when framerate is lower (30 fps is 2x (0.125))
		this.instVideo.play();
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	frameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.addRightMediaTime(metadata.mediaTime);
	}

	onVideoEnded(){
		this.abortController.callback = this.onExecutorAborted;
		this.instVideo.load();
	}

	addRightMediaTime(mediaTime){
		if(mediaTime > currentMediaTime){
			this.mediaTimes.addFront(mediaTime);
		}
	}

	onExecutorAborted() {
		if(!this.abortController.acknowledged()){
			this.abortController.acknowledge();
			this.instVideo.cancelVideoFrameCallback(this.requestID);
			super.onExecutorAborted();
		}
	}

	toString(){
		return "ForwardFrameSeek";
	}
}
class BackwardFrameSeek extends FrameSeek {
	static ACTIVE = false;
	/** @type number | null */ currentMediaTime = null;
	constructor(src) {
		super(src);
	}

	/** @param {number} mediaTime */
	beginExecutor(mediaTime){
		if(mediaTime == 0 || frameSeek.videoIsEnded(mediaTime)) return;
		if(!this.abortController){
			this.abortController = new FrameSeekAbortController();
			this.queuedMediaTime = null;
			this.executor(mediaTime);
		} else {
			this.queuedMediaTime = mediaTime;
		}
	}

	stopExecutor(){
		if(this.abortController){
			this.abortController.abort();
		}
		this.queuedMediaTime = null;
	}

	destroy(){

	}


	executor(mediaTime) {
		if(!BackwardFrameSeek.ACTIVE){
			this.abortController.callback = this.onExecutorAborted;
			return;
		}

		super.executor(mediaTime);
		if(round4(this.instVideo.currentTime) === round4(mediaTime))
			this.instVideo.currentTime = mediaTime-MOE;
		else
			this.instVideo.currentTime = mediaTime;
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	firstFrameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		this.addRightMediaTime(metadata.mediaTime);
		this.currentMediaTime = metadata.mediaTime;
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.instVideo.currentTime = metadata.mediaTime-MOE;
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	frameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		if(metadata.mediaTime === this.currentMediaTime){ this.abortController.callback = this.onExecutorAborted; return; }
		this.addRightMediaTime(metadata.mediaTime);
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.instVideo.currentTime = metadata.mediaTime-MOE;
	}

	addRightMediaTime(mediaTime){
		if(mediaTime < currentMediaTime){
			this.mediaTimes.addFront(mediaTime);
		}

		this.currentMediaTime = mediaTime;
	}

	onExecutorAborted() {
		// if(!this.abortController.acknowledged()){
			// this.abortController.acknowledge();
			// this.instVideo.cancelVideoFrameCallback(this.requestID);
		this.abortController.acknowledge();
			this.currentMediaTime = null;
			super.onExecutorAborted();
		// }
	}

	toString(){
		return "BackwardFrameSeek";
	}
}
class FrameRateSeek {
	/** @type number | null */ requestID = null;
	/** @type FrameSeekAbortController */ abortController = new FrameSeekAbortController();
	/** @type HTMLVideoElement */ instVideo = null;
	averageFrameDiff = 0;
	frameCount = 0;
	/** @type number */ lastMediaTime;
	/** @type number */ lastFrameNum;
	/** @type number */ beginTime;
	 constructor(src) {
		this.firstFrameCallback = this.firstFrameCallback.bind(this);
		this.frameCallback = this.frameCallback.bind(this);
		this.destroy = this.destroy.bind(this);
		this.instVideo = document.createElement("video");
		this.instVideo.muted = true;
		this.instVideo.addEventListener("ended",this.destroy,{passive:true});

		this.requestID = this.instVideo.requestVideoFrameCallback(this.firstFrameCallback);
		this.instVideo.src = src;

		let fRequestID = null;
		/** @type HTMLVideoElement */
		let finalFrameVideo = document.createElement("video");
		finalFrameVideo.muted = true;

		finalFrameVideo.requestVideoFrameCallback((now, metadata) => {
			fRequestID = finalFrameVideo.requestVideoFrameCallback(function repeat(now, metadata) {
				fRequestID = finalFrameVideo.requestVideoFrameCallback(repeat);
				// noinspection JSUnusedGlobalSymbols
				frameSeek.finalMediaTime = metadata.mediaTime;
			});
			finalFrameVideo.currentTime = finalFrameVideo.duration-5;
			finalFrameVideo.play();
		});
		finalFrameVideo.addEventListener("ended", () => {
			new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
				finalFrameVideo.cancelVideoFrameCallback(fRequestID);
				finalFrameVideo = null;
			});
		}, {passive: true, once: true});
		finalFrameVideo.src = src;
	}

	destroy(){
		this.instVideo.pause();
		this.abortController.abort();
		this.instVideo.cancelVideoFrameCallback(this.requestID);
		this.instVideo.removeEventListener("ended",this.destroy,{passive:true});
		console.log("frameRateSeek destroyed")
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	firstFrameCallback(now, metadata) {
		if(this.abortController.aborted){ this.destroy(); return; }
		this.lastMediaTime = metadata.mediaTime;
		this.lastFrameNum = metadata.presentedFrames;
		this.beginTime = now;
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.instVideo.playbackRate = 0.0625;
		this.instVideo.play();
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	frameCallback(now, metadata) {
		if(this.abortController.aborted){ this.destroy(); return; }
		if(metadata.presentedFrames > 15){
			this.destroy();//
			frameSeek.startFrameSeek(video.currentTime);
			if(frameRateDeterminedCallback)
				frameRateDeterminedCallback(metadata.presentedFrames);
			this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		} else {
			this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		}

		this.updateFPS(metadata);
		this.lastMediaTime = metadata.mediaTime;
		this.lastFrameNum = metadata.presentedFrames;
	}

	medianFrameDiff() {
		// return frameDiffs.reduce((a, b) => a + b) / frameDiffs.length;

		// frameDiffs.sort(function(a,b){return a-b;}); //https://stackoverflow.com/a/45309582
		// const mid = frameDiffs.length / 2;
		// return mid % 1 ? frameDiffs[mid-0.5] : (frameDiffs[mid-1]+frameDiffs[mid])/2;
	}

	/** @param {VideoFrameCallbackMetadata} metadata */
	updateFPS(metadata) {
		// Source - https://stackoverflow.com/a/73094937 Posted by derder56, modified by community.
		// Retrieved 2026-03-18, License - CC BY-SA 4.0
		const mediaTimeDiff = metadata.mediaTime - this.lastMediaTime;
		const frameNumDiff = metadata.presentedFrames - this.lastFrameNum; //this doesn't account for if the browser drops a frame. sad.
		const diff = mediaTimeDiff / frameNumDiff;
		if (diff && diff <= 1
			// && frameDiffs.length < 50
		) {
			// frameDiffs.push(diff);
			this.averageFrameDiff = ((this.averageFrameDiff*this.frameCount)+diff)/(++this.frameCount)
			frameSeek.frameRate = 1 / this.averageFrameDiff;
			FRAME_RATE_INPUT.valueAsNumber = frameSeek.frameRate;
		}

		const dropped = this.instVideo.getVideoPlaybackQuality().totalVideoFrames-metadata.presentedFrames-3;
		if(dropped){ //for some reason, dropped frames is always a difference of 3. waiting to be proven wrong.
			FRAME_RATE_INPUT.style.color = "red";
			FRAME_RATE_INPUT.title = `${dropped} frames were dropped due to lag in the framerate calculation. This result may be incorrect.`;
			FRAME_RATE_INPUT.labels[0].title = `${dropped} frames were dropped due to lag in the framerate calculation. This result may be incorrect.`;
		}
	}

	toString(){
		return "FrameRateSeek";
	}
}
class AB {
	loopBeginMediaTime;
	loopBeginFrameNumber = 0; //only used by modern FrameSeek
	loopEndMediaTime;
	loopEndFrameNumber = -1; //only used by modern FrameSeek

	constructor(beginMediaTime, endMediaTime, firstFrameNumber = 0, finalFrameNumber = -1) {
		this.loopBeginMediaTime = beginMediaTime;
		this.loopEndMediaTime = endMediaTime;
		this.loopBeginFrameNumber = firstFrameNumber;
		this.loopEndFrameNumber = finalFrameNumber;
	}
}
class FrameSeekAbortController {
	aborted = 0;
	callback = function(){};
	reset(){ this.aborted = 0; }
	abort(){
		if(!this.aborted){
			this.aborted = 1;
			this.callback();
		}
	}
	acknowledge(){
		this.aborted = 2;
	}
	acknowledged(){
		return this.aborted == 2;
	}
}

FILE_UPLOAD.addEventListener("change", () => {
	if(!inert)
		uploadFile(FILE_UPLOAD.files[0]);
	FILE_UPLOAD.value = null;
}, true);


/** @param {File} file
 * @returns {Promise<[timestamps: number[], keyframeTimestamps: number[]]>}
 * */
function getVideoFrameTimes(file) {
	return new Promise((resolve, reject) => {
		let mp4Box = MP4Box.createFile(false);
		let timestamps = [];
		let keyframeTimestamps = [];
		let videoTrackId = null;
		let timescale = null;

		mp4Box.onError = function(e) {
			console.log("mp4box failed to parse data.");
			reject(e);
		};
		mp4Box.onMoovStart = function () {
			// console.log("Starting to receive File Information");
		};
		mp4Box.onReady = function(info) {
			console.log(info.mime);
			const videoTrack = info.videoTracks?.[0];
			if (!videoTrack) {
				reject(new Error("No video track found"));
				return;
			}
			mp4Box.onSamples = (trackId, user, samples) => {
				for (const sample of samples) {
					const pts = (sample.cts ?? sample.dts) / timescale;
					timestamps.push(pts);
					if(sample.is_sync) keyframeTimestamps.push(pts);
				}
			};

			videoTrackId = videoTrack.id;
			timescale = videoTrack.timescale;
			mp4Box.setExtractionOptions(videoTrackId, null, {nbSamples: Infinity}); //1_000_000
			mp4Box.start();
		};

		let offset = 0;
		let reader = new FileReader();
		reader.addEventListener("error", reject, {passive: true});
		reader.addEventListener("load", (e) => {
			const buffer = reader.result;
			buffer.fileStart = offset;
			offset = mp4Box.appendBuffer(buffer);

			if (offset < file.size || !offset) {
				readNextChunk();
			} else {
				mp4Box.flush();
				resolve([timestamps, keyframeTimestamps]);
				mp4Box = null;
				reader = null;
			}
		}, {passive: true});

		function readNextChunk() {
			LOADING_PERCENTAGE.value = offset / file.size;
			const slice = file.slice(offset, offset+BUFFER_SIZE);
			reader.readAsArrayBuffer(slice);
		}
		readNextChunk();
	});
}

window.addEventListener("dragover", (event) => {
	if(event.dataTransfer.types.includes("Files") && !inert)
		event.preventDefault();
});
window.addEventListener("drop", (event) => {
	const fileList = event.dataTransfer.files;
	if(fileList.length && !inert) { //an empty FileList is truthy, for some reason
		event.preventDefault();
		uploadFile(fileList[0]);
	}
});

video.addEventListener("play", () => {
	PLAY_BUTTON.classList.add("playing");
	frameSeek.stopFrameSeek();
}, {passive: true});
video.addEventListener("pause", () => {
	PLAY_BUTTON.classList.remove("playing");
	frameSeek.queueStartFrameSeek(() => currentMediaTime, 100);
}, {passive: true});
video.addEventListener("loadstart", () => {
	PLAY_BUTTON.classList.remove("playing");
}, {passive: true});
video.addEventListener("timeupdate", timeUpdate, {passive: true});
// video.addEventListener("seeking", timeUpdate, {passive: true});
video.addEventListener("durationchange", () => document.getElementById("secondDurationLabel").textContent = secondsToTimestamp(video.duration), {passive: true});
video.addEventListener("click", () => {if(videoSrc)toggleUI();}, {passive: true});
video.addEventListener("dblclick", toggleFullscreen, {passive: true});
video.addEventListener("ended", () => {
	if(frameSeek.abEnabled) {
		currentMediaTime = frameSeek.ab.loopBeginMediaTime;
		video.currentTime = currentMediaTime+MOE;
		frameSeek.onSeekedManually(currentMediaTime+MOE);
		video.play();
	}
}, {passive: true});
registerClickEvent(document.getElementById("fullscreenButton"), toggleFullscreen)();

function timeUpdate() {
	const currentTime = video.currentTime;
	PLAY_BAR.style.setProperty("--percentage", String(Math.min(currentTime / video.duration, 1) * 100) + '%');
	setEditableTextContent(CURRENT_TIME_INPUT, secondsToTimestamp(currentTime));
}
function timeUpdateUnofficial() {
	PLAY_BAR.style.setProperty("--percentage", String(Math.min(currentMediaTime / video.duration, 1) * 100) + '%');
	CURRENT_TIME_INPUT.textContent = secondsToTimestamp(currentMediaTime);
	MEDIA_TIME_INPUT.textContent = String(round6(currentMediaTime)); //avoid excessive decimals from inserted mediaTime
	FRAME_INPUT.textContent = String(round1(frameSeek.calcFrameNumber(currentMediaTime)));
	COLOR_CONTAINER.style.setProperty("--color", "#aaaaaa");
}

function toggleUI(){
	if(UI.inert){
		UI.style.visibility = "visible";
		UI.inert = false;
	} else {
		UI.style.visibility = "hidden";
		UI.inert = true;
	}
}
function toggleFullscreen(){
	if(document.fullscreenElement){
		document.exitFullscreen().catch(function(reason){});
	} else {
		document.documentElement.requestFullscreen({navigationUI: "hide"}).catch(function(reason){});
	}
}

PLAY_BAR.addEventListener('pointerenter', (pointer) => progressBarSeek(pointer, false), { passive: true })
PLAY_BAR.addEventListener('pointerdown', (pointer) => { if(pointer.button === 0) progressBarSeek(pointer, true); }, { passive: true })
PLAY_BAR.addEventListener('pointermove', (pointer) => progressBarSeek(pointer, false), { passive: true })
PLAY_BAR.addEventListener('pointerleave', (pointer) => removeHoveredTimeDisplay(), { passive: true })

curWin.addEventListener("keydown", keyEvent => {
	const activeElement = document.activeElement;
	// noinspection JSUnresolvedReference
	if(!activeElement || activeElement instanceof HTMLInputElement || activeElement?.contentEditable == "plaintext-only")
		return;

	const keyLower = keyEvent.key.toLowerCase();
	/** @type number */ const compressed = (Number(keyEvent.shiftKey)/*1*/)+(Number(keyEvent.ctrlKey)<<1/*2*/)+(Number(keyEvent.altKey)<<2/*4*/)+(Number(keyEvent.metaKey)<<3/*8*/);
	if(compressed == 0){
		switch(keyLower) {
			case " ": //space
			case "k":
				togglePause();
				keyEvent.preventDefault();
				break;
			case "arrowleft":
				seek(-1);
				keyEvent.preventDefault();
				break;
			case "arrowright":
				seek(1);
				keyEvent.preventDefault();
				break;
			case ",":
				frameSeek.backward();
				keyEvent.preventDefault();
				break;
			case ".":
				frameSeek.forward();
				keyEvent.preventDefault();
				break;
			case "s":
				keyEvent.preventDefault();
				DOWNLOAD_BUTTON.click();
				break;
			case "m":
				video.muted = !video.muted;
				VOLUME_ICON.classList.toggle("muted", video.muted);
				keyEvent.preventDefault();
				break;
			case "f":
				toggleFullscreen();
				keyEvent.preventDefault();
				break;
			case "b":
				toggleUI();
				keyEvent.preventDefault();
				break;
		}
	} else if(compressed == 1){
		switch(keyLower) {
			case "q":
			case "p":
			case "arrowleft":
				frameSeek.backward();
				keyEvent.preventDefault();
				break;
			case "n":
			case "arrowright":
				frameSeek.forward();
				keyEvent.preventDefault();
				break;
		}
	} else if(compressed == 2){
		switch(keyLower) {
			case "s":
				keyEvent.preventDefault();
				DOWNLOAD_BUTTON.click();
				break;
		}
	}
});

function onVideoFrame(now, metadata){
	video.requestVideoFrameCallback(onVideoFrame);
	currentMediaTime = metadata.mediaTime;
	setEditableTextContent(MEDIA_TIME_INPUT, String(currentMediaTime));
	setEditableTextContent(FRAME_INPUT, String(round1(frameSeek.calcFrameNumber(currentMediaTime))));
	COLOR_CONTAINER.style.setProperty("--color", "#ffffff");

	if(frameSeek.abEnabled){
		const ab = frameSeek.ab;
		if(round2(metadata.mediaTime) >= round2(ab.loopEndMediaTime)){
			currentMediaTime = ab.loopBeginMediaTime;
			video.currentTime = currentMediaTime+MOE;
			frameSeek.onSeekedManually(currentMediaTime+MOE);
		}
	}
}

function round1(num) {
	return Math.round(num*10)/10;
}
function round2(num) {
	return Math.round(num*100)/100;
}
function round3(num) {
	return Math.round(num*1000)/1000;
}
function round4(num) {
	return Math.round(num*10000)/10000;
}
function round6(num) {
	return Math.round(num*1000000)/1000000;
}

function setButtonsDisabled(disabled){
	inert = disabled;
	const style = document.body.style;
	style.setProperty("--interactivity", disabled ? "inert" : "auto");
	style.setProperty("--interactivityPointerEvents", disabled ? "none" : "auto");
}

FRAME_RATE_INPUT.addEventListener("change", () => {
	frameSeek.frameRate = FRAME_RATE_INPUT.valueAsNumber;
});

/** Registers a click event which calls the specified function. Call the returned function to add a keyboard event.
 *  @param element EventTarget | string
 *  @param func (event: Event) => void
 *  @returns () => void
 * */
function registerClickEvent(element, func) {
	if (typeof element === 'string') element = curDoc.getElementById(element);
	element.addEventListener('click', func, {passive: true})
	return () => registerKeyDownEvent(element, func);
}
/** @param element HTMLElement
 *  @param func (event: Event) => void
 *  @param keyName string */
function registerKeyDownEvent(element, func, keyName = "Enter"){
	element.addEventListener('keydown', (keyEvent) => { if(keyEvent.key === keyName) func(keyEvent) }, {passive: true})
}
/** @param element EventTarget | string
 *  @param func (event: Event) => void */
function registerChangeEvent(element, func) {
	if (typeof element === 'string') element = curDoc.getElementById(element);
	element.addEventListener('change', func, { passive: true })
}
/** @param elem HTMLInputElement
 *  @param func (event: Event) => void) */
function registerInputEvent(elem, func) {
	elem.addEventListener('input', func, { passive: true });
}

async function togglePictureInPicture() {
	TOGGLE_PIP_BUTTON.disabled = true;

	if(storedWindow == null) await enterPictureInPicture();
	else exitPictureInPicture();

	TOGGLE_PIP_BUTTON.disabled = false;
}

async function enterPictureInPicture() {
	// noinspection JSUnresolvedReference
	storedWindow = await documentPictureInPicture.requestWindow({width: 450, height: 450, disallowReturnToOpener: false, preferInitialWindowPlacement: false});
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

function progressBarSeek(mouse, seekVideo) {
	if (mouse?.pointerType === "touch" && !seekVideo){
		removeHoveredTimeDisplay();
		return;
	}

	const offsetX = mouse.offsetX;
	const progressBarDomRect = PLAY_BAR.getBoundingClientRect();
	const progress = Math.max(offsetX / progressBarDomRect.width, 0);
	const [mediaTime, frameNumber] = frameSeek.getSeekDataFromProgress(progress);
	if(seekVideo) {
		currentMediaTime = mediaTime;
		video.currentTime = mediaTime+MOE;
		frameSeek.onSeekedManually(mediaTime+MOE);
	} else {
		HOVERED_TIME_DISPLAY.children[0].textContent = String(secondsToTimestamp(mediaTime));
		HOVERED_TIME_DISPLAY.children[1].textContent = String(frameNumber);
		HOVERED_TIME_DISPLAY.style.transform = `translate(calc(${mouse.x}px - 50%), ${progressBarDomRect.top-40}px)`;
	}
}

function removeHoveredTimeDisplay(){
	HOVERED_TIME_DISPLAY.style.transform = "translate(-9999px, 0px)";
}

/** @param {InputEvent} event */
function timeInputBeforeInput(event, submitCallback, isUnallowedTest) {
	if(inert || !videoSrc){
		event.preventDefault();
	}

	console.log(event.inputType)
	switch (event.inputType){
		case "insertLineBreak":
			event.preventDefault();
			submitCallback();
			break;
		case "insertText":
			if(isUnallowedTest(event.data)){
				event.preventDefault();
			}
			break;
	}
}
function charIsNumeric(char) {
	const codePoint = char.codePointAt(0);
	return codePoint >= 48 && codePoint <= 57;
}
function charIsNotNumeric(char) {
	return !charIsNumeric(char);
}
function charMatchesTimeRegex(char) {
	return char.match(TIME_ONLY_REGEX);
}
function charMatchesNumberRegex(char) {
	return char.match(NUMBERS_ONLY_REGEX);
}
FRAME_INPUT.addEventListener("beforeinput", (event) => timeInputBeforeInput(event, submitFrameInput, charMatchesNumberRegex));
FRAME_INPUT.addEventListener("input", (event) => {
	const numbersOnly = FRAME_INPUT.textContent.replace(NUMBERS_ONLY_REGEX, "");
	if(numbersOnly !== FRAME_INPUT.textContent){
		FRAME_INPUT.textContent = numbersOnly;
		fixCursorOnInput(FRAME_INPUT);
	}
});
CURRENT_TIME_INPUT.addEventListener("beforeinput", (event) => timeInputBeforeInput(event, submitTimeInput, charMatchesTimeRegex));
CURRENT_TIME_INPUT.addEventListener("input", (event) => {
	const timeOnly = CURRENT_TIME_INPUT.textContent.replace(TIME_ONLY_REGEX, "");
	if(timeOnly !== CURRENT_TIME_INPUT.textContent){
		CURRENT_TIME_INPUT.textContent = timeOnly;
		fixCursorOnInput(CURRENT_TIME_INPUT);
	}
});
MEDIA_TIME_INPUT.addEventListener("beforeinput", (event) => timeInputBeforeInput(event, submitMediaTimeInput, charMatchesNumberRegex));
MEDIA_TIME_INPUT.addEventListener("input", (event) => {
	const timeOnly = MEDIA_TIME_INPUT.textContent.replace(NUMBERS_ONLY_REGEX, "");
	if(timeOnly !== MEDIA_TIME_INPUT.textContent){
		MEDIA_TIME_INPUT.textContent = timeOnly;
		fixCursorOnInput(MEDIA_TIME_INPUT);
	}
});

function submitFrameInput(){
	video.pause();
	const currentTime = frameSeek.calcMediaTimeAtFrame(Number(FRAME_INPUT.textContent));
	currentMediaTime = currentTime;
	video.currentTime = currentTime+MOE;
	frameSeek.onSeekedManually(currentTime+MOE);
}
const timeInputMultipliers = [1, 60, 60*60, 60*60*24];
function submitTimeInput(){
	video.pause();
	let newTime = 0;
	const timeSegments = CURRENT_TIME_INPUT.textContent.split(':').reverse();
	for(let i = 0; i < Math.min(timeSegments.length, timeInputMultipliers.length); i++){
		newTime += timeSegments[i]*timeInputMultipliers[i];
	}
	const frameNumber = Math.floor(round1(frameSeek.calcFrameNumber(newTime)));
	const frameTime = frameSeek.calcMediaTimeAtFrame(frameNumber);

	currentMediaTime = frameTime;
	video.currentTime = frameTime+MOE;
	frameSeek.onSeekedManually(frameTime+MOE);
}
function submitMediaTimeInput(){
	video.pause();
	currentMediaTime = Number(MEDIA_TIME_INPUT.textContent);
	video.currentTime = currentMediaTime+MOE;
	frameSeek.onSeekedManually(currentMediaTime+MOE);
}

function setEditableTextContent(element, string){
	element.textContent = string;
	if(document.activeElement === element){
		fixCursorOnInput(element);
	}
}

function fixCursorOnInput(input){
	const selection = window.getSelection();
	selection.removeAllRanges();
	const range = new Range();
	range.selectNodeContents(input);
	range.collapse(false);
	selection.addRange(range);
}



registerClickEvent(document.getElementById("toggleLoopBar"), () => {
	if(!frameSeek || inert) return;
	frameSeek.toggleAB();
})();

LOOP_START_BAR.addEventListener("pointerdown", (mouse) => {
	LOOP_START_BAR.setPointerCapture(mouse.pointerId);
}, {passive: true});
LOOP_START_BAR.addEventListener("pointermove", (mouse) => {
	if(LOOP_START_BAR.hasPointerCapture(mouse.pointerId)){
		const mouseX = mouse.clientX;
		const rect = LOOP_BAR_TRACK.getBoundingClientRect();
		const progress = clamp((mouseX - rect.left) * (1 / rect.width), 0, 1);
		LOOP_START_BAR.style.setProperty("--progress", `${progress*100}%`);

		const [mediaTime, frameNumber] = frameSeek.setAMediaTime(video.duration * progress);
		showTimeDisplayPointerEvent(mediaTime, frameNumber, mouse, rect);
	}
}, {passive: true});
LOOP_START_BAR.addEventListener("keydown", (keyboard) => {
	let frameNumber;
	let mediaTime;
	switch (keyboard.key){
		case "ArrowLeft":
			keyboard.preventDefault();
			keyboard.stopPropagation();
			[mediaTime, frameNumber] = frameSeek.decrementAPosition();
			break;
		case "ArrowRight":
			keyboard.preventDefault();
			keyboard.stopPropagation();
			[mediaTime, frameNumber] = frameSeek.incrementAPosition();
			break;
		default:
			return;
	}

	if(mediaTime !== null && frameNumber !== null){
		LOOP_START_BAR.style.setProperty("--progress", `${mediaTime/video.duration*100}%`);
		showTimeDisplayPointerEvent1(mediaTime, frameNumber, LOOP_START_BAR);
	}
});
LOOP_START_BAR.addEventListener("pointerenter", (mouse) => {
	showTimeDisplayPointerEvent1(frameSeek.ab.loopBeginMediaTime, null, LOOP_START_BAR);
}, {passive: true});
LOOP_START_BAR.addEventListener("focus", (mouse) => {
	showTimeDisplayPointerEvent1(frameSeek.ab.loopBeginMediaTime, null, LOOP_START_BAR);
}, {passive: true});
LOOP_START_BAR.addEventListener("pointerleave", removeHoveredTimeDisplay, {passive: true});
LOOP_START_BAR.addEventListener("blur", removeHoveredTimeDisplay, {passive: true});
registerClickEvent(document.getElementById("setAHere"), () => {
	const [mediaTime, frameNumber] = frameSeek.setAMediaTime(currentMediaTime);
	LOOP_START_BAR.style.setProperty("--progress", `${mediaTime/video.duration*100}%`);
})();



LOOP_END_BAR.addEventListener("pointerdown", (mouse) => {
	LOOP_END_BAR.setPointerCapture(mouse.pointerId);
});
LOOP_END_BAR.addEventListener("pointermove", (mouse) => {
	if(LOOP_END_BAR.hasPointerCapture(mouse.pointerId)){
		const mouseX = mouse.clientX;
		const rect = LOOP_BAR_TRACK.getBoundingClientRect();
		const progress = clamp((mouseX - rect.left) * (1 / rect.width), 0, 1);
		LOOP_END_BAR.style.setProperty("--progress", `${progress*100}%`);

		const [mediaTime, frameNumber] = frameSeek.setBMediaTime(video.duration * progress);
		showTimeDisplayPointerEvent(mediaTime, frameNumber, mouse, rect);
	}
});
LOOP_END_BAR.addEventListener("keydown", (keyboard) => {
	let mediaTime;
	let frameNumber;
	switch (keyboard.key){
		case "ArrowLeft":
			keyboard.preventDefault();
			keyboard.stopPropagation();
			[mediaTime, frameNumber] = frameSeek.decrementBPosition();
			break;
		case "ArrowRight":
			keyboard.preventDefault();
			keyboard.stopPropagation();
			[mediaTime, frameNumber] = frameSeek.incrementBPosition();
			break;
		default:
			return;
	}

	if(mediaTime !== null && frameNumber !== null){
		LOOP_END_BAR.style.setProperty("--progress", `${mediaTime/video.duration*100}%`);
		showTimeDisplayPointerEvent1(mediaTime, frameNumber, LOOP_END_BAR);
	}
});
LOOP_END_BAR.addEventListener("pointerenter", (mouse) => {
	showTimeDisplayPointerEvent1(frameSeek.ab.loopEndMediaTime, null, LOOP_END_BAR);
});
LOOP_END_BAR.addEventListener("focus", (mouse) => {
	showTimeDisplayPointerEvent1(frameSeek.ab.loopEndMediaTime, null, LOOP_END_BAR);
});
LOOP_END_BAR.addEventListener("pointerleave", removeHoveredTimeDisplay);
LOOP_END_BAR.addEventListener("blur", removeHoveredTimeDisplay);
registerClickEvent(document.getElementById("setBHere"), () => {
	const [mediaTime, frameNumber] = frameSeek.setBMediaTime(currentMediaTime);
	LOOP_END_BAR.style.setProperty("--progress", `${mediaTime/video.duration*100}%`);
})();


function showTimeDisplayPointerEvent(mediaTime, frameNumber, mouse, rect) {
	HOVERED_TIME_DISPLAY.children[0].textContent = String(secondsToTimestamp(mediaTime));
	HOVERED_TIME_DISPLAY.children[1].textContent = String(frameNumber);
	HOVERED_TIME_DISPLAY.style.transform = `translate(calc(${clamp(mouse.clientX, rect.left, rect.right)}px - 50%), ${rect.top - 40}px)`;
}

function showTimeDisplayPointerEvent1(mediaTime, frameNumber, element) {
	frameNumber ??= round1(frameSeek.calcFrameNumber(mediaTime));
	const rect = element.getBoundingClientRect();
	HOVERED_TIME_DISPLAY.children[0].textContent = String(secondsToTimestamp(mediaTime));
	HOVERED_TIME_DISPLAY.children[1].textContent = String(frameNumber);
	HOVERED_TIME_DISPLAY.style.transform = `translate(calc(${rect.left}px - 50%), ${rect.top - 40}px)`;
}

function clamp(val, min, max) {
	return Math.min(Math.max(val, min), max);
}

function binarySearch(arr, val) {
	let start = 0;
	let end = arr.length - 1;

	while (start <= end) {
		let mid = Math.floor((start + end) / 2);

		if (arr[mid] == val) {
			return mid;
		}

		if (val < arr[mid]) {
			end = mid - 1;
		} else {
			start = mid + 1;
		}
	}
	return -1;
}
/** @param arr {number[]}
 * @param val {number} */
function binarySearchLenient(arr, val) {
	if(val < arr[0]) {
		return 0;
	}
	if(val > arr[arr.length-1]) {
		return arr.length-1;
	}

	let lo = 0;
	let hi = arr.length - 1;

	while (lo <= hi) {
		const mid = Math.floor((hi + lo) / 2);

		if (val < arr[mid]) {
			hi = mid - 1;
		} else if (val > arr[mid]) {
			lo = mid + 1;
		} else {
			return mid;
		}
	}
	// lo == hi + 1
	return (arr[lo] - val) < (val - arr[hi]) ? lo : hi;
}

// /** @param arr {number[]}
//  * @param val {number} */
// function binarySearchLenientValues(arr, val) {
// 	if(val < arr[0]) {
// 		return arr[0];
// 	}
// 	if(val > arr[arr.length-1]) {
// 		return arr[arr.length-1];
// 	}
//
// 	let lo = 0;
// 	let hi = arr.length - 1;
//
// 	while (lo <= hi) {
// 		const mid = (hi + lo) / 2;
//
// 		if (val < arr[mid]) {
// 			hi = mid - 1;
// 		} else if (val > arr[mid]) {
// 			lo = mid + 1;
// 		} else {
// 			return arr[mid];
// 		}
// 	}
// 	// lo == hi + 1
// 	return (arr[lo] - val) < (val - arr[hi]) ? arr[lo] : arr[hi];
// }

setup();