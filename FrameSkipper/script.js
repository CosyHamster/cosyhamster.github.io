// import("../Javascript/mp4box.all.js").catch((error) => {
// 	console.warn(error);
// 	let howlerScript = document.createElement('script');
// 	howlerScript.src = "../Javascript/mp4box.all.js";
// 	document.head.appendChild(howlerScript);
// });
// /** @type {typeof import("mediabunny")} */
// var Mediabunny = null;
function importMediabunny(){
	return import("mediabunny").catch(e => {
		console.error("Mediabunny failed to import due to error", e);
		throw e;
	});
}

/** Splits inputted seconds into hours, minutes, & seconds. toString() returns the time in digital format.
 * @param {number} seconds */
function secondsToTimestamp(seconds) {
	let prefix = "";
	if(seconds < 0){
		prefix = "-";
		seconds = -seconds;
	}

	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const hourString = String(hours).padStart(2, "0");
	const minuteString = String(minutes - hours * 60).padStart(2, "0");
	const secondString = String(Math.floor(seconds % 60)).padStart(2, "0");

	if(hours === 0) return `${prefix}${minuteString}:${secondString}`;
	return `${prefix}${hourString}:${minuteString}:${secondString}`;
}

/** @type HTMLCanvasElement */
const screenshotCanvas = document.createElement("canvas");
const screenshotCanvasCtx = screenshotCanvas.getContext("2d");

const BUFFER_SIZE = 1024*1024*15;
const MOE = 0.015;//0.016900000000077853  //0.001900000000205182
const SEEK_APPROACH = 0; //0 - MOE, 1 - BACKWARD MOE, 2 - CLAMPED MOE (not yet added)
var inert = false;
/** @type HTMLDivElement */ const VIDEO_TITLE_DISPLAY = document.getElementById("videoTitle");
/** @type HTMLDivElement */ const LOADING_OVERLAY = document.getElementById("loadingFR");
/** @type HTMLProgressElement */ const LOADING_PERCENTAGE = document.getElementById("loadingPercentage");
/** @type HTMLInputElement */ const FILE_UPLOAD = document.getElementById("upload");
/** @type HTMLSpanElement */ const CURRENT_TIME_INPUT = document.getElementById("firstDurationLabel");
/** @type HTMLSpanElement */ const COLOR_CONTAINER = document.getElementById("inputColorContainer");
/** @type HTMLDivElement */ const MEDIA_TIME_INPUT = document.getElementById("mediaTimeInput");
/** @type HTMLSpanElement */ const FRAME_INPUT = document.getElementById("frameNumber");
/** @type RegExp */ const NUMBERS_ONLY_REGEX = /[^\d.]/g;
/** @type RegExp */ const TIME_ONLY_REGEX = /[^\d:.]/g;
/** @type HTMLVideoElement */ const video = document.getElementById("video");
/** @type string */ let videoSrc = null;
/** @type File */ let videoFile = null;
/** @type string */ let saveVideoNamePrefix = "";
/** @type number */ var currentMediaTime = 0;
/** @type number */ var currentFrameNumber = 0;
/** @type FrameSeek */ var frameSeek = null;

/** @type Window */ var storedWindow;
/** @type Window */ var curWin = window;
/** @type Document */ var curDoc = document;

/** @type HTMLDivElement */ const LOOP_BAR_TRACK = document.getElementById("loopBarTrack");
/** @type HTMLDivElement */ const LOOP_START_BAR = document.getElementById("drag1");
/** @type HTMLDivElement */ const LOOP_END_BAR = document.getElementById("drag2");

/** @type HTMLDivElement */ const FRAME_VIEW = document.getElementById("frameView");
/** @type HTMLDivElement */ const FRAME_ITEM_CONTAINER = document.getElementById("frameItemContainer");
/** @type HTMLDivElement */ const FRAME_ITEM_OFFSET = document.getElementById("frameItemOffset");
/**@type HTMLInputElement */ const KEYFRAME_ONLY_CHECKBOX = document.getElementById("keyframesOnlyCheckbox");

/** @type HTMLAnchorElement */ const DOWNLOAD_BUTTON = document.getElementById("downloadFrame");
/** @type HTMLDivElement */ const UI = document.getElementById("ui");
/** @type HTMLDivElement */ const PLAY_BUTTON = document.getElementById("playButton");
/** @type HTMLInputElement */ const PLAY_RATE_INPUT = document.getElementById("playRateInput");
/** @type HTMLInputElement */ const PLAY_RATE_SLIDER = document.getElementById("playRateSlider");
/** @type HTMLInputElement */ const VOLUME_SLIDER = document.getElementById("volumeSlider");
/** @type HTMLImageElement */ const VOLUME_ICON = document.getElementById("volumeIcon");
/** @type HTMLDivElement */ const PLAY_BAR = document.getElementsByClassName("playbar")[0];
/** @type HTMLDivElement */ const HOVERED_TIME_DISPLAY = document.getElementById('hoveredTimeDisplay');
/** @type HTMLDivElement */ const SKIP_FORWARD = document.getElementById("skipForward");
/** @type HTMLDivElement */ const SKIP_BACKWARD = document.getElementById("skipBackward");
/** @type HTMLDivElement */ const SEEK_BACKWARD = document.getElementById('seekBackward');
/** @type HTMLDivElement */ const SEEK_FORWARD = document.getElementById('seekForward');

/**@type HTMLDialogElement */ const EXPORT_MENU = document.getElementById("exportMenu");
/**@type HTMLSpanElement */ const COMMAND_CREATOR_PATH = document.getElementById("commandCreatorPath");
/**@type HTMLSpanElement */ const COMMAND_CREATOR_OUTPUT = document.getElementById("commandCreatorOutput");
/** @type HTMLInputElement */ const USE_MEMORY_BUFFER = document.getElementById("useMemoryBuffer");
/** @type HTMLInputElement */ const EXPORT_AUDIO_CHECKBOX = document.getElementById("exportAudio");
/** @type HTMLInputElement */ const START_AT_KEYFRAME = document.getElementById("startAtKeyframe");


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

function togglePause(){
	if(video.paused)
		video.play();
	else
		video.pause();
}

/** @param {number} seekDirection */
function seek(seekDirection){
	const frameNumber = Math.max(frameSeek.calcFrameNumber(currentMediaTime+(5 * seekDirection)), frameSeek.getFirstValidFrameNumber());
	const mediaTime = frameSeek.getMediaTimeAtFrame(frameNumber);
	updateCurrentTime(frameNumber, mediaTime);
	video.currentTime = currentMediaTime+MOE;
	frameSeek.onSeekedManually(currentMediaTime);
	frameSeek.scrollFrameView(frameNumber);
}

/** @param {number} seekDirection */
function smallSeek(seekDirection){
	const frameNumber = clamp(currentFrameNumber+(5 * seekDirection), frameSeek.getFirstValidFrameNumber(), frameSeek.getFrameCount()-1);
	const mediaTime = frameSeek.getMediaTimeAtFrame(frameNumber);
	updateCurrentTime(frameNumber, mediaTime);
	video.currentTime = currentMediaTime+MOE;
	frameSeek.onSeekedManually(currentMediaTime);
	frameSeek.scrollFrameView(frameNumber);
}

/** @param {File} file */
function uploadFile(file){
	setButtonsDisabled(true);
	video.pause();
	if(videoSrc){
		URL.revokeObjectURL(videoSrc);
	}
	if(frameSeek){
		frameSeek.destroy();
		frameSeek = null;
	}

	const separationIndex = file.name.lastIndexOf('.');
	VIDEO_TITLE_DISPLAY.textContent = separationIndex !== -1 ? file.name.substring(0, separationIndex) : file.name;
	COMMAND_CREATOR_PATH.textContent = file.name;
	COMMAND_CREATOR_OUTPUT.textContent = separationIndex !== -1 ? file.name.substring(0, separationIndex)+" TRIM"+file.name.substring(separationIndex) : file.name;
	saveVideoNamePrefix = VIDEO_TITLE_DISPLAY.textContent.substring(0, 28);

	videoFile = file;
	videoSrc = URL.createObjectURL(file);
	LOADING_OVERLAY.toggleAttribute("data-active", true);

	// console.log(function(){return frameSeek});
	console.time("loadFR");
	createFrameSeeker(file).then(newFrameSeeker => {
		frameSeek = newFrameSeeker;
		loadVideoPlayer();
	}).catch(e => {
		console.timeEnd("loadFR");
		setButtonsDisabled(true);
		inert = false;
		LOADING_OVERLAY.toggleAttribute("data-active", false);
	});
}

