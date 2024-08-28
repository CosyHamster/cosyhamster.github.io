"use strict";
//@ts-expect-error
import("./howler.js").catch((error) => {
    console.warn(error + "\nLoading Howler using script element instead.");
    let howlerScript = document.createElement('script');
    howlerScript.src = "../Javascript/howler.js";
    document.head.appendChild(howlerScript);
});
const SITE_DEPRECATED = document.URL.toLowerCase().includes('codehs') || document.URL.includes("127.0.0.1");
var ON_MOBILE;
//@ts-expect-error
if (navigator.userAgentData)
    ON_MOBILE = navigator.userAgentData.mobile;
else {
    //@ts-expect-error
    let userAgent = navigator.userAgent || navigator.vendor || window.opera;
    /* cspell: disable-next-line */
    ON_MOBILE = (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(userAgent.substring(0, 4)));
}
class SongLoader {
    constructor(song) {
        this.fileReader = new FileReader();
        this.song = song;
    }
    loadSong() {
        return new Promise((resolve, reject) => {
            if (!this.finishedLoadingAbortController) {
                this.finishedLoadingAbortController = new AbortController();
            }
            else {
                if (this.finishedLoadingAbortController.signal.aborted) {
                    if (this.song.howl)
                        resolve(this.song.howl);
                    else
                        reject("Failed to find howl when attempting to load song from a completed SongLoader.");
                    return;
                }
                else {
                    this.finishedLoadingAbortController.signal.addEventListener('abort', () => {
                        if (this.song.howl)
                            resolve(this.song.howl);
                        else
                            reject("Failed to find howl after waiting for previous load to finish.");
                    }, { once: true });
                    return;
                }
            }
            const onProgress = (progressEvent) => {
                if (sounds[currentSongIndex].file == this.song.file)
                    PROGRESS_BAR.value = (100 * progressEvent.loaded) / progressEvent.total;
                fileSizeDisplays[this.song.currentRow.rowIndex - 1].textContent = `${getInMegabytes(progressEvent.loaded)} MB / ${getInMegabytes(this.song.file.size)} MB`;
                fileSizeDisplays[this.song.currentRow.rowIndex - 1].setAttribute('title', `${progressEvent.loaded} bytes / ${this.song.file.size} bytes`);
            };
            const onLoaded = () => {
                resolve(this.createHowl());
                this.triggerAbort();
            };
            const errorFunc = (progressEvent) => {
                this.triggerAbort();
                switch (progressEvent.target.error.name) {
                    case "NotFoundError": {
                        displayError(progressEvent.target.error.name, "Failed to find file!", progressEvent.target.error.message, this.song.file.name);
                        break;
                    }
                    case "NotReadableError": {
                        displayError(progressEvent.target.error.name, "This file needs to be reimported to the playlist!", progressEvent.target.error.message, this.song.file.name);
                        break;
                    }
                    default: {
                        displayError(progressEvent.target.error.name, "Unknown Error!", progressEvent.target.error.message, this.song.file.name);
                        break;
                    }
                }
                reject(progressEvent.target.error.name);
            };
            const warnUser = () => {
                this.triggerAbort();
                reject(`File Aborted: ${this.song.file.name}`);
            };
            this.fileReader.addEventListener('progress', onProgress, { passive: true, signal: this.finishedLoadingAbortController.signal });
            this.fileReader.addEventListener('loadend', onLoaded, { passive: true, signal: this.finishedLoadingAbortController.signal });
            this.fileReader.addEventListener('error', errorFunc, { passive: true, signal: this.finishedLoadingAbortController.signal });
            this.fileReader.addEventListener('abort', warnUser, { passive: true, signal: this.finishedLoadingAbortController.signal });
            this.fileReader.readAsDataURL(this.song.file);
        });
    }
    ;
    quitLoading() {
        this.triggerAbort();
        this.fileReader.abort();
    }
    triggerAbort() {
        if (this.finishedLoadingAbortController) {
            this.finishedLoadingAbortController.abort();
        }
        setFileSizeDisplay(this.song.currentRow.rowIndex - 1, this.song.file.size);
    }
    createHowl() {
        const sound = new Howl({
            src: [this.fileReader.result],
            preload: PRELOAD_TYPE_SELECTOR.value === "process",
            autoplay: false,
            loop: false,
        });
        reapplySoundAttributes(sound);
        sound.on('end', () => {
            if (REPEAT_BUTTON.checked) {
                if (sounds[currentSongIndex].isInExistence() && !sounds[currentSongIndex].howl.playing()) {
                    sounds[currentSongIndex].howl.stop();
                    sounds[currentSongIndex].howl.play();
                }
                return;
            }
            jumpSong();
        }); //jump to next song when they end (or do custom stuff if needed)
        setFileSizeDisplay(this.song.currentRow.rowIndex - 1, this.song.file.size);
        return sound;
    }
}
class Song {
    constructor(file, nativeIndex, currentRow) {
        this.songLoader = null;
        this.howl = null;
        this.file = file;
        this.nativeIndex = nativeIndex;
        this.currentRow = currentRow;
    }
    async loadSong() {
        return new Promise(resolve => {
            if (this.howl) {
                resolve(true);
                return;
            }
            if (this.songLoader == null || this.songLoader.finishedLoadingAbortController.signal.aborted)
                this.songLoader = new SongLoader(this);
            else
                this.songLoader?.finishedLoadingAbortController?.signal?.addEventListener?.("abort", () => {
                    resolve(!!this.howl);
                });
            this.songLoader.loadSong().then(howl => {
                this.howl = howl;
                resolve(true);
            }, (error) => {
                console.warn("Failed loading song: " + this.file.name + ". Error: " + error);
                resolve(false);
            }).finally(() => {
                this.songLoader = null;
            });
        });
    }
    unload() {
        if (this.songLoader) {
            this.songLoader.quitLoading();
            this.songLoader = null;
        }
        if (this.howl) {
            this.howl.unload();
            this.howl = null;
        }
    }
    isPaused() {
        return this.isLoaded() && this.howl.playing() == false;
    }
    isLoaded() {
        return this.isInExistence() && this.howl.state() === "loaded";
    }
    isLoading() {
        return this.isInExistence() && this.howl.state() === "loading";
    }
    isInExistence() {
        return this.howl != null;
    }
    isUnloaded() {
        return !this.isInExistence() || this.howl.state() === "unloaded";
    }
}
class RegistrableEvent {
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
class KeyDownEventRegistrar extends RegistrableEvent {
    constructor() {
        super();
        window.addEventListener('keydown', key => this.callAllRegisteredFunctions({ keyEvent: key }), { passive: false });
    }
}
class RequestAnimationFrameEventRegistrar extends RegistrableEvent {
    constructor() {
        super();
        RequestAnimationFrameEventRegistrar.raf((timestamp) => this.handleRAFCall(timestamp));
    }
    handleRAFCall(timestamp) {
        this.callAllRegisteredFunctions({ timestamp: timestamp });
        RequestAnimationFrameEventRegistrar.raf((timestamp) => this.handleRAFCall(timestamp));
    }
}
// @ts-expect-error
RequestAnimationFrameEventRegistrar.raf = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame).bind(window);
/** Splits inputted seconds into hours, minutes, & seconds. toString() returns the time in digital format. */
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
        this.phase = 0 /* PhaseType.COLLECTING */;
        this.dataTransferItemList = dataTransferItemList;
    }
    async retrieveContents() {
        return new Promise(async (resolve) => {
            if (this.files.length > 0)
                resolve(this.files);
            let fileEntryArray = []; //collect all file entries that need to be scanned
            //@ts-expect-error
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
            ;
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
var REQUEST_ANIMATION_FRAME_EVENT = new RequestAnimationFrameEventRegistrar(), KEY_DOWN_EVENT = new KeyDownEventRegistrar(), StatusTexts = {
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
}, PAUSED = false, PLAYING = true, PLAYLIST_VIEWER_TABLE = document.getElementById("Playlist_Viewer"), PRELOAD_DIST_ELEMENT = document.getElementById('preloadDistance'), PRELOAD_TYPE_SELECTOR = document.getElementById("preloadType"), COMPACT_MODE_LINK_ELEMENT = null, //document.getElementById('compactModeStyleLink'),
COMPACT_MODE_TOGGLE = document.getElementById('compactMode'), SEEK_DURATION_NUMBER_INPUT = document.getElementById('seekDuration'), SEEK_DURATION_DISPLAY = document.getElementById("seekDurationDisplay"), SEEK_DISTANCE_PROPORTIONAL_CHECKBOX = document.getElementById('seekDistanceProportional'), SKIP_UNPLAYABLE_CHECKBOX = document.getElementById('skipUnplayable'), REORDER_FILES_CHECKBOX = document.getElementById('reorderFiles'), UPLOAD_BUTTON = document.getElementById('0input'), UPLOAD_DIRECTORY_BUTTON = document.getElementById('inputDirectory'), PLAY_RATE_RANGE = document.getElementById('0playRateSlider'), SETTINGS_PAGE = document.getElementById('settingsPage'), ERROR_POPUP = document.getElementById('errorPopup'), DEPRECATED_POPUP = document.getElementById('deprecatedPopup'), ERROR_LIST = document.getElementById('errorList'), CONTEXT_MENU = document.getElementById('rightClickContextMenu'), PROGRESS_BAR = document.getElementById('progress-bar'), HOVERED_TIME_DISPLAY = document.getElementById('hoveredTimeDisplay'), VOLUME_CHANGER = document.getElementById('0playVolume'), PLAY_RATE = document.getElementById('0playRate'), PLAY_PAN = document.getElementById('0playPan'), SEEK_BACK = document.getElementById('seekBack'), SEEK_FORWARD = document.getElementById('seekForward'), REPEAT_BUTTON = document.getElementById('repeatButton'), REPEAT_BUTTON_IMAGE = document.getElementById("repeatButtonImg"), SHUFFLE_BUTTON = document.getElementById('shuffleButton'), MUTE_BUTTON = document.getElementById('0Mute'), PLAY_BUTTON = document.getElementById('playpause'), STATUS_TEXT = document.getElementById('0status'), CURRENT_FILE_NAME = document.getElementById('currentFileName'), DURATION_OF_SONG_DISPLAY = document.getElementById('secondDurationLabel'), DROPPING_FILE_OVERLAY = document.getElementById("dragOverDisplay");
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
/* start */ (() => {
    if ("serviceWorker" in navigator && !SITE_DEPRECATED) {
        navigator.serviceWorker.register("../ServiceWorker.js");
    }
    KEY_DOWN_EVENT.register(closeContextMenu);
    KEY_DOWN_EVENT.register(selectionLogicForKeyboard);
    REQUEST_ANIMATION_FRAME_EVENT.register(onFrameStepped);
    makeDocumentDroppable();
    // document.addEventListener('touchend', (touchEvent: TouchEvent) => {
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
    document.addEventListener("beforeunload", function () {
        quitPlayingMusic();
        sounds = [];
    }, { passive: true });
    initContextMenu();
    registerClickEvent(document, (mouseEvent) => {
        closeContextMenu();
        if (mouseEvent.target == document.querySelector("html") || mouseEvent.target == document.body)
            deselectAll();
    });
    registerClickEvent('skipBack', () => jumpSong(-1));
    registerClickEvent('skipForward', () => jumpSong());
    registerClickEvent('seekBack', () => seek(parseFloat(SEEK_BACK.getAttribute('seekDirection'))));
    registerClickEvent('seekForward', () => seek(parseFloat(SEEK_FORWARD.getAttribute('seekDirection'))));
    registerClickEvent(CURRENT_FILE_NAME, () => PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1].scrollIntoView(false));
    registerClickEvent('settingsButton', async () => SETTINGS_PAGE.showModal());
    registerClickEvent('exitSettingsButton', async () => SETTINGS_PAGE.close());
    registerClickEvent('exitErrorPopup', async () => ERROR_POPUP.close());
    registerClickEvent('exitDeprecatedPopup', async () => DEPRECATED_POPUP.close());
    registerChangeEvent(PLAY_BUTTON, () => pauseOrUnpauseCurrentSong(!PLAY_BUTTON.checked));
    registerChangeEvent(COMPACT_MODE_TOGGLE, toggleCompactMode);
    registerChangeEvent(REORDER_FILES_CHECKBOX, () => {
        const checked = REORDER_FILES_CHECKBOX.checked;
        const rows = PLAYLIST_VIEWER_TABLE.rows;
        for (let i = PLAYLIST_VIEWER_TABLE.rows.length - 1; i > 0; i--) { //purposely exclude last index. that is the header for the table
            rows[i].draggable = checked;
        }
    });
    registerChangeEvent(MUTE_BUTTON, () => { if (sounds[currentSongIndex].isInExistence())
        sounds[currentSongIndex].howl.mute(MUTE_BUTTON.checked); });
    registerChangeEvent(REPEAT_BUTTON, () => {
        const checked = REPEAT_BUTTON.checked;
        if (currentSongIndex !== null && sounds[currentSongIndex].isInExistence())
            sounds[currentSongIndex].howl.loop(checked);
        if (checked)
            REPEAT_BUTTON_IMAGE.src = "../Icons/Repeat1Icon.svg";
        else
            REPEAT_BUTTON_IMAGE.src = "../Icons/RepeatIcon.svg";
    });
    registerChangeEvent(SHUFFLE_BUTTON, () => handleShuffleButton(SHUFFLE_BUTTON.checked));
    registerChangeEvent(PLAY_RATE, () => onPlayRateUpdate(parseFloat(PLAY_RATE.value)));
    registerChangeEvent(UPLOAD_BUTTON, () => importFiles(UPLOAD_BUTTON.files));
    registerChangeEvent(UPLOAD_DIRECTORY_BUTTON, () => importFiles(UPLOAD_DIRECTORY_BUTTON.files));
    registerInputEvent(PLAY_RATE_RANGE, () => { onPlayRateUpdate(parseFloat(PLAY_RATE_RANGE.value)); });
    registerInputEvent(PRELOAD_DIST_ELEMENT, () => { PRELOAD_DIST_ELEMENT.labels[0].textContent = `Value: ${PRELOAD_DIST_ELEMENT.value}`; });
    registerInputEvent(PLAY_PAN, () => { if (sounds[currentSongIndex].howl)
        PLAY_PAN.labels[0].textContent = `${Math.floor(Number(PLAY_PAN.value) * 100)}%`; sounds[currentSongIndex].howl.stereo(Number(PLAY_PAN.value)); });
    registerInputEvent(VOLUME_CHANGER, () => { if (sounds[currentSongIndex].howl)
        VOLUME_CHANGER.labels[0].textContent = `${Math.floor(Number(VOLUME_CHANGER.value) * 100)}%`; sounds[currentSongIndex].howl.volume(Number(VOLUME_CHANGER.value)); });
    ERROR_POPUP.addEventListener("close", onCloseErrorPopup);
    SEEK_DURATION_NUMBER_INPUT.addEventListener('input', updateSeekDurationDisplay, { passive: true });
    PROGRESS_BAR.addEventListener('pointerenter', (pointer) => progressBarSeek(pointer, 1 /* ProgressBarSeekAction.DISPLAY_TIME */), { passive: true });
    PROGRESS_BAR.addEventListener('pointerdown', (pointer) => { if (pointer.button == 0)
        progressBarSeek(pointer, 0 /* ProgressBarSeekAction.SEEK_TO */); }, { passive: true });
    PROGRESS_BAR.addEventListener('pointermove', (pointer) => progressBarSeek(pointer, 1 /* ProgressBarSeekAction.DISPLAY_TIME */), { passive: true });
    PROGRESS_BAR.addEventListener('pointerleave', (pointer) => progressBarSeek(pointer, 2 /* ProgressBarSeekAction.STOP_DISPLAYING */), { passive: true });
    if (SITE_DEPRECATED)
        DEPRECATED_POPUP.showModal();
    REORDER_FILES_CHECKBOX.dispatchEvent(new MouseEvent('click')); //.checked = !ON_MOBILE;
    SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked = true;
    SKIP_UNPLAYABLE_CHECKBOX.checked = true;
    //END
})();
function makeDocumentDroppable() {
    window.addEventListener("dragover", (event) => {
        if (!onlyFiles(event.dataTransfer))
            return;
        event.preventDefault();
        DROPPING_FILE_OVERLAY.toggleAttribute("draggingOver", true);
        stopHighlightingRow();
    });
    window.addEventListener("dragleave", () => {
        DROPPING_FILE_OVERLAY.toggleAttribute("draggingOver", false);
        stopHighlightingRow();
    }, { passive: true });
    window.addEventListener("drop", (event) => {
        const dataTransfer = event.dataTransfer;
        if (!onlyFiles(dataTransfer))
            return;
        event.preventDefault();
        DROPPING_FILE_OVERLAY.toggleAttribute("draggingOver", false);
        stopHighlightingRow();
        importFiles(dataTransfer);
    });
}
function onCloseErrorPopup() {
    let childElement;
    while ((childElement = ERROR_LIST.lastChild) != null) {
        ERROR_LIST.removeChild(childElement);
    }
}
function registerClickEvent(element, func) {
    if (typeof element === 'string')
        element = document.getElementById(element);
    element.addEventListener('click', func, { passive: true });
}
function registerChangeEvent(element, func) {
    if (typeof element === 'string')
        element = document.getElementById(element);
    element.addEventListener('change', func, { passive: true });
}
function registerInputEvent(elem, func) {
    elem.addEventListener('input', func, { passive: true });
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
    const fileSize = document.createElement('div');
    fileSize.setAttribute('class', 'songName test');
    fileSize.setAttribute('style', 'position: absolute; transform: translate(-100%, 0); left: calc(100% - 3px);');
    fileSize.setAttribute('id', `${index}playButtonLabel`);
    const songName = document.createElement('div');
    songName.setAttribute('class', 'songName text');
    songName.setAttribute('title', `${fileName}`);
    songName.textContent = fileName;
    const songNumber = document.createElement('div');
    songNumber.textContent = `${sounds.length + 1}. `;
    setAttributes(songNumber, {
        style: 'float: left; display: inline-block;',
        class: 'songNumber text',
        index: String(index)
    });
    const playButton = document.createElement('label');
    playButton.setAttribute('class', 'smallplaypause playpause');
    playButton.setAttribute('for', `${index}playButton`);
    const checkbox = document.createElement('input');
    registerChangeEvent(checkbox, () => onClickSpecificPlaySong(checkbox));
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
async function toggleCompactMode() {
    if (COMPACT_MODE_LINK_ELEMENT === null) {
        COMPACT_MODE_LINK_ELEMENT = document.createElement('link');
        setAttributes(COMPACT_MODE_LINK_ELEMENT, {
            rel: "stylesheet",
            href: "../CSS/CompactMode.css",
        });
        document.head.appendChild(COMPACT_MODE_LINK_ELEMENT);
    }
}
function onFrameStepped() {
    if (skipSongQueued) {
        skipSongQueued = false;
        filePlayingCheckboxes[(currentSongIndex + 1) % filePlayingCheckboxes.length].dispatchEvent(new MouseEvent('click'));
        ;
    }
    PRELOAD_DIST_ELEMENT.max = String(Math.max(sounds.length - 1, 1));
    if (COMPACT_MODE_LINK_ELEMENT?.sheet) {
        // if(COMPACT_MODE_TOGGLE.disabled) COMPACT_MODE_TOGGLE.disabled = false;
        if (COMPACT_MODE_LINK_ELEMENT.sheet.disabled == COMPACT_MODE_TOGGLE.checked) //if disabled needs to be updated with checkbox (checked is enabled, unchecked is disabled)
            COMPACT_MODE_LINK_ELEMENT.sheet.disabled = !COMPACT_MODE_TOGGLE.checked;
    }
    if (currentSongIndex === null || !sounds[currentSongIndex].isLoaded())
        return cannotUpdateProgress(sounds[currentSongIndex]?.isLoading?.());
    else if (sounds[currentSongIndex].howl.playing() && (STATUS_TEXT.textContent == StatusTexts.PROCESSING || STATUS_TEXT.textContent == StatusTexts.DOWNLOADING))
        onLatePlayStart();
    let songDuration = sounds[currentSongIndex].howl.duration();
    let currentTime = sounds[currentSongIndex].howl.seek();
    const timeToSet = (currentTime / songDuration) * 100;
    if (Number.isFinite(timeToSet))
        PROGRESS_BAR.value = timeToSet;
    updateCurrentTimeDisplay(currentTime, songDuration);
    updateRowColor(PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1]);
}
function onLatePlayStart() {
    changeStatus(StatusTexts.PLAYING);
    reapplySoundAttributes(sounds[currentSongIndex].howl);
}
function cannotUpdateProgress(isProcessing) {
    if (isProcessing)
        changeStatus(StatusTexts.PROCESSING);
    if (DURATION_OF_SONG_DISPLAY.textContent != "00:00")
        DURATION_OF_SONG_DISPLAY.textContent = "00:00";
    if (HOVERED_TIME_DISPLAY.style.left != '-9999px')
        HOVERED_TIME_DISPLAY.style.left = '-9999px';
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
    if (HOVERED_TIME_DISPLAY.hasAttribute('inUse'))
        return;
    const progressBarDomRect = PROGRESS_BAR.getBoundingClientRect();
    if (progressBarDomRect.top + 50 < 0)
        return; //return if you scrolled away from the progress bar (+50 to include the hoveredTimeDisplay)
    const currentTimeString = new Time(currentTime).toString();
    if (HOVERED_TIME_DISPLAY.children[0].textContent != currentTimeString)
        HOVERED_TIME_DISPLAY.children[0].textContent = currentTimeString;
    const beginningOfProgressBar = (progressBarDomRect.left - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2) + scrollX;
    const pixelsAcrossProgressBar = (progressBarDomRect.width * currentTime / songDurationInSeconds) - 1;
    HOVERED_TIME_DISPLAY.style.top = `${progressBarDomRect.top + scrollY}px`;
    HOVERED_TIME_DISPLAY.style.left = `${beginningOfProgressBar + pixelsAcrossProgressBar}px`;
}
function progressBarSeek(mouse, hoverType) {
    if (currentSongIndex === null || !sounds[currentSongIndex].isInExistence() || (mouse?.pointerType == "touch" && hoverType !== 0 /* ProgressBarSeekAction.SEEK_TO */) || hoverType === 2 /* ProgressBarSeekAction.STOP_DISPLAYING */) {
        HOVERED_TIME_DISPLAY.toggleAttribute('inUse', false);
        return;
    }
    const offsetX = mouse.offsetX, progressBarWidth = PROGRESS_BAR.clientWidth, currentSongLength = sounds[currentSongIndex].howl.duration();
    let seekToTime = Math.max(offsetX * (currentSongLength / progressBarWidth), 0);
    switch (hoverType) {
        case (0 /* ProgressBarSeekAction.SEEK_TO */): {
            sounds[currentSongIndex].howl.seek(seekToTime);
            return;
        }
        case (1 /* ProgressBarSeekAction.DISPLAY_TIME */): {
            HOVERED_TIME_DISPLAY.toggleAttribute('inUse', true);
            HOVERED_TIME_DISPLAY.style.left = `${(mouse.x - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2) + 1}px`;
            HOVERED_TIME_DISPLAY.firstChild.textContent = new Time(seekToTime).toString();
            return;
        }
    }
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
    songError.textContent = errorType.concat(": ", errorText);
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
    if (sounds[currentSongIndex].isUnloaded())
        return;
    const seekDuration = parseFloat(SEEK_DURATION_NUMBER_INPUT.value) * seekDirection;
    const numToAdd = (SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked) ? seekDuration * parseFloat(PLAY_RATE.value) : seekDuration;
    const currentTime = sounds[currentSongIndex].howl.seek();
    sounds[currentSongIndex].howl.seek(Math.max(currentTime + numToAdd, 0));
}
async function importFiles(element) {
    const songTableRows = [];
    if (element instanceof FileList) {
        addFiles(element);
    }
    else if (element instanceof DataTransfer) {
        let dataTransferItemList = element?.items;
        if (!dataTransferItemList || dataTransferItemList.length == 0)
            return;
        changeStatus(StatusTexts.RETRIEVING);
        let fileReceiver = new DataTransferItemGrabber(dataTransferItemList);
        addFiles(await fileReceiver.retrieveContents());
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
            if (SKIP_UNPLAYABLE_CHECKBOX.checked && !isValidExtension(fileExtension)) {
                displayError("TypeError", `The file type '${fileExtension}' is unsupported.`, "This file is unsupported and cannot be imported!", file.name);
                ++offsetBecauseOfSkipped;
                continue;
            }
            const nativeIndex = i + lengthBeforeBegin - offsetBecauseOfSkipped;
            const tableRow = createNewSong(file.name, nativeIndex);
            const song = new Song(file, nativeIndex, tableRow);
            songTableRows.push(tableRow); //index (2nd parameter) is used to number the checkboxes
            setFileSizeDisplay(nativeIndex, file.size);
            sounds.push(song);
        }
        const QUANTUM = 32768;
        const playlistTableBody = PLAYLIST_VIEWER_TABLE.tBodies[0];
        for (let i = 0; i < songTableRows.length; i += QUANTUM) {
            playlistTableBody.append(...songTableRows.slice(i, Math.min(i + QUANTUM, songTableRows.length)));
        }
        changeStatus(`${files.length - offsetBecauseOfSkipped} files added!`);
    }
}
function onPlayRateUpdate(newRate) {
    let stringRate = String(newRate);
    PLAY_RATE_RANGE.value = stringRate;
    PLAY_RATE.value = stringRate;
    if (!sounds[currentSongIndex].isInExistence())
        return;
    if (newRate <= 0) {
        sounds[currentSongIndex].howl.pause(); //the rate cant be set to 0. the progress tracker will glitch back to 0.
        return;
    }
    if (sounds[currentSongIndex].isPaused() && STATUS_TEXT.textContent == StatusTexts.PLAYING) {
        const currentTime = sounds[currentSongIndex].howl.seek();
        sounds[currentSongIndex].howl.rate(newRate);
        sounds[currentSongIndex].howl.play(); //this starts the song over
        sounds[currentSongIndex].howl.seek(currentTime); //jump back to where we were
        return;
    }
    sounds[currentSongIndex].howl.rate(newRate);
}
function updateSeekDurationDisplay() {
    let duration = Number(SEEK_DURATION_NUMBER_INPUT.value);
    if (duration < 1) {
        SEEK_DURATION_DISPLAY.textContent = `${duration * 1000} ms`;
    }
    else {
        SEEK_DURATION_DISPLAY.textContent = `${duration} sec`;
    }
}
function handleShuffleButton(enable) {
    if (enable) {
        shuffle();
        refreshSongNames();
        for (var i = 0; i < sounds.length; i++) {
            setFileSizeDisplay(i, sounds[i].file.size);
        }
        return;
    }
    let tempArray = sounds, foundCurrentPlayingSong = false;
    // sounds = [].fill(null, 0, tempArray.length);
    sounds = new Array(tempArray.length);
    for (var i = 0; i < tempArray.length; i++) {
        let sound = tempArray[i];
        sounds[sound.nativeIndex] = sound;
        setFileSizeDisplay(sound.nativeIndex, sound.file.size);
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
        tempForSwapping.currentRow = PLAYLIST_VIEWER_TABLE.rows[randomIndex + 1];
        sounds[randomIndex].currentRow = PLAYLIST_VIEWER_TABLE.rows[currentIndex + 1];
        sounds[randomIndex] = tempForSwapping;
    }
}
function onClickSpecificPlaySong(checkbox) {
    const index = tryFindTableRowInParents(checkbox).rowIndex - 1;
    startOrUnloadSong(index, checkbox.checked);
}
function startOrUnloadSong(index, startPlaying) {
    filePlayingCheckboxes.forEach(checkbox => { checkbox.checked = false; }); //uncheck the play button for all the other sounds except the one u chose
    filePlayingCheckboxes[index].checked = startPlaying;
    if (startPlaying)
        startPlayingSpecificSong(index);
    else
        quitPlayingMusic();
}
function quitPlayingMusic() {
    const currentRow = PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1];
    filePlayingCheckboxes[currentSongIndex].checked = false;
    PLAY_BUTTON.checked = false;
    currentSongIndex = null;
    PROGRESS_BAR.value = 0;
    for (var i = 0; i < sounds.length; i++)
        sounds[i].unload();
    Howler.stop();
    changeStatus(StatusTexts.STOPPED);
    updateRowColor(currentRow);
    return;
}
async function startPlayingSpecificSong(index) {
    if (sounds[index].isInExistence())
        sounds[index].howl.stop();
    Howler.stop();
    currentSongIndex = index;
    const soundName = sounds[index].file.name, fileExtension = getFileExtension(soundName);
    if (SKIP_UNPLAYABLE_CHECKBOX.checked && !isValidExtension(fileExtension)) {
        displayError("TypeError", `The file type '${fileExtension}' is unsupported.`, "This file is unsupported and cannot be played!", soundName);
        skipSongQueued = true;
        return;
    }
    changeStatus(StatusTexts.DOWNLOADING);
    let song = sounds[index];
    song.loadSong().then(succeeded => {
        if (succeeded)
            startPlayingSong(song);
    });
    refreshPreloadedSongs();
}
function startPlayingSong(song) {
    setCurrentFileName(song.file.name);
    reapplySoundAttributes(song.howl);
    if (Number(PLAY_RATE.value) != 0) {
        if (song.isUnloaded())
            song.howl.load();
        song.howl.play();
        PLAY_BUTTON.checked = PLAYING;
    }
}
function refreshPreloadedSongs() {
    if (currentSongIndex === null)
        return;
    for (let i = 0; i < sounds.length; i++) {
        if (currentSongIndex === i)
            continue;
        if (!isIndexInRangeOfCurrent(i)) {
            sounds[i].unload();
            continue;
        }
        sounds[i].loadSong();
    }
}
function isIndexInRangeOfCurrent(index) {
    const distance = parseInt(PRELOAD_DIST_ELEMENT.value);
    const withinRange = index >= (currentSongIndex - distance) && index <= (currentSongIndex + distance);
    const inRangeWrappedToBegin = (index + distance) >= sounds.length && ((index + distance) % sounds.length) >= currentSongIndex;
    const inRangeWrappedToEnd = index - distance < 0 && ((index - distance) + sounds.length) <= currentSongIndex;
    return withinRange || inRangeWrappedToBegin || inRangeWrappedToEnd;
}
function jumpSong(amount) {
    amount = amount ?? 1; //if no value inputted, assume u want to jump ahead one song
    currentSongIndex = (currentSongIndex + (sounds.length + amount)) % sounds.length;
    // currentSongIndex += amount
    // if (currentSongIndex > sounds.length - 1) currentSongIndex %= sounds.length;
    // else if (currentSongIndex < 0) currentSongIndex = Math.max(currentSongIndex + sounds.length, 0) //idk a real solution to this
    const playButtonToActivate = filePlayingCheckboxes[currentSongIndex];
    playButtonToActivate.dispatchEvent(new MouseEvent('click'));
}
function pauseOrUnpauseCurrentSong(pause) {
    if (!sounds[currentSongIndex] || !sounds[currentSongIndex].isInExistence()) {
        PLAY_BUTTON.checked = !PLAY_BUTTON.checked;
        return;
    }
    if (pause) { //if set to paused
        PLAY_BUTTON.checked = PAUSED;
        sounds[currentSongIndex].howl.pause();
        changeStatus(StatusTexts.PAUSED);
        return;
    }
    sounds[currentSongIndex].howl.play();
    changeStatus(StatusTexts.PLAYING);
}
function setFileSizeDisplay(index, bytes) {
    const megabytes = (bytes / 1048576).toFixed(2);
    fileSizeDisplays[index].textContent = `${megabytes} MB`;
    fileSizeDisplays[index].setAttribute('title', `${bytes} bytes`);
}
function refreshSongNames() {
    for (var i = 0; i < sounds.length; i++) {
        fileNameDisplays[i].textContent = sounds[i].file.name;
        fileNameDisplays[i].setAttribute('title', sounds[i].file.name);
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
        const secondsSkipAmount = precisionRound(10 * Number(PLAY_RATE.value), 3);
        element.textContent = `${element.textContent[0]}${secondsSkipAmount} Seconds`;
    });
}
function precisionRound(number, precision) {
    const factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}
