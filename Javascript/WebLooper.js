class OnEventUpdated{
    constructor(){
        this.registeredCallbacks = []
    }

    register(func){
        this.registeredCallbacks.push(func)
    }
    unregister(func){
        this.registeredCallbacks.splice(this.registeredCallbacks.indexOf(func), 1)
    }
    clearAll(){
        this.registeredCallbacks = []
    }
    callAllRegisteredFunctions(data){
        for(var i = 0; i < this.registeredCallbacks.length; i++) this.registeredCallbacks[i](data)
    }
}

class OnKeyDownEvent extends OnEventUpdated{
    constructor(){
        super()
        onkeydown = key => this.callAllRegisteredFunctions(key)
    }
}

class OnRequestAnimationFrameEvent extends OnEventUpdated{
    raf = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame).bind(window)
    constructor(){
        super()
        this.raf( timestamp => this.handleRAFCall(timestamp))
    }
    handleRAFCall(timestamp){
        this.callAllRegisteredFunctions(timestamp)
        this.raf( timestamp => this.handleRAFCall(timestamp))
    }
}

/**
 * Splits inputted seconds into hours, minutes, & seconds. toString() prints the time in digital format.
*/
class Time{
  seconds = 0
  minutes = 0
  hours = 0
  constructor(seconds){
    this.seconds = this.numberToDigitalClockString(Math.floor(seconds%60))
    this.minutes = Math.floor(seconds/60)
    while(this.minutes >= 60){
      this.minutes -= 60
      this.hours += 1
    }
    this.minutes = this.numberToDigitalClockString(this.minutes)
    this.hours = this.numberToDigitalClockString(this.hours)
  }

  toString(){
    if(this.hours === '00') return `${this.minutes}:${this.seconds}`
    return `${this.hours}:${this.minutes}:${this.seconds}`
  }

  numberToDigitalClockString(number){
    if(number <= 9) return `0${number}`
    return `${number}`
  }
}

//August 27, 2023, 12:33AM
const PLAYLIST_VIEWER_TABLE = document.getElementById("theTable"),
FADE_CONTROLLER_DIALOG = document.getElementById('FadeControlDialog'),
FADE_CONTROLLER_TABLE = document.getElementById('fadeControllingTable'),
ON_KEY_DOWN = new OnKeyDownEvent(),
REQUEST_ANIMATION_FRAME_EVENT = new OnRequestAnimationFrameEvent(),
ProgressBarSeekActions = { SEEK: "seekTo", DISPLAY: "displayTime", STOP_DISPLAYING: "stopDisplaying" }
let sounds = [],
statusObjects = [],
progressBarObjects = [],
openDialogs = [],
processQueue = [],
fadeControllerQuantity = 0

const start = (() => {
  createNewPlayer(0)
  registerClickEvent('seekBackward', () => seek('seekBackward') )
  registerClickEvent('seekForward', () => seek('seekForward') )
  registerClickEvent('playButton', () => {playAllSounds('playButton'); togglePlayButtonText('playButton');} )
  registerClickEvent('FadingControlOpenDialog', () => toggleDialog( document.getElementById('FadeControlDialog') ))
  registerClickEvent('fadeAllButton', () => { for(var i = 0; i < fadeControllerQuantity; i++) fadeAudio(i); } )
  registerClickEvent('PlaylistModeCloseDialog', () => closeNewestDialog() )
  importFileDetectID(document.getElementById('batchUpload'));

  ON_KEY_DOWN.register(handleKeyDown)
  REQUEST_ANIMATION_FRAME_EVENT.register(keepTrackofTimes)
})()

function registerClickEvent(element, func){
  if(typeof element === 'string') element = document.getElementById(element)
  element.addEventListener('click', func, {passive: true})
}
function handleKeyDown(key){
  let pressedKey = key.key
  switch(pressedKey){
    case " ":
      playAllSounds('playButton'); togglePlayButtonText('playButton')
      break
    case "Escape":
      closeNewestDialog()
      break
  }
}

function toggleDialog(dialog){
  if(dialog.open) return closeNewestDialog()
  dialog.show()
  openDialogs.unshift(dialog)
}
function closeNewestDialog(){
  if(openDialogs[0]) openDialogs[0].close()
}