function loadVideoPlayer(){
	console.timeEnd("loadFR");
	document.getElementById("secondDurationLabel").textContent = secondsToTimestamp(frameSeek.getDuration());
	video.addEventListener("loadeddata", () => {
		video.volume = VOLUME_SLIDER.valueAsNumber;
		video.playbackRate = PLAY_RATE_INPUT.valueAsNumber;
		screenshotCanvas.width = video.videoWidth;
		screenshotCanvas.height = video.videoHeight;
		setButtonsDisabled(false);
		LOADING_OVERLAY.toggleAttribute("data-active", false);
	}, {passive: true, once: true});
	video.src = videoSrc;
}


const BUFFER_LENGTH = 8000;
class ExpandingTypedArray {
	/**@type {Float64ArrayConstructor | Uint32ArrayConstructor}*/
	TypedArrayClass;
	/**@type {Float64Array[] | Uint32Array[]}*/
	buffers;
	index = 0;
	bufferIndex = 0;

	/**@param TypedArrayClass {Float64ArrayConstructor | Uint32ArrayConstructor}*/
	constructor(TypedArrayClass) {
		this.TypedArrayClass = TypedArrayClass;
		this.buffers = [new TypedArrayClass(BUFFER_LENGTH)];
	}

	addValue(value) {
		if(this.bufferIndex === BUFFER_LENGTH){
			this.buffers.push(new this.TypedArrayClass(BUFFER_LENGTH));
			this.bufferIndex -= BUFFER_LENGTH;
			this.index++;
		}
		this.buffers[this.index][this.bufferIndex++] = value;
	}

	//must be called before iterating or converting to a TypedArray.
	//cannot add more values after calling finalize
	finalize(){
		this.buffers[this.index] = this.buffers[this.index].subarray(0, this.bufferIndex);
	}

	*[Symbol.iterator](){
		for(const buffer of this.buffers){
			for(const value of buffer){
				yield value;
			}
		}
	}

	toTypedArray(){
		const typedArray = new this.TypedArrayClass(this.index*BUFFER_LENGTH+this.bufferIndex);
		let index = 0;
		for(const value of this){
			typedArray[index++] = value;
		}
		return typedArray;
	}
}

class FrameSeek {
	/** @type AB */ ab;
	/** @type boolean */ abEnabled;
	/** @type FrameView */ frameView;
	/** @type boolean */ frameViewEnabled;
	/** @type Float64Array */ timestamps;
	/** @type Uint32Array */ keyframeIndexes;
	/** @type number? */ duration;

	/** @param {Float64Array} timestamps
	 * @param {Uint32Array} keyframeIndexes
	 * @param {FrameView} frameView
	 * @param {number?} duration */
	constructor(timestamps, keyframeIndexes, frameView, duration) {
		this.timestamps = timestamps;
		this.keyframeIndexes = keyframeIndexes;
		this.frameView = frameView;
		this.duration = duration;
		if(frameView){
			frameView.assignFrameSeek(this);
		}
	}

