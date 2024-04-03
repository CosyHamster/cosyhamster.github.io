//@ts-nocheck
import { Howl, Howler } from "../howler";

enum PhaseType {
  COLLECTING,
  RETRIEVING,
  FINISHED
}

interface ContextMenuOptions {
  text: String,
  icon: String,
  action: Function
}

enum ProgressBarSeekAction {
  SEEK_TO,
  DISPLAY_TIME,
  STOP_DISPLAYING
}

class OnEventUpdated {
  registeredCallbacks: Function[] = [];
  register(func: Function) {
    this.registeredCallbacks.push(func)
  }
  unregister(func) {
    this.registeredCallbacks.splice(this.registeredCallbacks.indexOf(func), 1)
  }
  clearAll() {
    this.registeredCallbacks = [];
  }
  callAllRegisteredFunctions(data: any) {
    for (var i = 0; i < this.registeredCallbacks.length; i++) this.registeredCallbacks[i](data)
  }
}

class OnKeyDownEvent extends OnEventUpdated {
  constructor() {
    super();
    window.addEventListener('keydown', key => this.callAllRegisteredFunctions(key), { passive: false });
  }
}

class OnRequestAnimationFrameEvent extends OnEventUpdated {
  // @ts-expect-error
  raf: ((callback: FrameRequestCallback) => number) & ((callback: FrameRequestCallback) => number) = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame).bind(window)
  constructor() {
    super();
    this.raf((timestamp) => this.handleRAFCall(timestamp))
  }
  handleRAFCall(timestamp: number) {
    this.callAllRegisteredFunctions(timestamp)
    this.raf((timestamp) => this.handleRAFCall(timestamp))
  }
}

/** Splits inputted seconds into hours, minutes, & seconds. toString() returns the time in digital format.
*/
class Time {
  seconds: string | number = 0
  minutes: string | number = 0
  hours: string | number = 0
  constructor(seconds: number) {
    this.seconds = Time.numberToDigitalTimeString(Math.floor(seconds % 60))

    this.minutes = Math.floor(seconds / 60)
    this.hours = Math.floor(this.minutes / 60)
    this.minutes = Time.numberToDigitalTimeString(this.minutes - this.hours * 60);
    this.hours = Time.numberToDigitalTimeString(this.hours);
  }

  toString() {
    if (this.hours === '00') return `${this.minutes}:${this.seconds}`

    return `${this.hours}:${this.minutes}:${this.seconds}`
  }

  static numberToDigitalTimeString(number) {
    if (number <= 9) return `0${number}`

    return `${number}`
  }
}
class DataTransferItemGrabber { //this exists because javascript has bugs
  
  dataTransferItemList: DataTransferItem[] | FileSystemEntry[] = [];
  files: (File | null)[] = [];
  promises: Promise<File>[] = [];
  filesCollected = 0;
  filesAdded = 0;
  phase: PhaseType = PhaseType.COLLECTING; //0 == collecting, 1 == retrieving

  /** @param dataTransferItemList this can be any array-like containing DataTransferItems or File / Directory entries (from DataTransferItem.webkitGetAsEntry()) */
  constructor(dataTransferItemList: DataTransferItem[] | FileSystemEntry[]) {
    this.dataTransferItemList = dataTransferItemList;
  }

  async retrieveContents() {
    return new Promise(async resolve => {
      if (this.files.length > 0) resolve(this.files);
      let fileEntryArray: FileSystemEntry[] = []; //collect all file entries that need to be scanned
      for (let i = 0; i < this.dataTransferItemList.length; i++) fileEntryArray.push(this.dataTransferItemList[i]?.webkitGetAsEntry?.() ?? this.dataTransferItemList[i]);
      await this.scanFilesInArray(fileEntryArray);

      this.phase = PhaseType.RETRIEVING;
      await Promise.allSettled(this.promises);
      this.phase = PhaseType.FINISHED;
      this.updateLoadingStatus();
      return resolve(this.files);
    });
  }

  async scanFilesInArray(fileEntries) {
    return new Promise<void>(async (resolve, reject) => {
      for (let i = 0; i < fileEntries.length; i++) {
        let webkitEntry = fileEntries[i];
        if (webkitEntry.isDirectory) {
          let reader: FileSystemDirectoryReader = webkitEntry.createReader();
          await this.addFilesInDirectory(reader);
        } else if (webkitEntry.isFile) {
          let index = this.filesCollected++;
          this.files.push(null);
          this.updateLoadingStatus();

          let promise: Promise<File> = this.getFile(webkitEntry);
          promise.then(file => {
            this.files[index] = file;
            ++this.filesAdded;
            this.updateLoadingStatus();
          })
          this.promises.push(promise);
        }
      }
      resolve();
    });
  }

  async addFilesInDirectory(reader: FileSystemDirectoryReader) {
    return new Promise(async resolve => {
      let someFiles = await this.getSomeFilesInDirectory(reader);
      while (someFiles.length > 0) {
        await this.scanFilesInArray(someFiles);
        someFiles = await this.getSomeFilesInDirectory(reader);
      };

      return resolve(this.files);
    });
  }

  async getSomeFilesInDirectory(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    return new Promise(async resolve => {
      reader.readEntries(someFiles => {
        resolve(someFiles);
      }, error => {
        console.error(error, reader);
        resolve([]);
      });
    })
  }

  async getFile(fileEntry: FileSystemEntry): Promise<File> {
    return new Promise(async resolve => {
      fileEntry.file(file => {
        resolve(file);
      })
    });
  }

