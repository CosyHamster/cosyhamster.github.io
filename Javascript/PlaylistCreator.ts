//@ts-expect-error
import("./howler.js").catch((error) => {
  console.warn(error + "\nLoading Howler using script element instead.");
  let howlerScript = document.createElement('script');
  howlerScript.src = "../Javascript/howler.js";
  document.head.appendChild(howlerScript);
});

var audio = new Audio();
var aiffIsPlayable = !!(audio.canPlayType("audio/aiff") || audio.canPlayType("audio/x-aiff"));
function codecsMixin(extension: string): boolean {
  switch(extension){
    case "aif": return aiffIsPlayable;
    case "aiff": return aiffIsPlayable;
    case "aff": return aiffIsPlayable;
    default: return Howler.codecs(extension);
  }
}

var storedWindow: Window;
var curWin: Window = window;
var curDoc: Document = document;
const SITE_DEPRECATED = document.URL.toLowerCase().includes('codehs') || document.URL.includes("127.0.0.1");
var ON_MOBILE: boolean;

//@ts-expect-error
if(navigator.userAgentData) { ON_MOBILE = navigator.userAgentData.mobile; }
else {
  //@ts-expect-error
  let userAgent: string = navigator.userAgent||navigator.vendor||window.opera;
  /* cspell: disable-next-line */
  ON_MOBILE = (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series([46])0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br([ev])w|bumb|bw-([nu])|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do([cp])o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly([-_])|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-([mpt])|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c([- _agpst])|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac([ \-\/])|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja([tv])a|jbro|jemu|jigs|kddi|keji|kgt([ \/])|klon|kpt |kwc-|kyo([ck])|le(no|xi)|lg( g|\/([klu])|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t([- ov])|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30([02])|n50([025])|n7(0([01])|10)|ne(([cm])-|on|tf|wf|wg|wt)|nok([6i])|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan([adt])|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c([-01])|47|mc|nd|ri)|sgh-|shar|sie([-m])|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel([im])|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c([- ])|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(userAgent.substring(0,4)));
}

const enum PhaseType {
  COLLECTING,
  RETRIEVING,
  FINISHED
}

const enum ProgressBarSeekAction {
  SEEK_TO,
  DISPLAY_TIME,
  STOP_DISPLAYING
}

interface ContextMenuOption {
  text: string,
  icon?: string,
  action: () => void
}

class SongLoader{
  song: Song;
  fileReader: FileReader = new FileReader();
  finishedLoadingAbortController?: AbortController;
  constructor(song: Song){
    this.song = song;
  }
  
  loadSong(): Promise<Howl>{
    return new Promise<Howl>((resolve, reject) => {
      if(!this.finishedLoadingAbortController){
        this.finishedLoadingAbortController = new AbortController();
      } else {
        if(this.finishedLoadingAbortController.signal.aborted){
          if(this.song.howl) resolve(this.song.howl);
          else reject("Failed to find howl when attempting to load song from a completed SongLoader.");
          return;
        } else {
          this.finishedLoadingAbortController.signal.addEventListener('abort', () => {
            if(this.song.howl) resolve(this.song.howl);
            else reject("Failed to find howl after waiting for previous load to finish.");
          }, {once: true});
          return;
        }
      }

      const onProgress = (progressEvent: ProgressEvent<FileReader>) => {
        if (sounds[currentSongIndex].file == this.song.file) PROGRESS_BAR.value = (100 * progressEvent.loaded) / progressEvent.total;
        const fileBytes = this.song.file.size;
        setSongFileSizeDisplay(
            this.song,
            `${getInMegabytes(progressEvent.loaded)} MB / ${getInMegabytes(fileBytes)} MB`,
            `${progressEvent.loaded} bytes / ${fileBytes} bytes`
        );
      }
      const onLoaded = () => {
        resolve(this.createHowl());
        updateSongFileSizeDisplay(this.song);
        this.triggerAbort();
      }
      const errorFunc = (progressEvent: ProgressEvent<FileReader>) => {
        this.triggerAbort();
        switch (progressEvent.target.error.name) {
          case "NotFoundError": { displayError(progressEvent.target.error.name, "Failed to find file!", progressEvent.target.error.message, this.song.file.name); break; }
          case "NotReadableError": { displayError(progressEvent.target.error.name, "This file needs to be reimported to the playlist!", progressEvent.target.error.message, this.song.file.name); break; }
          default: { displayError(progressEvent.target.error.name, "Unknown Error!", progressEvent.target.error.message, this.song.file.name); break; }
        }

        reject(progressEvent.target.error.name);
      }
      const warnUser = () => {
        this.triggerAbort();
        reject(`File Aborted: ${this.song.file.name}`);
      }

      this.fileReader.addEventListener('progress', onProgress, { passive: true, signal: this.finishedLoadingAbortController.signal });
      this.fileReader.addEventListener('loadend', onLoaded, { passive: true, signal: this.finishedLoadingAbortController.signal });
      this.fileReader.addEventListener('error', errorFunc, { passive: true, signal: this.finishedLoadingAbortController.signal });
      this.fileReader.addEventListener('abort', warnUser, { passive: true, signal: this.finishedLoadingAbortController.signal });
      this.fileReader.readAsDataURL(this.song.file);
    });    
  };
  quitLoading(){
    this.triggerAbort();
    this.fileReader.abort();
  }
  triggerAbort(){
    if(this.finishedLoadingAbortController){
      this.finishedLoadingAbortController.abort();
    }
    updateSongFileSizeDisplay(this.song);
  }
  createHowl(): Howl {
    console.time("createHowl")
    const sound: Howl = new Howl({
      src: [this.fileReader.result as string],
      preload: PRELOAD_TYPE_SELECTOR.value === "process",
      autoplay: false,
      loop: false,
    });
    console.timeEnd("createHowl")

    reapplySoundAttributes(sound);
    sound.on('end', () => {
      if(REPEAT_BUTTON.checked) {
        if (sounds[currentSongIndex].isInExistence() && !sounds[currentSongIndex].howl.playing()) {
          sounds[currentSongIndex].howl.stop();
          sounds[currentSongIndex].howl.play();
        }
        return;
      }
      jumpSong();
    }); //jump to next song when they end (or do custom stuff if needed)
  
    return sound;
  }
}

class Song {
  file: File;
  nativeIndex: number;
  currentRow: HTMLTableRowElement;
  songLoader?: SongLoader = null;
  howl?: Howl = null;

  constructor(file: File, nativeIndex: number, currentRow: HTMLTableRowElement){
    this.file = file;
    this.nativeIndex = nativeIndex;
    this.currentRow = currentRow;
  }

  toString() {
    return this.file.name + ": " + this.getState();
  }

  getState() {
    if(!this.isInExistence()) {
      if(this.songLoader == null) {
        return "NO DATA";
      } else {
        return "DOWNLOADING FILE";
      }
    } else {
      if(this.isLoaded()) {
        return "HOWL LOADED";
      } else if(this.isLoading()) {
        return "HOWL LOADING";
      } else {
        return "HOWL UNLOADED";
      }
    }
  }

  async loadSong(): Promise<boolean>{
    return new Promise(resolve => {
      if(this.howl){
        resolve(true);
        return;
      }
      if(this.songLoader == null || this.songLoader.finishedLoadingAbortController.signal.aborted) this.songLoader = new SongLoader(this);
      else this.songLoader?.finishedLoadingAbortController?.signal?.addEventListener?.("abort", () => {
        resolve(!!this.howl);
      });

      this.songLoader.loadSong().then(howl => {
        this.howl = howl;
        resolve(true);
      }, (error: string) => {
        console.warn("Failed loading song: " + this.file.name + ". Error: " + error);
        resolve(false);
      }).finally(() => {
        this.songLoader = null;
      });
    })
  }