function progressBarSeek(mouse, progressBar, hoverType){
    if(mouse?.pointerType == "touch" && hoverType != ProgressBarSeekActions.SEEK) return

    const index = parseInt(progressBar.id),
    hoveredTimeDialog = document.getElementById(`${index}hoveredTimeDisplay`);

    if(sounds[index] == null || sounds[index].state() != 'loaded' || hoverType === ProgressBarSeekActions.STOP_DISPLAYING) return hoveredTimeDialog.setAttribute('inUse', 0)
    
    const offsetX = mouse.offsetX,
    progressBarWidth = progressBar.clientWidth,
    currentSongLength = sounds[index].duration(),
    seekToTime = toNum( offsetX*(currentSongLength/progressBarWidth) )
    if(seekToTime < 0) return

    switch(hoverType){
        case(ProgressBarSeekActions.SEEK): return sounds[index].seek(seekToTime)
        case(ProgressBarSeekActions.DISPLAY):
            hoveredTimeDialog.setAttribute('inUse', 1)
            hoveredTimeDialog.style.left = `${(mouse.x-hoveredTimeDialog.getBoundingClientRect().width/2)+1}px`
            hoveredTimeDialog.children[0].innerHTML = new Time(seekToTime).toString()
            break
    }
}

function createNewPlayer(index){
    const row = PLAYLIST_VIEWER_TABLE.insertRow(PLAYLIST_VIEWER_TABLE.rows.length-1), // Create <tr> element & add to end of table
    cell0 = row.insertCell(0); //Add new <td> at beginning of <tr>
    cell0.style.width = "100vw"

    const fileInput = document.createElement('input');
    setAttributes(fileInput, {
        id: `${index}input`,
        type: 'file',
        style: 'width:90px; color:transparent;'
    });
    const fileInputLabel = document.createElement('text')
    fileInputLabel.setAttribute('id', `${index}inputLabel`)
    fileInputLabel.className = "songName"

    const timeDisplay = document.createElement('div');
    setAttributes(timeDisplay, {
        style: "background-color: lightgrey; width: min-content; margin-top: 20px; left: -9999px; position: absolute;",
        id: `${index}hoveredTimeDisplay`,
        inUse: 0
    });
    const timeDisplayText = document.createElement('text');
    timeDisplayText.setAttribute('style', 'margin-left:1ch; margin-right:1ch; color: black;');
    timeDisplayText.setAttribute('class', "prevent-select");
    timeDisplay.appendChild(timeDisplayText);
    
    const progress = document.createElement('progress'),
    display = ProgressBarSeekActions.DISPLAY;
    addListeners(progress, [
        {name: 'pointerenter', func: (mouse) => progressBarSeek(mouse, progress, display), options: {passive: true}},
        {name: 'pointermove', func: (mouse) => progressBarSeek(mouse, progress, display), options: {passive: true}},
        {name: 'pointerdown', func: (mouse) => progressBarSeek(mouse, progress, ProgressBarSeekActions.SEEK), options: {passive: true}},
        {name: 'pointerleave', func: (mouse) => progressBarSeek(mouse, progress, ProgressBarSeekActions.STOP_DISPLAYING), options: {passive: true}}
    ])
    setAttributes(progress, {
        value: 0,
        max: 100,
        id: `${index}progress-bar`,
        style: "accent-color:white"
    });
    const songLengthLabel = document.createElement('text')
    songLengthLabel.style.marginLeft = "1ch";
    songLengthLabel.setAttribute('id', `${index}durationLabel`);

    const status = document.createElement('div');
    status.setAttribute('class', 'fileStatus');
    status.setAttribute('id', `${index}status`);

    const volLabel = document.createElement('label');
    volLabel.setAttribute('for', `${index}playVolume`);
    volLabel.innerHTML = "Volume:";
    const volumeChanger = document.createElement('input');
    setAttributes(volumeChanger, {
        type: 'number',
        id: `${index}playVolume`,
        inputmode: "numeric",
        value: 1,
        step: 0.01,
        min: 0,
        max: 1
    });

    const rateLabel = document.createElement('label');
    rateLabel.setAttribute('for', `${index}playRate`);
    rateLabel.innerHTML = "Rate:";
    const rateChanger = document.createElement('input');
    setAttributes(rateChanger, {
        type: 'number',
        id: `${index}playRate`,
        inputmode: "numeric",
        class: 'playRate',
        value: 1,
        step: 0.01,
        min: 0
    });

    const panLabel = document.createElement('label');
    panLabel.setAttribute('for', `${index}playPan`);
    panLabel.innerHTML = "Pan:";
    panLabel.title = "-1 is most left, +1 is most right";
    const panChanger = document.createElement('input');
    panChanger.title = "-1 is most left, +1 is most right";
    setAttributes(panChanger, {
        type: 'number',
        id: `${index}playPan`,
        inputmode: "numeric",
        value: 0,
        step: 0.01,
        min: -1,
        max: 1
    });

    const muteButton = document.createElement('input');
    setAttributes(muteButton, {
        style: 'margin-left:0px',
        type: 'checkbox',
        id: `${index}Mute`
    });
    const muteLabel = document.createElement('label');
    muteLabel.setAttribute('for', `${index}Mute`);
    muteLabel.innerHTML = "Mute";

    const seekBack = document.createElement('button');
    seekBack.innerHTML = '-10 Seconds';
    seekBack.setAttribute('id', `${index}seekBackward`);
    seekBack.className = 'audioSpecificSeekButton'
    registerClickEvent(seekBack, () => seek(`${index}seekBackward`) );
    const seekForward = document.createElement('button');
    seekForward.innerHTML = '+10 Seconds';
    seekForward.setAttribute('id', `${index}seekForward`);
    seekForward.className = 'audioSpecificSeekButton'
    registerClickEvent(seekForward, () => seek(`${index}seekForward`) );
    
    appendChilds(cell0, [
        createHorizontalLine(),
        fileInputLabel,
        document.createElement('div'),
        fileInput,
        timeDisplay,
        progress,
        songLengthLabel,
        status,
        document.createElement('div'),
        volLabel,
        volumeChanger,
        document.createElement('div'),
        rateLabel,
        rateChanger,
        document.createElement('div'),
        panLabel,
        panChanger,
        document.createElement('div'),
        muteButton,
        muteLabel,
        document.createElement('div'),
        seekBack,
        seekForward
    ])

    sounds.push(null); //make a new index for a song upload.
    importFileDetectID(fileInput);
    inputNumberChangeDetect(volumeChanger);
    inputNumberChangeDetect(rateChanger);
    inputNumberChangeDetect(panChanger);
    handleCheckBoxClick(muteButton);
    updateElementContainers();
}