  updateLoadingStatus() {
    switch (this.phase) {
      case PhaseType.COLLECTING: return changeStatus(`Collecting: (${this.filesCollected} files; ${this.filesAdded} processed)`);
      case PhaseType.RETRIEVING: return changeStatus(`Processed: ${this.filesAdded}/${this.filesCollected} files`);
      case PhaseType.FINISHED: return changeStatus(`Adding ${this.filesAdded} to the playlist... (this will lag)`)
    }
  }
}
var REQUEST_ANIMATION_FRAME_EVENT = new OnRequestAnimationFrameEvent(),
  KEY_DOWN_EVENT = new OnKeyDownEvent(),
  VALAD_FILE_EXTENSIONS: Set<String> = new Set(["ogg", "webm", "wav", "hls", "flac", "mp3", "opus", "pcm", "vorbis", "aac"]),
  StatusTexts = {
    PLAYING: "Playing",
    PAUSED: "Paused",
    STOPPED: "Stopped",
    DOWNLOADING: "Downloading File...",
    PROCESSING: "Processing...",
    RETRIEVING: "Retrieving Files...",
    COLLECTING: "Collecting Files..."
  },
  RowColors = {
    PLAYING: "rgb(172, 172, 172)",
    SELECTING: "lightblue",
    NONE: ""
  },
  PAUSED = false,
  PLAYING = true,
  PLAYLIST_VIEWER_TABLE: HTMLTableElement = document.getElementById("Playlist_Viewer"),
  PRELOAD_DIST_ELEMENT: HTMLInputElement = document.getElementById('preloadDistance'),
  COMPACT_MODE_LINK_ELEMENT: HTMLLinkElement | null = null,//document.getElementById('compactModeStyleLink'),
  COMPACT_MODE_TOGGLE: HTMLInputElement = document.getElementById('compactMode'),
  SEEK_DURATION_NUMBER_INPUT: HTMLInputElement = document.getElementById('seekDuration'),
  SEEK_DURATION_DISPLAY: HTMLLabelElement = document.getElementById("seekDurationDisplay"),
  SEEK_DISTANCE_PROPORTIONAL_CHECKBOX: HTMLInputElement = document.getElementById('seekDistanceProportional'),
  SKIP_UNPLAYABLE_CHECKBOX: HTMLInputElement = document.getElementById('skipUnplayable'),
  UPLOAD_BUTTON: HTMLInputElement = document.getElementById('0input'),
  UPLOAD_DIRECTORY_BUTTON: HTMLInputElement = document.getElementById('inputDirectory'),
  PLAY_RATE_RANGE: HTMLInputElement = document.getElementById('0playRateSlider'),
  SETTINGS_PAGE: HTMLDialogElement = document.getElementById('settingsPage'),
  ERROR_POPUP: HTMLDialogElement = document.getElementById('errorPopup'),
  ERROR_LIST: HTMLDListElement = document.getElementById('errorList'),
  PROGRESS_BAR: HTMLProgressElement = document.getElementById('progress-bar'),
  HOVERED_TIME_DISPLAY: HTMLDivElement = document.getElementById('hoveredTimeDisplay'),
  VOLUME_CHANGER: HTMLInputElement = document.getElementById('0playVolume'),
  PLAY_RATE: HTMLInputElement = document.getElementById('0playRate'),
  PLAY_PAN: HTMLInputElement = document.getElementById('0playPan'),
  SEEK_BACK: HTMLTableCellElement = document.getElementById('seekBack'),
  SEEK_FORWARD: HTMLTableCellElement = document.getElementById('seekForward'),
  REPEAT_BUTTON: HTMLInputElement = document.getElementById('repeatButton'),
  SHUFFLE_BUTTON: HTMLInputElement = document.getElementById('shuffleButton'),
  MUTE_BUTTON: HTMLInputElement = document.getElementById('0Mute'),
  PLAY_BUTTON: HTMLInputElement = document.getElementById('playpause'),
  STATUS_TEXT: HTMLDivElement = document.getElementById('0status'),
  CURRENT_FILE_NAME: HTMLElement = document.getElementById('currentFileName'),
  DROPPING_FILE_OVERLAY: HTMLDivElement = document.getElementById("dragOverDisplay"),
  DURATION_OF_SONG_DISPLAY: HTMLElement = document.getElementById('secondDurationLabel');

