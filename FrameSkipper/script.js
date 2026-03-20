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

const fileUpload = document.getElementById("upload");
const skipDuration = document.getElementById("skipDuration");
/** @type HTMLInputElement */
const inputMediaTime = document.getElementById("mediaTimeInput");
/** @type HTMLInputElement */
const inputFrameRate = document.getElementById("videoFrameRate");
const calcFrameNumberButton = document.getElementById("calcFrameNumber");
/** @type HTMLOutputElement */
const outputFrameNumber = document.getElementById("outputFrame");
/** @type HTMLVideoElement */
const video = document.getElementById("video");
/** @type FrameSeeking */
var frameSeek = null;
var seeking = 0;
var iters = 0;
var currentMediaTime = 0;
var frameRate = NaN;
/** @type null | (framerate: number) => null */
let resolveWithVideoFrameRate = null;

/** @type Window */
var storedWindow;
/** @type Window */
var curWin = window;
/** @type Document */
var curDoc = document;

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
	VIDEO_CONTROLS_BOTTOM.addEventListener("click", event => event.preventDefault());
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
	/** @type HTMLAnchorElement */
	var downloadButton = document.getElementById("downloadFrame");
	registerClickEvent(downloadButton, (event) => {
		if(video.videoWidth && video.videoHeight){
			screenshotCanvas.width = video.videoWidth;
			screenshotCanvas.height = video.videoHeight;
			const ctx = screenshotCanvas.getContext("2d");
			ctx.drawImage(video, 0, 0);

			downloadButton.href = screenshotCanvas.toDataURL("image/png");
			downloadButton.download = `videoframe_${Math.round(calcFrameNumber())}`;
		}
	})

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
	video.currentTime += 5 * seekDirection;
	frameSeek.onSeekedManually(video.currentTime);
}

function uploadFile(file){
	video.pause();
	setButtonsDisabled(true);
	if(video.src){
		URL.revokeObjectURL(video.src);
		frameSeek.stopFrameSeek();
	}

	video.src = URL.createObjectURL(file);
	frameSeek = new FrameSeeking(video.src);

	setButtonsDisabled(false);
	new Promise((resolve, reject) => {
		// let frameDiffs = [];
		let averageFrameDiff = 0;
		let frameCount = 0;
		let lastMediaTime, lastFrameNum;
		/** @type HTMLVideoElement */
		const fastVideo = document.createElement("video");
		let requestID = fastVideo.requestVideoFrameCallback(firstFrame);
		fastVideo.muted = true;
		fastVideo.src = video.src;
		fastVideo.addEventListener("play", () => fastVideo.playbackRate = 0.0625, {passive: true, once: true});
		// fastVideo.addEventListener("timeupdate", () => inputFrameRate.valueAsNumber = fastVideo.getVideoPlaybackQuality().totalVideoFrames/fastVideo.currentTime, {passive: true});

		function firstFrame(now, metadata){
			requestID = fastVideo.requestVideoFrameCallback(frameCallback);
		}

		/** @param {DOMHighResTimeStamp} now
		 * @param {VideoFrameCallbackMetadata} metadata */
		function frameCallback(now, metadata) {
			// Source - https://stackoverflow.com/a/73094937
			// Posted by derder56, modified by community. See post 'Timeline' for change history
			// Retrieved 2026-03-18, License - CC BY-SA 4.0
			requestID = fastVideo.requestVideoFrameCallback(frameCallback);
			const mediaTimeDiff = metadata.mediaTime - lastMediaTime;
			const frameNumDiff = metadata.presentedFrames - lastFrameNum; //this doesn't account for if the browser drops a frame. sad.
			const diff = mediaTimeDiff / frameNumDiff;
			lastMediaTime = metadata.mediaTime;
			lastFrameNum = metadata.presentedFrames;
			if (diff && diff <= 1
				// && frameDiffs.length < 50
			) {
				// frameDiffs.push(diff);
				averageFrameDiff = ((averageFrameDiff*frameCount)+diff)/(++frameCount)
				frameRate = 1 / averageFrameDiff;
				inputFrameRate.valueAsNumber = round4(frameRate);
			}

			const dropped = fastVideo.getVideoPlaybackQuality().totalVideoFrames-metadata.presentedFrames-3;
			if(dropped){ //for some reason, dropped frames is always a difference of 3. waiting to be proven wrong.
				inputFrameRate.style.color = "red";
				inputFrameRate.title = `${dropped} frames were dropped due to lag in the framerate calculation. This result may be incorrect.`;
				inputFrameRate.labels[0].title = `${dropped} frames were dropped due to lag in the framerate calculation. This result may be incorrect.`;
			}
		}

		function medianFrameDiff() {
			// return frameDiffs.reduce((a, b) => a + b) / frameDiffs.length;

			// frameDiffs.sort(function(a,b){return a-b;}); //https://stackoverflow.com/a/45309582
			// const mid = frameDiffs.length / 2;
			// return mid % 1 ? frameDiffs[mid-0.5] : (frameDiffs[mid-1]+frameDiffs[mid])/2;
		}
		function round3(num) {
			return Math.round(num*1000)/1000;
		}
		function round4(num) {
			return Math.round(num*10000)/10000;
		}

		fastVideo.addEventListener("ended", async () => {
			fastVideo.cancelVideoFrameCallback(requestID);

			// const playbackInfo = fastVideo.getVideoPlaybackQuality();
			// const totalVideoFrames = playbackInfo.totalVideoFrames;
			// const frameRate = (totalVideoFrames/fastVideo.duration);// + totalVideoFrames/latestMediaTime)/2;
			// console.log("FRAMERATE COMPLETE");
			// console.log(playbackInfo)
			// console.log("totalVideoFrames " + totalVideoFrames)
			// console.log("frameRateWithDuration " + totalVideoFrames/fastVideo.duration)
			// console.log("frameRateWithMediaTime " + totalVideoFrames/latestMediaTime)
			// console.log("frameRateRaw " + frameRate)
			// console.log("frameRateFixed " + Math.round(frameRate*100)/100)
			// console.log("count " + count)
			// inputFrameRate.valueAsNumber = frameRate;
			resolve();
		}, {passive: true, once: true});

		fastVideo.play();
	})
}

