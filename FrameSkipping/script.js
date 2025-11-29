var PREFERRED_ITERS = 5;

const fileUpload = document.getElementById("upload");
const skipForwardButton = document.getElementById("skipForward");
const skipBackwardButton = document.getElementById("skipBackward");
const skipDuration = document.getElementById("skipDuration");
const currentTimeInput = document.getElementById("currentTimeInput");
const videoFramerateInput = document.getElementById("videoFrameRate");
const calcFramerateButton = document.getElementById("calcFramerate");
const calcFrameButton = document.getElementById("calcCurrentVideoFrame");
/** @type HTMLOutputElement */
const outputFrame = document.getElementById("outputFrame");
/** @type HTMLVideoElement */
const video = document.getElementById("video");
var seeking = 0;
var iters = 0;
var currentMediaTime = 0;
/** @type null | (framerate: number) => null */
let resolveWithVideoFrameRate = null;



function uploadFile(file){
	URL.revokeObjectURL(video.src);
	video.src = URL.createObjectURL(file);
	video.play();
}
fileUpload.addEventListener("change", () => {
	uploadFile(fileUpload.files[0]);
}, true);
document.addEventListener("dragover", (event) => {
	const dataTransfer = event.dataTransfer;
	if(dataTransfer.types.length === 1 && dataTransfer.types.includes("Files"))
		event.preventDefault();
});
document.addEventListener("drop", (event) => {
	const dataTransfer = event.dataTransfer;
	if(dataTransfer.types.length === 1 && dataTransfer.types.includes("Files")){
		event.preventDefault();
		uploadFile(dataTransfer.files[0]);
	}
});

function videoFrameAdvanced(now, metadata){
	console.log(`iters: ${iters}; currentTime: ${video.currentTime}; prevMediaTime: ${currentMediaTime}; mediaTime: ${metadata.mediaTime}`);
	skipDuration.valueAsNumber = (skipDuration.valueAsNumber*iters)/PREFERRED_ITERS;
	if(iters >= PREFERRED_ITERS){
		if(resolveWithVideoFrameRate != null){
			console.log((1/(metadata.mediaTime-currentMediaTime)))
			resolveWithVideoFrameRate(1/(metadata.mediaTime-currentMediaTime));
		}
		currentMediaTime = metadata.mediaTime+0.0001;
		currentTimeInput.valueAsNumber = metadata.mediaTime;
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
				console.log((1/(currentMediaTime-metadata.mediaTime)))
				resolveWithVideoFrameRate(1/(currentMediaTime-metadata.mediaTime));
			}
			seeking = 0;
		case 0:
			currentMediaTime = metadata.mediaTime+0.0001;
			currentTimeInput.valueAsNumber = currentMediaTime;
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
	video.currentTime = currentMediaTime-0.0002;
}
function skipForward(){
	seeking = 1;
	if(video.currentTime === currentMediaTime)
		video.currentTime = currentMediaTime+0.0001;
	else
		video.currentTime = currentMediaTime;
}

skipBackwardButton.addEventListener("click", () => {
	setButtonsDisabled(true);
	video.addEventListener("seeked", () => {
		setButtonsDisabled(false);
	}, {once: true});
	skipBackward();
}, true);
skipForwardButton.addEventListener("click", () => {
	if(video.ended) return;
	setButtonsDisabled(true);
	skipForward();
}, true);
calcFramerateButton.addEventListener("click", async () => {
	if(currentMediaTime <= 0.0001 || video.ended) return;
	setButtonsDisabled(true);
	const backwardFramerate = await new Promise(resolve => {
		resolveWithVideoFrameRate = resolve;
		skipBackward();
	});
	await new Promise(resolve => setTimeout(resolve, 0)); //allow normal processes to finish before starting next thingy
	const forwardFramerate = await new Promise(resolve => {
		resolveWithVideoFrameRate = resolve;
		skipForward();
	});
	videoFramerateInput.value = ((backwardFramerate+forwardFramerate)/2).toFixed(2);
}, true);
calcFrameButton.addEventListener("click", () => {
	const frameRate = videoFramerateInput.valueAsNumber;
	if(!frameRate)
		return;
	outputFrame.innerText = currentMediaTime*frameRate;
}, true);
currentTimeInput.addEventListener("change", () => {
	video.currentTime = currentTimeInput.valueAsNumber;
}, true);
function setButtonsDisabled(disabled){
	skipForwardButton.disabled = disabled;
	skipBackwardButton.disabled = disabled;
	calcFramerateButton.disabled = disabled;
}