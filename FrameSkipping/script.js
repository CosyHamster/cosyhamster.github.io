var PREFERRED_ITERS = 5;

const fileUpload = document.getElementById("upload");
const skipForward = document.getElementById("skipForward");
const skipBackward = document.getElementById("skipBackward");
const skipDuration = document.getElementById("skipDuration");
const currentTimeInput = document.getElementById("currentTimeInput");
const videoFrameRateInput = document.getElementById("videoFrameRate");
const calcFrameButton = document.getElementById("calcCurrentVideoFrame");
const outputFrame = document.getElementById("outputFrame");
const video = document.getElementById("video");
var seeking = 0;
var iters = 0;
var currentMediaTime = 0;



function uploadFile(file){
	URL.revokeObjectURL(video.src);
	video.src = URL.createObjectURL(file);
	video.play();
}
fileUpload.addEventListener("change", () => {
	uploadFile(fileUpload.files[0]);
});
document.addEventListener("dragover", (event) => {
	const dataTransfer = event.dataTransfer;
	if(dataTransfer.types.length == 1 && dataTransfer.types.includes("Files"))
		event.preventDefault();
});
document.addEventListener("drop", (event) => {
	const dataTransfer = event.dataTransfer;
	if(dataTransfer.types.length == 1 && dataTransfer.types.includes("Files")){
		event.preventDefault();
		uploadFile(dataTransfer.files[0]);
	}
});



function videoFrameAdvanced(now, metadata){
	console.log(`iters: ${iters}; currentTime: ${video.currentTime}; prevMediaTime: ${currentMediaTime}; mediaTime: ${metadata.mediaTime}`);
	skipDuration.valueAsNumber = (skipDuration.valueAsNumber*iters)/PREFERRED_ITERS;
	if(iters >= PREFERRED_ITERS){
		if(!videoFrameRateInput.value)
			videoFrameRateInput.value = (1/(metadata.mediaTime-currentMediaTime)).toFixed(2);
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
	switch(seeking){
		case -1:
			if(!videoFrameRateInput.value)
				videoFrameRateInput.value = (1/(currentMediaTime-metadata.mediaTime)).toFixed(2);
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



skipBackward.addEventListener("click", () => {
	setButtonsDisabled(true);
	video.addEventListener("seeked", () => {
		setButtonsDisabled(false);
	}, {once: true});
	seeking = -1;
	video.currentTime = currentMediaTime-0.0002;
});
skipForward.addEventListener("click", () => {
	setButtonsDisabled(true);
	seeking = 1;
	if(video.currentTime == currentMediaTime)
		video.currentTime = currentMediaTime+0.0001;
	else
		video.currentTime = currentMediaTime;
});
calcFrameButton.addEventListener("click", () => {
	const frameRate = videoFrameRateInput.valueAsNumber;
	if(!frameRate)
		return;
	outputFrame.innerText = currentMediaTime*frameRate;
})
currentTimeInput.addEventListener("change", () => {
	video.currentTime = currentTimeInput.valueAsNumber;
});

function setButtonsDisabled(disabled){
	skipForward.disabled = disabled;
	skipBackward.disabled = disabled;
}