	enableAB(){
		const firstFrame = this.getFirstValidFrameNumber();
		frameSeek.ab ??= new AB(this.getMediaTimeAtFrame(firstFrame), this.timestamps[this.timestamps.length-1], firstFrame, this.timestamps.length-1);
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
		} else {
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

	enableFrameView(){
		this.frameView.enable();
		this.frameViewEnabled = true;
	}

	disableFrameView(){
		this.frameView.disable();
		this.frameViewEnabled = false;
	}

	toggleFrameView() {
		if(!this.frameView)
			return;

		if(this.frameViewEnabled){
			this.disableFrameView();
		} else {
			this.enableFrameView();
		}
	}

	destroyFrameView(){
		this.frameView.destroy();
		this.frameViewEnabled = false;
	}

	destroy() {
		this.destroyAB();
		this.destroyFrameView();
	}

	onSeekedManually(currentMediaTime, newFrame) {
		// if(currentMediaTime && newFrame){
		// 	PLAY_BAR.style.setProperty("--percentage", String(Math.min(currentMediaTime / frameSeek.getFinalFrameMediaTime(), 1) * 100) + '%');
		// 	CURRENT_TIME_INPUT.textContent = secondsToTimestamp(currentMediaTime);
		// 	// MEDIA_TIME_INPUT.textContent = String(round6(currentMediaTime)); //avoid excessive decimals from inserted mediaTime
		// 	// FRAME_INPUT.textContent = String(newFrame);
		// 	COLOR_CONTAINER.style.setProperty("--color", "#aaaaaa");
		// }
		timeUpdateUnofficial();
	}

	scrollFrameView(frameNumber){
		const frameView = this.frameView;
		if(frameView){
			frameView.scrollToFrameNumber(frameNumber);
		}
	}

	forward(){
		if(!video.paused){ video.pause(); return; }
		let nextMediaTime;
		switch(SEEK_APPROACH){
			case 0:
				if(currentFrameNumber+1 < this.timestamps.length){
					nextMediaTime = this.getMediaTimeAtFrame(currentFrameNumber+1);
					updateCurrentTime(currentFrameNumber+1, nextMediaTime);
					video.currentTime = nextMediaTime+MOE;
					this.onSeekedManually(nextMediaTime+MOE);
					this.scrollFrameView(currentFrameNumber);
				}
				break;
			// case 1:
			// 	const newMediaTime = this.timestamps?.[currentFrameNumber+1];
			// 	nextMediaTime = this.timestamps?.[currentFrameNumber+2];
			// 	if(nextMediaTime){
			// 		currentMediaTime = newMediaTime;
			// 		video.currentTime = nextMediaTime-MOE;
			// 		this.onSeekedManually(newMediaTime, currentFrameNumber+1);
			// 	}
			// 	break;
		}
	}

	backward(){
		if(!video.paused){ video.pause(); return; }
		let prevMediaTime;
		switch(SEEK_APPROACH){
			case 0:
				if(currentFrameNumber-1 >= 0){
					prevMediaTime = this.getMediaTimeAtFrame(currentFrameNumber-1);
					updateCurrentTime(currentFrameNumber-1, prevMediaTime);
					video.currentTime = prevMediaTime+MOE;
					this.onSeekedManually(prevMediaTime+MOE);
					this.scrollFrameView(currentFrameNumber);
				}
				break;
			// case 1:
			// 	const mediaTime = this.timestamps?.[currentFrameNumber];
			// 	prevMediaTime = this.timestamps?.[currentFrameNumber-1];
			// 	if(prevMediaTime){
			// 		currentMediaTime = prevMediaTime;
			// 		video.currentTime = mediaTime-MOE;
			// 		this.onSeekedManually(prevMediaTime, currentFrameNumber-1);
			// 	}
			// 	break;
		}
	}

	getSeekDataFromProgress(progress){
		const index = binarySearchLenient(this.timestamps, progress*this.getDuration());
		return [this.timestamps[index], index];
	}

	getMediaTimeAtFrame(frameNumber){
		return this.timestamps[frameNumber];
	}

	getFirstValidFrameNumber(){
		const frameNumber = this.calcFrameNumber(0);
		if(this.getMediaTimeAtFrame(frameNumber) < 0){
			return Math.min(frameNumber+1, this.getFrameCount()-1);
		} else {
			return frameNumber;
		}
	}

	getFirstValidMediaTime(){
		return this.getMediaTimeAtFrame(this.getFirstValidFrameNumber());
	}

	getFrameNumber(mediaTime){
		return binarySearch(this.timestamps, mediaTime);
	}

	calcFrameNumber(mediaTime){
		return binarySearchLenient(this.timestamps, mediaTime);
	}

	calcOwningKeyFrameNumber(frameNumber){
		return binarySearchLenientFloor(this.keyframeIndexes, frameNumber);
	}

	calcOwningFrameNumber(frameNumber){
		return this.keyFrameNumberToFrameNumber(this.calcOwningKeyFrameNumber(frameNumber));
	}

	getFrameCount(){
		return this.timestamps.length;
	}

	getValidFrameCount(){
		return this.timestamps.length - this.getFirstValidFrameNumber();
	}

	getInvalidFrameCount(){
		return this.timestamps.length - this.getValidFrameCount();
	}

	getKeyFrameCount(){
		return this.keyframeIndexes.length;
	}

	getDuration(){
		// return video.duration;
		// return frameSeek.getMediaTimeAtFrame(frameSeek.getFrameCount()-1)
		return this.duration ?? this.getFinalFrameMediaTime();
	}

	getFinalFrameMediaTime(){
		return frameSeek.getMediaTimeAtFrame(frameSeek.getFrameCount()-1)
	}

	frameNumberToKeyFrameNumber(frameNumber){
		return binarySearch(this.keyframeIndexes, frameNumber);
	}

	keyFrameNumberToFrameNumber(keyframeNumber){
		return this.keyframeIndexes[keyframeNumber];
	}

	videoIsEnded(mediaTime){
		return round4(mediaTime) >= round4(this.timestamps[this.timestamps.length-1]);
	}

	incrementAPosition(){
		const frameNumber = this.ab.loopBeginFrameNumber+1;
		if(frameNumber > this.ab.loopEndFrameNumber){
			return [null, null];
		}

		const mediaTime = this.getMediaTimeAtFrame(frameNumber);
		this.ab.loopBeginMediaTime = mediaTime;
		this.ab.loopBeginFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	decrementAPosition(){
		const frameNumber = this.ab.loopBeginFrameNumber-1;
		if(frameNumber < this.getFirstValidFrameNumber()){
			return [null, null];
		}

		const mediaTime = this.getMediaTimeAtFrame(frameNumber);
		this.ab.loopBeginMediaTime = mediaTime;
		this.ab.loopBeginFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	setAMediaTime(mediaTime){
		let frameNumber = Math.min(this.calcFrameNumber(mediaTime), this.ab.loopEndFrameNumber);
		mediaTime = this.timestamps[frameNumber];
		this.ab.loopBeginMediaTime = mediaTime;
		this.ab.loopBeginFrameNumber = frameNumber;
		updateLoopStartBarPosition(mediaTime);
		return [mediaTime, frameNumber];
	}

	incrementBPosition(){
		const frameNumber = this.ab.loopEndFrameNumber+1;
		if(frameNumber === this.timestamps.length){
			return [null, null];
		}

		const mediaTime = this.getMediaTimeAtFrame(frameNumber);
		this.ab.loopEndMediaTime = mediaTime;
		this.ab.loopEndFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	decrementBPosition(){
		const frameNumber = this.ab.loopEndFrameNumber-1;
		if(frameNumber < this.ab.loopBeginFrameNumber){
			return [null, null];
		}

		const mediaTime = this.getMediaTimeAtFrame(frameNumber);
		this.ab.loopEndMediaTime = mediaTime;
		this.ab.loopEndFrameNumber = frameNumber;
		return [mediaTime, frameNumber];
	}

	setBMediaTime(mediaTime){
		let frameNumber = Math.max(this.calcFrameNumber(mediaTime), this.ab.loopBeginFrameNumber);
		mediaTime = this.timestamps[frameNumber];
		this.ab.loopEndMediaTime = mediaTime;
		this.ab.loopEndFrameNumber = frameNumber;
		updateLoopEndBarPosition(mediaTime);
		return [mediaTime, frameNumber];
	}
}

class AB {
	loopBeginMediaTime;
	loopBeginFrameNumber = 0;
	loopEndMediaTime;
	loopEndFrameNumber = -1;

	constructor(beginMediaTime, endMediaTime, firstFrameNumber = 0, finalFrameNumber = -1) {
		this.loopBeginMediaTime = beginMediaTime;
		this.loopEndMediaTime = endMediaTime;
		this.loopBeginFrameNumber = firstFrameNumber;
		this.loopEndFrameNumber = finalFrameNumber;
	}
}

class FrameView {
	/** @type FrameSeek */ frameSeek = null;
	/** @type MediabunnyThumbnailService */ thumbnailService = null;
	/** @type HTMLDivElement */ activeFrameItem = null;
	/** @param {MediabunnyThumbnailService?} thumbnailService */
	constructor(thumbnailService) {
		this.updateFrameView = this.updateFrameView.bind(this);
		this.frameItemClick = this.frameItemClick.bind(this);
		if(thumbnailService){
			thumbnailService.assign(this, FRAME_ITEM_CONTAINER);
			this.thumbnailService = thumbnailService;
		}
	}

	/** @param {FrameSeek} frameSeek */
	assignFrameSeek(frameSeek){
		this.frameSeek = frameSeek;
	}

	destroy(){
		this.disable();
		if(this.thumbnailService)
			this.thumbnailService.destroy();
	}

	enable() {
		document.body.style.setProperty("--frameViewDisplay", "block");
		FRAME_VIEW.addEventListener("scroll", this.updateFrameView, {passive: true});
		window.addEventListener("resize", this.updateFrameView, {passive: true});
		this.initializeFrameView();
		this.updateFrameView();
	}

	initializeFrameView(){
		if(KEYFRAME_ONLY_CHECKBOX.checked){
			FRAME_VIEW.style.setProperty("--scrollWidth", `${this.frameSeek.getKeyFrameCount() * 100}px`);
		} else {
			FRAME_VIEW.style.setProperty("--scrollWidth", `${this.frameSeek.getFrameCount() * 100}px`);
		}

		this.scrollToFrameNumber(currentFrameNumber);
	}

	scrollToFrameNumber(frameNumber){
		if(KEYFRAME_ONLY_CHECKBOX.checked){
			const kFrameNumber = this.frameSeek.calcOwningKeyFrameNumber(frameNumber);
			FRAME_VIEW.scrollLeft = (kFrameNumber*100)-(window.innerWidth/2)+50;
			this.setActiveFrameNumber(this.frameSeek.keyFrameNumberToFrameNumber(kFrameNumber));
		} else {
			FRAME_VIEW.scrollLeft = (frameNumber*100)-(window.innerWidth/2)+50;
			this.setActiveFrameNumber(frameNumber);
		}
	}

	/** @param {number} frameNumber */
	setActiveFrameNumber(frameNumber){
		for (const frameItem of FRAME_ITEM_CONTAINER.children) {
			if(Number(frameItem.getAttribute("data-n")) === frameNumber){
				this.setActiveFrameItem(frameItem);
			}
		}
	}

	/** @param {HTMLDivElement} frameItem */
	setActiveFrameItem(frameItem){
		if(this.activeFrameItem){
			this.activeFrameItem.classList.remove("active");
		}

		frameItem.classList.add("active");
		this.activeFrameItem = frameItem;
	}

	disable() {
		document.body.style.setProperty("--frameViewDisplay", "none");
		window.removeEventListener("resize", this.updateFrameView, {passive: true});
		FRAME_VIEW.removeEventListener("scroll", this.updateFrameView, {passive: true});
		FRAME_ITEM_CONTAINER.replaceChildren();
	}

	onChangedKeyFrameMode(){
		FRAME_ITEM_CONTAINER.replaceChildren();
		this.initializeFrameView();
		this.updateFrameView();
	}

	createFrameItem(frameNumber, frameType = null){
		if(KEYFRAME_ONLY_CHECKBOX.checked){
			frameNumber = this.frameSeek.keyFrameNumberToFrameNumber(frameNumber);
			frameType = "key";
		}

		frameType ??= (binarySearch(this.frameSeek.keyframeIndexes, frameNumber) !== -1) ? "key" : "delta";
		const container = document.createElement("div");
		container.title = String(this.frameSeek.getMediaTimeAtFrame(frameNumber));
		container.className = "frameItem clickableButton";
		if(frameNumber === (KEYFRAME_ONLY_CHECKBOX.checked ? this.frameSeek.calcOwningFrameNumber(currentFrameNumber) : currentFrameNumber))
			this.setActiveFrameItem(container);
		if(this.frameSeek.getMediaTimeAtFrame(frameNumber) < 0)
			container.classList.add("negative");
		container.setAttribute("data-n", frameNumber);
		container.addEventListener("click", this.frameItemClick, {passive: true});

		/**@type HTMLImageElement*/
		const img = document.createElement("img");
		img.toggleAttribute("data-l", true);
		// img.src = "../Icons/image.svg";
		img.decoding = "async";
		img.loading = "eager";

		const div = document.createElement("div");
		div.append(frameType, document.createElement("br"), String(frameNumber));//innerText b/c it creates <br> automatically

		container.append(img, div);
		return container;
	}

	// createKeyFrameItem(keyFrameNumber){
	// 	return this.createFrameItem(this.frameSeek.keyFrameNumberToFrameNumber(keyFrameNumber), "key");
	// }

	frameItemClick(mouseEvent){
		// video.pause();
		const frameNumber = Number(mouseEvent.currentTarget.getAttribute("data-n"));
		const mediaTime = this.frameSeek.getMediaTimeAtFrame(frameNumber);
		updateCurrentTime(frameNumber, mediaTime);
		video.currentTime = mediaTime+MOE;
		this.frameSeek.onSeekedManually(mediaTime+MOE);
		frameSeek.scrollFrameView(frameNumber); //TODO: check if this is better
	}

	updateFrameView() {
		if(KEYFRAME_ONLY_CHECKBOX.checked){
			return this.updateKeyFrameView();
		}

		const firstFrameNumber = Math.floor(FRAME_VIEW.scrollLeft/100);
		const lastFrameNumber = Math.min(Math.ceil((FRAME_VIEW.scrollLeft+window.innerWidth)/100), this.frameSeek.getFrameCount()); //up to but not including
		const currentFrameItems = FRAME_ITEM_CONTAINER.children;
		const lengthFrameItems = lastFrameNumber - firstFrameNumber;
		if(currentFrameItems.length){
			const currentFrameNumber = Number(currentFrameItems[0].getAttribute("data-n"));
			const gap = currentFrameNumber - firstFrameNumber;
			if(gap === 0){
				if(lengthFrameItems === currentFrameItems.length)
					return;
				this.appendToSize(firstFrameNumber+currentFrameItems.length, lastFrameNumber);
				this.truncateToSize(currentFrameItems.length, lengthFrameItems);
			} else if(gap > 0){ //frameItems must be generated in the left
				this.appendLeftToSize(firstFrameNumber, currentFrameNumber);
				this.appendToSize(firstFrameNumber+currentFrameItems.length, lastFrameNumber);
				this.truncateToSize(currentFrameItems.length, lengthFrameItems);
			} else { //frameItems must be removed in the left
				this.evictLeftToSize(firstFrameNumber);
				this.appendToSize(firstFrameNumber+currentFrameItems.length, lastFrameNumber);
				this.truncateToSize(currentFrameItems.length, lengthFrameItems);
			}
		} else {
			this.appendToSize(firstFrameNumber+currentFrameItems.length, lastFrameNumber);
		}

		FRAME_ITEM_OFFSET.style.width = `${firstFrameNumber*100}px`;
		// FRAME_ITEM_CONTAINER.scrollWidth,FRAME_ITEM_CONTAINER.scrollLeft
	}

	updateKeyFrameView() {
		const firstFrameNumber = Math.floor(FRAME_VIEW.scrollLeft/100);
		const lastFrameNumber = Math.min(Math.ceil((FRAME_VIEW.scrollLeft+window.innerWidth)/100), this.frameSeek.getKeyFrameCount()); //up to but not including
		const currentFrameItems = FRAME_ITEM_CONTAINER.children;
		const lengthFrameItems = lastFrameNumber - firstFrameNumber;
		if(currentFrameItems.length){
			const currentFrameNumber = this.frameSeek.frameNumberToKeyFrameNumber(Number(currentFrameItems[0].getAttribute("data-n")));
			const gap = currentFrameNumber - firstFrameNumber;
			if(gap === 0){
				if(lengthFrameItems === currentFrameItems.length)
					return;
				this.appendToSize(firstFrameNumber+currentFrameItems.length, lastFrameNumber);
				this.truncateToSize(currentFrameItems.length, lengthFrameItems);
			} else if(gap > 0){ //frameItems must be generated in the left
				this.appendLeftToSize(firstFrameNumber, currentFrameNumber);
				this.appendToSize(firstFrameNumber+currentFrameItems.length, lastFrameNumber);
				this.truncateToSize(currentFrameItems.length, lengthFrameItems);
			} else { //frameItems must be removed in the left
				this.evictLeftToSize(this.frameSeek.keyFrameNumberToFrameNumber(firstFrameNumber)); //must be a frame number due to comparison with data-n
				this.appendToSize(firstFrameNumber+currentFrameItems.length, lastFrameNumber);
				this.truncateToSize(currentFrameItems.length, lengthFrameItems);
			}
		} else {
			this.appendToSize(firstFrameNumber+currentFrameItems.length, lastFrameNumber);
		}

		FRAME_ITEM_OFFSET.style.width = `${firstFrameNumber*100}px`;
		// FRAME_ITEM_CONTAINER.scrollWidth,FRAME_ITEM_CONTAINER.scrollLeft
	}

	evictLeftToSize(firstFrameNumber){
		let firstElementChild;
		while((firstElementChild = FRAME_ITEM_CONTAINER.firstElementChild) && Number(firstElementChild.getAttribute("data-n")) < firstFrameNumber){
			firstElementChild.remove();
		}
	}

	appendLeftToSize(firstFrameNumber, currentFrameNumber){
		let appendList = [];
		for(let i = firstFrameNumber; i < currentFrameNumber; i++){
			appendList.push(this.createFrameItem(i));
		}
		FRAME_ITEM_CONTAINER.prepend(...appendList);
	}

	appendToSize(start, end){
		const appendList = [];
		for(let i = start; i < end; i++){
			appendList.push(this.createFrameItem(i));
		}
		FRAME_ITEM_CONTAINER.append(...appendList);
	}

	truncateToSize(currentLength, lengthFrameItems){
		for(let i = lengthFrameItems; i < currentLength; i++){
			FRAME_ITEM_CONTAINER.lastChild.remove();
		}
	}
}

class MediabunnyThumbnailService {
	/**@type {import("mediabunny").Input}*/ videoInput;
	/**@type {import("mediabunny").InputVideoTrack}*/ videoTrack;
	/**@type {import("mediabunny").CanvasSink}*/ canvasSink;
	/**@type {AsyncGenerator}*/ canvasSinkIterator = null;
	/**@type {number}*/ currentFrameNumber;
	/**@type {FrameView}*/ frameView;
	/**@type HTMLCanvasElement[]*/ cache = [];
	/**@type number*/ maxCached = 0;
	destroyed = false;
	running = false;
	dirty = false;
	/**@type HTMLDivElement*/
	frameItemContainer;
	/**@type MutationObserver*/
	observer;

	/** @param {Mediabunny: typeof import("mediabunny")} Mediabunny
	 * @param {import("mediabunny").Input} videoInput
	 * @param {import("mediabunny").InputVideoTrack} videoTrack */
	constructor(Mediabunny, videoInput, videoTrack) {
		this.onMutationList = this.onMutationList.bind(this);
		this.updateMaxCache = this.updateMaxCache.bind(this);
		this.videoInput = videoInput;
		this.videoTrack = videoTrack;
		this.canvasSink = new Mediabunny.CanvasSink(videoTrack, {alpha: false, poolSize: 1}); //sorry my poor vram
		window.addEventListener("resize", this.updateMaxCache, {passive: true});
		this.updateMaxCache();
	}

	updateMaxCache(){
		this.maxCached = Math.ceil(window.innerWidth/100)+1;
		if(this.cache.length > this.maxCached)
			this.cache.length = this.maxCached;
	}

	/**@param {MutationRecord[]} mutations*/
	onMutationList(mutations){
		for(const mutation of mutations){
			for(const node of mutation.removedNodes){
				const canvas = node.firstElementChild;
				if(canvas instanceof HTMLCanvasElement && this.cache.length < this.maxCached){
					this.cache.push(canvas);
				}
				// URL.revokeObjectURL(node.querySelector("img")?.src);
			}
			if(mutation.addedNodes.length){
				this.markDirty();
			}
		}
	}

	assign(frameView, frameItemContainer){
		this.frameView = frameView;
		this.frameItemContainer = frameItemContainer;
		this.observer = new MutationObserver(this.onMutationList);
		this.observer.observe(frameItemContainer, {attributes: false, childList: true, subtree: false});
	}

	markDirty(){
		if(this.destroyed)
			return;

		this.dirty = true;
		if(!this.running){
			this.running = true;
			this.run();
		}
	}

	async run(){
		try{
			const frameSeek = this.frameView.frameSeek;
			while(this.dirty){
				this.dirty = false;
				let frameItem = this.frameItemContainer.firstElementChild;
				if(!frameItem) continue;
				do {
					const img = frameItem.firstElementChild;
					if(!img.hasAttribute("data-l")) {
						continue;
					}

					const frameNumber = Number(frameItem.getAttribute("data-n"));
					let wrappedCanvas;
					if(KEYFRAME_ONLY_CHECKBOX.checked){
						wrappedCanvas = await this.canvasSink.getCanvas(frameSeek.getMediaTimeAtFrame(frameNumber), {verifyKeyPackets: true});
					} else {
						if(!this.canvasSinkIterator || this.currentFrameNumber > frameNumber || this.currentFrameNumber < frameNumber-25){
							if(this.canvasSinkIterator) {
								await this.canvasSinkIterator.return(undefined);
								if(!frameItem.parentNode)
									break;
								if(this.destroyed){
									return;
								}
							}
							this.canvasSinkIterator = this.canvasSink.canvases(frameSeek.getMediaTimeAtFrame(frameNumber), Infinity, {verifyKeyPackets: true});
							this.currentFrameNumber = frameNumber;
						}
						while(this.currentFrameNumber !== frameNumber){
							await this.canvasSinkIterator.next();
							++this.currentFrameNumber;
							if(!frameItem.parentNode)
								break;
							if(this.destroyed){
								return;
							}
						}

						wrappedCanvas = (await this.canvasSinkIterator.next()).value;
						++this.currentFrameNumber;
					}

					if(!frameItem.parentNode)
						break;
					if(this.destroyed)
						return;
					/**@type OffscreenCanvas*/
					const frameCanvas = wrappedCanvas.canvas;
					let canvas = this.cache.pop();
					if(!canvas){
						canvas = document.createElement("canvas");
					}
					canvas.width = frameCanvas.width;
					canvas.height = frameCanvas.height;
					canvas.getContext("bitmaprenderer").transferFromImageBitmap(frameCanvas.transferToImageBitmap());
					img.replaceWith(canvas);
					// const finalFrameItem = frameItem;
					// img.removeAttribute("data-l");
					// wrappedCanvas.canvas.toBlob((blob) => {
					// 	if(finalFrameItem.parentNode){
					// 		img.src = URL.createObjectURL(blob);
					// 	}
					// }, "image/png", 1);
				} while((frameItem = frameItem.nextElementSibling));
			}
		} finally {
			this.running = false;
		}
	}

	destroy(){
		this.destroyed = true;
		this.videoInput.dispose();
		if(this.canvasSinkIterator)
			this.canvasSinkIterator.return(void 0);
		this.onMutationList(this.observer.takeRecords());
		this.observer.disconnect();
		window.removeEventListener("resize", this.updateMaxCache, {passive: true});
		this.cache = [];
		this.dirty = false;
	}
}

function range(start, end){
	if(start > end)
		return [];
	const arr = [];
	for(let i = start; i < end; i++){
		arr.push(i);
	}
	return arr;
}



/** @param {File} file
 * @returns {Promise<FrameSeek>}
 * */
function createFrameSeeker(file) {
	return getVideoFrameTimesMediabunny(file).then(value => {
		const {timestamps, keyframeIndexes, frameView, duration} = value;
		return new FrameSeek(timestamps, keyframeIndexes, frameView, duration);
	}).catch(e => {
		console.warn("Cannot use Mediabunny due to error", e);
		console.log("Reattempting with MP4Box");
		return getVideoFrameTimesMP4Box(file).then(value => {
			const {timestamps, keyframeIndexes, frameView, duration} = value;
			return new FrameSeek(timestamps, keyframeIndexes, frameView, duration);
		}).catch(e => {
			console.warn("Error while creating frame seeker using MP4Box", e);
			console.error("Failed to create frame seeker. Cancelling.");
			throw e;
		});
	});
}

/**@returns {{timestamps: Float64Array, keyframeIndexes: Uint32Array}} */
function parseExpandingTimestampBuffer(timestamps) {
	const expandingKeyframeIndexesBuffer = new ExpandingTypedArray(Uint32Array);
	timestamps = timestamps.toTypedArray().sort((a,b) => a-b);
	timestamps = Float64Array.from((function* (){
		let index = 0;
		let ignored = 0;
		for(const val of timestamps){
			if(val !== val){
				expandingKeyframeIndexesBuffer.addValue(index-(++ignored));
			} else {
				yield val;
			}
			index++;
		}
	})());
	expandingKeyframeIndexesBuffer.finalize();
	return {timestamps, keyframeIndexes: /** @type Uint32Array */expandingKeyframeIndexesBuffer.toTypedArray()};
}

/** @param {File} file
 * @returns {Promise<{timestamps: Float64Array, keyframeIndexes: Uint32Array, frameView: FrameView, duration: number}>}
 * */
function getVideoFrameTimesMediabunny(file) {
	return importMediabunny().then(async (Mediabunny) => {
		let elapsed = 0;
		const videoInput = new Mediabunny.Input({source: new Mediabunny.BlobSource(file), formats: Mediabunny.ALL_FORMATS});
		const videoTrack = await videoInput.getPrimaryVideoTrack();
		if (!videoTrack) {
			videoInput.dispose();
			throw new TypeError("No video track found");
		}

		const duration = await videoTrack.getDurationFromMetadata() ?? await videoTrack.computeDuration();
		const expandingTimestampBuffer = new ExpandingTypedArray(Float64Array);
		const sink = new Mediabunny.EncodedPacketSink(videoTrack);
		for await (const encodedPacket of sink.packets(undefined, undefined, {metadataOnly: true})) { //may determine incorrect key frames but using metadataOnly is worth it imo TODO: benchmark this
			if(!(elapsed++%10_000)) await new Promise(resolve => requestAnimationFrame(resolve));
			expandingTimestampBuffer.addValue(encodedPacket.timestamp);
			if(encodedPacket.type === "key") expandingTimestampBuffer.addValue(NaN);
			LOADING_PERCENTAGE.value = encodedPacket.timestamp / duration;
		}

		expandingTimestampBuffer.finalize();
		return {...parseExpandingTimestampBuffer(expandingTimestampBuffer), frameView: new FrameView(new MediabunnyThumbnailService(Mediabunny, videoInput, videoTrack)), duration};
	});
}

async function getVideoFrameTimesMP4Box(file) {
	const MP4Box = await import("mp4box");
	return new Promise((resolve, reject) => {
		let mp4Box = MP4Box.createFile(false);
		const expandingTimestampBuffer = new ExpandingTypedArray(Float64Array);
		let videoTrackId = null;
		let timescale = null;

		mp4Box.onError = function(e) {
			console.log("mp4box failed to parse data.");
			reject(e);
			mp4Box.stop()
			mp4Box = null;
			reader = null;
		};
		mp4Box.onMoovStart = function () {
			// console.log("Starting to receive File Information");
		};
		mp4Box.onReady = function(info) {
			console.log(info.mime);
			const videoTrack = info.videoTracks?.[0];
			if (!videoTrack) {
				reject(new Error("No video track found"));
				mp4Box = null;
				reader = null;
				return;
			}
			mp4Box.onSamples = (trackId, user, samples) => {
				for (const sample of samples) {
					const pts = (sample.cts ?? sample.dts) / timescale;
					expandingTimestampBuffer.addValue(pts);
					if(sample.is_sync) expandingTimestampBuffer.addValue(NaN);
				}
			};

			videoTrackId = videoTrack.id;
			timescale = videoTrack.timescale;
			mp4Box.setExtractionOptions(videoTrackId, null, {nbSamples: Infinity}); //1_000_000
			mp4Box.start();
		};

		let offset = 0;
		let reader = new FileReader();
		reader.addEventListener("error", mp4Box.onError, {passive: true});
		reader.addEventListener("load", (e) => {
			const buffer = reader.result;
			buffer.fileStart = offset;
			offset = mp4Box.appendBuffer(buffer);

			if (offset < file.size || !offset) {
				readNextChunk();
			} else {
				mp4Box.flush();
				expandingTimestampBuffer.finalize();
				resolve({...parseExpandingTimestampBuffer(expandingTimestampBuffer), frameView: new FrameView(), duration: null});
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

function timeUpdate() {
	// const currentTime = video.currentTime;
	PLAY_BAR.style.setProperty("--percentage", String(Math.min(currentMediaTime / frameSeek.getFinalFrameMediaTime(), 1) * 100) + '%');
	setEditableTextContent(CURRENT_TIME_INPUT, secondsToTimestamp(currentMediaTime));
}
function timeUpdateUnofficial() {
	PLAY_BAR.style.setProperty("--percentage", String(Math.min(currentMediaTime / frameSeek.getFinalFrameMediaTime(), 1) * 100) + '%');
	setEditableTextContent(CURRENT_TIME_INPUT, secondsToTimestamp(currentMediaTime));
	// MEDIA_TIME_INPUT.textContent = String(currentMediaTime); //String(round6(currentMediaTime));
	// FRAME_INPUT.textContent = String(frameSeek.calcFrameNumber(currentMediaTime));
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
	// if(activeElement instanceof HTMLInputElement || (activeElement instanceof HTMLElement && activeElement.isContentEditable))
	// 	return;
	if(activeElement instanceof HTMLElement && activeElement.isContentEditable)
		return;

	const keyLower = keyEvent.key.toLowerCase();
	/** @type number */ const compressed = (Number(keyEvent.shiftKey)/*1*/)+(Number(keyEvent.ctrlKey)<<1/*2*/)+(Number(keyEvent.altKey)<<2/*4*/)+(Number(keyEvent.metaKey)<<3/*8*/);
	if(compressed === 0){
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
	} else if(compressed === 1){
		switch(keyLower) {
			case "arrowleft":
				smallSeek(-1);
				keyEvent.preventDefault();
				break;
			case "arrowright":
				smallSeek(1);
				keyEvent.preventDefault();
				break;
		}
	} else if(compressed === 2){
		switch(keyLower) {
			case "s":
				keyEvent.preventDefault();
				DOWNLOAD_BUTTON.click();
				break;
		}
	}
});

/** @param {DOMHighResTimeStamp} now
 * @param {VideoFrameCallbackMetadata} metadata */
function onVideoFrame(now, metadata){
	video.requestVideoFrameCallback(onVideoFrame);
	updateCurrentMediaTime(metadata.mediaTime);
	COLOR_CONTAINER.style.setProperty("--color", "#ffffff");

	if(!video.paused){
		if(frameSeek.abEnabled){
			const ab = frameSeek.ab;
			if(round3(metadata.mediaTime) >= round3(ab.loopEndMediaTime)){
				updateCurrentTime(ab.loopBeginFrameNumber, ab.loopBeginMediaTime);
				video.currentTime = currentMediaTime+MOE;
				frameSeek.onSeekedManually(currentMediaTime+MOE);
			}
		}

		frameSeek.scrollFrameView(currentFrameNumber);
	}
}

function updateCurrentMediaTime(mediaTime) {
	updateCurrentFrameNumber(frameSeek.calcFrameNumber(mediaTime));
}

function updateCurrentFrameNumber(frameNumber) {
	updateCurrentTime(frameNumber, frameSeek.getMediaTimeAtFrame(frameNumber));
}

function updateCurrentTime(frameNumber, mediaTime) {
	setEditableTextContent(MEDIA_TIME_INPUT, String(currentMediaTime = frameSeek.getMediaTimeAtFrame(frameNumber)));
	setEditableTextContent(FRAME_INPUT, String(currentFrameNumber = frameNumber));
}

//TODO: ensure Math.ceil is fine
function round1(num) {
	return Math.ceil(num*10)/10;
}
function round2(num) {
	return Math.ceil(num*100)/100;
}
function round3(num) {
	return Math.ceil(num*1000)/1000;
}
function round4(num) {
	return Math.ceil(num*10000)/10000;
}
function round6(num) {
	return Math.ceil(num*1000000)/1000000;
}

function setButtonsDisabled(disabled){
	inert = disabled;
	const style = document.body.style;
	style.setProperty("--interactivity", disabled ? "inert" : "auto");
	style.setProperty("--interactivityPointerEvents", disabled ? "none" : "auto");
}

/** Registers a click event which calls the specified function. Call the returned function to add a keyboard event.
 *  @param {EventTarget} element
 *  @param {(event: Event) => void} func
 *  @returns () => void
 * */
function registerClickEvent(element, func) {
	element.addEventListener('click', func, {passive: true})
	return () => registerKeyDownEvent(element, func);
}
/** @param {HTMLElement} element
 *  @param {(event: Event) => void} func
 *  @param {string} keyName */
function registerKeyDownEvent(element, func, keyName = "Enter"){
	element.addEventListener('keydown', (keyEvent) => { if(keyEvent.key === keyName) func(keyEvent) }, {passive: true})
}
/** @param {EventTarget} element
 *  @param {(event: Event) => void} func */
function registerChangeEvent(element, func) {
	element.addEventListener('change', func, { passive: true })
}
/** @param {HTMLInputElement} elem
 *  @param {(event: Event) => void} func */
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
		updateCurrentFrameNumber(frameNumber);
		video.currentTime = mediaTime+MOE;
		frameSeek.onSeekedManually(mediaTime+MOE);
		frameSeek.scrollFrameView(frameNumber);
	} else {
		HOVERED_TIME_DISPLAY.children[0].textContent = String(secondsToTimestamp(mediaTime));
		HOVERED_TIME_DISPLAY.children[1].textContent = String(frameNumber);
		HOVERED_TIME_DISPLAY.style.transform = `translate(calc(${mouse.x}px - 50%), ${progressBarDomRect.top-40}px)`;
	}
}

function removeHoveredTimeDisplay(){
	HOVERED_TIME_DISPLAY.style.transform = "translate(-9999px, 0px)";
}

/** @param {InputEvent} event
 * @param {() => void} submitCallback
 * @param {(s: string) => boolean} isUnallowedTest
 */
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
	const frameNumber = Number(FRAME_INPUT.textContent);
	const mediaTime = frameSeek.getMediaTimeAtFrame(frameNumber);
	updateCurrentTime(frameNumber, mediaTime);
	video.currentTime = mediaTime+MOE;
	frameSeek.onSeekedManually(mediaTime+MOE);
	frameSeek.scrollFrameView(frameNumber);
}
const timeInputMultipliers = [1, 60, 60*60, 60*60*24];
function submitTimeInput(){
	video.pause();
	let newTime = 0;
	const timeSegments = CURRENT_TIME_INPUT.textContent.split(':').reverse();
	for(let i = 0; i < Math.min(timeSegments.length, timeInputMultipliers.length); i++){
		newTime += timeSegments[i]*timeInputMultipliers[i];
	}
	const frameNumber = frameSeek.calcFrameNumber(newTime);
	const mediaTime = frameSeek.getMediaTimeAtFrame(frameNumber);

	updateCurrentTime(frameNumber, mediaTime);
	video.currentTime = mediaTime+MOE;
	frameSeek.onSeekedManually(mediaTime+MOE);
	frameSeek.scrollFrameView(frameNumber);
}
function submitMediaTimeInput(){
	video.pause();
	const frameNumber = frameSeek.calcFrameNumber(Number(MEDIA_TIME_INPUT.textContent));
	const mediaTime = frameSeek.getMediaTimeAtFrame(frameNumber);
	updateCurrentTime(frameNumber, mediaTime);
	video.currentTime = currentMediaTime+MOE;
	frameSeek.onSeekedManually(currentMediaTime+MOE);
	frameSeek.scrollFrameView(frameNumber);
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



LOOP_START_BAR.addEventListener("pointerdown", (mouse) => {
	LOOP_START_BAR.setPointerCapture(mouse.pointerId);
}, {passive: false});
LOOP_START_BAR.addEventListener("pointermove", (mouse) => {
	if(LOOP_START_BAR.hasPointerCapture(mouse.pointerId)){
		const mouseX = mouse.clientX;
		const rect = LOOP_BAR_TRACK.getBoundingClientRect();
		const progress = clamp((mouseX - rect.left) * (1 / rect.width), 0, 1);
		// LOOP_START_BAR.style.setProperty("--progress", `${progress*100}%`);

		const [mediaTime, frameNumber] = frameSeek.setAMediaTime(frameSeek.getFinalFrameMediaTime() * progress);
		showTimeDisplayPointerEvent(mediaTime, frameNumber, mouse, rect);
		// showTimeDisplayPointerEvent1(mediaTime, frameNumber, LOOP_START_BAR);
	}
}, {passive: false});
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
		updateLoopStartBarPosition(mediaTime);
		showTimeDisplayPointerEvent1(mediaTime, frameNumber, LOOP_START_BAR);
	}
}, {passive: false});
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
})();
/** @param {number} mediaTime */
function updateLoopStartBarPosition(mediaTime){
	LOOP_START_BAR.style.setProperty("--progress", `${mediaTime/frameSeek.getFinalFrameMediaTime()*100}%`);
}



LOOP_END_BAR.addEventListener("pointerdown", (mouse) => {
	LOOP_END_BAR.setPointerCapture(mouse.pointerId);
}, {passive: false});
LOOP_END_BAR.addEventListener("pointermove", (mouse) => {
	if(LOOP_END_BAR.hasPointerCapture(mouse.pointerId)){
		const mouseX = mouse.clientX;
		const rect = LOOP_BAR_TRACK.getBoundingClientRect();
		const progress = clamp((mouseX - rect.left) * (1 / rect.width), 0, 1);
		// LOOP_END_BAR.style.setProperty("--progress", `${progress*100}%`);

		const [mediaTime, frameNumber] = frameSeek.setBMediaTime(frameSeek.getFinalFrameMediaTime() * progress);
		showTimeDisplayPointerEvent(mediaTime, frameNumber, mouse, rect);
		// showTimeDisplayPointerEvent1(mediaTime, frameNumber, LOOP_END_BAR);
	}
}, {passive: false});
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
		updateLoopEndBarPosition(mediaTime);
		showTimeDisplayPointerEvent1(mediaTime, frameNumber, LOOP_END_BAR);
	}
}, {passive: false});
LOOP_END_BAR.addEventListener("pointerenter", (mouse) => {
	showTimeDisplayPointerEvent1(frameSeek.ab.loopEndMediaTime, null, LOOP_END_BAR);
}, {passive: true});
LOOP_END_BAR.addEventListener("focus", (mouse) => {
	showTimeDisplayPointerEvent1(frameSeek.ab.loopEndMediaTime, null, LOOP_END_BAR);
}, {passive: true});
LOOP_END_BAR.addEventListener("pointerleave", removeHoveredTimeDisplay, {passive: true});
LOOP_END_BAR.addEventListener("blur", removeHoveredTimeDisplay, {passive: true});
registerClickEvent(document.getElementById("setBHere"), () => {
	const [mediaTime, frameNumber] = frameSeek.setBMediaTime(currentMediaTime);
})();
/** @param {number} mediaTime */
function updateLoopEndBarPosition(mediaTime){
	LOOP_END_BAR.style.setProperty("--progress", `${mediaTime/frameSeek.getFinalFrameMediaTime()*100}%`);
}