function setAttributes(element, attrs) {
    for(var key in attrs)
        element.setAttribute(key, attrs[key]);
}
function appendChilds(element, childElements){
    for(var i = 0; i < childElements.length; i++)
        if(childElements[i]) element.appendChild(childElements[i]);
}
function addListeners(el, data){
    data.forEach(data => el.addEventListener(data.name, data.func, data.options));
}

function updateElementContainers(){
    statusObjects = document.querySelectorAll('div[class=fileStatus]')
    progressBarObjects = document.querySelectorAll('progress')
    ratesInIndexOrder = document.querySelectorAll('input[class=playRate]')
}

function changeStatus(status, index) {
    statusObjects[index].innerHTML = status;
}
function getStatus(index) {
    return statusObjects[index].innerHTML;
}

function setProgress(e, index) {
    progressBarObjects[index].value = (100 * e.loaded) / e.total
    changeStatus('Importing...', index)
}

function keepTrackofTimes(){
    const queued = processQueue[0]
    if(queued && document.getElementById(`${queued.index}input`)){
        processFile(queued.file, queued.index);
        processQueue.shift();
    }

    for(let i = 0; i < sounds.length; i++){
        try{
        const isLoading = sounds[i]?.state() != 'loaded' && sounds[i] != null;
        if(sounds[i] == null || isLoading){
            cannotUpdateProgress(isLoading, i);   
            continue
        }
        
        const currentTime = sounds[i].seek(sounds[i]), songDuration = sounds[i].duration();

        resyncWithAudio0(i)
        progressBarObjects[i].value = currentTime/songDuration*100
        updateCurrentTimeDisplay(i, currentTime, songDuration)

        let volumeChanger = document.getElementById(`${i}playVolume`);
        if(document.activeElement !== volumeChanger) volumeChanger.value = sounds[i].volume(sounds[i]);
        if(getStatus(i) == 'Processing...'){
            statusObjects[i].innerHTML = "Loaded!"
        }
        } catch (e) {changeStatus(e,i);}
    }
}