class FrameSeeking {
	/** @type ForwardFrameSeek */ forwardFrameSeek;
	/** @type BackwardFrameSeek */ backwardFrameSeek;
	/** @type FrameRateSeek */ frameRateSeek;
	constructor(src) {
		this.forwardFrameSeek = new ForwardFrameSeek(src);
		this.backwardFrameSeek = new BackwardFrameSeek(src);
	}

	startFrameSeek() {
		this.forwardFrameSeek.beginExecutor(currentMediaTime);
		this.backwardFrameSeek.beginExecutor(currentMediaTime);
	}

	stopFrameSeek() {
		this.forwardFrameSeek.stopExecutor();
		this.backwardFrameSeek.stopExecutor();
	}

	onSeekedManually(newTime) {
		if(video.paused){
			this.stopFrameSeek();
			this.forwardFrameSeek.beginExecutor(newTime);
			this.backwardFrameSeek.beginExecutor(newTime);
		}
	}

	forward(){
		const nextMediaTime = this.forwardFrameSeek.popLeftMediaTime();
		if(nextMediaTime){
			this.backwardFrameSeek.addLeftMediaTime(currentMediaTime);
			currentMediaTime = nextMediaTime;
			video.currentTime = nextMediaTime;
		}
	}

	backward(){
		const prevMediaTime = this.backwardFrameSeek.popLeftMediaTime();
		if(prevMediaTime){
			this.forwardFrameSeek.addLeftMediaTime(currentMediaTime);
			currentMediaTime = prevMediaTime;
			video.currentTime = prevMediaTime;
		}
	}
}



class ForwardFrameSeek {
	/** @type number | null */ queuedMediaTime = null;
	/** @type SimpleAbortController */ abortController = null;
	/** @type HTMLVideoElement */ instVideo = null;
	/** @type number | null */ requestID = null;
	mediaTimes = new Deque();
	constructor(src) {
		this.firstFrameCallback = this.firstFrameCallback.bind(this);
		this.frameCallback = this.frameCallback.bind(this);
		this.onExecutorAborted = this.onExecutorAborted.bind(this);
		this.instVideo = document.createElement("video");
		this.instVideo.muted = true;
		this.instVideo.src = src;
		this.instVideo.addEventListener("ended", () => {
			this.abortController.callback = this.onExecutorAborted;
			this.instVideo.cancelVideoFrameCallback(this.requestID);
		}, {passive: true});
	}

	beginExecutor(mediaTime){
		console.log("ForwardFrameSeek beginExecutor");
		if(!this.abortController){
			this.abortController = new SimpleAbortController();
			this.queuedMediaTime = null;
			this.executor(mediaTime);
		} else {
			this.queuedMediaTime = mediaTime;
		}
	}