var fileNameDisplays = [];
var filePlayingCheckboxes: HTMLInputElement[] = [];
var fileSizeDisplays = [];
var sounds: (Howl | File)[] = [];
var selectedRows: HTMLTableRowElement[] = [];
var hoveredRowInDragAndDrop: HTMLTableRowElement = null; //does not work with importing files, only when organizing added files
/** An ID representing what current batch of sounds is being loaded. If the ID increments, then the old sounds being loaded are discarded. */
var processingNumber: number = 0;
var skipSongQueued = false;
var currentSongIndex: number | null = null;
const start = (() => {
  if ("serviceWorker" in navigator) {
    try {
      navigator.serviceWorker.register("/Javascript/ServiceWorker.js");
    } catch (exception) {
      console.warn(exception);
    }
  }

  KEY_DOWN_EVENT.register(closeContextMenu);
  registerClickEvent('skipBack', () => jumpSong(-1));
  registerClickEvent('skipForward', () => jumpSong(1));
  registerClickEvent('seekBack', () => seek(new Number(SEEK_BACK.getAttribute('seekDirection'))));
  registerClickEvent('seekForward', () => seek(new Number(SEEK_FORWARD.getAttribute('seekDirection'))));
  registerClickEvent(CURRENT_FILE_NAME, () => PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1].scrollIntoView(false));
  KEY_DOWN_EVENT.register(selectionLogicForKeyboard);
  REQUEST_ANIMATION_FRAME_EVENT.register(keepTrackofTimes);
  makeDocumentDroppable();
  document.addEventListener('click', (mouseEvent) => {
    closeContextMenu();
    if (mouseEvent.target == document.querySelector("html") || mouseEvent.target == document.body) deselectAll();
  }, { passive: true });
  document.addEventListener('touchend', (touchEvent: TouchEvent) => {
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
  PLAY_BUTTON.addEventListener('change', playButton, { passive: true })
  COMPACT_MODE_TOGGLE.addEventListener('change', toggleCompactMode, { passive: true });
  registerClickEvent('settingsButton', async () => SETTINGS_PAGE.showModal());
  registerClickEvent('exitSettingsButton', async () => SETTINGS_PAGE.close());
  registerClickEvent('exitErrorPopup', async () => ERROR_POPUP.close());
  ERROR_POPUP.addEventListener("close", onCloseErrorPopup);

  UPLOAD_BUTTON.addEventListener('change', function () { importFiles(UPLOAD_BUTTON.files) }, { passive: true })
  UPLOAD_DIRECTORY_BUTTON.addEventListener('change', function () { importFiles(UPLOAD_DIRECTORY_BUTTON.files) }, { passive: true });
  // document.getElementById('uploadFilesLabel').addEventListener('contextmenu', (pointerEvent) => {
  //   pointerEvent.preventDefault();

  // })
  PLAY_RATE.addEventListener('change', () => { onPlayRateUpdate(PLAY_RATE.value) }, { passive: true });
  SEEK_DURATION_NUMBER_INPUT.addEventListener('input', updateSeekDurationDisplay, { passive: true });
  onRangeInput(PLAY_RATE_RANGE, () => { onPlayRateUpdate(PLAY_RATE_RANGE.value) });
  onRangeInput(PRELOAD_DIST_ELEMENT, () => { PRELOAD_DIST_ELEMENT.labels[0].textContent = `Value: ${PRELOAD_DIST_ELEMENT.value}` })
  onRangeInput(PLAY_PAN, () => { PLAY_PAN.labels[0].textContent = `${Math.floor(PLAY_PAN.value * 100)}%`; sounds[currentSongIndex].stereo(parseFloat(PLAY_PAN.value)) })
  onRangeInput(VOLUME_CHANGER, () => { VOLUME_CHANGER.labels[0].textContent = `${Math.floor(VOLUME_CHANGER.value * 100)}%`; sounds[currentSongIndex].volume(VOLUME_CHANGER.value) })
  handleCheckBoxClick(MUTE_BUTTON, REPEAT_BUTTON, SHUFFLE_BUTTON)
  PROGRESS_BAR.addEventListener('pointerenter', (pointer) => progressBarSeek(pointer, ProgressBarSeekAction.DISPLAY_TIME), { passive: true })
  PROGRESS_BAR.addEventListener('pointerdown', (pointer) => { if(pointer.button == 0) progressBarSeek(pointer, ProgressBarSeekAction.SEEK_TO); }, { passive: true })
  PROGRESS_BAR.addEventListener('pointermove', (pointer) => progressBarSeek(pointer, ProgressBarSeekAction.DISPLAY_TIME), { passive: true })
  PROGRESS_BAR.addEventListener('pointerleave', (pointer) => progressBarSeek(pointer, ProgressBarSeekAction.STOP_DISPLAYING), { passive: true })
  //END
})()

function makeDocumentDroppable() {
  window.addEventListener("dragover", (event) => {
    if (!onlyFiles(event.dataTransfer)) return;
    event.preventDefault();
    DROPPING_FILE_OVERLAY.setAttribute("draggingOver", "true");
    stopHighlightingRow();
  });
  window.addEventListener("dragleave", () => {
    DROPPING_FILE_OVERLAY.setAttribute("draggingOver", "false");
    stopHighlightingRow();
  }, { passive: true })
  window.addEventListener("drop", (event) => {
    const dataTransfer = event.dataTransfer;
    if (!onlyFiles(dataTransfer)) return;
    event.preventDefault();
    DROPPING_FILE_OVERLAY.setAttribute("draggingOver", "false");
    stopHighlightingRow();
    importFiles(dataTransfer);
  });
}
function onlyFiles(dataTransfer: DataTransfer) { return dataTransfer.types.length == 1 && dataTransfer.types[0] == 'Files' }
//displayProgress - show progress in seek bar | currentIndex - what index in "fileSizeDisplays" to show loading progress in. This value is nullable to prevent showing loading progress in song chooser.
function retrieveSound(file: File, displayProgress: boolean, currentIndex: number) {
  if (file === null || file instanceof Howl) return new Promise((resolve, reject) => { resolve(file) });
  const currentProcessingNumber = processingNumber;

  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);

    const onProgress = function (progressEvent: ProgressEvent<FileReader>) {
      if (processingNumber === currentProcessingNumber && displayProgress) PROGRESS_BAR.value = (100 * progressEvent.loaded) / progressEvent.total;
      if (currentIndex >= 0) {
        fileSizeDisplays[currentIndex].textContent = `${getInMegabytes(progressEvent.loaded)} MB / ${getInMegabytes(file.size)} MB`;
        fileSizeDisplays[currentIndex].setAttribute('title', `${progressEvent.loaded} bytes / ${file.size} bytes`);
      }
    }
    const onLoaded = function () {
      removeListeners();
      if (processingNumber !== currentProcessingNumber) resolve(null);
      resolve(loaded(fileReader, file));
    }
    const errorFunc = function (progressEvent: ProgressEvent<FileReader>) {
      removeListeners();
      switch (progressEvent.target.error.name) {
        case "NotFoundError": { displayError(progressEvent.target.error.name, "Failed to find file!", progressEvent.target.error.message, file.name); break; }
        default: { displayError(progressEvent.target.error.name, "Unknown Error!", progressEvent.target.error.message, file.name); break; }
      }

      resolve(null);
    }
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
      if (currentIndex >= 0) updateFileSizeDisplay(currentIndex, file.size);
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

function registerClickEvent(element: HTMLElement, func: EventListenerOrEventListenerObject) {
  if (typeof element === "string") element = document.getElementById(element);
  element.addEventListener('click', func, { passive: true })
}

function createNewSong(fileName, index) { //index is used to number the checkboxes
  const row = PLAYLIST_VIEWER_TABLE.insertRow(PLAYLIST_VIEWER_TABLE.rows.length)
  const cell1 = row.insertCell(0);
  initializeRow(row);

  const fileSize = document.createElement('text');
  fileSize.setAttribute('class', 'songName');
  fileSize.setAttribute('style', 'position: absolute; transform: translate(-100%, 0); left: calc(100% - 3px);');
  fileSize.setAttribute('id', `${index}playButtonLabel`)

  const songName = document.createElement('text')
  songName.setAttribute('class', 'songName')
  songName.setAttribute('title', `${fileName}`)
  songName.textContent = fileName

  const songNumber = document.createElement('text');
  songNumber.textContent = `${PLAYLIST_VIEWER_TABLE.rows.length - 1}. `;
  setAttributes(songNumber, {
    style: 'float: left; display: inline-block;',
    class: 'songNumber',
    index: index
  })

  const playButtonDiv = document.createElement('label');
  playButtonDiv.setAttribute('class', 'smallplaypause playpause');
  playButtonDiv.setAttribute('for', `${index}playButton`);
  const checkbox = document.createElement('input');
  checkbox.addEventListener('change', () => playSpecificSong(filePlayingCheckboxes.indexOf(checkbox)), { passive: true });
  setAttributes(checkbox, {
    type: 'checkbox',
    id: `${index}playButton`,
    class: 'smallplaypause playpause'
  });
  playButtonDiv.appendChild(checkbox);
  playButtonDiv.appendChild(document.createElement('div'));

  appendChilds(cell1, [
    fileSize,
    songNumber,
    playButtonDiv,
    songName,
  ]);

  fileSizeDisplays.push(fileSize);
  fileNameDisplays.push(songName);
  filePlayingCheckboxes.push(checkbox);
}

function setAttributes(element, attrs) {
  for (var key in attrs) element.setAttribute(key, attrs[key]);
}
function appendChilds(element, childElements) {
  for (var i = 0; i < childElements.length; i++) element.appendChild(childElements[i]);
}

async function toggleCompactMode() {
  // COMPACT_MODE_TOGGLE.disabled = true;
  if (COMPACT_MODE_LINK_ELEMENT === null) {
    COMPACT_MODE_LINK_ELEMENT = document.createElement('link');
    setAttributes(COMPACT_MODE_LINK_ELEMENT, {
      rel: "stylesheet",
      href: "../CSS/CompactMode.css",
    });
    document.head.appendChild(COMPACT_MODE_LINK_ELEMENT);
  }
}
function keepTrackofTimes() {
  if (skipSongQueued) {
    skipSongQueued = false;
    filePlayingCheckboxes[(currentSongIndex + 1) % filePlayingCheckboxes.length].dispatchEvent(new MouseEvent("click"));
    // playSpecificSong((currentSongIndex+1)%sounds.length);
  }

  PRELOAD_DIST_ELEMENT.max = Math.max(sounds.length - 1, 1);
  if (COMPACT_MODE_LINK_ELEMENT?.sheet) {
    // if(COMPACT_MODE_TOGGLE.disabled) COMPACT_MODE_TOGGLE.disabled = false;
    if (COMPACT_MODE_LINK_ELEMENT.sheet.disabled == COMPACT_MODE_TOGGLE.checked) //if disabled needs to be updated with checkbox (checked is enabled, unchecked is disabled)
      COMPACT_MODE_LINK_ELEMENT.sheet.disabled = !COMPACT_MODE_TOGGLE.checked;
  }

  if (isUnloaded(sounds[currentSongIndex])) return cannotUpdateProgress(isLoading(sounds[currentSongIndex]));
  if (sounds[currentSongIndex].playing() && (STATUS_TEXT.textContent == StatusTexts.PROCESSING || STATUS_TEXT.textContent == StatusTexts.DOWNLOADING)) onLatePlayStart();
  let songDuration = sounds[currentSongIndex].duration();
  let currentTime = sounds[currentSongIndex].seek(sounds[currentSongIndex]);

  const timeToSet = currentTime / songDuration * 100;
  if (Number.isFinite(timeToSet)) PROGRESS_BAR.value = timeToSet;
  updateCurrentTimeDisplay(currentTime, songDuration);

  highlightCurrentSongRow();
}
function unHighlightOldCurrentSongRow() {
  for (let i = 0; i < PLAYLIST_VIEWER_TABLE.rows.length; i++) {
    if (PLAYLIST_VIEWER_TABLE.rows[i].style.backgroundColor == RowColors.PLAYING) PLAYLIST_VIEWER_TABLE.rows[i].style.backgroundColor = RowColors.NONE;
  }
}
function highlightCurrentSongRow() {
  const style = PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1].style;
  if (currentSongIndex != null && style.backgroundColor == RowColors.NONE) style.backgroundColor = RowColors.PLAYING;
}
function onLatePlayStart() {
  changeStatus(StatusTexts.PLAYING);
}
function cannotUpdateProgress(isProcessing) {
  if (isProcessing) changeStatus(StatusTexts.PROCESSING);
  if (DURATION_OF_SONG_DISPLAY.textContent != "00:00") {
    HOVERED_TIME_DISPLAY.style.left = '-9999px';
    DURATION_OF_SONG_DISPLAY.textContent = "00:00";
  }
}
function reapplySoundAttributes(index) {
  let affected = (index instanceof Howl) ? index : sounds[index];
  affected.rate(PLAY_RATE.value);
  affected.volume(VOLUME_CHANGER.value);
  affected.mute(MUTE_BUTTON.checked);
  affected.stereo(parseFloat(PLAY_PAN.value));
}
function updateCurrentTimeDisplay(currentTime, songDurationInSeconds) {
  if (HOVERED_TIME_DISPLAY.getAttribute('inUse') == 1) return;
  const progressBarDomRect = PROGRESS_BAR.getBoundingClientRect();
  if (progressBarDomRect.top + 50 < 0) return; //return if you scrolled away from the progress bar (+50 to include the hoveredTimeDisplay)

  const songDurationFormatted = new Time(songDurationInSeconds).toString(),
    top = progressBarDomRect.top + window.scrollY,
    left = (progressBarDomRect.left - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2) + (progressBarDomRect.width * currentTime / songDurationInSeconds) - 1;

  if (DURATION_OF_SONG_DISPLAY.textContent != songDurationFormatted) DURATION_OF_SONG_DISPLAY.textContent = songDurationFormatted;
  HOVERED_TIME_DISPLAY.style.top = `${top}px`;
  HOVERED_TIME_DISPLAY.style.left = `${left}px`;
  const currentTimeString = new Time(currentTime).toString();
  if (HOVERED_TIME_DISPLAY.children[0].textContent != currentTimeString) HOVERED_TIME_DISPLAY.children[0].textContent = currentTimeString;
}