function cannotUpdateProgress(isProcessing, index){
    if(isProcessing) changeStatus("Processing...", index);
    document.getElementById(`${index}hoveredTimeDisplay`).style.left = '-9999px';
    document.getElementById(`${index}durationLabel`).innerHTML = "";
}

function resyncWithAudio0(audioIndex){
    const syncAudioCheckbox = document.getElementById(`syncWithSound0Checkbox${audioIndex}`);
    
    let currentSong = sounds[audioIndex],
    currentSoundSeek = currentSong.seek(currentSong),
    currentSoundDuration = currentSong.duration(currentSong),
    sound0Seek = sounds[0].seek(sounds[0]),
    leewaySeconds = toNum(document.getElementById('fallBehindLeeway').value);

    if((syncAudioCheckbox == null || !syncAudioCheckbox.checked) || sound0Seek >= currentSoundDuration) return;
    else if(!(
        (sound0Seek-leewaySeconds > currentSoundSeek || sound0Seek+leewaySeconds < currentSoundSeek) && (currentSoundDuration-leewaySeconds >= currentSoundSeek && currentSoundSeek > leewaySeconds)
    )) return;

    console.log(`Sound #${audioIndex+1} resynced`);
    currentSong.seek(sound0Seek);
    if(isSoundPaused(audioIndex)) currentSong.play();
}

function updateCurrentTimeDisplay(index, currentTime, songDuration){
    const timeDisplay = document.getElementById(`${index}hoveredTimeDisplay`);
    if(timeDisplay.getAttribute('inUse') == 1) return;

    const progressBarDomRect = progressBarObjects[index].getBoundingClientRect(),
    top = progressBarDomRect.top + window.scrollY,
    left = (progressBarDomRect.left-timeDisplay.getBoundingClientRect().width/2)+(progressBarDomRect.width*currentTime/songDuration)-1;

    timeDisplay.style.top = `${top}px`
    timeDisplay.style.left = `${left}px`
    timeDisplay.children[0].innerHTML = new Time(currentTime).toString();
    document.getElementById(`${index}durationLabel`).innerHTML = new Time(songDuration).toString();
}

function loaded(index, fileReader, abortController, fileName) {
    abortController.abort();
    document.getElementById(`${index}inputLabel`).innerHTML = fileName
    
    if(sounds[index] != null) sounds[index].unload() //make audio stop first
    sounds[index] = new Howl({
        src: [fileReader.result],
        preload: true,
        loop: true,
    });
    sounds[index].rate( document.getElementById(index + "playRate").value )
    sounds[index].volume( document.getElementById(index + "playVolume").value )
    sounds[index].mute( document.getElementById(index + "Mute").checked )
    sounds[index].faded = false;

    if(index >= sounds.length-1){
        createNewPlayer(index+1);
        addNewFadeController();
    }
}

const processFile = (file, index) => {
    const fileReader = new FileReader(),
    abortController = new AbortController(),
    signal = {signal: abortController.signal, passive: true};

    fileReader.readAsDataURL(file) //IF AN EVENT LISTENER CHANGED, DO CALLBACKS IN REMOVALS TOO!
    changeStatus('Initializing...', index)
    addListeners(fileReader, [
        {name: 'progress', func: (e) => setProgress(e, index), options: signal},
        {name: 'loadend', func: () => loaded(index, fileReader, abortController, file.name), options: signal},
        {name: 'error', func: (progressEvent) => errorHandler(progressEvent, index, abortController), options: signal}
    ])
}