registerClickEvent(document.getElementById("exportTrim"), (event) => {
	const currentTarget = event.currentTarget;
	currentTarget.style.pointerEvents = "none";

	const file = videoFile;
	const buffered = !USE_MEMORY_BUFFER.checked;
	const useAudio = EXPORT_AUDIO_CHECKBOX.checked;
	const loopBeginMediaTime = (frameSeek.abEnabled) ? frameSeek.ab.loopBeginMediaTime : 0;
	const loopEndMediaTime = (frameSeek.abEnabled) ? frameSeek.ab.loopEndMediaTime : frameSeek.getMediaTimeAtFrame(frameSeek.getFrameCount()-1);
	const separationIndex = file.name.lastIndexOf('.');
	const suggestedName = separationIndex !== -1 ? file.name.substring(0, separationIndex)+" TRIM"+file.name.substring(separationIndex) : file.name;

	importMediabunny().then(async (Mediabunny) => {
		const input = new Mediabunny.Input({source: new Mediabunny.BlobSource(file), formats: Mediabunny.ALL_FORMATS});
		return Promise.all([input.getPrimaryVideoTrack(), useAudio ? input.getPrimaryAudioTrack() : null, input.getMetadataTags()]).then(([videoTrack, audioTrack, metadata]) => {
			return Promise.all([videoTrack.getCodec(), audioTrack?.getCodec?.()]).then(async ([videoCodec, audioCodec]) => {
				let streamTarget;
				if(buffered){
					/** @type FileSystemFileHandle */
					const fileHandle = await showSaveFilePicker({id: 75347884, startIn: "videos", suggestedName: suggestedName});
					const writable = await fileHandle.createWritable();
					streamTarget = new Mediabunny.StreamTarget(writable);
				} else {
					streamTarget = new Mediabunny.BufferTarget();
				}

				const output = new Mediabunny.Output({
					target: streamTarget,
					format: new Mediabunny.Mp4OutputFormat()
				});

				const videoPacketSource = new Mediabunny.EncodedVideoPacketSource(videoCodec);
				output.addVideoTrack(videoPacketSource);

				/** @type EncodedAudioPacketSource */
				let audioPacketSource = null;
				if(audioCodec){
					audioPacketSource = new Mediabunny.EncodedAudioPacketSource(audioCodec);
					output.addAudioTrack(audioPacketSource);
				}

				output.setMetadataTags(metadata);
				await output.start();

				const videoSink = new Mediabunny.EncodedPacketSink(videoTrack);
				const beginVideoPacket = (await videoSink.getKeyPacket(loopBeginMediaTime, {verifyKeyPackets: true, metadataOnly: false})) ?? (await videoSink.getFirstKeyPacket({verifyKeyPackets: true, metadataOnly: false}));
				const begin = START_AT_KEYFRAME.checked ? beginVideoPacket.timestamp : loopBeginMediaTime;
				const end = loopEndMediaTime;

				const videoMux = (async () => {
					const decoderConfig = await videoTrack.getDecoderConfig();
					for await (const encodedPacket of videoSink.packets(beginVideoPacket, undefined, {metadataOnly: false})) {
						//TODO: investigate video duration glitches if the last frame is on a keyframe.
						let sequenceNumber = 0;
						if(encodedPacket.timestamp > end)
							break;
						await videoPacketSource.add(encodedPacket.clone({timestamp: encodedPacket.timestamp-begin, sequenceNumber: sequenceNumber++}), {decoderConfig: decoderConfig});
					}
					videoPacketSource.close();
				})();
				let audioMux = null;
				if(audioCodec){
					audioMux = (async () => {
						const decoderConfig = await audioTrack.getDecoderConfig();
						const sink = new Mediabunny.EncodedPacketSink(audioTrack);

						const beginPacket = (await sink.getKeyPacket(begin, {verifyKeyPackets: true, metadataOnly: false})) ?? (await sink.getFirstKeyPacket({verifyKeyPackets: true, metadataOnly: false}));
						for await (const encodedPacket of sink.packets(beginPacket, undefined, { metadataOnly: false })) {
							let sequenceNumber = 0;
							if(encodedPacket.timestamp > end){
								break;
							}
							await audioPacketSource.add(encodedPacket.clone({timestamp: encodedPacket.timestamp-begin, sequenceNumber: sequenceNumber++}), {decoderConfig: decoderConfig});
						}
						audioPacketSource.close();
					})();
				}

				return Promise.all([videoMux, audioMux]).then(async () => {
					await output.finalize();
					if(!buffered){
						const blob = new Blob([output.target.buffer], { type: "video/mp4" });
						const url = URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.href = url;
						a.download = videoFile.name;
						a.click();
						URL.revokeObjectURL(url);
					}
				});
			});
		}).finally(() => {
			input.dispose();
		});
	}).finally(() => {
		currentTarget.style.pointerEvents = "";
	});
})();