function progressBarSeek(mouse: MouseEvent, hoverType: ProgressBarSeekAction) {
  if ((mouse?.pointerType == "touch" && hoverType !== ProgressBarSeekAction.SEEK_TO) || sounds[currentSongIndex] == null || sounds[currentSongIndex]?.state?.() != 'loaded' || hoverType === ProgressBarSeekAction.STOP_DISPLAYING) return HOVERED_TIME_DISPLAY.setAttribute('inUse', 0);

  const offsetX = mouse.offsetX,
    progressBarWidth = PROGRESS_BAR.clientWidth,
    currentSongLength: number = sounds[currentSongIndex].duration();

  let seekToTime = Math.max(new Number(offsetX * (currentSongLength / progressBarWidth)), 0);
  switch (hoverType) {
    case (ProgressBarSeekAction.SEEK_TO): return sounds[currentSongIndex].seek(seekToTime);
    case (ProgressBarSeekAction.DISPLAY_TIME):
      HOVERED_TIME_DISPLAY.setAttribute('inUse', 1);
      HOVERED_TIME_DISPLAY.style.left = `${(mouse.x - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2) + 1}px`;
      HOVERED_TIME_DISPLAY.firstChild.textContent = new Time(seekToTime).toString();
  }
}

function loaded(fileReader: FileReader, sourceFileObject: File) {
  let result: string = fileReader.result;
  const index: number = sourceFileObject.nativeIndex;

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
 * @param {String} errorType The name of the exception
 * @param {String} errorText Generic error message to explain the error better.
 * @param {String} errorMessage The message provided by the error
*/
function displayError(errorType: String, errorText: String, errorMessage: String, fileName: String) {
  let insertAfter;
  const children = ERROR_LIST.children;
  for (let i = 0; i < children.length; i++) {
    if (children[i].textContent == fileName) {
      insertAfter = children[i];
      break;
    }
  }
  const songTitle = document.createElement('dt');
  songTitle.textContent = fileName;
  const songError = document.createElement('dd');
  songError.textContent = errorType + ": " + errorText;
  songError.title = errorMessage;

  if (insertAfter) {
    insertAfter.after(songError);
  } else {
    ERROR_LIST.appendChild(songTitle);
    ERROR_LIST.appendChild(songError);
  }
  ERROR_POPUP.showModal();
  console.error(`${errorType}: ${errorText} ${errorMessage}`);
}

function seek(seekDirection) { //controls audio seeking, seekDuration: usually +1 || -1
  if (isUnloaded(sounds[currentSongIndex])) return;
  const seekDuration = new Number(SEEK_DURATION_NUMBER_INPUT.value) * seekDirection;
  const numToAdd = (SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked) ? seekDuration * PLAY_RATE.value : seekDuration;
  const currentTime = sounds[currentSongIndex].seek(sounds[currentSongIndex]);
  sounds[currentSongIndex].seek(Math.max(currentTime + numToAdd, 0));
}

async function importFiles(element) {
  if (element instanceof FileList) {
    addFiles(element);
  } else if (element instanceof DataTransfer) {
    let dataTransferItemList = element?.items;
    if (!dataTransferItemList || dataTransferItemList.length == 0) return;

    changeStatus(StatusTexts.RETRIEVING);
    let fileReciever = new DataTransferItemGrabber(dataTransferItemList);
    addFiles(await fileReciever.retrieveContents());
  }

  function addFiles(files: FileList | Array<File>/*: FileList or array-like containing File objects*/) {
    const lengthBeforeBegin = sounds.length;
    changeStatus(`Importing ${files.length} Files...`);
    for (var i = 0, offsetBecauseOfSkipped = 0; i < files.length; i++) {
      const file = files[i];
      if (file == null) continue;
      const fileExtension = getFileExtension(file.name);
      if (SKIP_UNPLAYABLE_CHECKBOX.checked && !VALAD_FILE_EXTENSIONS.has(fileExtension)) {
        displayError("TypeError", `The file type '${fileExtension}' is unsupported.`, "This file is unsupported and cannot be imported!", file.name);
        ++offsetBecauseOfSkipped;
        continue;
      }

      file.nativeIndex = i + lengthBeforeBegin - offsetBecauseOfSkipped;
      createNewSong(file.name, file.nativeIndex); //index (2nd parameter) is used to number the checkboxes
      updateFileSizeDisplay(file.nativeIndex, file.size);
      sounds.push(file);
    }
    changeStatus(`${files.length - offsetBecauseOfSkipped} files added!`);
  }
}

function onPlayRateUpdate(newRate) {
  PLAY_RATE_RANGE.value = newRate;
  PLAY_RATE.value = newRate;
  if (sounds[currentSongIndex] === undefined || sounds[currentSongIndex] instanceof File) return;
  if (newRate <= 0) return sounds[currentSongIndex].pause(); //the rate cant be set to 0. the progress tracker will glitch back to 0.

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
  } else {
    SEEK_DURATION_DISPLAY.textContent = `${new Number(duration)} sec`;
  }

}