function errorHandler(progressEvent, index, abortController) {
    changeStatus(progressEvent.target.error.name, index);
    console.error(progressEvent.target.error);
    console.warn("Uploading folders isn't supported! Add the files using 'Ctrl + A' instead.");
    abortController.abort();
}

function importFileDetectID(element){
    const isBatch = element.multiple,
        index = parseInt(element?.id)
    element.addEventListener('change', () => {
        const files = element.files
        if(!files.length) return;
        if(isBatch && processQueue.length == 0){
            for(let i = 0; i < files.length; i++) processQueue.push({file: files[i], index: fadeControllerQuantity+i})
            return
        }
        processQueue.push({file: files[0], index: index});
    }, {passive: true});
}

function seek(idHTML){ //controls audio seeking, called by HTML elements
    const onlyText = idHTML.replace(/[^a-z]/gi, ''),
    index = parseInt(idHTML),
    isPlayerSpecificSeeked = index >= 0,
    timesToLoop = ( isPlayerSpecificSeeked ) ? 1 : sounds.length-1; //loop through all the sounds if not seeked from audio-player-specific seek button.
    for(var i = 0; i < timesToLoop; i++){
        const currIndex = ( isPlayerSpecificSeeked ) ? index : i,
        songDuration = sounds[currIndex]?.duration(sounds[currIndex])
        
        if(sounds[currIndex] == null || sounds[currIndex].state() != 'loaded') continue;

        let numToAdd = (10 * ratesInIndexOrder[currIndex].value) * ((onlyText == "seekBackward") ? -1 : 1)

        const currentTime = sounds[currIndex].seek(sounds[currIndex]);
        if(
            (numToAdd < 0 && Math.abs(numToAdd) >= currentTime) ||
            (numToAdd > 0 && currentTime+numToAdd >= songDuration)
        ){ sounds[currIndex].seek(0); continue; }
        
        sounds[currIndex].seek(currentTime+numToAdd);
    }
}

function inputNumberChangeDetect(element){ //index is fetched from last digit of ID.
    element.addEventListener('change', () => {
        const index = parseInt(element.id),
        onlyText = element.id.replace(/[^a-z]/gi, '');
        
        if(onlyText == "playVolume") return sounds[index]?.volume(element.value);
        if(onlyText == "playPan") return sounds[index]?.stereo( toNum(element.value) );
        if(onlyText != "playRate") return;
        if(sounds[index] == null || sounds[index]?.state() != 'loaded') return updateSeekButtonTexts();
        
        if(element.value <= 0) sounds[index].pause();
        else if(isSoundPaused(index) && statusObjects[index].innerHTML == "Playing"){ //the rate cant be set to 0. the progress tracker will glitch back to 0.
            const currentTime = sounds[index].seek(sounds[index]);
            sounds[index].rate(element.value);
            sounds[index].play(); //this starts the song over
            sounds[index].seek(currentTime, sounds[index]); //jump back to where we were
        } else {
            sounds[index].rate(element.value);
        }

        updateSeekButtonTexts();
    }, {passive: true})
}

function updateSeekButtonTexts(){
    const seekButtons = document.getElementsByClassName('audioSpecificSeekButton');
    for(var i = 0; i < seekButtons.length; i++){
        const button = seekButtons[i],
        buttonIndex = parseInt(button.id);
        button.innerHTML = `${button.innerHTML[0]}${precisionRound(10 * ratesInIndexOrder[buttonIndex].value, 3)} Seconds`;
    }
}

function toNum(num){ return parseFloat(num.toString()) }

function handleCheckBoxClick(element){
    const onlyText = element.id.replace(/[^a-z]/gi, ''), //grab all text except numbers
    index = parseInt(element.id); //grab all numbers except text
    element.addEventListener('change', () => {
        if(onlyText == "Mute") return sounds[index]?.mute(element.checked);
        if(onlyText != "playAfter") return;
        
        if(!element.checked){ sounds[0].off('end'); return sounds[0].loop(true); }
        
        const playAfterCheckbox = document.getElementById("1playAfter0") //fetch element early to minimize delay on play
        sounds[0].loop(false)
        sounds[0].once('end', () => {
            if(playAfterCheckbox.checked){ //user could uncheck button before end
                sounds[1].play()
                statusObjects[1].innerHTML = "Playing";
            }
        })
        sounds[1].stop()
    }, {passive: true})
};