	stopExecutor(){
		console.log("ForwardFrameSeek stopExecutor");
		if(this.abortController){
			this.abortController.abort();
		}
		this.queuedMediaTime = null;
	}

	async executor(mediaTime){
		console.log("ForwardFrameSeek executor");
		this.requestID = this.instVideo.requestVideoFrameCallback(this.firstFrameCallback);
		this.instVideo.currentTime = mediaTime;
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	firstFrameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		this.addRightMediaTime(metadata.mediaTime);
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.instVideo.playbackRate = 0.0625;
		this.instVideo.play();
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	frameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		this.requestID = this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.addRightMediaTime(metadata.mediaTime);
	}

	addRightMediaTime(mediaTime){
		if(mediaTime > currentMediaTime){
			this.mediaTimes.addFront(mediaTime);
		}
	}

	popLeftMediaTime(){
		return this.mediaTimes.removeBack();
	}

	addLeftMediaTime(mediaTime){
		this.mediaTimes.addBack(mediaTime);
	}

	async onExecutorAborted() {
		console.log("ForwardFrameSeek onExecutorAborted");
		this.instVideo.pause();
		this.mediaTimes = new Deque();
		await new Promise(resolve => setTimeout(resolve, 1000)); //provide the video time to rest
		this.abortController = null;
		if(this.queuedMediaTime){
			this.beginExecutor(this.queuedMediaTime);
		}
	}
}

class BackwardFrameSeek {
	/** @type number | null */ queuedMediaTime = null;
	/** @type SimpleAbortController */ abortController = null;
	/** @type HTMLVideoElement */ instVideo = null;
	/** @type number | null */ currentMediaTime = null;
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
		console.log("BackwardFrameSeek beginExecutor");
		if(!this.abortController){
			this.abortController = new SimpleAbortController();
			this.queuedMediaTime = null;
			this.executor(mediaTime);
		} else {
			this.queuedMediaTime = mediaTime;
		}
	}

	stopExecutor(){
		console.log("BackwardFrameSeek stopExecutor");
		if(this.abortController){
			this.abortController.abort();
		}
		this.queuedMediaTime = null;
	}

	async executor(mediaTime){
		console.log("BackwardFrameSeek executor");
		this.instVideo.requestVideoFrameCallback(this.firstFrameCallback);
		this.instVideo.currentTime = mediaTime;
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	firstFrameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		this.addRightMediaTime(metadata.mediaTime);
		this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.instVideo.currentTime = metadata.mediaTime-0.0001;
	}

	/** @param {DOMHighResTimeStamp} now
	 * @param {VideoFrameCallbackMetadata} metadata */
	frameCallback(now, metadata) {
		if(this.abortController.aborted){ this.onExecutorAborted(); return; }
		if(metadata.mediaTime === this.currentMediaTime){ this.abortController.callback = this.onExecutorAborted; return; }
		this.instVideo.requestVideoFrameCallback(this.frameCallback);
		this.addRightMediaTime(metadata.mediaTime);
		this.instVideo.currentTime = metadata.mediaTime-0.0001;
	}

	addRightMediaTime(mediaTime){
		this.currentMediaTime = mediaTime;
		if(mediaTime < currentMediaTime){
			this.mediaTimes.addFront(mediaTime);
		}
	}

	popLeftMediaTime(){
		return this.mediaTimes.removeBack();
	}

	addLeftMediaTime(mediaTime){
		this.mediaTimes.addBack(mediaTime);
	}

	async onExecutorAborted() {
		console.log("BackwardFrameSeek onExecutorAborted");
		this.instVideo.pause();
		this.currentMediaTime = null;
		this.mediaTimes = new Deque();
		await new Promise(resolve => setTimeout(resolve, 1000)); //provide the video time to rest
		this.abortController = null;
		if(this.queuedMediaTime){
			this.beginExecutor(this.queuedMediaTime);
		}
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
	PLAY_BUTTON.classList.remove("playing");
	frameSeek.startFrameSeek();
}, {passive: true});
video.addEventListener("loadstart", () => {
	PLAY_BUTTON.classList.remove("playing");
}, {passive: true});
video.addEventListener("loadeddata", () => {
	frameSeek.startFrameSeek();
}, {passive: true});
video.addEventListener("timeupdate", () => {
	PLAY_BAR.style.setProperty("--percentage", String(Math.min(video.currentTime / video.duration, 1) * 100) + '%');
	CURRENT_TIME_LABEL.innerText = secondsToTimestamp(video.currentTime);
}, {passive: true});
video.addEventListener("seeking", () => PLAY_BAR.style.setProperty("--percentage", String(Math.min(video.currentTime/video.duration, 1)*100)+'%'), {passive: true});
video.addEventListener("durationchange", () => document.getElementById("secondDurationLabel").innerText = secondsToTimestamp(video.duration), {passive: true});
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