  unload(){
    if(this.songLoader){
      this.songLoader.quitLoading();
      this.songLoader = null;
    }
    if(this.howl){
      this.howl.unload();
      this.howl = null;
    }
  }
  /** @returns Whether the {@link Howl} exists for the audio, is fully loaded, but is not currently playing. */
  isPaused(){
    return this.isLoaded() && this.howl.playing() == false;
  }
  /** @returns Whether the {@link Howl} for this audio exists and is fully loaded. */
  isLoaded(){
    return this.isInExistence() && this.howl.state() === "loaded";
  }
  /** @returns Whether the {@link Howl} for this audio exists and is in the loading state. */
  isLoading(){
    return this.isInExistence() && this.howl.state() === "loading";
  }
  /** @returns Whether the associated {@link Howl} for this audio doesn't exist, or the {@link Howl}'s current audio data is not loaded, or currently loading. */
  isUnloaded(){
    return !this.isInExistence() || this.howl.state() === "unloaded";
  }
  /** @returns Whether the associated {@link Howl} is created for this Song. */
  isInExistence(){
    return this.howl != null;
  }
}

abstract class RegistrableEvent {
  registeredCallbacks: Function[] = [];

  abstract createNewListener(): void

  register(func: (parameter: unknown) => void) {
    this.registeredCallbacks.push(func)
  }
  unregister(func: Function) {
    this.registeredCallbacks.splice(this.registeredCallbacks.indexOf(func), 1)
  }
  clearAll() {
    this.registeredCallbacks = [];
  }
  callAllRegisteredFunctions(data: (DOMHighResTimeStamp | KeyboardEvent)) {
    for (let i = 0; i < this.registeredCallbacks.length; i++) this.registeredCallbacks[i](data)
  }
}

class KeyDownEventRegistrar extends RegistrableEvent {
  constructor() {
    super();
    this.createNewListener();
  }
  override register(func: (keyEvent: KeyboardEvent) => void) {
    this.registeredCallbacks.push(func)
  }

  createNewListener(): void {
    curWin.addEventListener('keydown', keyEvent => this.callAllRegisteredFunctions(keyEvent), { passive: false });
  }
}

class RequestAnimationFrameEventRegistrar extends RegistrableEvent {
  // @ts-expect-error
  static raf: ((callback: FrameRequestCallback) => number) = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame).bind(window)
  constructor() {
    super();
    RequestAnimationFrameEventRegistrar.raf((timestamp) => this.handleRAFCall(timestamp))
  }
  handleRAFCall(timestamp: DOMHighResTimeStamp) {
    this.callAllRegisteredFunctions(timestamp)
    RequestAnimationFrameEventRegistrar.raf((timestamp) => this.handleRAFCall(timestamp))
  }
  override register(func: (timestamp: DOMHighResTimeStamp) => void) {
    this.registeredCallbacks.push(func)
  }

  createNewListener(): void {
  }
}

/** Splits inputted seconds into hours, minutes, & seconds. toString() returns the time in digital format. */
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

  static numberToDigitalTimeString(number: number) {
    if (number <= 9) return `0${number}`

    return `${number}`
  }
}

class DataTransferItemGrabber { //this exists because javascript has bugs (it keeps deleting the references in FileSystemEntry[])
  dataTransferItemList: DataTransferItem[] | FileSystemEntry[] = [];
  files: (File | null)[] = [];
  activePromises = 0;
  filesCollected = 0;
  filesAdded = 0;
  phase: PhaseType = PhaseType.COLLECTING;

  /** @param dataTransferItemList this can be any array-like containing DataTransferItems or File / Directory entries (from DataTransferItem.webkitGetAsEntry()) */
  constructor(dataTransferItemList: DataTransferItemList) {
    this.dataTransferItemList = dataTransferItemList as unknown as DataTransferItem[];
  }

  async retrieveContents(): Promise<File[]> {
    return new Promise(async resolve => {
      if (this.files.length > 0) resolve(this.files);
      let fileEntryArray: FileSystemEntry[] = []; //collect all file entries that need to be scanned
      //@ts-expect-error
      for (let i = 0; i < this.dataTransferItemList.length; i++) fileEntryArray.push(this.dataTransferItemList[i]?.webkitGetAsEntry?.() ?? this.dataTransferItemList[i]);
      await this.scanFilesInArray(fileEntryArray);

      this.phase = PhaseType.RETRIEVING;
      await new Promise<void>((resolve) => {
        const waitForPromisesToResolve = (() => {
          if(this.activePromises > 0){
            setTimeout(waitForPromisesToResolve, 5);
          } else {
            resolve();
          }
        });
        waitForPromisesToResolve();
      });

      this.phase = PhaseType.FINISHED;
      this.updateLoadingStatus();
      return resolve(this.files);
    });
  }

