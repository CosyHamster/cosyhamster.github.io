var PREFERRED_ITERS = 5;

/** Splits inputted seconds into hours, minutes, & seconds. toString() returns the time in digital format.
  * @param seconds number */
function secondsToTimestamp(seconds) {
	this.seconds = numberToDigitalTimeString(Math.floor(seconds % 60))

	this.minutes = Math.floor(seconds / 60)
	this.hours = Math.floor(this.minutes / 60)
	this.minutes = numberToDigitalTimeString(this.minutes - this.hours * 60);
	this.hours = numberToDigitalTimeString(this.hours);

	if(this.hours === "00") return `${this.minutes}:${this.seconds}`;
	return `${this.hours}:${this.minutes}:${this.seconds}`;
}
function numberToDigitalTimeString(number) {
	return String(number).padStart(2, "0");
}

var inert = false;
/** @type HTMLCanvasElement */
const screenshotCanvas = document.createElement("canvas");
const screenshotCanvasCtx = screenshotCanvas.getContext("2d");

const LOADING_FR_OVERLAY = document.getElementById("loadingFR");
const fileUpload = document.getElementById("upload");
const skipDuration = document.getElementById("skipDuration");
/** @type HTMLInputElement */
const inputMediaTime = document.getElementById("mediaTimeInput");
/** @type HTMLInputElement */
const inputFrameRate = document.getElementById("videoFrameRate");
/** @type HTMLSpanElement */
const FRAME_INPUT = document.getElementById("frameNumber");
/** @type HTMLVideoElement */
const video = document.getElementById("video");
/** @type string */
let videoSrc = null;
let saveVideoNamePrefix = "";
/** @type FrameSeeking */
var frameSeek = null;
var seeking = 0;
var iters = 0;
var currentMediaTime = 0;
var frameRate = null;
/** @type (frameCount:number) -> void */
var frameRateDeterminedCallback = null;
/** @type null | (framerate: number) => null */
let resolveWithVideoFrameRate = null;

/** @type Window */
var storedWindow;
/** @type Window */
var curWin = window;
/** @type Document */
var curDoc = document;

/** @type HTMLAnchorElement */
const DOWNLOAD_BUTTON = document.getElementById("downloadFrame");
/** @type HTMLDivElement */
const UI = document.getElementById("ui");
/** @type HTMLDivElement */
const VIDEO_CONTROLS_BOTTOM = document.getElementById("videoControlsB");
/** @type HTMLDivElement */
const PLAY_BUTTON = document.getElementById("playButton");
/** @type HTMLInputElement */
const VOLUME_SLIDER = document.getElementById("volumeSlider");
/** @type HTMLDivElement */
const PLAY_BAR = document.getElementsByClassName("playbar")[0];
/** @type HTMLDivElement */
const HOVERED_TIME_DISPLAY = document.getElementById('hoveredTimeDisplay');
/** @type HTMLSpanElement */
const CURRENT_TIME_LABEL = document.getElementById("firstDurationLabel");
/** @type HTMLDivElement */
const MEDIA_CONTROLS = document.getElementById("controls");
/** @type HTMLDivElement */
const SKIP_FORWARD = document.getElementById("skipForward");
/** @type HTMLDivElement */
const SKIP_BACKWARD = document.getElementById("skipBackward");
/** @type HTMLDivElement */
const SEEK_BACKWARD = document.getElementById('seekBackward');
/** @type HTMLDivElement */
const SEEK_FORWARD = document.getElementById('seekForward');

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