function changeStatus(status) { STATUS_TEXT.textContent = status; }
function onlyFiles(dataTransfer) { return dataTransfer.types.length == 1 && dataTransfer.types[0] === 'Files'; }
function isValidExtension(extension) { return Howler.codecs(extension); }
function isSongRepeating() { return REPEAT_BUTTON.checked; }
function setAttributes(element, attrs) { for (var key in attrs)
    element.setAttribute(key, attrs[key]); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function getInMegabytes(bytes) { return (bytes / 1048576).toFixed(2); }
function getFileExtension(fileName) { return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(); }
/*            TABLE INTERACTION FUNCTIONS             */
function initializeRowEvents(row) {
    row.setAttribute('draggable', (REORDER_FILES_CHECKBOX.checked).toString());
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
var previouslyActiveRow = null;
function setRowActive(row) {
    if (previouslyActiveRow != null && previouslyActiveRow != row) {
        updateRowColor(previouslyActiveRow); //previouslyActiveRow.style.backgroundColor = RowColors.NONE;
    }
    row.style.backgroundColor = RowColors.PLAYING;
    previouslyActiveRow = row;
}
function updateRowColor(row) {
    if (row.hasAttribute("data-selected")) {
        row.style.backgroundColor = RowColors.SELECTING;
    }
    else if (row.rowIndex - 1 === currentSongIndex) {
        setRowActive(row);
    }
    else {
        row.style.backgroundColor = RowColors.NONE;
    }
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
function onSingleClick(mouseEvent) {
    let row = findValidTableRow(mouseEvent.target);
    if (row == null)
        return;
    if (mouseEvent.ctrlKey) {
        if (row.hasAttribute("data-selected"))
            return deselectRow(selectedRows.indexOf(row));
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
    }
    else {
        deselectAll();
    }
    selectRow(row);
}
// function onRightClick(pointerEvent){
//   let row = pointerEvent.target;
//   if(!rowValid(row)){
//     row = tryFindTableRowInParents(row);
//     if(!rowValid(row)) return;
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
    row = findValidTableRow(row);
    if (!row)
        return;
    if (row.hasAttribute("data-selected"))
        return;
    row.toggleAttribute("data-selected", true);
    updateRowColor(row);
    selectedRows.push(row);
    //@ts-expect-error
    if (row.scrollIntoViewIfNeeded) {
        //@ts-expect-error
        row.scrollIntoViewIfNeeded();
    }
    else {
        row.scrollIntoView({ behavior: "instant", block: "nearest" });
    }
}
function onDoubleClick(mouseEvent) {
    deselectAll();
    let row = findValidTableRow(mouseEvent.target);
    if (row)
        playRow(row);
}
/** @param removeIndex (-1) = won't remove any elems from array */
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
}
function playRow(row) {
    row = findValidTableRow(row);
    const index = row.rowIndex - 1;
    const checkbox = filePlayingCheckboxes[index];
    checkbox.checked = !checkbox.checked;
    onClickSpecificPlaySong(checkbox);
}
function deleteSelectedSongs() {
    const tableBody = PLAYLIST_VIEWER_TABLE.firstElementChild;
    for (let i = 0; i < selectedRows.length; i++) {
        const index = selectedRows[i].rowIndex - 1;
        if (index === currentSongIndex) {
            quitPlayingMusic(); //stop playing
            PROGRESS_BAR.value = 0;
        }
        else if (currentSongIndex !== null && currentSongIndex > index) {
            --currentSongIndex;
        }
        tableBody.removeChild(selectedRows[i]);
        for (let i = 0; i < sounds.length; i++) {
            if (sounds[i].nativeIndex > sounds[index].nativeIndex) {
                --sounds[i].nativeIndex;
            }
        }
        sounds.splice(index, 1);
        filePlayingCheckboxes.splice(index, 1);
        fileNameDisplays.splice(index, 1);
        fileSizeDisplays.splice(index, 1);
    }
    deselectAll();
    updateSongNumberings();
    refreshPreloadedSongs();
}
function moveSelectedSongs(toIndex) {
    const tableBody = PLAYLIST_VIEWER_TABLE.firstElementChild;
    for (let i = selectedRows.length - 1; i >= 0; i--) {
        const currentlyPlayingRow = PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1];
        const index = selectedRows[i].rowIndex - 1;
        tableBody.removeChild(selectedRows[i]);
        sounds.splice(toIndex, 0, sounds.splice(index, 1)[0]);
        filePlayingCheckboxes.splice(toIndex, 0, filePlayingCheckboxes.splice(index, 1)[0]);
        fileNameDisplays.splice(toIndex, 0, fileNameDisplays.splice(index, 1)[0]);
        fileSizeDisplays.splice(toIndex, 0, fileSizeDisplays.splice(index, 1)[0]);
        tableBody.insertBefore(selectedRows[i], tableBody.children[toIndex + 1]);
        currentSongIndex = currentlyPlayingRow.rowIndex - 1;
    }
    deselectAll();
    updateSongNumberings();
    refreshPreloadedSongs();
}
function selectionLogicForKeyboard(data) {
    if (selectedRows.length == 0)
        return;
    const keyboardEvent = data.keyEvent;
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
var indexScrollDirection = 0;
function arrowSelection(keyboardEvent, indexIncrement) {
    keyboardEvent.preventDefault();
    sortSelectedRows();
    if (isTyping(keyboardEvent))
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
function isTyping(keyboardEvent) { return keyboardEvent.target instanceof HTMLInputElement; }
/*                       CONTEXT MENU                      */
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
        contextOptions = contextOptions.concat([
            { text: COMPACT_MODE_TOGGLE.checked ? "Disable Compact Mode" : "Enable Compact Mode", action: () => { COMPACT_MODE_TOGGLE.dispatchEvent(new MouseEvent('click')); } },
            { text: REORDER_FILES_CHECKBOX.checked ? "Disable Song Reordering" : "Enable Song Reordering", action: () => { REORDER_FILES_CHECKBOX.dispatchEvent(new MouseEvent('click')); } }
        ]);
    }
    for (let i = 0; i < contextOptions.length; i++) {
        const contextOption = contextOptions[i];
        const contextButton = document.createElement('div');
        contextButton.setAttribute('class', 'contextOption');
        if (i < contextOptions.length - 1)
            contextButton.style.borderBottomWidth = "1px";
        contextButton.addEventListener('click', (event) => { if (CONTEXT_MENU.hasAttribute('open'))
            contextOption.action(event); });
        if (contextOption.icon) {
            const contextIcon = document.createElement('img');
            contextIcon.setAttribute('class', 'contextIcon');
            contextIcon.src = contextOption.icon;
            contextButton.append(contextIcon, contextOption.text);
        }
        else {
            contextButton.textContent = contextOption.text;
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
    CONTEXT_MENU.toggleAttribute('open', true);
}
function closeContextMenu() { CONTEXT_MENU.toggleAttribute('open', false); CONTEXT_MENU.style.height = '0'; }
;
//# sourceMappingURL=PlaylistCreator.js.map