  async scanFilesInArray(fileEntries: FileSystemEntry[]) {
    return new Promise<void>(async (resolve) => {
      for (let i = 0; i < fileEntries.length; i++) {
        let webkitEntry = fileEntries[i];
        if (webkitEntry.isDirectory) {
          let reader: FileSystemDirectoryReader = (<FileSystemDirectoryEntry><unknown>webkitEntry).createReader();
          await this.addFilesInDirectory(reader);
        } else if (webkitEntry.isFile) {
          let index = this.filesCollected++;
          this.files.push(null);
          this.updateLoadingStatus();

          let promise: Promise<File> = this.getFile(<FileSystemFileEntry>webkitEntry);
          promise.then(file => {
            this.files[index] = file;
            ++this.filesAdded;
            this.updateLoadingStatus();
          })
          promise.finally(() => {
            --this.activePromises;
          })
          ++this.activePromises;
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
      }

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

  async getFile(fileEntry: FileSystemFileEntry): Promise<File> {
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

var REQUEST_ANIMATION_FRAME_EVENT = new RequestAnimationFrameEventRegistrar(),
  KEY_DOWN_EVENT = new KeyDownEventRegistrar(),
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
  MAIN_TABLE = document.body.querySelector(".mainTable") as HTMLTableElement,
  PLAYLIST_VIEWER_TABLE = document.getElementById("Playlist_Viewer") as HTMLTableElement,
  PRELOAD_DIST_ELEMENT = document.getElementById('preloadDistance') as HTMLInputElement,
  PRELOAD_TYPE_SELECTOR = document.getElementById("preloadType") as HTMLSelectElement,
  COMPACT_MODE_LINK_ELEMENT: HTMLLinkElement | null = null,//document.getElementById('compactModeStyleLink'),
  COMPACT_MODE_TOGGLE = document.getElementById('compactMode') as HTMLInputElement,
  SEEK_DURATION_NUMBER_INPUT = document.getElementById('seekDuration') as HTMLInputElement,
  SEEK_DURATION_DISPLAY = document.getElementById("seekDurationDisplay") as HTMLLabelElement,
  SEEK_DISTANCE_PROPORTIONAL_CHECKBOX = document.getElementById('seekDistanceProportional') as HTMLInputElement,
  SKIP_UNPLAYABLE_CHECKBOX = document.getElementById('skipUnplayable') as HTMLInputElement,
  REORDER_FILES_CHECKBOX = document.getElementById('reorderFiles') as HTMLInputElement,
  TOGGLE_PIP_BUTTON = document.getElementById('enterPIP') as HTMLButtonElement,
  UPLOAD_BUTTON = document.getElementById('0input') as HTMLInputElement,
  UPLOAD_DIRECTORY_BUTTON = document.getElementById('inputDirectory') as HTMLInputElement,
  PLAY_RATE_RANGE = document.getElementById('0playRateSlider') as HTMLInputElement,
  SETTINGS_POPUP = document.getElementById('settingsPage') as HTMLDialogElement,
  ERROR_POPUP = document.getElementById('errorPopup') as HTMLDialogElement,
  DEPRECATED_POPUP = document.getElementById('deprecatedPopup') as HTMLDialogElement,
  DIALOGS = [SETTINGS_POPUP, ERROR_POPUP, DEPRECATED_POPUP],
  ERROR_LIST = document.getElementById('errorList') as HTMLDListElement,
  CONTEXT_MENU = document.getElementById('rightClickContextMenu') as HTMLDivElement,
  PROGRESS_BAR = document.getElementById('progress-bar') as HTMLProgressElement,
  HOVERED_TIME_DISPLAY = document.getElementById('hoveredTimeDisplay') as HTMLDivElement,
  VOLUME_CHANGER = document.getElementById('0playVolume') as HTMLInputElement,
  PLAY_RATE = document.getElementById('0playRate') as HTMLInputElement,
  PLAY_PAN = document.getElementById('0playPan') as HTMLInputElement,
  SEEK_BACK = document.getElementById('seekBack') as HTMLTableCellElement,
  // SEEK_FORWARD = document.getElementById('seekForward') as HTMLTableCellElement,
  REPEAT_BUTTON = document.getElementById('repeatButton') as HTMLInputElement,
  REPEAT_BUTTON_IMAGE = document.getElementById("repeatButtonImg") as HTMLImageElement,
  SHUFFLE_BUTTON = document.getElementById('shuffleButton') as HTMLInputElement,
  MUTE_BUTTON = document.getElementById('0Mute') as HTMLInputElement,
  PLAY_BUTTON = document.getElementById('playpause') as HTMLInputElement,
  STATUS_TEXT = document.getElementById('0status') as HTMLDivElement,
  CURRENT_FILE_NAME = document.getElementById('currentFileName') as HTMLElement,
  DURATION_OF_SONG_DISPLAY = document.getElementById('secondDurationLabel') as HTMLElement,
  DROPPING_FILE_OVERLAY = document.getElementById("dragOverDisplay") as HTMLDivElement;

var fileNameDisplays: HTMLElement[] = [];
var filePlayingCheckboxes: HTMLInputElement[] = [];
var fileSizeDisplays: HTMLElement[] = [];
var sounds: Song[] = [];
var selectedRows: HTMLTableRowElement[] = [];
var hoveredRowInDragAndDrop: HTMLTableRowElement = null; //does not work with importing files, only when organizing added files
var skipSongQueued = false;
var currentSongIndex: number | null = null;

/* start */(() => {
  if ("serviceWorker" in navigator && !SITE_DEPRECATED) {
    navigator.serviceWorker.register("../ServiceWorker.js");
  }

  registerDialogInertEvents();
  KEY_DOWN_EVENT.register(keyEvent => {
    if(keyEvent.key != "Tab" && keyEvent.key != "Shift" && keyEvent.key != "Ctrl" && keyEvent.key != "Alt" && keyEvent.key != "Enter") closeContextMenu();
  });
  KEY_DOWN_EVENT.register((keyboardEvent) => { if(keyboardEvent.key == "Escape") deselectAll()});
  REQUEST_ANIMATION_FRAME_EVENT.register(onFrameStepped);
  makeDocumentDroppable();
  // curDoc.addEventListener('touchend', (touchEvent: TouchEvent) => {
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
  curDoc.addEventListener("beforeunload", function () {
    quitPlayingMusic();
    sounds = [];
  }, { passive: true });
  initContextMenu();
  registerClickEvent(CURRENT_FILE_NAME, () => PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1].scrollIntoView(false))();
  registerClickEvent('skipBack', () => jumpSong(-1))();
  registerClickEvent('skipForward', () => jumpSong())();
  registerClickEvent(SEEK_BACK, () => seek(-1))();
  registerClickEvent('seekForward', () => seek(1))();
  registerClickEvent('settingsButton', () => SETTINGS_POPUP.showModal())();
  registerClickEvent('exitSettingsButton', () => SETTINGS_POPUP.close())();
  registerClickEvent('exitErrorPopup', () => ERROR_POPUP.close())();
  registerClickEvent('exitDeprecatedPopup', () => DEPRECATED_POPUP.close())();
  registerKeyDownEvent(<HTMLElement>SEEK_BACK.nextElementSibling, () => PLAY_BUTTON.click());
  registerChangeEvent(PLAY_BUTTON, () => pauseOrUnpauseCurrentSong(!PLAY_BUTTON.checked));
  registerChangeEvent(COMPACT_MODE_TOGGLE, toggleCompactMode);
  registerChangeEvent(REORDER_FILES_CHECKBOX, () => {
    const checked: boolean = REORDER_FILES_CHECKBOX.checked;
    const rows: HTMLCollectionOf<HTMLTableRowElement> = PLAYLIST_VIEWER_TABLE.rows;
    for(let i = PLAYLIST_VIEWER_TABLE.rows.length-1; i > 0; i--){ //purposely exclude last index. that is the header for the table
      rows[i].draggable = checked;
    }
  });
  registerKeyDownEvent(MUTE_BUTTON.parentElement, () => MUTE_BUTTON.click());
  registerChangeEvent(MUTE_BUTTON, () => { if(currentHowlExists()) sounds[currentSongIndex].howl.mute(MUTE_BUTTON.checked); });
  registerKeyDownEvent(REPEAT_BUTTON.labels[0], () => REPEAT_BUTTON.click());
  registerChangeEvent(REPEAT_BUTTON, () => {
      const checked = REPEAT_BUTTON.checked;
      if(currentHowlExists()) sounds[currentSongIndex].howl.loop(checked);
      if (checked) REPEAT_BUTTON_IMAGE.src = "../Icons/Repeat1Icon.svg";
      else REPEAT_BUTTON_IMAGE.src = "../Icons/RepeatIcon.svg";
  });
  registerKeyDownEvent(SHUFFLE_BUTTON.labels[0], () => SHUFFLE_BUTTON.click());
  registerChangeEvent(SHUFFLE_BUTTON, () => handleShuffleButton(SHUFFLE_BUTTON.checked));
  registerChangeEvent(PLAY_RATE, () => onPlayRateUpdate(parseFloat(PLAY_RATE.value)));
  registerKeyDownEvent(UPLOAD_BUTTON.labels[0].querySelector("img"), () => UPLOAD_BUTTON.click());
  registerChangeEvent(UPLOAD_BUTTON, () => importFiles(UPLOAD_BUTTON.files));
  registerChangeEvent(UPLOAD_DIRECTORY_BUTTON, () => importFiles(UPLOAD_DIRECTORY_BUTTON.files));
  registerInputEvent(PLAY_RATE_RANGE, () => { onPlayRateUpdate(parseFloat(PLAY_RATE_RANGE.value)) });
  registerInputEvent(PRELOAD_DIST_ELEMENT, () => { PRELOAD_DIST_ELEMENT.labels[0].textContent = `Value: ${PRELOAD_DIST_ELEMENT.value}` });
  registerInputEvent(PLAY_PAN, () => { if(currentHowlExists()) sounds[currentSongIndex].howl.stereo(Number(PLAY_PAN.value)); PLAY_PAN.labels[0].textContent = `${Math.floor(Number(PLAY_PAN.value) * 100)}%`; });
  registerInputEvent(VOLUME_CHANGER, () => { if (currentHowlExists()) sounds[currentSongIndex].howl.volume(Number(VOLUME_CHANGER.value)); VOLUME_CHANGER.labels[0].textContent = `${Math.floor(Number(VOLUME_CHANGER.value) * 100)}%`; });
  PLAYLIST_VIEWER_TABLE.addEventListener("keyup", (keyEvent) => {
    if(keyEvent.key == "Tab"){
      if(selectedRows.length == 0 && PLAYLIST_VIEWER_TABLE.rows[1]) selectRow(PLAYLIST_VIEWER_TABLE.rows[1]);
      if(selectedRows[0]) scrollRowIntoView(selectedRows[0]);
    }
  });
  PLAYLIST_VIEWER_TABLE.addEventListener("keydown", selectionLogicForKeyboard);
  
  ERROR_POPUP.addEventListener("close", onCloseErrorPopup);
  SEEK_DURATION_NUMBER_INPUT.addEventListener('input', updateSeekDurationDisplay, { passive: true });
  PROGRESS_BAR.addEventListener('pointerenter', (pointer) => progressBarSeek(pointer, ProgressBarSeekAction.DISPLAY_TIME), { passive: true })
  PROGRESS_BAR.addEventListener('pointerdown', (pointer) => { if(pointer.button == 0) progressBarSeek(pointer, ProgressBarSeekAction.SEEK_TO); }, { passive: true })
  PROGRESS_BAR.addEventListener('pointermove', (pointer) => progressBarSeek(pointer, ProgressBarSeekAction.DISPLAY_TIME), { passive: true })
  PROGRESS_BAR.addEventListener('pointerleave', (pointer) => progressBarSeek(pointer, ProgressBarSeekAction.STOP_DISPLAYING), { passive: true })
  if ('documentPictureInPicture' in window) {
    registerClickEvent(TOGGLE_PIP_BUTTON, togglePictureInPicture);
  } else {
    TOGGLE_PIP_BUTTON.remove();
  }

  if(SITE_DEPRECATED) DEPRECATED_POPUP.showModal();
  REORDER_FILES_CHECKBOX.dispatchEvent(new MouseEvent('click'));//.checked = !ON_MOBILE;
  SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked = true;
  SKIP_UNPLAYABLE_CHECKBOX.checked = true;
  //END
})()

function makeDocumentDroppable() {
  curWin.addEventListener("dragover", (event) => {
    if (!onlyFiles(event.dataTransfer)) return;
    event.preventDefault();
    DROPPING_FILE_OVERLAY.toggleAttribute("draggingOver", true);
    stopHighlightingRow();
  });
  curWin.addEventListener("dragleave", () => {
    DROPPING_FILE_OVERLAY.toggleAttribute("draggingOver", false);
    stopHighlightingRow();
  }, { passive: true })
  curWin.addEventListener("drop", (event) => {
    const dataTransfer = event.dataTransfer;
    if (!onlyFiles(dataTransfer)) return;
    event.preventDefault();
    DROPPING_FILE_OVERLAY.toggleAttribute("draggingOver", false);
    stopHighlightingRow();
    importFiles(dataTransfer);
  });
}

function registerDialogInertEvents(){
  modifyDialogPrototype();
  DIALOGS.forEach(dialog => {
    dialog.addEventListener("close", () => {
      dialog.toggleAttribute("inert", true);
    });
  })
}
function modifyDialogPrototype(){
  const showModalFunction = curWin.HTMLDialogElement.prototype.showModal;
  curWin.HTMLDialogElement.prototype.showModal = function() {
    this.removeAttribute("inert");
    return showModalFunction.call(this);
  }
}

function onCloseErrorPopup() {
  let childElement;
  while ((childElement = ERROR_LIST.lastChild) != null) {
    ERROR_LIST.removeChild(childElement);
  }
}

function registerClickEvent(element: EventTarget | string, func: (event: Event) => void): () => void {
  if (typeof element === 'string') element = curDoc.getElementById(element);
  element.addEventListener('click', func, { passive: true })
  return () => registerKeyDownEvent(<HTMLElement>element, func);
}
function registerKeyDownEvent(element: HTMLElement, func: (event: Event) => void, keyName = "Enter"){
  element.addEventListener('keydown', (keyEvent) => { if(keyEvent.key == keyName) func(keyEvent) }, { passive: true })
}
function registerChangeEvent(element: EventTarget | string, func: (event: Event) => void) {
  if (typeof element === 'string') element = curDoc.getElementById(element);
  element.addEventListener('change', func, { passive: true })
}
function registerInputEvent(elem: HTMLInputElement, func: (event: Event) => void){
  elem.addEventListener('input', func, { passive: true });
}

/**
 * @satisfies New song was not pushed to sounds array beforehand.
 * @param fileName The name of the song to be added to the Playlist Table.
 * @param index The song's index.
 */
function createNewSong(fileName: string, index: number): HTMLTableRowElement { //index is used to number the checkboxes
  const row = curDoc.createElement('tr');//PLAYLIST_VIEWER_TABLE.insertRow(PLAYLIST_VIEWER_TABLE.rows.length)
  const cell1 = row.insertCell(0);
  cell1.className = "songBorder";
  initializeRowEvents(row);

  const fileSize = curDoc.createElement('div');
  fileSize.setAttribute('class', 'songName fileSizeLabel');
  fileSize.setAttribute('style', 'position: absolute; transform: translate(-100%, 0); left: calc(100% - 3px);');

  const songName = curDoc.createElement('div')
  songName.setAttribute('class', 'songName text')
  songName.setAttribute('title', `${fileName}`)
  songName.textContent = fileName

  const songNumber = curDoc.createElement('div');
  songNumber.textContent = `${sounds.length + 1}. `;
  setAttributes(songNumber, {
    style: 'float: left; display: inline-block;',
    class: 'songNumber text',
    index: String(index)
  })

  const playButton = curDoc.createElement('label');
  playButton.setAttribute('class', 'smallplaypause playpause');
  playButton.setAttribute('for', `${index}playButton`);

  const checkbox = curDoc.createElement('input');
  registerChangeEvent(checkbox, () => onClickSpecificPlaySong(checkbox));
  setAttributes(checkbox, {
    type: 'checkbox',
    id: `${index}playButton`,
    class: 'smallplaypause playpause'
  });

  playButton.append(checkbox, curDoc.createElement('div'));
  cell1.append(fileSize, songNumber, playButton, songName);

  fileSizeDisplays.push(fileSize);
  fileNameDisplays.push(songName);
  filePlayingCheckboxes.push(checkbox);

  return row;
}

function toggleCompactMode() {
  if (COMPACT_MODE_LINK_ELEMENT === null) {
    COMPACT_MODE_LINK_ELEMENT = curDoc.createElement('link');
    setAttributes(COMPACT_MODE_LINK_ELEMENT, {
      rel: "stylesheet",
      href: "../CSS/CompactMode.css",
    });
    curDoc.head.appendChild(COMPACT_MODE_LINK_ELEMENT);
  }
  updateTranslationOfMainTable();
}

function onFrameStepped() {
  if (skipSongQueued) {
    skipSongQueued = false;
    filePlayingCheckboxes[(currentSongIndex + 1) % filePlayingCheckboxes.length].dispatchEvent(new MouseEvent('click'));
  }

  PRELOAD_DIST_ELEMENT.max = String(Math.max(sounds.length - 1, 1));
  if (COMPACT_MODE_LINK_ELEMENT?.sheet) {
    // if(COMPACT_MODE_TOGGLE.disabled) COMPACT_MODE_TOGGLE.disabled = false;
    if (COMPACT_MODE_LINK_ELEMENT.sheet.disabled == COMPACT_MODE_TOGGLE.checked) //if disabled needs to be updated with checkbox (checked is enabled, unchecked is disabled)
      COMPACT_MODE_LINK_ELEMENT.sheet.disabled = !COMPACT_MODE_TOGGLE.checked;
  }

  if (currentSongIndex === null || !sounds[currentSongIndex].isLoaded()) return cannotUpdateProgress(sounds[currentSongIndex]?.isLoading?.());
  else if(sounds[currentSongIndex].howl.playing() && (STATUS_TEXT.textContent == StatusTexts.PROCESSING || STATUS_TEXT.textContent == StatusTexts.DOWNLOADING)) onLatePlayStart();
  let songDuration = sounds[currentSongIndex].howl.duration();
  let currentTime = sounds[currentSongIndex].howl.seek();

  const timeToSet: number = (currentTime / songDuration) * 100;
  if (Number.isFinite(timeToSet)) PROGRESS_BAR.value = timeToSet;
  updateCurrentTimeDisplay(currentTime, songDuration);
  updateRowColor(PLAYLIST_VIEWER_TABLE.rows[currentSongIndex+1]);
}

function onLatePlayStart() {
  changeStatus(StatusTexts.PLAYING);
  reapplySoundAttributes(sounds[currentSongIndex].howl);
}
function cannotUpdateProgress(isProcessing: boolean) {
  if (isProcessing) changeStatus(StatusTexts.PROCESSING);
  if (DURATION_OF_SONG_DISPLAY.textContent != "00:00") DURATION_OF_SONG_DISPLAY.textContent = "00:00";
  if (HOVERED_TIME_DISPLAY.style.left != '-9999px') HOVERED_TIME_DISPLAY.style.left = '-9999px';
}
function reapplySoundAttributes(howl: Howl) {
  howl.rate(parseFloat(PLAY_RATE.value));
  howl.volume(parseFloat(VOLUME_CHANGER.value));
  howl.mute(MUTE_BUTTON.checked);
  howl.stereo(parseFloat(PLAY_PAN.value));
}
function updateCurrentTimeDisplay(currentTime: number, songDurationInSeconds: number) {
  const songDurationFormatted = new Time(songDurationInSeconds).toString()
  if (DURATION_OF_SONG_DISPLAY.textContent != songDurationFormatted) DURATION_OF_SONG_DISPLAY.textContent = songDurationFormatted;
  if (HOVERED_TIME_DISPLAY.hasAttribute('inUse')) return;

  const progressBarDomRect: DOMRect = PROGRESS_BAR.getBoundingClientRect();
  if (progressBarDomRect.top + 50 < 0) return; //return if you scrolled away from the progress bar (+50 to include the hoveredTimeDisplay)

  var hoveredTimeDisplayWidth = HOVERED_TIME_DISPLAY.getBoundingClientRect();
  const beginningOfProgressBar = (progressBarDomRect.left - hoveredTimeDisplayWidth.width / 2)+curWin.scrollX;
  const currentTimeString = new Time(currentTime).toString();
  if (HOVERED_TIME_DISPLAY.children[0].textContent != currentTimeString) HOVERED_TIME_DISPLAY.children[0].textContent = currentTimeString;

  const pixelsAcrossProgressBar = (progressBarDomRect.width * currentTime / songDurationInSeconds) - 1;
  HOVERED_TIME_DISPLAY.style.top = `${progressBarDomRect.top + curWin.scrollY}px`;
  HOVERED_TIME_DISPLAY.style.left = `${beginningOfProgressBar+pixelsAcrossProgressBar}px`;
}

function progressBarSeek(mouse: PointerEvent, hoverType: ProgressBarSeekAction): void {
  if (currentSongIndex === null || !sounds[currentSongIndex].isInExistence() || (mouse?.pointerType == "touch" && hoverType !== ProgressBarSeekAction.SEEK_TO) || hoverType === ProgressBarSeekAction.STOP_DISPLAYING){
    HOVERED_TIME_DISPLAY.toggleAttribute('inUse', false);
    return;
  }

  const offsetX = mouse.offsetX,
    progressBarWidth = PROGRESS_BAR.clientWidth,
    currentSongLength: number = sounds[currentSongIndex].howl.duration();

  let seekToTime = Math.max(offsetX * (currentSongLength / progressBarWidth), 0);
  switch (hoverType) {
    case (ProgressBarSeekAction.SEEK_TO): {
      sounds[currentSongIndex].howl.seek(seekToTime);
      return;
    }
    case (ProgressBarSeekAction.DISPLAY_TIME): {
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
function displayError(errorType: string, errorText: string, errorMessage: string, errorCategory: string) {
  let insertAfter;
  const children = ERROR_LIST.children;
  for (let i = 0; i < children.length; i++) {
    if (children[i].textContent == errorCategory) {
      insertAfter = children[i];
      break;
    }
  }
  const songTitle = curDoc.createElement('dt');
  songTitle.textContent = errorCategory;
  const songError = curDoc.createElement('dd');
  songError.textContent = errorType.concat(": ", errorText);
  songError.title = errorMessage;

  if (insertAfter) {
    insertAfter.after(songError);
  } else {
    ERROR_LIST.append(songTitle, songError);
  }
  ERROR_POPUP.showModal();
  console.error(`${errorType}: ${errorText} ${errorMessage}`);
}

function seek(seekDirection: number) { //controls audio seeking, seekDuration: usually +1 || -1
  if (sounds[currentSongIndex].isUnloaded()) return;
  const seekDuration = parseFloat(SEEK_DURATION_NUMBER_INPUT.value) * seekDirection;
  const numToAdd = (SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked) ? seekDuration * parseFloat(PLAY_RATE.value) : seekDuration;
  const currentTime = sounds[currentSongIndex].howl.seek();
  sounds[currentSongIndex].howl.seek(Math.max(currentTime + numToAdd, 0));
}

async function importFiles(element: DataTransfer | ArrayLike<File>) {
  const songTableRows: HTMLTableRowElement[] = [];
  if (element.constructor.name == "FileList") {
    addFiles(element);
  } else if (element instanceof curWin.DataTransfer) {
    let dataTransferItemList: DataTransferItemList = element?.items;
    if (!dataTransferItemList || dataTransferItemList.length == 0) return;

    changeStatus(StatusTexts.RETRIEVING);
    let fileReceiver = new DataTransferItemGrabber(dataTransferItemList);
    addFiles(await fileReceiver.retrieveContents());
  }

  function addFiles(files: ArrayLike<File> /*FileList or File[]*/) {
    const lengthBeforeBegin = sounds.length;
    let offsetBecauseOfSkipped = 0
    changeStatus(`Importing ${files.length} Files...`);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file == null) continue;
      const fileExtension = getFileExtension(file.name);
      if (SKIP_UNPLAYABLE_CHECKBOX.checked && !isValidExtension(fileExtension)) {
        displayError("TypeError", `The file type '${fileExtension}' is unsupported.`, "This file is unsupported and cannot be imported!", file.name);
        ++offsetBecauseOfSkipped;
        continue;
      }
      const nativeIndex: number = i + lengthBeforeBegin - offsetBecauseOfSkipped;
      const tableRow: HTMLTableRowElement = createNewSong(file.name, nativeIndex);
      const song = new Song(file, nativeIndex, tableRow);

      songTableRows.push(tableRow); //index (2nd parameter) is used to number the checkboxes
      sounds.push(song);
      updateSongFileSizeDisplay(song);
      updateTranslationOfMainTable();
    }

    const QUANTUM = 32768;
    const playlistTableBody = PLAYLIST_VIEWER_TABLE.tBodies[0];
    for (let i = 0; i < songTableRows.length; i += QUANTUM) {
      playlistTableBody.append( ...songTableRows.slice(i, Math.min(i + QUANTUM, songTableRows.length)) );
    }
    changeStatus(`${files.length - offsetBecauseOfSkipped} files added!`);
  }
}

function onPlayRateUpdate(newRate: number) {
  let stringRate = String(newRate);
  PLAY_RATE_RANGE.value = stringRate;
  PLAY_RATE.value = stringRate;
  if (!currentHowlExists()) return;

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
  } else {
    SEEK_DURATION_DISPLAY.textContent = `${duration} sec`;
  }
}

function handleShuffleButton(enable: boolean) {
  if (enable) {
    shuffle();
    refreshSongNames();
    for (let i = 0; i < sounds.length; i++) {
      updateSongFileSizeDisplays();
    }
    return;
  }

  let tempArray = sounds,
  foundCurrentPlayingSong = false;
  sounds = new Array(tempArray.length);

  for (let i = 0; i < tempArray.length; i++) {
    let sound = tempArray[i];
    sounds[sound.nativeIndex] = sound;
    sound.currentRow = PLAYLIST_VIEWER_TABLE.rows[sound.nativeIndex+1];
    updateSongFileSizeDisplay(sound);

    if (!foundCurrentPlayingSong && currentSongIndex !== null && i == currentSongIndex) {
      currentSongIndex = sound.nativeIndex;
      const currentCheckbox = filePlayingCheckboxes[currentSongIndex];
      filePlayingCheckboxes.forEach(it => { it.checked = false; });
      currentCheckbox.checked = true;
      foundCurrentPlayingSong = true;
    }
  }
  for (let i = 0; i < tempArray.length; i++) sounds[tempArray[i].nativeIndex] = tempArray[i];
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

    tempForSwapping.currentRow = PLAYLIST_VIEWER_TABLE.rows[randomIndex+1];
    sounds[randomIndex].currentRow = PLAYLIST_VIEWER_TABLE.rows[currentIndex+1];

    sounds[randomIndex] = tempForSwapping;
  }
}

function onClickSpecificPlaySong(checkbox: HTMLInputElement){
  const index: number = tryFindTableRowInParents(checkbox).rowIndex-1;
  startOrUnloadSong(index, checkbox.checked);
}

function startOrUnloadSong(index: number, startPlaying: boolean){
  filePlayingCheckboxes.forEach(checkbox => { checkbox.checked = false; }) //uncheck the play button for all the other sounds except the one u chose
  filePlayingCheckboxes[index].checked = startPlaying;
  if(startPlaying) startPlayingSpecificSong(index);
  else quitPlayingMusic();
}

function quitPlayingMusic(){
  const currentRow = PLAYLIST_VIEWER_TABLE.rows[currentSongIndex+1];
  filePlayingCheckboxes[currentSongIndex].checked = false;
  PLAY_BUTTON.checked = false;
  currentSongIndex = null;
  PROGRESS_BAR.value = 0;
  for (let i = 0; i < sounds.length; i++) sounds[i].unload();
  Howler.stop();
  changeStatus(StatusTexts.STOPPED);
  updateRowColor(currentRow);
  return;
}

async function startPlayingSpecificSong(index: number){ //called by HTML element
  if (sounds[index].isInExistence()) sounds[index].howl.stop();
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
    if(succeeded) startPlayingSong(song);
  })
  refreshPreloadedSongs();
}

function startPlayingSong(song: Song) {
  setCurrentFileName(song.file.name);
  reapplySoundAttributes(song.howl);

  if (Number(PLAY_RATE.value) != 0) {
    if(song.isUnloaded()) song.howl.load();
    song.howl.play();
    PLAY_BUTTON.checked = PLAYING;
  }
}

function refreshPreloadedSongs() {
  if (currentSongIndex === null) return;
  for (let i = 0; i < sounds.length; i++) {
    if (currentSongIndex === i) continue;
    if (!isIndexInRangeOfCurrent(i)) {
      sounds[i].unload();
      continue;
    }

    sounds[i].loadSong();
  }
}

function isIndexInRangeOfCurrent(index: number) {
  const distance: number = parseInt(PRELOAD_DIST_ELEMENT.value);
  const withinRange: boolean = index >= (currentSongIndex - distance) && index <= (currentSongIndex + distance);
  const inRangeWrappedToBegin: boolean = (index + distance) >= sounds.length && ((index + distance) % sounds.length) >= currentSongIndex;
  const inRangeWrappedToEnd: boolean = index - distance < 0 && ((index - distance) + sounds.length) <= currentSongIndex;
  return withinRange || inRangeWrappedToBegin || inRangeWrappedToEnd;
}

function jumpSong(amount?: number) { // amount can be negative or positive ;)
  amount = amount ?? 1 //if no value inputted, assume u want to jump ahead one song

  currentSongIndex = (currentSongIndex+(sounds.length+amount))%sounds.length;
  // currentSongIndex += amount
  // if (currentSongIndex > sounds.length - 1) currentSongIndex %= sounds.length;
  // else if (currentSongIndex < 0) currentSongIndex = Math.max(currentSongIndex + sounds.length, 0) //IDK a real solution to this

  const playButtonToActivate = filePlayingCheckboxes[currentSongIndex];
  playButtonToActivate.dispatchEvent(new MouseEvent('click'));
}

function pauseOrUnpauseCurrentSong(pause: boolean){ //controls playAll button, called by HTML element
  if (!sounds[currentSongIndex] || !sounds[currentSongIndex].isInExistence()){
    PLAY_BUTTON.checked = !PLAY_BUTTON.checked;
    return;
  }

  if (pause) { //if set to paused
    PLAY_BUTTON.checked = PAUSED;
    sounds[currentSongIndex].howl.pause()
    changeStatus(StatusTexts.PAUSED);
    return;
  }

  sounds[currentSongIndex].howl.play();
  changeStatus(StatusTexts.PLAYING);
}

function refreshSongNames() {
  for (let i = 0; i < sounds.length; i++) {
    fileNameDisplays[i].textContent = sounds[i].file.name;
    fileNameDisplays[i].setAttribute('title', sounds[i].file.name);
  }
}
function setCurrentFileName(name: string) {
  if (CURRENT_FILE_NAME.textContent != name) {
    CURRENT_FILE_NAME.textContent = name; //name is compressed by CSS formatting if too large
    CURRENT_FILE_NAME.setAttribute('title', name);
    curDoc.title = name;
  }
}
function updateSeekButtonTexts() {
  curDoc.querySelectorAll('button').forEach(element => {
    const secondsSkipAmount = precisionRound(10 * Number(PLAY_RATE.value), 3);
    element.textContent = `${element.textContent[0]}${secondsSkipAmount} Seconds`;
  });
}
function precisionRound(number: number, precision: number) {
  const factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

function currentHowlExists(){ return currentSongIndex !== null && sounds[currentSongIndex].isInExistence() }
function changeStatus(status: string) { STATUS_TEXT.textContent = status; }
function onlyFiles(dataTransfer: DataTransfer) { return dataTransfer.types.length == 1 && dataTransfer.types[0] === 'Files' }
function isValidExtension(extension: string) { return codecsMixin(extension); }
function setAttributes(element: HTMLElement, attrs: { [key: string]: string }) { for (const key in attrs) element.setAttribute(key, attrs[key]); }
// @ts-ignore
function sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
function getInMegabytes(bytes: number): string { return (bytes / 1_048_576).toFixed(2); }
function getFileExtension(fileName: string): string { return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(); }

/*            TABLE INTERACTION FUNCTIONS             */
function initializeRowEvents(row: HTMLTableRowElement) {
  row.setAttribute('draggable', (REORDER_FILES_CHECKBOX.checked).toString());
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

var previouslyActiveRow: HTMLTableRowElement = null;
function setRowActive(row: HTMLTableRowElement){
  if(previouslyActiveRow != null && previouslyActiveRow != row){
    updateRowColor(previouslyActiveRow); //previouslyActiveRow.style.backgroundColor = RowColors.NONE;
  }
  row.style.backgroundColor = RowColors.PLAYING;
  previouslyActiveRow = row;
}

function updateRowColor(row: HTMLTableRowElement){
  if(row.hasAttribute("data-selected")){
    row.style.backgroundColor = RowColors.SELECTING;
  } else if(row.rowIndex-1 === currentSongIndex){
    setRowActive(row);
  } else {
    row.style.backgroundColor = RowColors.NONE;
  }
}

function whileDraggingRows(event: DragEvent): void  {
  if (onlyFiles(event.dataTransfer)) return;
  stopHighlightingRow();

  
  let hoveredElement = findValidTableRow(event.target as Element);
  if(!hoveredElement){
    return;
  }
  hoveredRowInDragAndDrop = hoveredElement;
  hoveredRowInDragAndDrop.style.borderBottomColor = "blue"
  event.stopPropagation();
}
function onDropRow(event: DragEvent) {
  if (event.dataTransfer.getData("text/plain") != "action:reorganizingPlaylist") return;
  stopHighlightingRow();
  sortSelectedRows();
  let row: Element = event.target as Element;
  if (!rowValid(row)) {
    row = tryFindTableRowInParents(row);
    if (!rowValid(row)) return;
  }
  moveSelectedSongs((row as HTMLTableRowElement).rowIndex - 1);
  event.stopPropagation();
}
function stopHighlightingRow() {
  if (hoveredRowInDragAndDrop != null) {
    hoveredRowInDragAndDrop.style.borderBottomColor = "";
    hoveredRowInDragAndDrop.style.borderTopColor = "";
  }
}
function onSingleClick(mouseEvent: MouseEvent) {
  let row = findValidTableRow(mouseEvent.target as Element)
  if(row == null) return;

  if (mouseEvent.ctrlKey) {
    if (row.hasAttribute("data-selected")) return deselectRow(selectedRows.indexOf(row as HTMLTableRowElement));
  } else if (mouseEvent.shiftKey && selectedRows.length != 0) {
    sortSelectedRows();
    let startingIndex = selectedRows[selectedRows.length - 1].rowIndex;
    const endingIndex = (row as HTMLTableRowElement).rowIndex;
    if (endingIndex > startingIndex) {
      for (let i = startingIndex + 1; i < endingIndex; i++) selectRow(PLAYLIST_VIEWER_TABLE.rows[i]);
    } else {
      startingIndex = selectedRows[0].rowIndex;
      for (let i = startingIndex - 1; i > endingIndex; i--) selectRow(PLAYLIST_VIEWER_TABLE.rows[i]);
    }
  } else {
    deselectAll();
  }

  selectRow(row as HTMLTableRowElement);
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
function scrollRowIntoView(row: HTMLTableRowElement){
  //@ts-expect-error
  if(row.scrollIntoViewIfNeeded){
    //@ts-expect-error
    row.scrollIntoViewIfNeeded();
  } else {
    row.scrollIntoView({behavior: "instant", block: "nearest"});
  }
}
function selectRow(row: HTMLTableRowElement) {
  row = findValidTableRow(row);
  if(!row) return;
  if(row.hasAttribute("data-selected")) return;
  row.toggleAttribute("data-selected", true);
  updateRowColor(row);
  selectedRows.push(row);
  scrollRowIntoView(row);
}
function onDoubleClick(mouseEvent: MouseEvent) {
  deselectAll();
  let row: HTMLTableRowElement | null = findValidTableRow(mouseEvent.target as Element);
  if(row) playRow(row);
}
/**
 * @param removeIndex {number} (-1) = won't remove any elems from array
 * @param removeFromArray Whether to remove the index from the array.
 */
function deselectRow(removeIndex: number, removeFromArray: boolean = true) {
  const row: HTMLTableRowElement = selectedRows[removeIndex];
  row.toggleAttribute("data-selected", false)
  updateRowColor(row);
  if(removeFromArray) selectedRows.splice(removeIndex, 1);
}
function deselectAll() {
  for (let i = 0; i < selectedRows.length; i++) deselectRow(i, false);
  selectedRows = [];
}
function playRow(row: HTMLTableRowElement) {
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
    } else if (currentSongIndex !== null && currentSongIndex > index){
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
  updateTranslationOfMainTable();
  refreshPreloadedSongs();
}
function moveSelectedSongs(toIndex: number) {
  const tableBody: HTMLTableSectionElement = PLAYLIST_VIEWER_TABLE.firstElementChild as HTMLTableSectionElement;
  for (let i = selectedRows.length - 1; i >= 0; i--) {
    const currentlyPlayingRow: HTMLTableRowElement = PLAYLIST_VIEWER_TABLE.rows[currentSongIndex+1];
    const index = selectedRows[i].rowIndex - 1;
    tableBody.removeChild(selectedRows[i]);
    sounds.splice(toIndex, 0, sounds.splice(index, 1)[0]);
    filePlayingCheckboxes.splice(toIndex, 0, filePlayingCheckboxes.splice(index, 1)[0]);
    fileNameDisplays.splice(toIndex, 0, fileNameDisplays.splice(index, 1)[0]);
    fileSizeDisplays.splice(toIndex, 0, fileSizeDisplays.splice(index, 1)[0]);
    tableBody.insertBefore(selectedRows[i], tableBody.children[toIndex + 1])
    currentSongIndex = currentlyPlayingRow.rowIndex-1;
  }
  deselectAll();
  updateSongNumberings();
  refreshPreloadedSongs();
}
function selectionLogicForKeyboard(keyboardEvent: KeyboardEvent) {
  if (selectedRows.length == 0) return;
  switch (keyboardEvent.key) {
    case "ArrowUp": return arrowSelection(keyboardEvent, -1);
    case "ArrowDown": return arrowSelection(keyboardEvent, 1);
    case "Backspace":
    case "Delete": return deleteSongsFromKeyboard(keyboardEvent);
    case "Space":
    case "Enter": return startPlayingFromKeyboard(keyboardEvent);
  }
}

var indexScrollDirection = 0;
function arrowSelection(keyboardEvent: KeyboardEvent, indexIncrement: number) {
  keyboardEvent.preventDefault();
  sortSelectedRows();
  if (isTyping(keyboardEvent)) return;
  if (keyboardEvent.shiftKey) { 
    if(selectedRows.length == 1) indexScrollDirection = Math.sign(indexIncrement);
    if(Math.sign(indexScrollDirection) == Math.sign(indexIncrement)){
      let row;
      if (indexIncrement > 0) {
        row = PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + indexIncrement];
      } else {
        row = PLAYLIST_VIEWER_TABLE.rows[selectedRows[0].rowIndex + indexIncrement];
      }
      if(row) selectRow(row);
    } else {
      if(indexIncrement > 0){
        deselectRow(0);
      } else {
        deselectRow(selectedRows.length - 1);
      }
      
    }
    
  } else {
    const oneElement = PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + indexIncrement];
    if (!rowValid(oneElement)) return;
    deselectAll();
    selectRow(oneElement);
  }
}
function deleteSongsFromKeyboard(keyboardEvent: KeyboardEvent) { if (!isTyping(keyboardEvent)) deleteSelectedSongs(); }
function startPlayingFromKeyboard(keyboardEvent: KeyboardEvent) {
  if(isTyping(keyboardEvent) || selectedRows.length != 1) return;
  keyboardEvent.preventDefault();
  playRow(selectedRows[0])
  // deselectAll();
}
function tryFindTableRowInParents(element: Element): HTMLTableRowElement | null {
  return element.closest('tr');
}
function updateTranslationOfMainTable(){//COMPACT_MODE_TOGGLE.checked
  MAIN_TABLE.style.setProperty("--moveDown", `calc(30vh - ${sounds.length*((/*COMPACT_MODE_TOGGLE.checked ? 22 : */52))}px)`);
}
function updateSongNumberings() {
  for(const song of sounds){
    var row = song.currentRow;
    row.querySelector(".songNumber").textContent = `${row.rowIndex}. `
  }
  // let songNumbers = curDoc.getElementsByClassName('songNumber');
  // for (let i = 0; i < songNumbers.length; i++) {
  //   let songNumber = songNumbers[i];
  //   let row = tryFindTableRowInParents(songNumber);
  //   if (row == null) continue;
  //   songNumber.textContent = `${row.rowIndex}. `;
  // }
}
function setSongFileSizeDisplay(song: Song, textContent: string, hoverText: string) {
  const row = song.currentRow;
  const fileSizeDisplay = row.querySelector(".fileSizeLabel");
  fileSizeDisplay.textContent = textContent;
  fileSizeDisplay.setAttribute('title', hoverText);
}
function updateSongFileSizeDisplay(song: Song) {
  const row = song.currentRow;
  const fileSizeDisplay = row.querySelector(".fileSizeLabel");
  const bytes = song.file.size;
  const megabytes: string = getInMegabytes(bytes);
  fileSizeDisplay.textContent = `${megabytes} MB`
  fileSizeDisplay.setAttribute('title', `${bytes} bytes`);
}
function updateSongFileSizeDisplays() {
  for(const song of sounds){
    updateSongFileSizeDisplay(song);
  }
}

function rowValid(row: Element) { return row?.constructor?.name == "HTMLTableRowElement" && row != PLAYLIST_VIEWER_TABLE.rows[0] && row.closest('table') == PLAYLIST_VIEWER_TABLE; }
function findValidTableRow(topLevelElement: Element): HTMLTableRowElement | null{
  if(rowValid(topLevelElement)) return topLevelElement as HTMLTableRowElement;
  else {
    topLevelElement = tryFindTableRowInParents(topLevelElement);
    if (rowValid(topLevelElement)) return topLevelElement as HTMLTableRowElement;
    else return null;
  }
}
function sortSelectedRows() { selectedRows.sort((a, b) => a.rowIndex - b.rowIndex) }
function isTyping(keyboardEvent: KeyboardEvent): boolean { return keyboardEvent.target instanceof curWin.HTMLInputElement; }



async function togglePictureInPicture() {
  TOGGLE_PIP_BUTTON.disabled = true;

  if(storedWindow == null) await enterPictureInPicture();
  else exitPictureInPicture();

  TOGGLE_PIP_BUTTON.disabled = false;
}

async function enterPictureInPicture() {
  // @ts-expect-error
  storedWindow = await documentPictureInPicture.requestWindow({width: 450, height: 450, disallowReturnToOpener: false, preferInitialWindowPlacement: false});
  curWin = storedWindow;
  curDoc = storedWindow.document;
  moveElementsToDocument(document, storedWindow.document);
  storedWindow.addEventListener('pagehide', exitPictureInPicture, true);

  KEY_DOWN_EVENT.createNewListener();
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

function moveElementsToDocument(oldDoc: Document, newDoc: Document) {
  newDoc.head.append(...oldDoc.head.children)
  newDoc.body.append(...oldDoc.body.children)
  DIALOGS.forEach(dialog => dialog.close()); //Dialogs lose their state when transferring and become glitched
}

/*                       CONTEXT MENU                      */

function initContextMenu(): void {
  curDoc.addEventListener('contextmenu', (pointerEvent) => {
    selectingSongRow: { //if clicking a row
      let row: Element = pointerEvent.target as Element;
      if (!rowValid(row)) {
        row = tryFindTableRowInParents(row as Element);
        if (!rowValid(row)) break selectingSongRow;
      }

      if (!selectedRows.includes(row as HTMLTableRowElement)) {
        deselectAll();
        selectRow(row as HTMLTableRowElement);
      }

      const contextOptions: ContextMenuOption[] = [];
      if (selectedRows.length == 1) contextOptions.push({ text: (currentSongIndex != selectedRows[0].rowIndex - 1) ? "Play" : "Stop", action: () => playRow(selectedRows[0]) });
      contextOptions.push({ text: "Delete", action: deleteSelectedSongs });

      pointerEvent.preventDefault()
      return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, contextOptions, true);
    }

    switch ((pointerEvent.target as Element).getAttribute('data-onRightClick')) {
      case "uploadFileMenu": {
        pointerEvent.preventDefault()
        return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [
          { text: "Upload Files", icon: "../Icons/UploadIcon.svg", action: () => UPLOAD_BUTTON.dispatchEvent(new MouseEvent('click')) },
          { text: "Upload Folder", icon: "../Icons/UploadIcon.svg", action: () => UPLOAD_DIRECTORY_BUTTON.dispatchEvent(new MouseEvent('click')) }
        ], false);
      }
      case "quickSettings": {
        pointerEvent.preventDefault()
        return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [
          { text: "Toggle PIP (WIP)", action: () => TOGGLE_PIP_BUTTON.dispatchEvent(new MouseEvent('click')) },
        ], true);
      }
      default: {
        // return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [], true);
      }
    }
  });

  registerClickEvent(curDoc, (mouseEvent) => {
    closeContextMenu();
    if (mouseEvent.target == curDoc.querySelector("html") || mouseEvent.target == curDoc.body) deselectAll();
  });
}

function spawnContextMenu(clientX: number, clientY: number, contextOptions: ContextMenuOption[], allowDefaultOptions: Boolean) {
  let childElement: HTMLElement;
  while ((childElement = CONTEXT_MENU.lastChild as HTMLElement) != null) {
    CONTEXT_MENU.removeChild(childElement);
  }

  if (allowDefaultOptions) {
    contextOptions = contextOptions.concat([
      { text: COMPACT_MODE_TOGGLE.checked ? "Disable Compact Mode" : "Enable Compact Mode", action: () => { COMPACT_MODE_TOGGLE.dispatchEvent(new MouseEvent('click')); } },
      { text: REORDER_FILES_CHECKBOX.checked ? "Disable Song Reordering" : "Enable Song Reordering", action: () => { REORDER_FILES_CHECKBOX.dispatchEvent(new MouseEvent('click')); } }
    ]);
  }

  const contextButtons: HTMLDivElement[] = [];
  for (let i = 0; i < contextOptions.length; i++) {
    const contextOption = contextOptions[i];
    const contextButton = curDoc.createElement('div');
    contextButton.setAttribute('class', 'contextOption');
    contextButton.tabIndex = 1;
    if (i < contextOptions.length - 1) contextButton.style.borderBottomWidth = "1px";
    contextButton.addEventListener('click', (event) => { if (CONTEXT_MENU.hasAttribute('open')) contextOption.action(event) });
    contextButton.addEventListener('keyup', (event) => { if (event.key == 'Enter' && CONTEXT_MENU.hasAttribute('open')) contextOption.action(event) });

    if (contextOption.icon) {
      const contextIcon = curDoc.createElement('img');
      contextIcon.setAttribute('class', 'contextIcon');
      contextIcon.src = contextOption.icon;
      contextButton.append(contextIcon, contextOption.text);
    } else {
      contextButton.textContent = contextOption.text;
    }
    contextButtons.push(contextButton);
  }

  CONTEXT_MENU.append(...contextButtons);
  CONTEXT_MENU.style.height = 'max-content';//`${contextButtons.length * 29}px`;

  let leftOffset = clientX + 2,
    downOffset = clientY + 2;
  const viewportWidth = curDoc.documentElement.clientWidth,
    viewportHeight = curDoc.documentElement.clientHeight,
    contextMenuRect = CONTEXT_MENU.getBoundingClientRect();

  if (leftOffset + contextMenuRect.width > viewportWidth) {
    leftOffset = viewportWidth - contextMenuRect.width;
  }
  if (downOffset + contextMenuRect.height > viewportHeight) {
    downOffset = viewportHeight - contextMenuRect.height;
  }
  CONTEXT_MENU.style.left = `${leftOffset}px`;
  CONTEXT_MENU.style.top = `${downOffset}px`;
  CONTEXT_MENU.toggleAttribute('open', true);
  if(contextButtons[0]) contextButtons[0].focus({focusVisible: true});
}

function closeContextMenu() { CONTEXT_MENU.toggleAttribute('open', false); CONTEXT_MENU.style.height = '0'; }