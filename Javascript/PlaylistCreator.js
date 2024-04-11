var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// @ts-nocheck
const SITE_DEPRECATED = document.URL.toLowerCase().includes('codehs');
import("./howler.js").catch((error) => {
    console.warn(error);
    let howlerScript = document.createElement('script');
    howlerScript.src = "../Javascript/howler.js";
    document.head.appendChild(howlerScript);
});
class OnEventUpdated {
    constructor() {
        this.registeredCallbacks = [];
    }
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
        for (var i = 0; i < this.registeredCallbacks.length; i++)
            this.registeredCallbacks[i](data);
    }
}
class OnKeyDownEvent extends OnEventUpdated {
    constructor() {
        super();
        window.addEventListener('keydown', key => this.callAllRegisteredFunctions(key), { passive: false });
    }
}
class OnRequestAnimationFrameEvent extends OnEventUpdated {
    constructor() {
        super();
        // @ts-expect-error
        this.raf = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame).bind(window);
        this.raf((timestamp) => this.handleRAFCall(timestamp));
    }
    handleRAFCall(timestamp) {
        this.callAllRegisteredFunctions(timestamp);
        this.raf((timestamp) => this.handleRAFCall(timestamp));
    }
}
/** Splits inputted seconds into hours, minutes, & seconds. toString() returns the time in digital format.
*/
class Time {
    constructor(seconds) {
        this.seconds = 0;
        this.minutes = 0;
        this.hours = 0;
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
    /** @param dataTransferItemList this can be any array-like containing DataTransferItems or File / Directory entries (from DataTransferItem.webkitGetAsEntry()) */
    constructor(dataTransferItemList) {
        this.dataTransferItemList = [];
        this.files = [];
        this.activePromises = 0;
        this.filesCollected = 0;
        this.filesAdded = 0;
        this.phase = 0 /* PhaseType.COLLECTING */; //0 == collecting, 1 == retrieving
        this.dataTransferItemList = dataTransferItemList;
    }
    retrieveContents() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                if (this.files.length > 0)
                    resolve(this.files);
                let fileEntryArray = []; //collect all file entries that need to be scanned
                for (let i = 0; i < this.dataTransferItemList.length; i++)
                    fileEntryArray.push((_c = (_b = (_a = this.dataTransferItemList[i]) === null || _a === void 0 ? void 0 : _a.webkitGetAsEntry) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : this.dataTransferItemList[i]);
                yield this.scanFilesInArray(fileEntryArray);
                this.phase = 1 /* PhaseType.RETRIEVING */;
                yield new Promise((resolve, reject) => {
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
            }));
        });
    }
    scanFilesInArray(fileEntries) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                for (let i = 0; i < fileEntries.length; i++) {
                    let webkitEntry = fileEntries[i];
                    if (webkitEntry.isDirectory) {
                        let reader = webkitEntry.createReader();
                        yield this.addFilesInDirectory(reader);
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
            }));
        });
    }
    addFilesInDirectory(reader) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                let someFiles = yield this.getSomeFilesInDirectory(reader);
                while (someFiles.length > 0) {
                    yield this.scanFilesInArray(someFiles);
                    someFiles = yield this.getSomeFilesInDirectory(reader);
                }
                ;
                return resolve(this.files);
            }));
        });
    }
    getSomeFilesInDirectory(reader) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                reader.readEntries(someFiles => {
                    resolve(someFiles);
                }, error => {
                    console.error(error, reader);
                    resolve([]);
                });
            }));
        });
    }
    getFile(fileEntry) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                fileEntry.file(file => {
                    resolve(file);
                });
            }));
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
var REQUEST_ANIMATION_FRAME_EVENT = new OnRequestAnimationFrameEvent(), KEY_DOWN_EVENT = new OnKeyDownEvent(), VALID_FILE_EXTENSIONS = new Set(["ogg", "webm", "wav", "hls", "flac", "mp3", "opus", "pcm", "vorbis", "aac"]), StatusTexts = {
    PLAYING: "Playing",
    PAUSED: "Paused",
    STOPPED: "Stopped",
    DOWNLOADING: "Downloading File...",
    PROCESSING: "Processing...",
    RETRIEVING: "Retrieving Files...",
    COLLECTING: "Collecting Files..."
}, RowColors = {
    PLAYING: "rgb(172, 172, 172)",
    SELECTING: "lightblue",
    NONE: ""
}, PAUSED = false, PLAYING = true, PLAYLIST_VIEWER_TABLE = document.getElementById("Playlist_Viewer"), PRELOAD_DIST_ELEMENT = document.getElementById('preloadDistance'), COMPACT_MODE_LINK_ELEMENT = null, //document.getElementById('compactModeStyleLink'),
COMPACT_MODE_TOGGLE = document.getElementById('compactMode'), SEEK_DURATION_NUMBER_INPUT = document.getElementById('seekDuration'), SEEK_DURATION_DISPLAY = document.getElementById("seekDurationDisplay"), SEEK_DISTANCE_PROPORTIONAL_CHECKBOX = document.getElementById('seekDistanceProportional'), SKIP_UNPLAYABLE_CHECKBOX = document.getElementById('skipUnplayable'), UPLOAD_BUTTON = document.getElementById('0input'), UPLOAD_DIRECTORY_BUTTON = document.getElementById('inputDirectory'), PLAY_RATE_RANGE = document.getElementById('0playRateSlider'), SETTINGS_PAGE = document.getElementById('settingsPage'), ERROR_POPUP = document.getElementById('errorPopup'), DEPRECATED_POPUP = document.getElementById('deprecatedPopup'), ERROR_LIST = document.getElementById('errorList'), PROGRESS_BAR = document.getElementById('progress-bar'), HOVERED_TIME_DISPLAY = document.getElementById('hoveredTimeDisplay'), VOLUME_CHANGER = document.getElementById('0playVolume'), PLAY_RATE = document.getElementById('0playRate'), PLAY_PAN = document.getElementById('0playPan'), SEEK_BACK = document.getElementById('seekBack'), SEEK_FORWARD = document.getElementById('seekForward'), REPEAT_BUTTON = document.getElementById('repeatButton'), SHUFFLE_BUTTON = document.getElementById('shuffleButton'), MUTE_BUTTON = document.getElementById('0Mute'), PLAY_BUTTON = document.getElementById('playpause'), STATUS_TEXT = document.getElementById('0status'), CURRENT_FILE_NAME = document.getElementById('currentFileName'), DROPPING_FILE_OVERLAY = document.getElementById("dragOverDisplay"), DURATION_OF_SONG_DISPLAY = document.getElementById('secondDurationLabel');
var fileNameDisplays = [];
var filePlayingCheckboxes = [];
var fileSizeDisplays = [];
var sounds = [];
var selectedRows = [];
var hoveredRowInDragAndDrop = null; //does not work with importing files, only when organizing added files
/** An ID representing what current batch of sounds is being loaded. If the ID increments, then the old sounds being loaded are discarded. */
var processingNumber = 0;
var skipSongQueued = false;
var currentSongIndex = null;
const start = (() => {
    if ("serviceWorker" in navigator && !SITE_DEPRECATED) {
        navigator.serviceWorker.register("../ServiceWorker.js");
    }
    KEY_DOWN_EVENT.register(closeContextMenu);
    registerClickEvent('skipBack', () => jumpSong(-1));
    registerClickEvent('skipForward', () => jumpSong(1));
    registerClickEvent('seekBack', () => seek(new Number(SEEK_BACK.getAttribute('seekDirection'))));
    registerClickEvent('seekForward', () => seek(new Number(SEEK_FORWARD.getAttribute('seekDirection'))));
    registerClickEvent(CURRENT_FILE_NAME, () => PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1].scrollIntoView(false));
    KEY_DOWN_EVENT.register(selectionLogicForKeyboard);
    REQUEST_ANIMATION_FRAME_EVENT.register(keepTrackOfTimes);
    makeDocumentDroppable();
    document.addEventListener('click', (mouseEvent) => {
        closeContextMenu();
        if (mouseEvent.target == document.querySelector("html") || mouseEvent.target == document.body)
            deselectAll();
    }, { passive: true });
    document.addEventListener('touchend', (touchEvent) => {
        // if(touchEvent.touches == 1) {
        //   touchEvent.preventDefault();
        //   const rect = touchEvent.target.getBoundingClientRect();
        //   const mouseEvent = new MouseEvent("contextmenu", {
        //     bubbles: true,
        //     cancelable: false,
        //     view: window,
        //     button: 2,
        //     buttons: 0,
        //     clientX: rect.left,
        //     clientY: rect.top
        //   });
        //   touchEvent.target.dispatchEvent(mouseEvent);
        //   // openRowContextMenu(releasedTouch.clientX, releasedTouch.clientY, releasedTouch.target);
        // }
    });
    document.addEventListener("beforeunload", function () {
        Howler.unload();
        sounds = [];
    }, { passive: true });
    initContextMenu();
    PLAY_BUTTON.addEventListener('change', playButton, { passive: true });
    COMPACT_MODE_TOGGLE.addEventListener('change', toggleCompactMode, { passive: true });
    registerClickEvent('settingsButton', () => __awaiter(void 0, void 0, void 0, function* () { return SETTINGS_PAGE.showModal(); }));
    registerClickEvent('exitSettingsButton', () => __awaiter(void 0, void 0, void 0, function* () { return SETTINGS_PAGE.close(); }));
    registerClickEvent('exitErrorPopup', () => __awaiter(void 0, void 0, void 0, function* () { return ERROR_POPUP.close(); }));
    registerClickEvent('exitDeprecatedPopup', () => __awaiter(void 0, void 0, void 0, function* () { return DEPRECATED_POPUP.close(); }));
    ERROR_POPUP.addEventListener("close", onCloseErrorPopup);
    UPLOAD_BUTTON.addEventListener('change', function () { importFiles(UPLOAD_BUTTON.files); }, { passive: true });
    UPLOAD_DIRECTORY_BUTTON.addEventListener('change', function () { importFiles(UPLOAD_DIRECTORY_BUTTON.files); }, { passive: true });
    // document.getElementById('uploadFilesLabel').addEventListener('contextmenu', (pointerEvent) => {
    //   pointerEvent.preventDefault();
    // })
    PLAY_RATE.addEventListener('change', () => { onPlayRateUpdate(PLAY_RATE.value); }, { passive: true });
    SEEK_DURATION_NUMBER_INPUT.addEventListener('input', updateSeekDurationDisplay, { passive: true });
    onRangeInput(PLAY_RATE_RANGE, () => { onPlayRateUpdate(PLAY_RATE_RANGE.value); });
    onRangeInput(PRELOAD_DIST_ELEMENT, () => { PRELOAD_DIST_ELEMENT.labels[0].textContent = `Value: ${PRELOAD_DIST_ELEMENT.value}`; });
    onRangeInput(PLAY_PAN, () => { PLAY_PAN.labels[0].textContent = `${Math.floor(PLAY_PAN.value * 100)}%`; sounds[currentSongIndex].stereo(parseFloat(PLAY_PAN.value)); });
    onRangeInput(VOLUME_CHANGER, () => { VOLUME_CHANGER.labels[0].textContent = `${Math.floor(VOLUME_CHANGER.value * 100)}%`; sounds[currentSongIndex].volume(VOLUME_CHANGER.value); });
    handleCheckBoxClick(MUTE_BUTTON, REPEAT_BUTTON, SHUFFLE_BUTTON);
    PROGRESS_BAR.addEventListener('pointerenter', (pointer) => progressBarSeek(pointer, 1 /* ProgressBarSeekAction.DISPLAY_TIME */), { passive: true });
    PROGRESS_BAR.addEventListener('pointerdown', (pointer) => { if (pointer.button == 0)
        progressBarSeek(pointer, 0 /* ProgressBarSeekAction.SEEK_TO */); }, { passive: true });
    PROGRESS_BAR.addEventListener('pointermove', (pointer) => progressBarSeek(pointer, 1 /* ProgressBarSeekAction.DISPLAY_TIME */), { passive: true });
    PROGRESS_BAR.addEventListener('pointerleave', (pointer) => progressBarSeek(pointer, 2 /* ProgressBarSeekAction.STOP_DISPLAYING */), { passive: true });
    if (SITE_DEPRECATED)
        DEPRECATED_POPUP.showModal();
    //END
})();
function makeDocumentDroppable() {
    window.addEventListener("dragover", (event) => {
        if (!onlyFiles(event.dataTransfer))
            return;
        event.preventDefault();
        DROPPING_FILE_OVERLAY.setAttribute("draggingOver", "true");
        stopHighlightingRow();
    });
    window.addEventListener("dragleave", () => {
        DROPPING_FILE_OVERLAY.setAttribute("draggingOver", "false");
        stopHighlightingRow();
    }, { passive: true });
    window.addEventListener("drop", (event) => {
        const dataTransfer = event.dataTransfer;
        if (!onlyFiles(dataTransfer))
            return;
        event.preventDefault();
        DROPPING_FILE_OVERLAY.setAttribute("draggingOver", "false");
        stopHighlightingRow();
        importFiles(dataTransfer);
    });
}
function onlyFiles(dataTransfer) { return dataTransfer.types.length == 1 && dataTransfer.types[0] == 'Files'; }
//displayProgress - show progress in seek bar | currentIndex - what index in "fileSizeDisplays" to show loading progress in. This value is nullable to prevent showing loading progress in song chooser.
function retrieveSound(file, displayProgress, currentIndex) {
    if (file === null || file instanceof Howl)
        return new Promise((resolve, reject) => { resolve(file); });
    const currentProcessingNumber = processingNumber;
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        const onProgress = function (progressEvent) {
            if (processingNumber === currentProcessingNumber && displayProgress)
                PROGRESS_BAR.value = (100 * progressEvent.loaded) / progressEvent.total;
            if (currentIndex >= 0) {
                fileSizeDisplays[currentIndex].textContent = `${getInMegabytes(progressEvent.loaded)} MB / ${getInMegabytes(file.size)} MB`;
                fileSizeDisplays[currentIndex].setAttribute('title', `${progressEvent.loaded} bytes / ${file.size} bytes`);
            }
        };
        const onLoaded = function () {
            removeListeners();
            if (processingNumber !== currentProcessingNumber)
                resolve(null);
            resolve(loaded(fileReader, file));
        };
        const errorFunc = function (progressEvent) {
            removeListeners();
            switch (progressEvent.target.error.name) {
                case "NotFoundError": {
                    displayError(progressEvent.target.error.name, "Failed to find file!", progressEvent.target.error.message, file.name);
                    break;
                }
                default: {
                    displayError(progressEvent.target.error.name, "Unknown Error!", progressEvent.target.error.message, file.name);
                    break;
                }
            }
            resolve(null);
        };
        function warnUser() {
            removeListeners();
            console.warn(`File Aborted: ${fileReader.name}`);
            resolve(null);
        }
        function removeListeners() {
            fileReader.removeEventListener('progress', onProgress, { passive: true });
            fileReader.removeEventListener('loadend', onLoaded, { passive: true });
            fileReader.removeEventListener('error', errorFunc, { passive: true });
            fileReader.removeEventListener('abort', warnUser, { passive: true });
            if (currentIndex >= 0)
                updateFileSizeDisplay(currentIndex, file.size);
        }
        fileReader.addEventListener('progress', onProgress, { passive: true });
        fileReader.addEventListener('loadend', onLoaded, { passive: true });
        fileReader.addEventListener('error', errorFunc, { passive: true });
        fileReader.addEventListener('abort', warnUser, { passive: true });
    });
}
function onCloseErrorPopup() {
    let childElement;
    while ((childElement = ERROR_LIST.lastChild) != null) {
        ERROR_LIST.removeChild(childElement);
    }
}
function registerClickEvent(element, func) {
    if (typeof element === "string")
        element = document.getElementById(element);
    element.addEventListener('click', func, { passive: true });
}
/**
 * @satisfies New song was not pushed to sounds array beforehand.
 * @param fileName The name of the song to be added to the Playlist Table.
 * @param index The song's index.
 */
