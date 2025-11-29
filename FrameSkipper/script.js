var PREFERRED_ITERS = 5;

const fileUpload = document.getElementById("upload");
const skipForwardButton = document.getElementById("skipForward");
const skipBackwardButton = document.getElementById("skipBackward");
const skipDuration = document.getElementById("skipDuration");
/** @type HTMLInputElement */
const inputMediaTime = document.getElementById("mediaTimeInput");
/** @type HTMLInputElement */
const inputFrameRate = document.getElementById("videoFrameRate");
const calcFramerateButton = document.getElementById("calcFramerate");
const calcFrameNumberButton = document.getElementById("calcFrameNumber");
/** @type HTMLOutputElement */
const outputFrame = document.getElementById("outputFrame");
/** @type HTMLVideoElement */
const video = document.getElementById("video");
var seeking = 0;
var iters = 0;
var currentMediaTime = 0;
var frameRate = NaN;
/** @type null | (framerate: number) => null */
let resolveWithVideoFrameRate = null;

setButtonsDisabled(true);

function uploadFile(file){
	if(video.src)
		URL.revokeObjectURL(video.src);
	else
		setButtonsDisabled(false);
	video.src = URL.createObjectURL(file);
	video.play();
}
fileUpload.addEventListener("change", () => {
	uploadFile(fileUpload.files[0]);
}, true);
document.addEventListener("dragover", (event) => {
	const dataTransfer = event.dataTransfer;
	if(dataTransfer.types.includes("Files"))
		event.preventDefault();
});
document.addEventListener("drop", (event) => {
	const dataTransfer = event.dataTransfer;
	if(dataTransfer.types.includes("Files")){
		event.preventDefault();
		uploadFile(dataTransfer.files[0]);
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
	// noinspection FallThroughInSwitchStatementJS
	switch(seeking){
		case -1:
			if(resolveWithVideoFrameRate != null){
				resolveWithVideoFrameRate(1/(currentMediaTime-metadata.mediaTime));
			}
			seeking = 0;
		case 0:
			currentMediaTime = metadata.mediaTime;
			inputMediaTime.valueAsNumber = currentMediaTime;
			break;
		case 1:
			if(currentMediaTime < metadata.mediaTime){
				videoFrameAdvanced(now, metadata);
			} else {
				video.currentTime += skipDuration.valueAsNumber;
				console.log(video.currentTime);
				iters++;
			}
			break;
	}
}
video.requestVideoFrameCallback(onVideoFrame);

function skipBackward(){
	seeking = -1;
	video.currentTime = currentMediaTime-0.0001;
}
function skipForward(){
	seeking = 1;
	//change video time to be super slightly above mediaTime (to reduce precision errors) and ensure it is different from the currentTime so the video is forced to seek
	if(video.currentTime === currentMediaTime+0.0001)
		video.currentTime = currentMediaTime+0.0002;
	else
		video.currentTime = currentMediaTime+0.0001;
}
function calcFrameNumberAndDisplay(){
	if(!frameRate){
		inputFrameRate.focus();
		return;
	}
	const frameNumber = currentMediaTime*frameRate;
	console.log("RAW: " + String(frameNumber))
	outputFrame.innerText = String(Math.round(frameNumber));
}
function setButtonsDisabled(disabled){
	skipForwardButton.disabled = disabled;
	skipBackwardButton.disabled = disabled;
	calcFramerateButton.disabled = disabled;
	video.inert = disabled;
}


skipBackwardButton.addEventListener("click", () => {
	setButtonsDisabled(true);
	video.pause();
	video.addEventListener("seeked", () => {
		setButtonsDisabled(false);
	}, {once: true});
	skipBackward();
}, true);

skipForwardButton.addEventListener("click", () => {
	if(video.ended) return;
	video.pause();
	setButtonsDisabled(true);
	skipForward();
}, true);

calcFramerateButton.addEventListener("click", async () => {
	if(currentMediaTime <= 0.0001 || video.ended) return;
	setButtonsDisabled(true);
	video.pause();
	const backwardFramerate = await new Promise(resolve => {
		resolveWithVideoFrameRate = resolve;
		skipBackward();
	});
	console.log("Frame rate backward: " + String(backwardFramerate));
	await new Promise(resolve => setTimeout(resolve, 0)); //allow normal processes to finish before starting next thingy
	const forwardFramerate = await new Promise(resolve => {
		resolveWithVideoFrameRate = resolve;
		skipForward();
	});
	console.log("Frame rate forward: " + String(forwardFramerate));

	// frameRate = ((backwardFramerate+forwardFramerate)/2);
	frameRate = (backwardFramerate+forwardFramerate)/2;
	console.log("Framerate raw: " + String(frameRate));
	frameRate = Math.round(frameRate*100)/100;
	console.log("Framerate fixed: " + String(frameRate));
	inputFrameRate.value = frameRate;//.toFixed(2);
}, true);

inputFrameRate.addEventListener("change", () => {
	frameRate = inputFrameRate.valueAsNumber;
})

calcFrameNumberButton.addEventListener("click", () => {
	calcFrameNumberAndDisplay();
}, true);

inputMediaTime.addEventListener("change", () => {
	video.currentTime = inputMediaTime.valueAsNumber;
}, true);