function handleCheckBoxClick(...elements) {
  elements.forEach(el => {
    const onlyText = el.id.replace(/[^a-z]/gi, ''); //grab all text except numbers
    el.addEventListener('change', () => {
      if (onlyText == "Mute" && !isUnloaded(sounds[currentSongIndex])) { Howler.mute(el.checked); }
      else if (onlyText == "repeatButton") {
        sounds[currentSongIndex]?.loop?.(el.checked);
        if (el.checked) el.labels[0].children[0].src = "../Icons/Repeat1Icon.svg";
        else el.labels[0].children[0].src = "../Icons/RepeatIcon.svg";
      }
      else if (onlyText == "shuffleButton") handleShuffleButton(el.checked);
    }, { passive: true })
  })
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

  let tempArray = sounds,
    foundCurrentPlayingSong = false;
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
  for (var i = 0; i < tempArray.length; i++) sounds[tempArray[i].nativeIndex] = tempArray[i];
  refreshSongNames();
  tempArray = null;
}

function shuffle() {
  let currentIndex = sounds.length, randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    --currentIndex;

    if (currentSongIndex !== null) {
      if (currentSongIndex == currentIndex) currentSongIndex = randomIndex;
      else if (currentSongIndex == randomIndex) currentSongIndex = currentIndex;

      const currentCheckbox = filePlayingCheckboxes[currentSongIndex];
      filePlayingCheckboxes.forEach(it => { it.checked = false; });
      currentCheckbox.checked = true;
    }

    let tempForSwapping = sounds[currentIndex];
    sounds[currentIndex] = sounds[randomIndex];
    sounds[randomIndex] = tempForSwapping;
  }
}