function videoFrameAdvanced(now, metadata){
	console.log(`iters: ${iters}; currentTime: ${video.currentTime}; prevMediaTime: ${currentMediaTime}; mediaTime: ${metadata.mediaTime}`);
	skipDuration.valueAsNumber = (skipDuration.valueAsNumber*iters)/PREFERRED_ITERS;
	if(iters >= PREFERRED_ITERS){
		if(resolveWithVideoFrameRate != null){
			resolveWithVideoFrameRate(1/(metadata.mediaTime-currentMediaTime));
		}
		currentMediaTime = metadata.mediaTime;
		inputMediaTime.valueAsNumber = metadata.mediaTime;
		setButtonsDisabled(false);
		seeking = 0;
		iters = 0;
	} else {
		console.log(`Not enough iterations. Restarting to ${currentMediaTime}`);
		video.currentTime = currentMediaTime;
		iters = 0;
	}
}

function onVideoFrame(now, metadata){
	video.requestVideoFrameCallback(onVideoFrame);
	currentMediaTime = metadata.mediaTime;
	inputMediaTime.valueAsNumber = currentMediaTime;
	// noinspection FallThroughInSwitchStatementJS
	// switch(seeking){
	// 	case -1:
	// 		if(resolveWithVideoFrameRate != null){
	// 			resolveWithVideoFrameRate(1/(currentMediaTime-metadata.mediaTime));
	// 		}
	// 		seeking = 0;
	// 	case 0:
	// 		currentMediaTime = metadata.mediaTime;
	// 		inputMediaTime.valueAsNumber = currentMediaTime;
	// 		break;
	// 	case 1:
	// 		if(currentMediaTime < metadata.mediaTime){
	// 			videoFrameAdvanced(now, metadata);
	// 		} else {
	// 			video.currentTime += skipDuration.valueAsNumber;
	// 			console.log(video.currentTime);
	// 			iters++;
	// 		}
	// 		break;
	// }
}

// function skipBackward(){
// 	seeking = -1;
// 	video.currentTime = currentMediaTime-0.0001;
// }
// function skipForward(){
// 	seeking = 1;
// 	//change video time to be super slightly above mediaTime (to reduce precision errors) and ensure it is different from the currentTime so the video is forced to seek
// 	if(video.currentTime === currentMediaTime+0.0001)
// 		video.currentTime = currentMediaTime+0.0002;
// 	else
// 		video.currentTime = currentMediaTime+0.0001;
// }
function calcFrameNumber(){
	if(!frameRate){
		inputFrameRate.focus();
		return 0;
	}
	const frameNumber = currentMediaTime*frameRate;
	console.log("RAW: " + String(frameNumber))
	console.log("RAW WITH ROUNDED: " + String(currentMediaTime*inputFrameRate.valueAsNumber))
	return frameNumber;
}
function setButtonsDisabled(disabled){
	inert = disabled;
	PLAY_BAR.inert = disabled;
	MEDIA_CONTROLS.inert = disabled;
	video.inert = disabled;
}

inputFrameRate.addEventListener("change", () => {
	frameRate = inputFrameRate.valueAsNumber;
});

calcFrameNumberButton.addEventListener("click", () => {
	outputFrameNumber.innerText = String(Math.round(calcFrameNumber()));
}, true);

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
	const seekToTime = Math.max(offsetX * (video.duration / progressBarDomRect.width), 0);
	if(seekVideo) {
		video.currentTime = seekToTime;
		frameSeek.onSeekedManually(seekToTime);
	} else {
		HOVERED_TIME_DISPLAY.style.transform = `translate(calc(${mouse.x}px - 50%), ${progressBarDomRect.top-20}px)`;
		HOVERED_TIME_DISPLAY.firstChild.textContent = secondsToTimestamp(seekToTime);
	}
}

function removeHoveredTimeDisplay(){
	HOVERED_TIME_DISPLAY.style.transform = "translate(-9999px, 0px)";
}



setup();