function showTimeDisplayPointerEvent(mediaTime, frameNumber, mouse, rect) {
	// HOVERED_TIME_DISPLAY.children[0].textContent = String(secondsToTimestamp(mediaTime));
	// HOVERED_TIME_DISPLAY.children[1].textContent = String(frameNumber);
	// HOVERED_TIME_DISPLAY.style.transform = `translate(calc(${clamp(mouse.clientX, rect.left, rect.right)}px - 50%), ${rect.top - 40}px)`;
	HOVERED_TIME_DISPLAY.children[0].textContent = String(secondsToTimestamp(mediaTime));
	HOVERED_TIME_DISPLAY.children[1].textContent = String(frameNumber);
	HOVERED_TIME_DISPLAY.style.transform = `translate(calc(${rect.left+(rect.right-rect.left)*((frameNumber-frameSeek.getInvalidFrameCount())/(frameSeek.getValidFrameCount()-1))}px - 50%), ${rect.top - 40}px)`;
}

function showTimeDisplayPointerEvent1(mediaTime, frameNumber, element) {
	frameNumber ??= frameSeek.calcFrameNumber(mediaTime);
	const rect = element.getBoundingClientRect();
	HOVERED_TIME_DISPLAY.children[0].textContent = String(secondsToTimestamp(mediaTime));
	HOVERED_TIME_DISPLAY.children[1].textContent = String(frameNumber);
	HOVERED_TIME_DISPLAY.style.transform = `translate(calc(${rect.left+4}px - 50%), ${rect.top - 40}px)`;
}