async function playSpecificSong(index) { //called by HTML element
  const checkbox = filePlayingCheckboxes[index];
  if (sounds[currentSongIndex]?.playing?.() && sounds[currentSongIndex]?.state?.() == "loaded") sounds[currentSongIndex]?.stop?.();
  Howler.stop();

  if (!checkbox.checked) {
    PLAY_BUTTON.checked = PAUSED;
    currentSongIndex = null;
    for (var i = 0; i < sounds.length; i++) removeSongFromRam(i);
    changeStatus(StatusTexts.STOPPED);
    unHighlightOldCurrentSongRow();
    return;
  } else {
    currentSongIndex = index;
    filePlayingCheckboxes.forEach((it) => { if (it.id != checkbox.id) it.checked = false; }) //uncheck the play button for all the other sounds except the one u chose

    const soundName = sounds[index].name, fileType = getFileExtension(soundName);
    if (SKIP_UNPLAYABLE_CHECKBOX.checked && !VALAD_FILE_EXTENSIONS.has(fileType)) {
      displayError("TypeError", `The file type '${fileType}' is unsupported.`, "This file is unsupported and cannot be played!", soundName);
      skipSongQueued = true;
      return;
    }
    changeStatus(StatusTexts.DOWNLOADING);
    retrieveSound(sounds[index], true, index).then((retrieved) => loadSong(retrieved, index, true));
    refreshPreloadedSongs();
    unHighlightOldCurrentSongRow();
  }
}
function loadSong(retrieved, index, startPlaying) {
  if (retrieved === null) return;
  sounds[index] = retrieved; //make sure its loaded
  if (sounds[index].state() == 'unloaded') sounds[index].load();

  if (startPlaying) startPlayingSong();
}

function startPlayingSong() {
  setCurrentFileName(sounds[currentSongIndex].name);
  reapplySoundAttributes(currentSongIndex);

  if (PLAY_RATE.value != 0) {
    sounds[currentSongIndex].play();
    PLAY_BUTTON.checked = PLAYING;
  }
}
function refreshPreloadedSongs() {
  if (currentSongIndex == null) return;
  for (let i = 0; i < sounds.length; i++) {
    if (i == currentSongIndex) continue;

    if (!isIndexInRangeofCurrent(i)) {
      if (sounds[i] !== null) removeSongFromRam(i);
      continue;
    }

    retrieveSound(sounds[i], false, i).then(retrieved => loadSong(retrieved, i, false));
  }
}
function jumpSong(amount) { // amount can be negative or positive ;)
  amount = amount || 1 //if no value inputted, assume u want to jump ahead one song

  const repeating = REPEAT_BUTTON.checked
  if (repeating) {
    if (isCurrentSoundPaused()) {
      sounds[currentSongIndex].stop();
      sounds[currentSongIndex].play();
    }
    return;
  }

  currentSongIndex += amount
  if (currentSongIndex > sounds.length - 1) currentSongIndex %= sounds.length;
  else if (currentSongIndex < 0) currentSongIndex = Math.max(currentSongIndex + sounds.length, 0) //idk a real solution to this

  const playButtonToActivate = filePlayingCheckboxes[currentSongIndex];
  playButtonToActivate.checked = true;
  playButtonToActivate.dispatchEvent(new Event('change'));
}