// demo
let deque = new Deque();
console.log(deque.peekFront()); // undefined
deque.addFront(1);
console.log(deque.peekBack()); // 1
deque.addFront(2);
console.log(deque.removeBack()); // 1
deque.addFront(3);
deque.addFront(4);
console.log(deque.peekBack()); // 2
deque.addBack(5);
deque.addBack(6);
console.log(deque.peekBack()); // 6
console.log(deque.removeFront()); // 4
console.log(deque.removeFront()); // 3
console.log(deque.removeFront()); // 2
console.log(deque.removeFront()); // 5
console.log(deque.removeFront()); // 6
console.log(deque.removeFront()); // undefined



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
		DOWNLOAD_BUTTON.download = `${saveVideoNamePrefix}_videoframe_${round2(calcFrameNumber(currentMediaTime))}.png`;
	})();

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
	currentMediaTime += 5 * seekDirection + 0.0001;
	video.currentTime = currentMediaTime;
	frameSeek.onSeekedManually(currentMediaTime);
}

/** @param {File} file */
async function uploadFile(file){
	setButtonsDisabled(true);
	video.pause();
	const separationIndex = file.name.lastIndexOf('.');
	saveVideoNamePrefix = separationIndex != -1 ? file.name.substring(0, separationIndex) : file.name;
	if(videoSrc){
		URL.revokeObjectURL(videoSrc);
		frameSeek.destroy();
	}

	videoSrc = URL.createObjectURL(file);
	frameSeek = new FrameSeeking(videoSrc);
	LOADING_FR_OVERLAY.toggleAttribute("data-active", true);
	await waitForStableFrameRate();

	video.addEventListener("loadeddata", () => {
		screenshotCanvas.width = video.videoWidth;
		screenshotCanvas.height = video.videoHeight;
		setButtonsDisabled(false);
		LOADING_FR_OVERLAY.toggleAttribute("data-active", false);
	}, {passive: true, once: true});
	video.src = videoSrc;
}

function waitForStableFrameRate(){
	return new Promise(resolve => {
		frameRateDeterminedCallback = resolve;
	});
}

class FrameSeeking {
	/** @type ForwardFrameSeek */ forwardFrameSeek;
	/** @type BackwardFrameSeek */ backwardFrameSeek;
	/** @type FrameRateSeek */ frameRateSeek;
	timeoutID = null;
	constructor(src) {
		this.forwardFrameSeek = new ForwardFrameSeek(src);
		this.backwardFrameSeek = new BackwardFrameSeek(src);
		this.frameRateSeek = new FrameRateSeek(src);
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
	}

	onSeekedManually(newTime) {
		if(video.paused){
			this.stopFrameSeek();
			this.forwardFrameSeek.beginExecutor(newTime);
			this.backwardFrameSeek.beginExecutor(newTime);
		}
	}

	forward(){
		let nextMediaTime = this.forwardFrameSeek.popLeftMediaTime();
		if(nextMediaTime === currentMediaTime) nextMediaTime = this.forwardFrameSeek.popLeftMediaTime();
		if(nextMediaTime){
			this.backwardFrameSeek.addLeftMediaTime(currentMediaTime);
			currentMediaTime = nextMediaTime;
			video.currentTime = nextMediaTime+0.0001; //add a slight amount to avoid rounding errors with the previous frame
		}
	}

	backward(){
		let prevMediaTime = this.backwardFrameSeek.popLeftMediaTime();
		if(prevMediaTime === currentMediaTime) prevMediaTime = this.forwardFrameSeek.popLeftMediaTime();
		if(prevMediaTime){
			this.forwardFrameSeek.addLeftMediaTime(currentMediaTime);
			currentMediaTime = prevMediaTime;
			video.currentTime = prevMediaTime+0.0001; //add a slight amount to avoid rounding errors with the previous frame
		} else if(round2(calcFrameNumber(currentMediaTime)) == 1){
			this.forwardFrameSeek.addLeftMediaTime(currentMediaTime);
			currentMediaTime = 0;
			video.currentTime = 0;
		}
	}
}

class FrameSeek {
	/** @type number | null */ queuedMediaTime = null;
	/** @type number | null */ requestID = null;
	/** @type SimpleAbortController */ abortController = null;
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