function createNewSong(fileName, index) {
    const row = document.createElement('tr'); //PLAYLIST_VIEWER_TABLE.insertRow(PLAYLIST_VIEWER_TABLE.rows.length)
    const cell1 = row.insertCell(0);
    initializeRowEvents(row);
    const fileSize = document.createElement('text');
    fileSize.setAttribute('class', 'songName');
    fileSize.setAttribute('style', 'position: absolute; transform: translate(-100%, 0); left: calc(100% - 3px);');
    fileSize.setAttribute('id', `${index}playButtonLabel`);
    const songName = document.createElement('text');
    songName.setAttribute('class', 'songName');
    songName.setAttribute('title', `${fileName}`);
    songName.textContent = fileName;
    const songNumber = document.createElement('text');
    songNumber.textContent = `${sounds.length + 1}. `;
    setAttributes(songNumber, {
        style: 'float: left; display: inline-block;',
        class: 'songNumber',
        index: index
    });
    const playButton = document.createElement('label');
    playButton.setAttribute('class', 'smallplaypause playpause');
    playButton.setAttribute('for', `${index}playButton`);
    const checkbox = document.createElement('input');
    checkbox.addEventListener('change', () => playSpecificSong(filePlayingCheckboxes.indexOf(checkbox)), { passive: true });
    setAttributes(checkbox, {
        type: 'checkbox',
        id: `${index}playButton`,
        class: 'smallplaypause playpause'
    });
    playButton.append(checkbox, document.createElement('div'));
    cell1.append(fileSize, songNumber, playButton, songName);
    fileSizeDisplays.push(fileSize);
    fileNameDisplays.push(songName);
    filePlayingCheckboxes.push(checkbox);
    return row;
}
function setAttributes(element, attrs) {
    for (var key in attrs)
        element.setAttribute(key, attrs[key]);
}
function toggleCompactMode() {
    return __awaiter(this, void 0, void 0, function* () {
        if (COMPACT_MODE_LINK_ELEMENT === null) {
            COMPACT_MODE_LINK_ELEMENT = document.createElement('link');
            setAttributes(COMPACT_MODE_LINK_ELEMENT, {
                rel: "stylesheet",
                href: "../CSS/CompactMode.css",
            });
            document.head.appendChild(COMPACT_MODE_LINK_ELEMENT);
        }
    });
}
function keepTrackOfTimes() {
    if (skipSongQueued) {
        skipSongQueued = false;
        filePlayingCheckboxes[(currentSongIndex + 1) % filePlayingCheckboxes.length].dispatchEvent(new MouseEvent("click"));
    }
    PRELOAD_DIST_ELEMENT.max = Math.max(sounds.length - 1, 1);
    if (COMPACT_MODE_LINK_ELEMENT === null || COMPACT_MODE_LINK_ELEMENT === void 0 ? void 0 : COMPACT_MODE_LINK_ELEMENT.sheet) {
        // if(COMPACT_MODE_TOGGLE.disabled) COMPACT_MODE_TOGGLE.disabled = false;
        if (COMPACT_MODE_LINK_ELEMENT.sheet.disabled == COMPACT_MODE_TOGGLE.checked) //if disabled needs to be updated with checkbox (checked is enabled, unchecked is disabled)
            COMPACT_MODE_LINK_ELEMENT.sheet.disabled = !COMPACT_MODE_TOGGLE.checked;
    }
    if (isUnloaded(sounds[currentSongIndex]))
        return cannotUpdateProgress(isLoading(sounds[currentSongIndex]));
    if (sounds[currentSongIndex].playing() && (STATUS_TEXT.textContent == StatusTexts.PROCESSING || STATUS_TEXT.textContent == StatusTexts.DOWNLOADING))
        onLatePlayStart();
    let songDuration = sounds[currentSongIndex].duration();
    let currentTime = sounds[currentSongIndex].seek(sounds[currentSongIndex]);
    const timeToSet = currentTime / songDuration * 100;
    if (Number.isFinite(timeToSet))
        PROGRESS_BAR.value = timeToSet;
    updateCurrentTimeDisplay(currentTime, songDuration);
    highlightCurrentSongRow();
}
function unHighlightOldCurrentSongRow() {
    for (let i = 0; i < PLAYLIST_VIEWER_TABLE.rows.length; i++) {
        if (PLAYLIST_VIEWER_TABLE.rows[i].style.backgroundColor == RowColors.PLAYING)
            PLAYLIST_VIEWER_TABLE.rows[i].style.backgroundColor = RowColors.NONE;
    }
}
function highlightCurrentSongRow() {
    const style = PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1].style;
    if (currentSongIndex != null && style.backgroundColor == RowColors.NONE)
        style.backgroundColor = RowColors.PLAYING;
}
function onLatePlayStart() {
    changeStatus(StatusTexts.PLAYING);
}
function cannotUpdateProgress(isProcessing) {
    if (isProcessing)
        changeStatus(StatusTexts.PROCESSING);
    if (DURATION_OF_SONG_DISPLAY.textContent != "00:00") {
        HOVERED_TIME_DISPLAY.style.left = '-9999px';
        DURATION_OF_SONG_DISPLAY.textContent = "00:00";
    }
}
function reapplySoundAttributes(howl) {
    howl.rate(PLAY_RATE.value);
    howl.volume(VOLUME_CHANGER.value);
    howl.mute(MUTE_BUTTON.checked);
    howl.stereo(parseFloat(PLAY_PAN.value));
}
function updateCurrentTimeDisplay(currentTime, songDurationInSeconds) {
    if (HOVERED_TIME_DISPLAY.getAttribute('inUse') == 1)
        return;
    const progressBarDomRect = PROGRESS_BAR.getBoundingClientRect();
    if (progressBarDomRect.top + 50 < 0)
        return; //return if you scrolled away from the progress bar (+50 to include the hoveredTimeDisplay)
    const songDurationFormatted = new Time(songDurationInSeconds).toString(), currentTimeString = new Time(currentTime).toString();
    if (DURATION_OF_SONG_DISPLAY.textContent != songDurationFormatted)
        DURATION_OF_SONG_DISPLAY.textContent = songDurationFormatted;
    if (HOVERED_TIME_DISPLAY.children[0].textContent != currentTimeString)
        HOVERED_TIME_DISPLAY.children[0].textContent = currentTimeString;
    const top = progressBarDomRect.top + window.scrollY, left = (progressBarDomRect.left - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2) + (progressBarDomRect.width * currentTime / songDurationInSeconds) - 1;
    HOVERED_TIME_DISPLAY.style.top = `${top}px`;
    HOVERED_TIME_DISPLAY.style.left = `${left}px`;
}
function progressBarSeek(mouse, hoverType) {
    var _a, _b;
    if (((mouse === null || mouse === void 0 ? void 0 : mouse.pointerType) == "touch" && hoverType !== 0 /* ProgressBarSeekAction.SEEK_TO */) || sounds[currentSongIndex] == null || ((_b = (_a = sounds[currentSongIndex]) === null || _a === void 0 ? void 0 : _a.state) === null || _b === void 0 ? void 0 : _b.call(_a)) != 'loaded' || hoverType === 2 /* ProgressBarSeekAction.STOP_DISPLAYING */)
        return HOVERED_TIME_DISPLAY.setAttribute('inUse', 0);
    const offsetX = mouse.offsetX, progressBarWidth = PROGRESS_BAR.clientWidth, currentSongLength = sounds[currentSongIndex].duration();
    let seekToTime = Math.max(new Number(offsetX * (currentSongLength / progressBarWidth)), 0);
    switch (hoverType) {
        case (0 /* ProgressBarSeekAction.SEEK_TO */): return sounds[currentSongIndex].seek(seekToTime);
        case (1 /* ProgressBarSeekAction.DISPLAY_TIME */):
            HOVERED_TIME_DISPLAY.setAttribute('inUse', 1);
            HOVERED_TIME_DISPLAY.style.left = `${(mouse.x - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2) + 1}px`;
            HOVERED_TIME_DISPLAY.firstChild.textContent = new Time(seekToTime).toString();
    }
}
function loaded(fileReader, sourceFileObject) {
    let result = fileReader.result;
    const index = sourceFileObject.nativeIndex;
    const sound = new Howl({
        src: [result],
        preload: false,
        autoplay: false,
        loop: false,
    });
    reapplySoundAttributes(sound);
    sound.nativeIndex = index; //if the songs in sounds[] are shuffled, use this property to know what index the song originally belonged to
    sound.name = sourceFileObject.name;
    sound.size = sourceFileObject.size;
    sound.sourceFile = sourceFileObject;
    sound.on('end', () => jumpSong(+1)); //jump to next song when they end (or do custom stuff if needed)
    updateFileSizeDisplay(index, sounds[index].size);
    return sound;
}
/**
 * @param {string} errorType The name of the exception.
 * @param {string} errorText A shortened error message.
 * @param {string} errorMessage The full error message.
 * @param {string} errorCategory The category the error is contained in.
*/
function displayError(errorType, errorText, errorMessage, errorCategory) {
    let insertAfter;
    const children = ERROR_LIST.children;
    for (let i = 0; i < children.length; i++) {
        if (children[i].textContent == errorCategory) {
            insertAfter = children[i];
            break;
        }
    }
    const songTitle = document.createElement('dt');
    songTitle.textContent = errorCategory;
    const songError = document.createElement('dd');
    songError.textContent = errorType + ": " + errorText;
    songError.title = errorMessage;
    if (insertAfter) {
        insertAfter.after(songError);
    }
    else {
        ERROR_LIST.append(songTitle, songError);
    }
    ERROR_POPUP.showModal();
    console.error(`${errorType}: ${errorText} ${errorMessage}`);
}
function seek(seekDirection) {
    if (isUnloaded(sounds[currentSongIndex]))
        return;
    const seekDuration = new Number(SEEK_DURATION_NUMBER_INPUT.value) * seekDirection;
    const numToAdd = (SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked) ? seekDuration * PLAY_RATE.value : seekDuration;
    const currentTime = sounds[currentSongIndex].seek(sounds[currentSongIndex]);
    sounds[currentSongIndex].seek(Math.max(currentTime + numToAdd, 0));
}
function importFiles(element) {
    return __awaiter(this, void 0, void 0, function* () {
        const songTableRows = [];
        if (element instanceof FileList) {
            addFiles(element);
        }
        else if (element instanceof DataTransfer) {
            let dataTransferItemList = element === null || element === void 0 ? void 0 : element.items;
            if (!dataTransferItemList || dataTransferItemList.length == 0)
                return;
            changeStatus(StatusTexts.RETRIEVING);
            let fileReceiver = new DataTransferItemGrabber(dataTransferItemList);
            addFiles(yield fileReceiver.retrieveContents());
        }
        function addFiles(files /*FileList or File[]*/) {
            const lengthBeforeBegin = sounds.length;
            let offsetBecauseOfSkipped = 0;
            changeStatus(`Importing ${files.length} Files...`);
            for (var i = 0; i < files.length; i++) {
                const file = files[i];
                if (file == null)
                    continue;
                const fileExtension = getFileExtension(file.name);
                if (SKIP_UNPLAYABLE_CHECKBOX.checked && !VALID_FILE_EXTENSIONS.has(fileExtension)) {
                    displayError("TypeError", `The file type '${fileExtension}' is unsupported.`, "This file is unsupported and cannot be imported!", file.name);
                    ++offsetBecauseOfSkipped;
                    continue;
                }
                file.nativeIndex = i + lengthBeforeBegin - offsetBecauseOfSkipped;
                songTableRows.push(createNewSong(file.name, file.nativeIndex)); //index (2nd parameter) is used to number the checkboxes
                updateFileSizeDisplay(file.nativeIndex, file.size);
                sounds.push(file);
            }
            const QUANTUM = 32768;
            const playlistTableBody = PLAYLIST_VIEWER_TABLE.tBodies[0];
            for (let i = 0; i < songTableRows.length; i += QUANTUM) {
                playlistTableBody.append(...songTableRows.slice(i, Math.min(i + QUANTUM, songTableRows.length)));
            }
            changeStatus(`${files.length - offsetBecauseOfSkipped} files added!`);
        }
    });
}
function onPlayRateUpdate(newRate) {
    PLAY_RATE_RANGE.value = newRate;
    PLAY_RATE.value = newRate;
    if (sounds[currentSongIndex] === undefined || sounds[currentSongIndex] instanceof File)
        return;
    if (newRate <= 0)
        return sounds[currentSongIndex].pause(); //the rate cant be set to 0. the progress tracker will glitch back to 0.
    if (isCurrentSoundPaused() && STATUS_TEXT.textContent == StatusTexts.PLAYING) {
        const currentTime = sounds[currentSongIndex].seek(sounds[currentSongIndex]);
        sounds[currentSongIndex].rate(newRate);
        sounds[currentSongIndex].play(); //this starts the song over
        sounds[currentSongIndex].seek(currentTime, sounds[currentSongIndex]); //jump back to where we were
        return;
    }
    sounds[currentSongIndex].rate(newRate);
}
function updateSeekDurationDisplay() {
    let duration = SEEK_DURATION_NUMBER_INPUT.value;
    if (duration < 1) {
        SEEK_DURATION_DISPLAY.textContent = `${new Number(duration) * 1000} ms`;
    }
    else {
        SEEK_DURATION_DISPLAY.textContent = `${new Number(duration)} sec`;
    }
}
function handleCheckBoxClick(...elements) {
    elements.forEach(el => {
        const onlyText = el.id.replace(/[^a-z]/gi, ''); //grab all text except numbers
        el.addEventListener('change', () => {
            var _a, _b;
            if (onlyText == "Mute" && !isUnloaded(sounds[currentSongIndex])) {
                Howler.mute(el.checked);
            }
            else if (onlyText == "repeatButton") {
                (_b = (_a = sounds[currentSongIndex]) === null || _a === void 0 ? void 0 : _a.loop) === null || _b === void 0 ? void 0 : _b.call(_a, el.checked);
                if (el.checked)
                    el.labels[0].children[0].src = "../Icons/Repeat1Icon.svg";
                else
                    el.labels[0].children[0].src = "../Icons/RepeatIcon.svg";
            }
            else if (onlyText == "shuffleButton")
                handleShuffleButton(el.checked);
        }, { passive: true });
    });
}
function handleShuffleButton(checked) {
    if (checked) {
        shuffle();
        refreshSongNames();
        for (var i = 0; i < sounds.length; i++) {
            updateFileSizeDisplay(i, sounds[i].size);
        }
        return;
    }
    let tempArray = sounds, foundCurrentPlayingSong = false;
    sounds = [].fill(null, 0, tempArray.length);
    for (var i = 0; i < tempArray.length; i++) {
        let sound = tempArray[i];
        sounds[sound.nativeIndex] = sound;
        updateFileSizeDisplay(sound.nativeIndex, sound.size);
        if (!foundCurrentPlayingSong && currentSongIndex !== null && i == currentSongIndex) {
            currentSongIndex = sound.nativeIndex;
            const currentCheckbox = filePlayingCheckboxes[currentSongIndex];
            filePlayingCheckboxes.forEach(it => { it.checked = false; });
            currentCheckbox.checked = true;
            foundCurrentPlayingSong = true;
        }
    }
    for (var i = 0; i < tempArray.length; i++)
        sounds[tempArray[i].nativeIndex] = tempArray[i];
    refreshSongNames();
    tempArray = null;
}
function shuffle() {
    let currentIndex = sounds.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        --currentIndex;
        if (currentSongIndex !== null) {
            if (currentSongIndex == currentIndex)
                currentSongIndex = randomIndex;
            else if (currentSongIndex == randomIndex)
                currentSongIndex = currentIndex;
            const currentCheckbox = filePlayingCheckboxes[currentSongIndex];
            filePlayingCheckboxes.forEach(it => { it.checked = false; });
            currentCheckbox.checked = true;
        }
        let tempForSwapping = sounds[currentIndex];
        sounds[currentIndex] = sounds[randomIndex];
        sounds[randomIndex] = tempForSwapping;
    }
}
function playSpecificSong(index) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        const checkbox = filePlayingCheckboxes[index];
        if (((_b = (_a = sounds[currentSongIndex]) === null || _a === void 0 ? void 0 : _a.playing) === null || _b === void 0 ? void 0 : _b.call(_a)) && ((_d = (_c = sounds[currentSongIndex]) === null || _c === void 0 ? void 0 : _c.state) === null || _d === void 0 ? void 0 : _d.call(_c)) == "loaded")
            (_f = (_e = sounds[currentSongIndex]) === null || _e === void 0 ? void 0 : _e.stop) === null || _f === void 0 ? void 0 : _f.call(_e);
        Howler.stop();
        if (!checkbox.checked) {
            PLAY_BUTTON.checked = PAUSED;
            currentSongIndex = null;
            for (var i = 0; i < sounds.length; i++)
                removeSongFromRam(i);
            changeStatus(StatusTexts.STOPPED);
            unHighlightOldCurrentSongRow();
            return;
        }
        else {
            currentSongIndex = index;
            filePlayingCheckboxes.forEach((it) => { if (it.id != checkbox.id)
                it.checked = false; }); //uncheck the play button for all the other sounds except the one u chose
            const soundName = sounds[index].name, fileType = getFileExtension(soundName);
            if (SKIP_UNPLAYABLE_CHECKBOX.checked && !VALID_FILE_EXTENSIONS.has(fileType)) {
                displayError("TypeError", `The file type '${fileType}' is unsupported.`, "This file is unsupported and cannot be played!", soundName);
                skipSongQueued = true;
                return;
            }
            changeStatus(StatusTexts.DOWNLOADING);
            retrieveSound(sounds[index], true, index).then((retrieved) => loadSong(retrieved, index, true));
            refreshPreloadedSongs();
            unHighlightOldCurrentSongRow();
        }
    });
}
function loadSong(retrieved, index, startPlaying) {
    if (retrieved === null)
        return;
    sounds[index] = retrieved; //make sure its loaded
    if (sounds[index].state() == 'unloaded')
        sounds[index].load();
    if (startPlaying)
        startPlayingSong();
}
function startPlayingSong() {
    setCurrentFileName(sounds[currentSongIndex].name);
    reapplySoundAttributes(sounds[currentSongIndex]);
    if (PLAY_RATE.value != 0) {
        sounds[currentSongIndex].play();
        PLAY_BUTTON.checked = PLAYING;
    }
}
function refreshPreloadedSongs() {
    if (currentSongIndex == null)
        return;
    for (let i = 0; i < sounds.length; i++) {
        if (i == currentSongIndex)
            continue;
        if (!isIndexInRangeOfCurrent(i)) {
            if (sounds[i] !== null)
                removeSongFromRam(i);
            continue;
        }
        retrieveSound(sounds[i], false, i).then(retrieved => loadSong(retrieved, i, false));
    }
}
function jumpSong(amount) {
    amount = amount || 1; //if no value inputted, assume u want to jump ahead one song
    const repeating = REPEAT_BUTTON.checked;
    if (repeating) {
        if (isCurrentSoundPaused()) {
            sounds[currentSongIndex].stop();
            sounds[currentSongIndex].play();
        }
        return;
    }
    currentSongIndex += amount;
    if (currentSongIndex > sounds.length - 1)
        currentSongIndex %= sounds.length;
    else if (currentSongIndex < 0)
        currentSongIndex = Math.max(currentSongIndex + sounds.length, 0); //idk a real solution to this
    const playButtonToActivate = filePlayingCheckboxes[currentSongIndex];
    playButtonToActivate.checked = true;
    playButtonToActivate.dispatchEvent(new Event('change'));
}
function playButton() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (isUnloaded(sounds[currentSongIndex]))
            return PLAY_BUTTON.checked = !PLAY_BUTTON.checked;
        if (PLAY_BUTTON.checked == PAUSED) { //if set to paused
            if (((_b = (_a = sounds[currentSongIndex]) === null || _a === void 0 ? void 0 : _a.pause) === null || _b === void 0 ? void 0 : _b.call(_a)) != undefined)
                changeStatus(StatusTexts.PAUSED);
            return;
        }
        if (sounds[currentSongIndex].state() != "loaded")
            yield sounds[currentSongIndex].load();
        sounds[currentSongIndex].play();
        changeStatus(StatusTexts.PLAYING);
    });
}
function isIndexInRangeOfCurrent(index) {
    const distance = parseInt(PRELOAD_DIST_ELEMENT.value);
    const withinRange = index >= currentSongIndex - distance && index <= currentSongIndex + distance;
    const inRangeWrappedToBegin = index + distance >= sounds.length && (index + distance) % sounds.length >= currentSongIndex;
    const inRangeWrappedToEnd = index - distance < 0 && (index - distance) + sounds.length <= currentSongIndex;
    return withinRange || inRangeWrappedToBegin || inRangeWrappedToEnd;
}
function removeSongFromRam(index) {
    if (sounds[index] instanceof File)
        return;
    try {
        sounds[index].unload();
    }
    catch (_a) { }
    sounds[index] = sounds[index].sourceFile;
}
function updateFileSizeDisplay(index, bytes) {
    const megabytes = (bytes / 1048576).toFixed(2);
    fileSizeDisplays[index].textContent = `${megabytes} MB`;
    fileSizeDisplays[index].setAttribute('title', `${bytes} bytes`);
}
function refreshSongNames() {
    for (var i = 0; i < sounds.length; i++) {
        fileNameDisplays[i].textContent = sounds[i].name;
        fileNameDisplays[i].setAttribute('title', sounds[i].name);
    }
}
function setCurrentFileName(name) {
    if (CURRENT_FILE_NAME.textContent != name) {
        CURRENT_FILE_NAME.textContent = name; //name is compressed by CSS formatting if too large
        CURRENT_FILE_NAME.setAttribute('title', name);
        document.title = name;
    }
}
function updateSeekButtonTexts() {
    document.querySelectorAll('button').forEach(element => {
        const secondsSkipAmount = precisionRound(10 * PLAY_RATE.value, 3);
        element.textContent = `${element.textContent[0]}${secondsSkipAmount} Seconds`;
    });
}
function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}
function setProgress(progressEvent, index) {
    fileSizeDisplays[index].textContent = `${(progressEvent.loaded / 1024000).toFixed(2)}/${(progressEvent.total / 1024000).toFixed(2)} MB`;
}
function changeStatus(status) { STATUS_TEXT.textContent = status; }
function isUnloaded(sound) { var _a; return sound === null || sound instanceof File || ((_a = sound === null || sound === void 0 ? void 0 : sound.state) === null || _a === void 0 ? void 0 : _a.call(sound)) != 'loaded'; }
function isLoading(sound) { var _a; return ((_a = sound === null || sound === void 0 ? void 0 : sound.state) === null || _a === void 0 ? void 0 : _a.call(sound)) == 'loading'; }
function isSongRepeating() { return REPEAT_BUTTON.checked; }
function onRangeInput(elem, func) { elem.addEventListener('input', func, { passive: true }); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function isCurrentSoundPaused() { var _a, _b; return !((_b = (_a = sounds[currentSongIndex]) === null || _a === void 0 ? void 0 : _a.playing) === null || _b === void 0 ? void 0 : _b.call(_a)); }
function getInMegabytes(bytes) { return (bytes / 1048576).toFixed(2); }
function getFileExtension(fileName) { return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(); }
/*            TABLE INTERACTION FUNCTIONS             */
function initializeRowEvents(row) {
    row.setAttribute('draggable', 'true');
    row.addEventListener('click', onSingleClick, { passive: true });
    // row.addEventListener('contextmenu', onRightClick);
    row.addEventListener('dblclick', onDoubleClick, { passive: true });
    row.addEventListener('dragstart', (event) => {
        if (onlyFiles(event.dataTransfer))
            return;
        if (selectedRows.length == 0)
            selectRow(row);
        event.dataTransfer.clearData();
        event.dataTransfer.setData("text/plain", "action:reorganizingPlaylist");
        whileDraggingRows(event);
    });
    row.addEventListener('dragover', (event) => {
        event.preventDefault(); //required to make rows allowed drop targets
        whileDraggingRows(event);
    });
    row.addEventListener('drop', onDropRow);
}
function whileDraggingRows(event) {
    if (onlyFiles(event.dataTransfer))
        return;
    stopHighlightingRow();
    hoveredRowInDragAndDrop = event.target;
    if (!rowValid(hoveredRowInDragAndDrop)) {
        hoveredRowInDragAndDrop = tryFindTableRowInParents(hoveredRowInDragAndDrop);
        if (!rowValid(hoveredRowInDragAndDrop))
            return hoveredRowInDragAndDrop = null;
    }
    hoveredRowInDragAndDrop.style.borderBottomColor = "blue";
    event.stopPropagation();
}
function onDropRow(event) {
    if (event.dataTransfer.getData("text/plain") != "action:reorganizingPlaylist")
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
}
function stopHighlightingRow() {
    if (hoveredRowInDragAndDrop != null) {
        hoveredRowInDragAndDrop.style.borderBottomColor = "";
        hoveredRowInDragAndDrop.style.borderTopColor = "";
    }
}
function onSingleClick(pointerEvent) {
    let row = pointerEvent.target;
    if (!rowValid(row)) {
        row = tryFindTableRowInParents(row);
        if (!rowValid(row))
            return;
    }
    const indexOf = selectedRows.indexOf(row);
    if (pointerEvent.ctrlKey) {
        if (indexOf != -1)
            return deselectRow(row, indexOf);
    }
    else if (pointerEvent.shiftKey && selectedRows.length != 0) {
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
    }
    else {
        deselectAll();
    }
    selectRow(row);
}
// function onRightClick(pointerEvent){
//   let row = pointerEvent.target;
//   if(!rowValad(row)){
//     row = tryFindTableRowInParents(row);
//     if(!rowValad(row)) return;
//   }
//   pointerEvent.preventDefault();
//   openRowContextMenu(pointerEvent.clientX, pointerEvent.clientY, row);
// }
// function openRowContextMenu(clientX, clientY, row){
//   if(!selectedRows.includes(row)){
//     deselectAll();
//     selectRow(row);
//   }
//   const contextOptions = [];
//   if(selectedRows.length == 1) contextOptions.push({text: (currentSongIndex != selectedRows[0].rowIndex-1) ? "Play" : "Stop", action: () => playRow(selectedRows[0]) });
//   contextOptions.push({text: "Delete", action: deleteSelectedSongs});
//   spawnContextMenu(clientX, clientY, contextOptions, true);
// }
function selectRow(row) {
    if (selectedRows.includes(row))
        return;
    if (!rowValid(row)) {
        row = tryFindTableRowInParents(row);
        if (!rowValid(row))
            return;
    }
    row.style.backgroundColor = RowColors.SELECTING;
    selectedRows.push(row);
    row.scrollIntoViewIfNeeded();
}
function onDoubleClick(pointerEvent) {
    deselectAll();
    playRow(pointerEvent.target);
}
/** @param removeIndex (-1) = won't remove any elems from array */
function deselectRow(row, removeIndex) {
    row.style.backgroundColor = RowColors.NONE;
    if (removeIndex >= 0)
        selectedRows.splice(removeIndex, 1);
}
function deselectAll() {
    for (let i = 0; i < selectedRows.length; i++)
        deselectRow(selectedRows[i], -1);
    selectedRows = [];
}
function playRow(row) {
    if (!rowValid(row)) {
        row = tryFindTableRowInParents(row);
        if (!rowValid(row))
            return;
    }
    const index = row.rowIndex - 1;
    filePlayingCheckboxes[index].checked = !filePlayingCheckboxes[index].checked;
    playSpecificSong(index);
}
function deleteSelectedSongs() {
    for (let i = 0; i < selectedRows.length; i++) {
        const index = selectedRows[i].rowIndex - 1;
        if (index == currentSongIndex) {
            filePlayingCheckboxes[currentSongIndex].checked = false;
            playSpecificSong(currentSongIndex); //stop playing
            PROGRESS_BAR.value = 0;
        }
        const tableBody = PLAYLIST_VIEWER_TABLE.firstElementChild;
        tableBody.removeChild(selectedRows[i]);
        for (let i = 0; i < sounds.length; i++) {
            if (sounds[i] != sounds[index] && sounds[i].nativeIndex >= sounds[index].nativeIndex) { //warning: branch prediction failure
                --sounds[i].nativeIndex;
                if (sounds[i] instanceof Howl)
                    --sounds[i].sourceFile.nativeIndex;
            }
        }
        if (currentSongIndex != null && currentSongIndex > index)
            --currentSongIndex;
        sounds.splice(index, 1);
        filePlayingCheckboxes.splice(index, 1);
        fileNameDisplays.splice(index, 1);
        fileSizeDisplays.splice(index, 1);
    }
    selectedRows = [];
    updateSongNumberings();
    refreshPreloadedSongs();
}
function moveSelectedSongs(toIndex) {
    for (let i = selectedRows.length - 1; i >= 0; i--) {
        const index = selectedRows[i].rowIndex - 1;
        // if(index == currentSongIndex){
        //   filePlayingCheckboxes[currentSongIndex].checked = false;
        //   playSpecificSong(currentSongIndex); //stop playing
        // }
        const tableBody = PLAYLIST_VIEWER_TABLE.firstElementChild;
        tableBody.removeChild(selectedRows[i]);
        for (let i = 0; i < sounds.length; i++) {
            if (sounds[i] != sounds[index] && sounds[i].nativeIndex >= sounds[index].nativeIndex) { //warning: branch prediction failure
                --sounds[i].nativeIndex;
                if (sounds[i] instanceof Howl)
                    --sounds[i].sourceFile.nativeIndex;
            }
        }
        if (index < currentSongIndex)
            --currentSongIndex;
        if (currentSongIndex == index)
            currentSongIndex = toIndex;
        sounds.splice(toIndex, 0, sounds.splice(index, 1)[0]);
        filePlayingCheckboxes.splice(toIndex, 0, filePlayingCheckboxes.splice(index, 1)[0]);
        fileNameDisplays.splice(toIndex, 0, fileNameDisplays.splice(index, 1)[0]);
        fileSizeDisplays.splice(toIndex, 0, fileSizeDisplays.splice(index, 1)[0]);
        tableBody.insertBefore(selectedRows[i], tableBody.children[toIndex + 1]);
        for (let i = 0; i < sounds.length; i++) {
            if (sounds[i] != sounds[toIndex] && sounds[i].nativeIndex >= sounds[toIndex].nativeIndex) { //warning: branch prediction failure
                ++sounds[i].nativeIndex;
                if (sounds[i] instanceof Howl)
                    ++sounds[i].sourceFile.nativeIndex;
            }
        }
        if (toIndex < currentSongIndex)
            ++currentSongIndex;
    }
    deselectAll();
    updateSongNumberings();
    refreshPreloadedSongs();
}
function selectionLogicForKeyboard(keyboardEvent) {
    if (selectedRows.length == 0)
        return;
    switch (keyboardEvent.code) {
        case "Escape": return deselectAll();
        case "ArrowUp": return arrowSelection(keyboardEvent, -1);
        case "ArrowDown": return arrowSelection(keyboardEvent, 1);
        case "Backspace":
        case "Delete": return deleteSongsFromKeyboard(keyboardEvent);
        case "Space":
        case "Enter": return startPlayingFromKeyboard(keyboardEvent);
    }
}
function arrowSelection(keyboardEvent, indexIncrement) {
    keyboardEvent.preventDefault();
    sortSelectedRows();
    if (isTyping(keyboardEvent))
        return;
    if (keyboardEvent.ctrlKey || keyboardEvent.shiftKey) {
        if (indexIncrement > 0) {
            const row = PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + indexIncrement];
            if (row)
                selectRow(row);
        }
        else {
            deselectRow(selectedRows[selectedRows.length - 1], selectedRows.length - 1);
        }
    }
    else {
        const oneElement = (indexIncrement > 0) ? PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + 1] : PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex - 1];
        if (!rowValid(oneElement))
            return;
        deselectAll();
        selectRow(oneElement);
    }
}
function deleteSongsFromKeyboard(keyboardEvent) { if (!isTyping(keyboardEvent))
    deleteSelectedSongs(); }