async function playButton() { //controls playAll button, called by HTML element
  if (isUnloaded(sounds[currentSongIndex])) return PLAY_BUTTON.checked = !PLAY_BUTTON.checked;

  if (PLAY_BUTTON.checked == PAUSED) { //if set to paused
    if (sounds[currentSongIndex]?.pause?.() != undefined) changeStatus(StatusTexts.PAUSED);
    return;
  }

  if (sounds[currentSongIndex].state() != "loaded") await sounds[currentSongIndex].load();
  sounds[currentSongIndex].play();
  changeStatus(StatusTexts.PLAYING);
}

function isIndexInRangeofCurrent(index) {
  const distance = parseInt(PRELOAD_DIST_ELEMENT.value);
  const withinRange = index >= currentSongIndex - distance && index <= currentSongIndex + distance;
  const inRangeWrappedToBegin = index + distance >= sounds.length && (index + distance) % sounds.length >= currentSongIndex;
  const inRangeWrappedToEnd = index - distance < 0 && (index - distance) + sounds.length <= currentSongIndex;
  return withinRange || inRangeWrappedToBegin || inRangeWrappedToEnd
}
function removeSongFromRam(index) {
  if (sounds[index] instanceof File) return;
  try { sounds[index].unload(); } catch { }
  sounds[index] = sounds[index].sourceFile;
}
function updateFileSizeDisplay(index, bytes) {
  const megabytes = (bytes / 1_048_576).toFixed(2);
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
  fileSizeDisplays[index].textContent = `${(progressEvent.loaded / 1_024_000).toFixed(2)}/${(progressEvent.total / 1_024_000).toFixed(2)} MB`
}
function changeStatus(status) { STATUS_TEXT.textContent = status; }
function isUnloaded(sound) { return sound === null || sound instanceof File || sound?.state?.() != 'loaded'; }
function isLoading(sound) { return sound?.state?.() == 'loading'; }
function isSongRepeating(): boolean { return REPEAT_BUTTON.checked; }
function onRangeInput(elem: HTMLInputElement, func: Function) { elem.addEventListener('input', func, { passive: true }); }
function sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
function isCurrentSoundPaused(): Boolean { return sounds[currentSongIndex]._sounds[0]._paused; }
function getInMegabytes(bytes): Number { return (bytes / 1_048_576).toFixed(2); }
function getFileExtension(fileName): String { return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(); }

/*            TABLE INTERACTION FUNCTIONS             */
function initializeRow(row) {
  row.setAttribute('draggable', 'true')
  row.addEventListener('click', onSingleClick, { passive: true });
  // row.addEventListener('contextmenu', onRightClick);
  row.addEventListener('dblclick', onDoubleClick, { passive: true });
  row.addEventListener('dragstart', (event: DragEvent) => {
    if (onlyFiles(event.dataTransfer)) return;
    if (selectedRows.length == 0) selectRow(row);
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
function whileDraggingRows(event: DragEvent) {
  if (onlyFiles(event.dataTransfer)) return;
  stopHighlightingRow();

  hoveredRowInDragAndDrop = event.target;
  if (!rowValid(hoveredRowInDragAndDrop)) {
    hoveredRowInDragAndDrop = tryFindTableRowInParents(hoveredRowInDragAndDrop);
    if (!rowValid(hoveredRowInDragAndDrop)) return hoveredRowInDragAndDrop = null;
  }
  hoveredRowInDragAndDrop.style.borderBottomColor = "blue"
  event.stopPropagation();
}
function onDropRow(event) {
  if (event.dataTransfer.getData("text/plain") != "action:reorganizingPlaylist") return;
  stopHighlightingRow();
  sortSelectedRows();
  let row = event.target;
  if (!rowValid(row)) {
    row = tryFindTableRowInParents(row);
    if (!rowValid(row)) return;
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
    if (!rowValid(row)) return;
  }

  const indexOf = selectedRows.indexOf(row);
  if (pointerEvent.ctrlKey) {
    if (indexOf != -1) return deselectRow(row, indexOf);
  } else if (pointerEvent.shiftKey && selectedRows.length != 0) {
    sortSelectedRows();
    let startingIndex = selectedRows[selectedRows.length - 1].rowIndex;
    const endingIndex = row.rowIndex;
    if (endingIndex > startingIndex) {
      for (let i = startingIndex + 1; i < endingIndex; i++) selectRow(PLAYLIST_VIEWER_TABLE.rows[i]);
    } else {
      startingIndex = selectedRows[0].rowIndex;
      for (let i = startingIndex - 1; i > endingIndex; i--) selectRow(PLAYLIST_VIEWER_TABLE.rows[i]);
    }
  } else {
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
  if (selectedRows.includes(row)) return;
  if (!rowValid(row)) {
    row = tryFindTableRowInParents(row);
    if (!rowValid(row)) return;
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
  if (removeIndex >= 0) selectedRows.splice(removeIndex, 1);
}
function deselectAll() {
  for (let i = 0; i < selectedRows.length; i++) deselectRow(selectedRows[i], -1);
  selectedRows = [];
}
function playRow(row) {
  if (!rowValid(row)) {
    row = tryFindTableRowInParents(row);
    if (!rowValid(row)) return;
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
        if (sounds[i] instanceof Howl) --sounds[i].sourceFile.nativeIndex;
      }
    }
    if (currentSongIndex != null && currentSongIndex > index) --currentSongIndex;
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
        if (sounds[i] instanceof Howl) --sounds[i].sourceFile.nativeIndex;
      }
    }
    if (index < currentSongIndex) --currentSongIndex;
    if (currentSongIndex == index) currentSongIndex = toIndex;
    sounds.splice(toIndex, 0, sounds.splice(index, 1)[0]);
    filePlayingCheckboxes.splice(toIndex, 0, filePlayingCheckboxes.splice(index, 1)[0]);
    fileNameDisplays.splice(toIndex, 0, fileNameDisplays.splice(index, 1)[0]);
    fileSizeDisplays.splice(toIndex, 0, fileSizeDisplays.splice(index, 1)[0]);
    tableBody.insertBefore(selectedRows[i], tableBody.children[toIndex + 1])
    for (let i = 0; i < sounds.length; i++) {
      if (sounds[i] != sounds[toIndex] && sounds[i].nativeIndex >= sounds[toIndex].nativeIndex) { //warning: branch prediction failure
        ++sounds[i].nativeIndex;
        if (sounds[i] instanceof Howl) ++sounds[i].sourceFile.nativeIndex;
      }
    }
    if (toIndex < currentSongIndex) ++currentSongIndex;
  }
  deselectAll();
  updateSongNumberings();
  refreshPreloadedSongs();
}
function selectionLogicForKeyboard(keyboardEvent) {
  if (selectedRows.length == 0) return;
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
  if (isTyping(keyboardEvent)) return;
  if (keyboardEvent.ctrlKey || keyboardEvent.shiftKey) {
    if (indexIncrement > 0) {
      const row = PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + indexIncrement];
      if (row) selectRow(row);
    } else {
      deselectRow(selectedRows[selectedRows.length - 1], selectedRows.length - 1);
    }
  } else {
    const oneElement = (indexIncrement > 0) ? PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + 1] : PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex - 1];
    if (!rowValid(oneElement)) return;
    deselectAll();
    selectRow(oneElement);
  }
}
function deleteSongsFromKeyboard(keyboardEvent) { if (!isTyping(keyboardEvent)) deleteSelectedSongs(); }
function startPlayingFromKeyboard(keyboardEvent) {
  if (isTyping(keyboardEvent) || selectedRows.length != 1) return;
  keyboardEvent.preventDefault();
  playRow(selectedRows[0])
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
    if (row == null) continue;
    songNumber.textContent = `${row.rowIndex}. `;
  }
}
function rowValid(row) { return row instanceof HTMLTableRowElement && row != PLAYLIST_VIEWER_TABLE.rows[0] && row.closest('table') == PLAYLIST_VIEWER_TABLE; }
function sortSelectedRows() { selectedRows.sort((a, b) => a.rowIndex - b.rowIndex) }
function isTyping(keyboardEvent: KeyboardEvent): boolean { return keyboardEvent.target instanceof HTMLInputElement; }