	async beginExecutor(mediaTime){
		if(!this.abortController){
			this.abortController = new SimpleAbortController();
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
		this.instVideo.currentTime = mediaTime;
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

	async onExecutorAborted() {
		console.log(this.toString() + " aborted");
		this.instVideo.pause();
		this.mediaTimes = new Deque();
		await new Promise(resolve => setTimeout(resolve, 250)); //provide the video time to rest
		this.abortController = null;
		if(this.queuedMediaTime !== null){
			this.beginExecutor(this.queuedMediaTime);
		}
	}
}

class ForwardFrameSeek extends FrameSeek {
	constructor(src) {
		super(src);
		this.onVideoEnded = this.onVideoEnded.bind(this);
		this.instVideo.addEventListener("ended",this.onVideoEnded,{passive:true});
	}

	beginExecutor(mediaTime){
		if(!this.abortController){
			this.abortController = new SimpleAbortController();
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
		this.instVideo.cancelVideoFrameCallback(this.requestID);
		this.instVideo.removeEventListener("ended",this.onVideoEnded,{passive:true});
		this.abortController = null;
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	firstFrameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		// this.addRightMediaTime(metadata.mediaTime);
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.instVideo.playbackRate = Math.max(0.0625*(60/frameRate), 0.0625); //goes faster when framerate is lower (30 fps is 2x (0.125))
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
		this.instVideo.cancelVideoFrameCallback(this.requestID);
	}

	addRightMediaTime(mediaTime){
		if(mediaTime > video.currentTime){
			this.mediaTimes.addFront(mediaTime);
		}
	}

	toString(){
		return "ForwardFrameSeek";
	}
}

class BackwardFrameSeek extends FrameSeek {
	/** @type number | null */ currentMediaTime = null;
	constructor(src) {
		super(src);
	}

	/** @param {number} mediaTime */
	beginExecutor(mediaTime){
		if(mediaTime == 0) return;
		if(!this.abortController){
			this.abortController = new SimpleAbortController();
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

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	firstFrameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		// this.addRightMediaTime(metadata.mediaTime);
		this.currentMediaTime = metadata.mediaTime;
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.instVideo.currentTime = metadata.mediaTime-0.0001;
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	frameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		if(metadata.mediaTime === this.currentMediaTime){ this.abortController.callback = this.onExecutorAborted; return; }
		this.addRightMediaTime(metadata.mediaTime);
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.instVideo.currentTime = metadata.mediaTime-0.0001;
	}

	addRightMediaTime(mediaTime){
		if(mediaTime < video.currentTime){
			this.mediaTimes.addFront(mediaTime);
		}

		this.currentMediaTime = mediaTime;
	}

	async onExecutorAborted() { //identical to base method to avoid delays between calling async functions
		console.log(this.toString() + " aborted");
		this.instVideo.cancelVideoFrameCallback(this.requestID);
		this.currentMediaTime = null;
		this.mediaTimes = new Deque();
		await new Promise(resolve => setTimeout(resolve, 250)); //provide the video time to rest
		this.abortController = null;
		if(this.queuedMediaTime){
			this.beginExecutor(this.queuedMediaTime);
		}
	}

	toString(){
		return "BackwardFrameSeek";
	}
}

class FrameRateSeek {
	/** @type number | null */ requestID = null;
	/** @type SimpleAbortController */ abortController = new SimpleAbortController();
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
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
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
			frameRate = 1 / this.averageFrameDiff;
			inputFrameRate.valueAsNumber = frameRate;
		}

		const dropped = this.instVideo.getVideoPlaybackQuality().totalVideoFrames-metadata.presentedFrames-3;
		if(dropped){ //for some reason, dropped frames is always a difference of 3. waiting to be proven wrong.
			inputFrameRate.style.color = "red";
			inputFrameRate.title = `${dropped} frames were dropped due to lag in the framerate calculation. This result may be incorrect.`;
			inputFrameRate.labels[0].title = `${dropped} frames were dropped due to lag in the framerate calculation. This result may be incorrect.`;
		}
	}

	toString(){
		return "FrameRateSeek";
	}
}

class SimpleAbortController {
	aborted = false;
	callback = function(){};
	reset(){ this.aborted = false; }
	abort(){
		if(!this.aborted){
			this.aborted = true;
			this.callback();
		}
	}
}

fileUpload.addEventListener("change", () => {
	if(!inert)
		uploadFile(fileUpload.files[0]);
	fileUpload.value = null;
}, true);
window.addEventListener("dragover", (event) => {
	if(event.dataTransfer.types.includes("Files") && !inert)
		event.preventDefault();
});
window.addEventListener("drop", (event) => {
	const dataTransfer = event.dataTransfer;
	if(dataTransfer.files && !inert) {
		event.preventDefault();
		uploadFile(dataTransfer.files[0]);
	}
});

video.addEventListener("play", () => {
	PLAY_BUTTON.classList.add("playing");
	frameSeek.stopFrameSeek();
}, {passive: true});
video.addEventListener("pause", () => {
	console.log(video.currentTime)
	console.log(currentMediaTime)
	PLAY_BUTTON.classList.remove("playing");
	frameSeek.queueStartFrameSeek(() => currentMediaTime, 100);
}, {passive: true});
video.addEventListener("loadstart", () => {
	PLAY_BUTTON.classList.remove("playing");
}, {passive: true});
video.addEventListener("timeupdate", timeUpdate, {passive: true});
video.addEventListener("seeking", timeUpdate, {passive: true});
video.addEventListener("durationchange", () => document.getElementById("secondDurationLabel").innerText = secondsToTimestamp(video.duration), {passive: true});
video.addEventListener("click", toggleUI, {passive: true});
video.addEventListener("dblclick", toggleFullscreen, {passive: true});
document.getElementById("fullscreenButton").addEventListener("click", toggleFullscreen, {passive: true});

function toggleUI(){
	if(videoSrc){
		if(UI.inert){
			UI.style.visibility = "visible";
			UI.inert = false;
		} else {
			UI.style.visibility = "hidden";
			UI.inert = true;
		}
	}
}
function toggleFullscreen(){
	if(document.fullscreenElement){
		document.exitFullscreen().catch(function(reason){});
	} else {
		document.documentElement.requestFullscreen({navigationUI: "hide"}).catch(function(reason){});
	}
}

CURRENT_TIME_LABEL.addEventListener("input", console.log);

PLAY_BAR.addEventListener('pointerenter', (pointer) => progressBarSeek(pointer, false), { passive: true })
PLAY_BAR.addEventListener('pointerdown', (pointer) => { if(pointer.button === 0) progressBarSeek(pointer, true); }, { passive: true })
PLAY_BAR.addEventListener('pointermove', (pointer) => progressBarSeek(pointer, false), { passive: true })
PLAY_BAR.addEventListener('pointerleave', (pointer) => removeHoveredTimeDisplay(), { passive: true })

curWin.addEventListener("keypress", keyEvent => {
	const keyLower = keyEvent.key.toLowerCase();
	const compressed = (Number(keyEvent.shiftKey)/*1*/)+(Number(keyEvent.ctrlKey)<<1/*2*/)+(Number(keyEvent.altKey)<<2/*4*/)+(Number(keyEvent.metaKey)<<3/*8*/);
	if(compressed === 0){
		switch(keyLower){
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
			// case "m":
			// 	MUTE_BUTTON.click();
			// 	break;
		}
	}
});

function timeUpdate() {
	const currentTime = video.currentTime;
	PLAY_BAR.style.setProperty("--percentage", String(Math.min(currentTime / video.duration, 1) * 100) + '%');
	CURRENT_TIME_LABEL.innerText = secondsToTimestamp(currentTime);
}

// function videoFrameAdvanced(now, metadata){
// 	console.log(`iters: ${iters}; currentTime: ${video.currentTime}; prevMediaTime: ${currentMediaTime}; mediaTime: ${metadata.mediaTime}`);
// 	skipDuration.valueAsNumber = (skipDuration.valueAsNumber*iters)/PREFERRED_ITERS;
// 	if(iters >= PREFERRED_ITERS){
// 		if(resolveWithVideoFrameRate != null){
// 			resolveWithVideoFrameRate(1/(metadata.mediaTime-currentMediaTime));
// 		}
// 		currentMediaTime = metadata.mediaTime;
// 		inputMediaTime.valueAsNumber = metadata.mediaTime;
// 		setButtonsDisabled(false);
// 		seeking = 0;
// 		iters = 0;
// 	} else {
// 		console.log(`Not enough iterations. Restarting to ${currentMediaTime}`);
// 		video.currentTime = currentMediaTime;
// 		iters = 0;
// 	}
// }

function onVideoFrame(now, metadata){
	video.requestVideoFrameCallback(onVideoFrame);
	currentMediaTime = metadata.mediaTime;
	FRAME_INPUT.textContent = String(round2(calcFrameNumber(currentMediaTime)));
	inputMediaTime.valueAsNumber = currentMediaTime;
}
function calcFrameNumber(mediaTime){
	if(!frameRate){
		inputFrameRate.focus();
		return 0;
	}
	const frameNumber = mediaTime*frameRate;
	console.log("RAW: " + String(frameNumber));
	return frameNumber;
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

function setButtonsDisabled(disabled){
	inert = disabled;
	document.body.style.setProperty("--interactivity", disabled ? "inert" : "auto");
	video.inert = disabled;
}

inputFrameRate.addEventListener("change", () => {
	frameRate = inputFrameRate.valueAsNumber;
});

inputMediaTime.addEventListener("change", () => {
	video.currentTime = inputMediaTime.valueAsNumber;
}, true);

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
	// @ts-ignore
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
	let seekToTime = Math.max(offsetX * (video.duration / progressBarDomRect.width), 0);
	const frameNumber = Math.floor(calcFrameNumber(seekToTime));
	seekToTime = calcMediaTimeAtFrame(frameNumber)+0.0001;
	if(seekVideo) {
		video.currentTime = seekToTime;
		frameSeek.onSeekedManually(seekToTime);
	} else {
		HOVERED_TIME_DISPLAY.children[0].textContent = String(secondsToTimestamp(seekToTime));
		HOVERED_TIME_DISPLAY.children[1].textContent = String(frameNumber);
		HOVERED_TIME_DISPLAY.style.transform = `translate(calc(${mouse.x}px - 50%), ${progressBarDomRect.top-40}px)`;
	}
}

function removeHoveredTimeDisplay(){
	HOVERED_TIME_DISPLAY.style.transform = "translate(-9999px, 0px)";
}

/** @param {InputEvent} event */
FRAME_INPUT.addEventListener("beforeinput", (event) => {
	console.log(event);
	switch (event.inputType){
		case "insertLineBreak":
			event.preventDefault();

			video.pause();
			const currentTime = calcMediaTimeAtFrame(Number(FRAME_INPUT.textContent));
			video.currentTime = currentTime+0.0001;
			frameSeek.onSeekedManually(currentTime+0.0001);
	}
});
FRAME_INPUT.addEventListener("input", (event) => {
	const numbersOnly = FRAME_INPUT.textContent.replace(/\D/g, "");
	if(numbersOnly !== FRAME_INPUT.textContent){
		FRAME_INPUT.textContent = numbersOnly;
		fixCursorOnFrameInput();
	}
});
function fixCursorOnFrameInput(){
	const selection = window.getSelection();
	selection.empty();
	const range = new Range();
	range.selectNodeContents(FRAME_INPUT);
	range.collapse(false);
	selection.addRange(range);
}
function calcMediaTimeAtFrame(frameNumber){
	return frameNumber/frameRate;
}

setup();