function playAllSounds(id){ //controls playing and pausing. doesn't toggle "Play All" button text; handled by seperate function called by HTML element.
    for(let i = 0; i < sounds.length; i++){
        if(sounds[i] == null || sounds[i].state() != 'loaded') continue;

        if(document.getElementById(id).innerText == "Stop All"){ sounds[i].stop(); continue; }

        if(ratesInIndexOrder[i].value != 0) sounds[i].play();
        statusObjects[i].innerHTML = "Playing";
        if(document.getElementById("1playAfter0").checked) break;
    }
    if(document.getElementById(id).innerText == "Stop All") for(var i = 0; i < statusObjects.length; i++) statusObjects[i].innerHTML = "Stopped";
}

function togglePlayButtonText(id){
    let text = document.getElementById(id).firstChild;
    if(text.data == 'Play All') text.data = "Stop All"
    else if (text.data == 'Stop All') text.data = "Play All"
}

function fadeAudio(soundIndex){
    if(sounds[soundIndex] == null || sounds[soundIndex]?.state() != 'loaded') return;
    let maxVolume = document.getElementById(`AudioMaxVolume${soundIndex}`).value,
    minVolume = document.getElementById(`AudioMinVolume${soundIndex}`).value,
    transitionSeconds = document.getElementById(`AudioTransition${soundIndex}`).value,
    fadeToVolume = (!sounds[soundIndex].faded) ? minVolume : maxVolume,
    currentVolume = sounds[soundIndex].volume(sounds[soundIndex]);
    
    sounds[soundIndex]?.fade(currentVolume, fadeToVolume, transitionSeconds*1000);
    sounds[soundIndex].faded = !sounds[soundIndex].faded;
    updateFadeSoundButton(soundIndex, sounds[soundIndex].faded)
}

function updateFadeSoundButton(index, isFaded){
    let fadeSoundButton = document.getElementById(`fadeSoundButton${index}`);
    if(isFaded) fadeSoundButton.innerHTML = `Unfade Audio #${index+1}`;
    else fadeSoundButton.innerHTML = `Fade Audio #${index+1}`;
}