/*                       CONTEXT MENU                      */

const CONTEXT_MENU: HTMLDialogElement = document.getElementById('rightClickContextMenu');

function initContextMenu() {
  document.addEventListener('contextmenu', (pointerEvent) => {
    pointerEvent.preventDefault()
    selectingSongRow: { //if clicking a row
      let row = pointerEvent.target;
      if (!rowValid(row)) {
        row = tryFindTableRowInParents(row);
        if (!rowValid(row)) break selectingSongRow;
      }

      if (!selectedRows.includes(row)) {
        deselectAll();
        selectRow(row);
      }

      const contextOptions: ContextMenuOptions[] = [];
      if (selectedRows.length == 1) contextOptions.push({ text: (currentSongIndex != selectedRows[0].rowIndex - 1) ? "Play" : "Stop", action: () => playRow(selectedRows[0]) });
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
  })
}

function spawnContextMenu(clientX: Number, clientY: Number, contextOptions: ContextMenuOptions[], allowDefaultOptions: Boolean) {
  let childElement: HTMLElement;
  while ((childElement = CONTEXT_MENU.lastChild) != null) {
    CONTEXT_MENU.removeChild(childElement);
  }

  if (allowDefaultOptions) {
    contextOptions = contextOptions.concat([{ text: COMPACT_MODE_TOGGLE.checked ? "Disable Compact Mode" : "Enable Compact Mode", action: () => { COMPACT_MODE_TOGGLE.dispatchEvent(new MouseEvent('click')) } }])
  }

  for (let i = 0; i < contextOptions.length; i++) {
    const contextOption = contextOptions[i];
    const contextButton = document.createElement('div');
    contextButton.setAttribute('class', 'contextOption');
    if (i < contextOptions.length - 1) contextButton.style.borderBottomWidth = "1px";
    contextButton.addEventListener('click', (event) => { if (CONTEXT_MENU.getAttribute('open') == 'true') contextOption.action(event) });

    if (contextOption.icon) {
      const contextIcon = document.createElement('img');
      contextIcon.setAttribute('class', 'contextIcon');
      contextIcon.src = contextOption.icon;
      contextButton.append(contextIcon, contextOption.text);
    } else {
      contextButton.innerText = contextOption.text;
    }
    CONTEXT_MENU.appendChild(contextButton);
  }

  CONTEXT_MENU.style.height = `${contextOptions.length * 29}px`;

  let leftOffset = clientX + 2,
    downOffset = clientY + 2;
  const viewportWidth = document.documentElement.clientWidth,
    viewportHeight = document.documentElement.clientHeight,
    contextMenuRect = CONTEXT_MENU.getBoundingClientRect();

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

function closeContextMenu() { CONTEXT_MENU.setAttribute('open', 'false'); CONTEXT_MENU.style.height = '0'; };