function clamp(val, min, max) {
	return Math.min(Math.max(val, min), max);
}

/** Runs a standard binary search algorithm on arr, returning the index of val or -1
 * @param arr {ArrayLike<number>}
 * @param val {number} */
function binarySearch(arr, val) {
	let start = 0;
	let end = arr.length - 1;

	while (start <= end) {
		let mid = Math.floor((start + end) / 2);

		if (arr[mid] === val) {
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
/** Runs a binary search algorithm on arr, returning the closest index to val
 * @param arr {ArrayLike<number>}
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
	// return (arr[lo] - val) < (val - arr[hi]) ? lo : hi;

	let chosenIndex = (arr[lo] - val) < (val - arr[hi]) ? lo : hi;
	//get the right-most item of identical neighboring items
	if(arr[chosenIndex] !== undefined){
		while(chosenIndex < arr.length-1 && arr[chosenIndex+1] === arr[chosenIndex]){
			++chosenIndex;
		}
	}
	return chosenIndex;
}

/** Runs a binary search algorithm on arr, returning the index of a value equal to or less than val
 * @param arr {ArrayLike<number>}
 * @param val {number} */
function binarySearchLenientFloor(arr, val) {
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

	return (arr[lo] < val) ? lo : hi;
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

(function setup(){
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
	FILE_UPLOAD.addEventListener("change", () => {
		if(!inert)
			uploadFile(FILE_UPLOAD.files[0]);
		FILE_UPLOAD.value = null;
	}, true);
	registerKeyDownEvent(FILE_UPLOAD.labels[0], () => FILE_UPLOAD.click());

	video.addEventListener("play", () => {
		PLAY_BUTTON.classList.add("playing");
	}, {passive: true});
	video.addEventListener("pause", () => {
		PLAY_BUTTON.classList.remove("playing");
	}, {passive: true});
	video.addEventListener("loadstart", () => {
		PLAY_BUTTON.classList.remove("playing");
	}, {passive: true});
	video.addEventListener("timeupdate", timeUpdate, {passive: true});
// video.addEventListener("seeking", timeUpdate, {passive: true});
	video.addEventListener("click", () => {if(videoSrc)toggleUI();}, {passive: true});
	video.addEventListener("dblclick", toggleFullscreen, {passive: true});
	video.addEventListener("ended", () => {
		if(frameSeek.abEnabled) {
			updateCurrentTime(frameSeek.ab.loopBeginFrameNumber, frameSeek.ab.loopBeginMediaTime);
			video.currentTime = currentMediaTime+MOE;
			frameSeek.onSeekedManually(currentMediaTime+MOE);
			video.play();
		}
	}, {passive: true});
	video.requestVideoFrameCallback(onVideoFrame);

	registerClickEvent(document.getElementById("fullscreenButton"), toggleFullscreen)();
	registerClickEvent(PLAY_BUTTON.parentElement, togglePause)();
	registerClickEvent(SEEK_BACKWARD, () => seek(-1))();
	registerClickEvent(SEEK_FORWARD, () => seek(1))();
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
	registerInputEvent(PLAY_RATE_SLIDER, () => {
		const value = PLAY_RATE_SLIDER.valueAsNumber;
		const cleanValue = clamp(value, 0.0625, 4);
		if(cleanValue !== value)
			PLAY_RATE_SLIDER.valueAsNumber = cleanValue;

		PLAY_RATE_INPUT.valueAsNumber = cleanValue;
		video.playbackRate = cleanValue;
	});
	registerChangeEvent(PLAY_RATE_INPUT, () => {
		const value = PLAY_RATE_INPUT.valueAsNumber;
		const cleanValue = clamp(value, 0.0625, 4);
		if(cleanValue !== value)
			PLAY_RATE_INPUT.valueAsNumber = cleanValue;

		PLAY_RATE_SLIDER.valueAsNumber = cleanValue;
		video.playbackRate = cleanValue;
	});
	registerClickEvent(DOWNLOAD_BUTTON, (event) => {
		screenshotCanvasCtx.drawImage(video, 0, 0);
		DOWNLOAD_BUTTON.href = screenshotCanvas.toDataURL("image/png");
		DOWNLOAD_BUTTON.download = `${saveVideoNamePrefix}_videoframe_${frameSeek.calcFrameNumber(currentMediaTime)}.png`;
	})();
	registerClickEvent(document.getElementById("toggleLoopBar"), () => {
		if(!frameSeek || inert) return;
		frameSeek.toggleAB();
	})();
	registerClickEvent(document.getElementById("frameViewToggle"), () => {
		if(!frameSeek || inert) return;
		frameSeek.toggleFrameView();
	})();
	registerChangeEvent(KEYFRAME_ONLY_CHECKBOX, () => frameSeek.frameView.onChangedKeyFrameMode());


	registerClickEvent(document.getElementById("exitCommandCreator"), () => {
		EXPORT_MENU.close();
	})();
	registerClickEvent(document.getElementById("videoExport"), () => {
		if(videoFile && frameSeek){
			document.getElementById("commandCreatorStart").style.display = "none"
			document.getElementById("commandCreatorEnd").style.display = "none";
			if(frameSeek.abEnabled){
				if(frameSeek.ab.loopBeginFrameNumber !== 0){
					document.getElementById("commandCreatorStart").textContent = `-ss ${START_AT_KEYFRAME.checked ? frameSeek.getMediaTimeAtFrame(frameSeek.calcOwningFrameNumber(frameSeek.ab.loopBeginFrameNumber)) : frameSeek.getMediaTimeAtFrame(frameSeek.ab.loopBeginFrameNumber)} `;
					document.getElementById("commandCreatorStart").style.display = "";
				}
				if(frameSeek.ab.loopEndFrameNumber !== frameSeek.getFrameCount()-1){
					document.getElementById("commandCreatorEnd").textContent = `-to ${frameSeek.ab.loopEndMediaTime} `;
					document.getElementById("commandCreatorEnd").style.display = "";
				}
			}
			EXPORT_MENU.showModal();
		}
	})();
	registerChangeEvent(START_AT_KEYFRAME, () => {
		if(frameSeek.abEnabled){
			if(frameSeek.ab.loopBeginFrameNumber !== 0){
				document.getElementById("commandCreatorStart").textContent = `-ss ${START_AT_KEYFRAME.checked ? frameSeek.getMediaTimeAtFrame(frameSeek.calcOwningFrameNumber(frameSeek.ab.loopBeginFrameNumber)) : frameSeek.getMediaTimeAtFrame(frameSeek.ab.loopBeginFrameNumber)} `;
				document.getElementById("commandCreatorStart").style.display = "";
			}
		}
	})
	registerInputEvent(COMMAND_CREATOR_PATH, () => {
		const path = COMMAND_CREATOR_PATH.textContent;
		const splitIndex = path.lastIndexOf('.');
		COMMAND_CREATOR_OUTPUT.textContent = splitIndex !== -1 ? path.substring(0, splitIndex)+" TRIM"+path.substring(splitIndex) : path;
	})
	registerClickEvent(document.getElementById("commandCreatorCopy"), () => {
		navigator.clipboard.writeText(EXPORT_MENU.querySelector("code").innerText.trim());
	})();

	registerChangeEvent(EXPORT_AUDIO_CHECKBOX, (event) => {
		if(event.currentTarget.checked){
			document.getElementById("commandCreatorOptions").textContent = "-c copy";
		} else {
			document.getElementById("commandCreatorOptions").textContent = "-an -c copy";
		}
	});

	if ("launchQueue" in window) {
		window.launchQueue.setConsumer(async (launchParams) => {
			for (const fsFile of launchParams.files) {
				if(fsFile.kind === "file"){
					uploadFile(await fsFile.getFile());
					break;
				}
			}
		});
	}

	// if("documentPictureInPicture" in curWin) {
	// 	registerClickEvent(TOGGLE_PIP_BUTTON, togglePictureInPicture);
	// 	[].push({ text: "Toggle PIP (WIP)", action: () => TOGGLE_PIP_BUTTON.dispatchEvent(new MouseEvent('click')) });
	// }
})();