function addNewFadeController(){
    const cellWithButtons = FADE_CONTROLLER_TABLE.rows[FADE_CONTROLLER_TABLE.rows.length-1].cells[0],
        row = FADE_CONTROLLER_TABLE.insertRow(FADE_CONTROLLER_TABLE.rows.length-1), // Create an empty <tr> element and add it to the last position in the table
        cell = row.insertCell(0); // Insert a new cell (<td> element) at the 1st position of the new <tr> element
    let syncWithSound0Button, syncWithSound0Label;

    let maxVolumeSelectorLabel = document.createElement('label')
    maxVolumeSelectorLabel.setAttribute('for', `AudioMaxVolume${fadeControllerQuantity}`);
    maxVolumeSelectorLabel.setAttribute('style', 'float: left;')
    maxVolumeSelectorLabel.innerHTML = `Audio #${fadeControllerQuantity+1} Max Volume:`;

    let maxVolumeSelector = document.createElement('input');
    maxVolumeSelector.oninput = () => maxVolumeSelectorDisplay.innerHTML = `${(maxVolumeSelector.value*100).toFixed(0)}%`
    setAttributes(maxVolumeSelector, {
        id: `AudioMaxVolume${fadeControllerQuantity}`,
        list: 'commonVolumes',
        type: 'range',
        value: 100,
        min: 0,
        max: 1,
        step: 0.01
    });

    let maxVolumeSelectorDisplay = document.createElement('label');
    maxVolumeSelectorDisplay.innerHTML = '100%';
    setAttributes(maxVolumeSelectorDisplay, {
        id: `maxVolumeDisplay${fadeControllerQuantity}`,
        for: `AudioMaxVolume${fadeControllerQuantity}` 
    });


    let minVolumeSelectorLabel = document.createElement('label')
    minVolumeSelectorLabel.setAttribute('for', `AudioMinVolume${fadeControllerQuantity}`)
    minVolumeSelectorLabel.setAttribute('style', 'float: left; margin-right: 3px;')
    minVolumeSelectorLabel.innerHTML = `Audio #${fadeControllerQuantity+1} Min Volume:`

    let minVolumeSelector = document.createElement('input')
    minVolumeSelector.oninput = () => minVolumeSelectorDisplay.innerHTML = `${(minVolumeSelector.value*100).toFixed(0)}%`
    setAttributes(minVolumeSelector, {
        id: `AudioMinVolume${fadeControllerQuantity}`,
        list: "commonVolumes",
        type: 'range',
        value: 0,
        min: 0,
        max: 1,
        step: 0.01
    });

    let minVolumeSelectorDisplay = document.createElement('label');
    minVolumeSelectorDisplay.innerHTML = '0%';
    setAttributes(minVolumeSelectorDisplay, {
        id: `minVolumeDisplay${fadeControllerQuantity}`,
        for: `AudioMinVolume${fadeControllerQuantity}` 
    });


    let transitionLabel = document.createElement('label');
    transitionLabel.setAttribute('for', `AudioTransition${fadeControllerQuantity}`);
    transitionLabel.setAttribute('style', 'float: left;');
    transitionLabel.innerHTML = `Audio #${fadeControllerQuantity+1} Transition Seconds:`

    let transitionTimeChanger = document.createElement('input');
    setAttributes(transitionTimeChanger, {
        type: 'number',
        id: `AudioTransition${fadeControllerQuantity}`,
        value: 1,
        step: 0.01,
        min: 0
    });

    if(fadeControllerQuantity > 0){
        syncWithSound0Label = document.createElement('label');
        const warnInfo = "Audios won't sync correctly if lengths not proportional or equal. If audios looped not same length, put longest as first audio and shortest as last audio."
        setAttributes(syncWithSound0Label, {
            for: `syncWithSound0Checkbox${fadeControllerQuantity}`,
            style: 'float: left; margin-right: 1ch;',
            title: warnInfo
        })
        syncWithSound0Label.innerHTML = 'Sync with sound #1:'

        syncWithSound0Button = document.createElement('input')
        setAttributes(syncWithSound0Button, {
            type: 'checkbox',
            style: 'margin-left:0px',
            id: `syncWithSound0Checkbox${fadeControllerQuantity}`,
            title: warnInfo
        })
    }

    appendChilds(cell, [
        (fadeControllerQuantity > 0) ? createHorizontalLine():null,
        maxVolumeSelectorLabel,
        maxVolumeSelector,
        maxVolumeSelectorDisplay,
        document.createElement('div'),

        minVolumeSelectorLabel,
        minVolumeSelector,
        minVolumeSelectorDisplay,
        document.createElement('div'),

        transitionLabel,
        transitionTimeChanger,
        document.createElement('div'),

        syncWithSound0Button,
        syncWithSound0Label
    ]);
    
    let fadeSoundButton = document.createElement('button');
    let currentIndex = fadeControllerQuantity;
    registerClickEvent(fadeSoundButton, () => fadeAudio(parseInt(`${currentIndex}`)) );
    fadeSoundButton.setAttribute('soundIndex', fadeControllerQuantity);
    fadeSoundButton.setAttribute('id', `fadeSoundButton${fadeControllerQuantity}`);
    fadeSoundButton.innerHTML = `Fade Audio #${fadeControllerQuantity+1}`;

    cellWithButtons.insertBefore(fadeSoundButton, cellWithButtons.children[cellWithButtons.children.length-2]);
    ++fadeControllerQuantity
}

function isSoundPaused(index){
    return sounds[index]._sounds[0]._paused
}

function precisionRound(number, precision) {
    var factor = Math.pow(10, precision); return Math.round(number * factor) / factor;
}

function createHorizontalLine(){
    const horizontalLine = document.createElement('hr')
    horizontalLine.setAttribute("color", "#000")
    return horizontalLine
}