function startPlayingFromKeyboard(keyboardEvent) {
    if (isTyping(keyboardEvent) || selectedRows.length != 1)
        return;
    keyboardEvent.preventDefault();
    playRow(selectedRows[0]);
    deselectAll();
}
function tryFindTableRowInParents(element) {
    return element.closest('tr');
}
function updateSongNumberings() {
    let songNumbers = document.getElementsByClassName('songNumber');
    for (let i = 0; i < songNumbers.length; i++) {
        let songNumber = songNumbers[i];
        let row = tryFindTableRowInParents(songNumber);
        if (row == null)
            continue;
        songNumber.textContent = `${row.rowIndex}. `;
    }
}
function rowValid(row) { return row instanceof HTMLTableRowElement && row != PLAYLIST_VIEWER_TABLE.rows[0] && row.closest('table') == PLAYLIST_VIEWER_TABLE; }
function sortSelectedRows() { selectedRows.sort((a, b) => a.rowIndex - b.rowIndex); }
function isTyping(keyboardEvent) { return keyboardEvent.target instanceof HTMLInputElement; }
/*                       CONTEXT MENU                      */
const CONTEXT_MENU = document.getElementById('rightClickContextMenu');
function initContextMenu() {
    document.addEventListener('contextmenu', (pointerEvent) => {
        pointerEvent.preventDefault();
        selectingSongRow: { //if clicking a row
            let row = pointerEvent.target;
            if (!rowValid(row)) {
                row = tryFindTableRowInParents(row);
                if (!rowValid(row))
                    break selectingSongRow;
            }
            if (!selectedRows.includes(row)) {
                deselectAll();
                selectRow(row);
            }
            const contextOptions = [];
            if (selectedRows.length == 1)
                contextOptions.push({ text: (currentSongIndex != selectedRows[0].rowIndex - 1) ? "Play" : "Stop", action: () => playRow(selectedRows[0]) });
            contextOptions.push({ text: "Delete", action: deleteSelectedSongs });
            return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, contextOptions, true);
        }
        switch (pointerEvent.target.getAttribute('data-onRightClick')) {
            case "uploadFileMenu": {
                return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [
                    { text: "Upload Files", icon: "../Icons/UploadIcon.svg", action: () => UPLOAD_BUTTON.dispatchEvent(new MouseEvent('click')) },
                    { text: "Upload Folder", icon: "../Icons/UploadIcon.svg", action: () => UPLOAD_DIRECTORY_BUTTON.dispatchEvent(new MouseEvent('click')) }
                ], false);
            }
            default: {
                return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [], true);
            }
        }
    });
}
function spawnContextMenu(clientX, clientY, contextOptions, allowDefaultOptions) {
    let childElement;
    while ((childElement = CONTEXT_MENU.lastChild) != null) {
        CONTEXT_MENU.removeChild(childElement);
    }
    if (allowDefaultOptions) {
        contextOptions = contextOptions.concat([{ text: COMPACT_MODE_TOGGLE.checked ? "Disable Compact Mode" : "Enable Compact Mode", action: () => { COMPACT_MODE_TOGGLE.dispatchEvent(new MouseEvent('click')); } }]);
    }
    for (let i = 0; i < contextOptions.length; i++) {
        const contextOption = contextOptions[i];
        const contextButton = document.createElement('div');
        contextButton.setAttribute('class', 'contextOption');
        if (i < contextOptions.length - 1)
            contextButton.style.borderBottomWidth = "1px";
        contextButton.addEventListener('click', (event) => { if (CONTEXT_MENU.getAttribute('open') == 'true')
            contextOption.action(event); });
        if (contextOption.icon) {
            const contextIcon = document.createElement('img');
            contextIcon.setAttribute('class', 'contextIcon');
            contextIcon.src = contextOption.icon;
            contextButton.append(contextIcon, contextOption.text);
        }
        else {
            contextButton.innerText = contextOption.text;
        }
        CONTEXT_MENU.appendChild(contextButton);
    }
    CONTEXT_MENU.style.height = `${contextOptions.length * 29}px`;
    let leftOffset = clientX + 2, downOffset = clientY + 2;
    const viewportWidth = document.documentElement.clientWidth, viewportHeight = document.documentElement.clientHeight, contextMenuRect = CONTEXT_MENU.getBoundingClientRect();
    if (leftOffset + contextMenuRect.width > viewportWidth) {
        leftOffset = viewportWidth - contextMenuRect.width;
    }
    if (downOffset + contextMenuRect.height > viewportHeight) {
        downOffset = viewportHeight - contextMenuRect.height;
    }
    CONTEXT_MENU.style.left = `${leftOffset}px`;
    CONTEXT_MENU.style.top = `${downOffset}px`;
    CONTEXT_MENU.setAttribute('open', 'true');
}
function closeContextMenu() { CONTEXT_MENU.setAttribute('open', 'false'); CONTEXT_MENU.style.height = '0'; }
;
//# sourceMappingURL=PlaylistCreator.js.map