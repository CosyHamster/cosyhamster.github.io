//@ts-expect-error
import("./howler.js").catch((error) => {
  console.warn(error + "\nLoading Howler using script element instead.");
  let howlerScript = document.createElement('script');
  howlerScript.src = "../Javascript/howler.js";
  document.head.appendChild(howlerScript);
});

var audio = new Audio();
var useObjectURLS = false;
var aiffIsPlayable = !!(audio.canPlayType("audio/aiff") || audio.canPlayType("audio/x-aiff"));
function codecsMixin(extension: string): boolean {
  switch(extension){
    case "aif":
    case "aiff":
    case "aff": return aiffIsPlayable;
    default: return Howler.codecs(extension);
  }
}

var storedWindow: Window;
var curWin: Window = window;
var curDoc: Document = document;
const SITE_DEPRECATED = document.URL.toLowerCase().includes('codehs');
const NO_SERVICE_WORKER = document.URL.includes("127.0.0.1");
var ON_MOBILE: boolean;

//@ts-ignore
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
  action: (event: UIEvent) => void
}

class SongTableRow {
  tableRow: HTMLTableRowElement;

  constructor(tableRow?: HTMLTableRowElement){
    if(tableRow){
      this.tableRow = tableRow;
      return;
    }

    const row = curDoc.createElement('tr');//PLAYLIST_VIEWER_TABLE.insertRow(PLAYLIST_VIEWER_TABLE.rows.length)
    const cell1 = row.insertCell(0);
    cell1.className = "songBorder";
    cell1.setAttribute("style", "display:flex;width:100%;");
    initializeRowEvents(row);

    const songNumber = curDoc.createElement('div');
    setAttributes(songNumber, {
      class: 'songNumber text',
    });


    const playButton = curDoc.createElement('label');
    playButton.style.flex = "flex: 0 1 auto;";
    playButton.setAttribute('class', 'smallplaypause playpause');

    const checkbox = curDoc.createElement('input');
    registerChangeEvent(checkbox, () => onClickSpecificPlaySong(checkbox));
    setAttributes(checkbox, {
      type: 'checkbox',
      class: 'smallplaypause playpause'
    });

    playButton.append(checkbox, curDoc.createElement('div'));

    const songName = curDoc.createElement('div');
    songName.setAttribute('class', 'songName scrollableText text');

    const fileSize = curDoc.createElement('div');
    fileSize.setAttribute('class', 'scrollableText fileSizeLabel');
    fileSize.addEventListener("contextmenu", onRightClickFileDisplay);



    cell1.append(songNumber, playButton, songName, fileSize);
    filePlayingCheckboxes.push(checkbox);

    this.tableRow = row;
  }

  setSongName(fileName: string){
    const songNameElement: HTMLDivElement = this.tableRow.firstElementChild.querySelector(".scrollableText:nth-child(odd)");
    songNameElement.textContent = fileName;
    songNameElement.setAttribute('title', fileName);
  }
  updateRowSongNumber(){
    this.setRowSongNumber(this.tableRow.rowIndex);
  }
  setRowSongNumber(songNumber: number){
    const songNumberElement: HTMLDivElement = this.tableRow.firstElementChild.querySelector(".songNumber");
    songNumberElement.textContent = `${songNumber}. `;
  }
  updateFileInfoDisplay(bytes: number, duration: number){
    const megabytes: string = getInMegabytes(bytes);
    const formattedDuration: string = new Time(duration).toString();
    this.setFileDisplay(formattedDuration, `${megabytes} MB`);
  }
  updateFileSizeDisplay(bytes: number){
    const megabytes: string = getInMegabytes(bytes);
    this.setFileDisplay(`${megabytes} MB`, `${bytes} bytes`);
  }
  setFileDisplay(textContent: string, titleText: string){
    const fileSizeDisplay = this.tableRow.firstElementChild.querySelector(".fileSizeLabel");
    fileSizeDisplay.textContent = textContent;
    fileSizeDisplay.setAttribute('title', titleText);
  }
  getPlaySongCheckbox(): HTMLInputElement {
    return this.tableRow.firstElementChild.querySelector("input.playpause");
  }
  isRemoved(){
    return this.tableRow.parentNode == null;
  }
}

class SongLoader{
  song: Song;
  fileReader: FileReader = new FileReader();
  finishedLoadingAbortController?: AbortController;
  constructor(song: Song){
    this.song = song;
  }
  
  loadSong(): Promise<Howl>{
    // const xml = new XMLHttpRequest();
    // xml.responseType = "blob";
    // xml.onprogress = (xmlHttpRequest: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => {return 5}
    // xml.open()

    return new Promise<Howl>(async (resolve, reject) => {
      if(useObjectURLS){
        if(this.song.howl == null){
          const howl = this.createHowl();
          this.song.howl = howl;
          resolve(howl);

          this.song.updateFileInfoDisplay();
          this.triggerAbort();
        }

        return;
      }

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
          }, {passive: true, once: true});
          return;
        }
      }

      const onProgress = (progressEvent: ProgressEvent<FileReader>) => {
        if (sounds[currentSongIndex].file == this.song.file)
          setProgressBarPercentage((100 * progressEvent.loaded) / progressEvent.total);

        if(SHOW_LENGTHS.checked){
          this.song.currentRow.setFileDisplay(
              `${Math.round(100 * progressEvent.loaded / progressEvent.total)} %`,
              `${progressEvent.loaded} bytes / ${progressEvent.total} bytes`
          );
        } else {
          this.song.currentRow.setFileDisplay(
              `${getInMegabytes(progressEvent.loaded)} MB / ${getInMegabytes(progressEvent.total)} MB`,
              `${progressEvent.loaded} bytes / ${progressEvent.total} bytes`
          );
        }
      }
      const onLoaded = () => {
        const howl = this.createHowl();
        this.song.howl = howl;
        resolve(howl);

        this.song.updateFileInfoDisplay();
        this.triggerAbort();
      }
      const errorFunc = (progressEvent: ProgressEvent<FileReader>) => {
        this.triggerAbort();
        //TODO: implement these error handlers for songs loaded using the object URL. accessing {sounds[currentSongIndex].howl._sounds[0]._node (.readyState === 3)} may help.
        const error = progressEvent.target.error;
        switch (error.name) {
          case "NotFoundError": { displayError(error, "Failed to find file!", this.song.file.name); break; }
          case "NotReadableError": { displayError(error, "This file's access had changed. Try reimporting it.", this.song.file.name); break; }
          default: { displayError(error, error.message, this.song.file.name); break; }
        }

        reject(error.name);
      }
      const warnUser = () => {
        this.triggerAbort();
        reject(`File Aborted: ${this.song.file.name}`);
      }

      this.finishedLoadingAbortController.signal.addEventListener('abort', () => {
        this.fileReader.abort();
        console.log('fileReader aborted');
      }, {passive: true, once: true, signal: this.finishedLoadingAbortController.signal});

      this.fileReader.addEventListener('progress', onProgress, { passive: true, signal: this.finishedLoadingAbortController.signal });
      this.fileReader.addEventListener('loadend', onLoaded, { passive: true, signal: this.finishedLoadingAbortController.signal });
      this.fileReader.addEventListener('error', errorFunc, { passive: true, signal: this.finishedLoadingAbortController.signal });
      this.fileReader.addEventListener('abort', warnUser, { passive: true, signal: this.finishedLoadingAbortController.signal });
      this.fileReader.readAsArrayBuffer(this.song.file);
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
    this.song.updateFileInfoDisplay();
  }
  createHowl() {
    // LOADING_GRAY.toggleAttribute("enable", true);
    // await sleep(0); //dom update before beginning the load
    console.time("createHowl");
    const howl: Howl = new Howl({
      providedBuffer: (useObjectURLS) ? null : this.fileReader.result as ArrayBuffer, //providedBuffer will be used over src
      src: this.song.fileURL,
      preload: PRELOAD_TYPE_SELECTOR.value === "process",
      autoplay: false,
      loop: false,
      format: getFileExtension(this.song.file.name),
    });
    console.timeEnd("createHowl");

    // LOADING_GRAY.toggleAttribute("enable", false);

    reapplySoundAttributes(howl);
    howl.on("load", () => {
      this.song.duration = howl.duration();
      this.song.updateFileInfoDisplay();
    });
    howl.on('end', () => {
      if(REPEAT_BUTTON.checked) {
        if (sounds[currentSongIndex].isInExistence() && !sounds[currentSongIndex].howl.playing()) {
          sounds[currentSongIndex].howl.stop();
          sounds[currentSongIndex].howl.play();
        }
        return;
      }
      jumpSong();
    }); //jump to next song when they end (or do custom stuff if needed)
    howl.on("play", onPlayStart);

  
    return howl;
  }
}

async function updateAllFileInfos(){
  // if(SHOW_LENGTHS.checked){
  //   loadAndDisplaySongLengths();
  // }

  for(const song of sounds){
    song.updateFileInfoDisplay();
  }
}


let queuedSongs: Set<Song> = new Set();
async function loadAndDisplaySongLengths(){
  const loadSongs = queuedSongs.size == 0;
  for(const song of sounds){
    if(song.duration === null)
      queuedSongs.add(song);
  }

  if(!loadSongs) return;
  for(const song of queuedSongs){
    if(!SHOW_LENGTHS.checked){
      queuedSongs.clear();
      return;
    }

    queuedSongs.delete(song);
    if(song.currentRow.isRemoved())
      continue;
    if(song.durationLoaded()) {
      song.updateFileInfoDisplay();
      continue;
    }

    await loadSongDuration(song);
  }
}

async function loadSongDuration(song: Song){
  await new Promise<void>((resolve) => {
    const audio = curDoc.createElement('audio');
    const abortController = new AbortController();
    
    let timeoutID: number;
    function onFinish(){
      clearTimeout(timeoutID)
      abortController.abort();
    }
    function giveUp(){
      onFinish();
      resolve();
    }

    // @ts-ignore
    timeoutID = setTimeout(giveUp, 60000);
    audio.addEventListener("durationchange", () => {
      song.duration = audio.duration;
      song.onDurationLoaded();
      onFinish();
      resolve();
    }, {passive: true, once: true, signal: abortController.signal});

    audio.addEventListener("error", giveUp, {passive: true, once: true, signal: abortController.signal});
    audio.addEventListener("abort", giveUp, {passive: true, once: true, signal: abortController.signal});

    audio.preload = "metadata";
    audio.src = song.fileURL;
  });
}

class Song {
  file: File;
  fileURL: string;
  howl?: Howl = null;
  songLoader?: SongLoader = null;
  duration: number = null;
  currentRow: SongTableRow;
  nativeIndex: number;

  constructor(file: File, nativeIndex: number, currentRow: SongTableRow){
    this.file = file;
    this.fileURL = URL.createObjectURL(this.file);
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
      if(this.howl != null){
        resolve(true);
        return;
      }

      if(this.songLoader == null || this.songLoader.finishedLoadingAbortController.signal.aborted)
        this.songLoader = new SongLoader(this);
      else
        this.songLoader.finishedLoadingAbortController.signal.addEventListener("abort", () => {
          resolve(this.howl != null);
        });

      this.songLoader.loadSong().then(howl => {
        this.howl = howl;
        resolve(true);
      }, (error: string) => {
        console.warn("Failed loading song: " + this.file.name + ".\nError: " + error);
        resolve(false);
      }).finally(() => {
        this.songLoader = null;
      });
    })
  }

  unload(){
    if(this.songLoader != null){
      this.songLoader.quitLoading();
      this.songLoader = null;
    }
    if(this.howl != null){
      this.howl.unload();
      if(this.howl._src != this.fileURL)
        URL.revokeObjectURL(this.howl._src);

      this.howl = null;
    }

    this.updateFileInfoDisplay();
  }

  onDelete(){
    this.unload();
    URL.revokeObjectURL(this.fileURL);
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

  durationLoaded(){
    return this.duration !== null;
  }

  updateFileInfoDisplay(){
    if(SHOW_LENGTHS.checked && this.durationLoaded()){
      this.currentRow.updateFileInfoDisplay(this.file.size, this.duration);
    } else {
      this.currentRow.updateFileSizeDisplay(this.file.size);
    }
  }

  onDurationLoaded(){
    this.updateFileInfoDisplay();
  }
}

abstract class RegistrableEvent {
  registeredCallbacks: Function[] = [];

  abstract attachToCurrentWindow(): void

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
    this.attachToCurrentWindow();
  }
  override register(func: (keyEvent: KeyboardEvent) => void) {
    this.registeredCallbacks.push(func)
  }

  attachToCurrentWindow(): void {
    curWin.addEventListener('keydown', keyEvent => this.callAllRegisteredFunctions(keyEvent), { passive: false });
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
      //@ts-ignore
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

var
  KEY_DOWN_EVENT = new KeyDownEventRegistrar(),
  StatusTexts = {
    PLAYING: "Playing",
    PAUSED: "Paused",
    STOPPED: "Stopped",
    LOADING: "Loading",
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
  COMPACT_MODE_LINK_ELEMENT = document.getElementById('compactModeStyleLink') as HTMLLinkElement,
  COMPACT_MODE_TOGGLE = document.getElementById('compactMode') as HTMLInputElement,
  SEEK_DURATION_NUMBER_INPUT = document.getElementById('seekDuration') as HTMLInputElement,
  SEEK_DURATION_DISPLAY = document.getElementById("seekDurationDisplay") as HTMLLabelElement,
  SEEK_DISTANCE_PROPORTIONAL_CHECKBOX = document.getElementById('seekDistanceProportional') as HTMLInputElement,
  SKIP_UNPLAYABLE_CHECKBOX = document.getElementById('skipUnplayable') as HTMLInputElement,
  SHOW_LENGTHS = document.getElementById('showLengths') as HTMLInputElement,
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
  MOBILE_PLAYLIST_OPTIONS= document.getElementById('mobilePlaylistOptions') as HTMLDivElement,
  // LOADING_GRAY = document.getElementById('loadingGray') as HTMLDivElement,
  PROGRESS_BAR = document.getElementById('progress-bar') as HTMLProgressElement,
  HOVERED_TIME_DISPLAY = document.getElementById('hoveredTimeDisplay') as HTMLDivElement,
  VOLUME_CHANGER = document.getElementById('0playVolume') as HTMLInputElement,
  PLAY_RATE = document.getElementById('0playRate') as HTMLInputElement,
  PLAY_PAN = document.getElementById('0playPan') as HTMLInputElement,
  SEEK_BACK = document.getElementById('seekBack') as HTMLTableCellElement,
  // SEEK_FORWARD = document.getElementById('seekForward') as HTMLTableCellElement,
  REPEAT_BUTTON = document.getElementById('repeatButton') as HTMLInputElement,
  SHUFFLE_BUTTON = document.getElementById('shuffleButton') as HTMLInputElement,
  MUTE_BUTTON = document.getElementById('0Mute') as HTMLInputElement,
  PLAY_BUTTON = document.getElementById('playpause') as HTMLInputElement,
  STATUS_TEXT = document.getElementById('0status') as HTMLDivElement,
  CURRENT_FILE_NAME = document.getElementById('currentFileName') as HTMLElement,
  POSITION_OF_SONG_DISPLAY = document.getElementById('firstDurationLabel') as HTMLElement,
  DURATION_OF_SONG_DISPLAY = document.getElementById('secondDurationLabel') as HTMLElement,
  DROPPING_FILE_OVERLAY = document.getElementById("dragOverDisplay") as HTMLDivElement;

var filePlayingCheckboxes: HTMLInputElement[] = [];
var sounds: Song[] = [];
var selectedRows: HTMLTableRowElement[] = [];
var hoveredRowInDragAndDrop: HTMLTableRowElement = null; //does not work with importing files, only when organizing added files
var skipSongQueued = false;
var currentSongIndex: number | null = null;

/* start */(() => {
  if ("serviceWorker" in navigator && !NO_SERVICE_WORKER) {
    navigator.serviceWorker.register("../ServiceWorker.js");
  }

  registerDialogInertEvents();
  KEY_DOWN_EVENT.register(keyEvent => {
    if(keyEvent.key != "Tab" && keyEvent.key != "Shift" && keyEvent.key != "Ctrl" && keyEvent.key != "Alt" && keyEvent.key != "Enter")
      closeContextMenu();
    const target = keyEvent.target;
    if(target instanceof HTMLElement && target.closest("dialog") !== null)
      return;

    const keyLower = keyEvent.key.toLowerCase();
    if(keyEvent.shiftKey){

      switch(keyLower){
        case "n":
          jumpSong(1);
          keyEvent.preventDefault();
          break;
        case "p":
          jumpSong(-1);
          keyEvent.preventDefault();
          break;
      }
    } else if(keyEvent.ctrlKey){

      switch(keyLower){
        case "a":
          selectAll();
          keyEvent.preventDefault();
          break;
      }
    } else {

      switch(keyLower){
        case "escape":
          deselectAll();
          PLAYLIST_VIEWER_TABLE.blur();
          break;
        case " ": //space
        case "k":
          togglePauseCurrentSong()
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
        case "m":
          MUTE_BUTTON.click();
          break;
        case "l":
          REPEAT_BUTTON.click();
          break;
        case "s":
          SHUFFLE_BUTTON.click();
          break;
      }
    }

  });

  requestAnimationFrame(onFrameStepped);
  setInterval(onTickStepped, 0);
  setInterval(onPeriodicStepped, 500);
  updateSongInfos();
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
  registerChangeEvent(PLAY_BUTTON, pauseOrUnpauseCurrentSong);
  registerChangeEvent(COMPACT_MODE_TOGGLE, toggleCompactMode);
  registerChangeEvent(SHOW_LENGTHS, updateAllFileInfos);
  registerKeyDownEvent(MUTE_BUTTON.parentElement, () => MUTE_BUTTON.click());
  registerChangeEvent(MUTE_BUTTON, () => { if(currentHowlExists()) sounds[currentSongIndex].howl.mute(MUTE_BUTTON.checked); });
  registerKeyDownEvent(REPEAT_BUTTON.labels[0], () => REPEAT_BUTTON.click());
  registerChangeEvent(REPEAT_BUTTON, () => {
      const checked = REPEAT_BUTTON.checked;
      if(currentHowlExists()) sounds[currentSongIndex].howl.loop(checked);
  });
  registerKeyDownEvent(SHUFFLE_BUTTON.labels[0], () => SHUFFLE_BUTTON.click());
  registerChangeEvent(SHUFFLE_BUTTON, () => handleShuffleButton(SHUFFLE_BUTTON.checked));
  registerChangeEvent(PLAY_RATE, () => onPlayRateUpdate(parseFloat(PLAY_RATE.value)));
  registerChangeEvent(SEEK_DISTANCE_PROPORTIONAL_CHECKBOX, updateSeekDurationDisplay);
  registerKeyDownEvent(UPLOAD_BUTTON.labels[0].querySelector("img"), () => UPLOAD_BUTTON.click());
  registerChangeEvent(UPLOAD_BUTTON, () => importFiles(UPLOAD_BUTTON.files));
  registerChangeEvent(UPLOAD_DIRECTORY_BUTTON, () => importFiles(UPLOAD_DIRECTORY_BUTTON.files));
  registerInputEvent(PLAY_RATE_RANGE, () => { onPlayRateUpdate(parseFloat(PLAY_RATE_RANGE.value)) });
  registerInputEvent(PRELOAD_DIST_ELEMENT, () => { PRELOAD_DIST_ELEMENT.labels[0].textContent = `Value: ${PRELOAD_DIST_ELEMENT.value}` });
  registerInputEvent(PLAY_PAN, onPanningUpdate);
  registerInputEvent(VOLUME_CHANGER, onVolumeUpdate);
  initializeTableEvents();
  
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

/** Registers a click event which calls the specified function. Call the returned function to add a keyboard event. */
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

function toggleCompactMode() {
  COMPACT_MODE_LINK_ELEMENT.disabled = !COMPACT_MODE_TOGGLE.checked;
  rowHeight = (COMPACT_MODE_TOGGLE.checked) ? 23+1 : 55+1;
}

var firstRowTop= 55;
var rowHeight = 56;
async function updateSongInfos() {
  if(PLAYLIST_VIEWER_TABLE.rows.length > 1 && SHOW_LENGTHS.checked) {
    // const rowsAway = Math.floor(Math.max(-heightAway/heightOfEachRow, 0))+1;
    // const firstRowTop = firstRowRect.top; //55px
    // const heightOfEachRow = firstRowRect.height+1; //+1 to account for row border
    const rowsAway = Math.floor(Math.max((scrollY-firstRowTop)/rowHeight, 0))+1;
    for(let i = 0; i < innerHeight/rowHeight; i++){
      const rowIndex = i+rowsAway;
      if(rowIndex >= PLAYLIST_VIEWER_TABLE.rows.length) break;

      const song = sounds[rowIndex-1];
      if(!song.durationLoaded()){
        await loadSongDuration(song);
        setTimeout(updateSongInfos, 0);
        return;
      }
    }
  }

  setTimeout(updateSongInfos, 500);
}

function onPeriodicStepped(){ //runs every 500 ms
  PRELOAD_DIST_ELEMENT.max = String(Math.max(sounds.length - 1, 1));
  if (skipSongQueued) {
    skipSongQueued = false;
    const nextSongIndex = (currentSongIndex + 1) % sounds.length;
    sounds[nextSongIndex].currentRow.getPlaySongCheckbox().dispatchEvent(new MouseEvent('click'));
  }
}

function onTickStepped(){ //runs every heartbeat
  let isLoading: boolean;
  if (currentSongIndex === null || (isLoading = sounds[currentSongIndex].isLoading()))
    return cannotUpdateProgress(isLoading);
  // else if(sounds[currentSongIndex].howl.playing() && (STATUS_TEXT.textContent == StatusTexts.LOADING || STATUS_TEXT.textContent == StatusTexts.DOWNLOADING))
  //   onLatePlayStart();
}

function onFrameStepped() { //runs every frame
  if(currentSongIndex !== null && sounds[currentSongIndex].isLoaded()){
    const songDuration = sounds[currentSongIndex].howl.duration();
    const currentTime = sounds[currentSongIndex].howl.seek();
    const timeToSet: number = (currentTime / songDuration) * 100;

    if (Number.isFinite(timeToSet)) setProgressBarPercentage(timeToSet);
    updateCurrentTimeDisplay(currentTime, songDuration);
  }

  requestAnimationFrame(onFrameStepped);
}

function onPlayStart() {
  changeStatus(StatusTexts.PLAYING);
  reapplySoundAttributes(sounds[currentSongIndex].howl);
}

function cannotUpdateProgress(isProcessing: boolean) {
  if (isProcessing) changeStatus(StatusTexts.LOADING);

  setProgressBarPercentage(100);
  if (DURATION_OF_SONG_DISPLAY.textContent != "00:00") DURATION_OF_SONG_DISPLAY.textContent = "00:00";
  if (POSITION_OF_SONG_DISPLAY.textContent != "00:00") POSITION_OF_SONG_DISPLAY.textContent = "00:00";
  if (HOVERED_TIME_DISPLAY.style.transform != "translate(-9999px, 0px)") HOVERED_TIME_DISPLAY.style.transform = "translate(-9999px, 0px)";
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
  // if (HOVERED_TIME_DISPLAY.hasAttribute('inUse')) return;

  // const progressBarDomRect = PROGRESS_BAR.getBoundingClientRect();
  // const hoveredTimeDisplayRect = HOVERED_TIME_DISPLAY.getBoundingClientRect();
  // const beginningOfProgressBar = (progressBarDomRect.left - hoveredTimeDisplayRect.width / 2)+curWin.scrollX;
  POSITION_OF_SONG_DISPLAY.textContent = new Time(currentTime).toString();
  // if (HOVERED_TIME_DISPLAY.children[0].textContent != currentTimeString) HOVERED_TIME_DISPLAY.children[0].textContent = currentTimeString;

  // const pixelsAcrossProgressBar = (progressBarDomRect.width * currentTime / songDurationInSeconds) - 1;
  // HOVERED_TIME_DISPLAY.style.top = `${progressBarDomRect.top}px`;
  // HOVERED_TIME_DISPLAY.style.left = `${beginningOfProgressBar+pixelsAcrossProgressBar}px`;
}

function progressBarSeek(mouse: PointerEvent, hoverType: ProgressBarSeekAction): void {
  if (currentSongIndex === null || !sounds[currentSongIndex].isInExistence() || (mouse?.pointerType == "touch" && hoverType !== ProgressBarSeekAction.SEEK_TO) || hoverType === ProgressBarSeekAction.STOP_DISPLAYING){
    // HOVERED_TIME_DISPLAY.toggleAttribute('inUse', false);
    HOVERED_TIME_DISPLAY.style.transform = "translate(-9999px, 0px)";
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
      // HOVERED_TIME_DISPLAY.toggleAttribute('inUse', true);

      const progressBarDomRect = PROGRESS_BAR.getBoundingClientRect();
      // HOVERED_TIME_DISPLAY.style.top = `${progressBarDomRect.top}px`;
      // HOVERED_TIME_DISPLAY.style.left = `${(mouse.x - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2) + 1}px`;
      HOVERED_TIME_DISPLAY.style.transform = `translate(${(mouse.x - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2)}px, ${progressBarDomRect.top-20}px)`;
      HOVERED_TIME_DISPLAY.firstChild.textContent = new Time(seekToTime).toString();
      return;
    }
  }
}

/**
 * @param error The exception.
 * @param shortMessage A user-readable error message. If the error type is known, it will help to write this value out manually to better explain the error to the user.
 * @param errorCategory The category the error is contained in.
*/
function displayError(error: Error, shortMessage: string, errorCategory: string) {
  console.error(error);
  errorCategory += ":";
  const songError = curDoc.createElement('dd');
  songError.textContent = error.name.concat(": ", shortMessage ?? error.message);
  songError.title = error.message;

  let insertInside: Element | null = null;
  const children = ERROR_LIST.children;
  const length = children.length;
  for (let i = 0; i < length; i++) {
    if ((children[i].firstChild as Text).data == errorCategory) {
      insertInside = children[i];
      break;
    }
  }

  if (insertInside) {
    insertInside.appendChild(songError);
  } else {
    const songTitle = curDoc.createElement('dt');
    songTitle.textContent = errorCategory;
    songTitle.appendChild(songError);
    ERROR_LIST.appendChild(songTitle);
  }

  if(!ERROR_POPUP.open) ERROR_POPUP.showModal();
}

function seek(seekDirection: number) { //controls audio seeking, seekDuration: usually +1 || -1
  if(currentSongIndex === null || sounds[currentSongIndex].isUnloaded()) return;
  const seekDuration = parseFloat(SEEK_DURATION_NUMBER_INPUT.value) * seekDirection;
  const numToAdd = (SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked) ? seekDuration * parseFloat(PLAY_RATE.value) : seekDuration;
  const currentTime = sounds[currentSongIndex].howl.seek();
  sounds[currentSongIndex].howl.seek(Math.max(currentTime + numToAdd, 0));
}

async function importFiles(element: DataTransfer | ArrayLike<File>) {
  const songTableRows: HTMLTableRowElement[] = [];
  if (element.constructor.name == "FileList") {
    addFiles(<FileList>element);
  } else if (element instanceof curWin.DataTransfer) {
    let dataTransferItemList: DataTransferItemList = (<DataTransfer>element)?.items;
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
        const error = new TypeError(`The file ${file.name} failed to import because its extension ${fileExtension} is unsupported and cannot be played!`);
        displayError(error, `The file type '${fileExtension}' is unsupported.`, file.name);
        ++offsetBecauseOfSkipped;
        continue;
      }

      const nativeIndex: number = i + lengthBeforeBegin - offsetBecauseOfSkipped;
      const songRow: SongTableRow = new SongTableRow();
      songRow.setSongName(file.name);
      songRow.updateFileSizeDisplay(file.size);
      songRow.setRowSongNumber(nativeIndex+1);
      const song = new Song(file, nativeIndex, songRow);

      songTableRows.push(songRow.tableRow); //index (2nd parameter) is used to number the checkboxes
      sounds.push(song);
    }

    addRowsInPlaylistTable(songTableRows);
    changeStatus(`${files.length - offsetBecauseOfSkipped} files added!`);
    updateAllFileInfos();
  }
}

function addRowsInPlaylistTable(songTableRows: HTMLTableRowElement[]){
  const QUANTUM = 32768;
  const addEvents = PLAYLIST_VIEWER_TABLE.rows.length <= 1 && songTableRows.length > 0;
  const playlistTableBody = PLAYLIST_VIEWER_TABLE.tBodies[0];
  // const headerRow = playlistTableBody.rows[0];
  // playlistTableBody.replaceChildren();
  // playlistTableBody.appendChild(headerRow);

  for (let i = 0; i < songTableRows.length; i += QUANTUM) {
    playlistTableBody.append( ...songTableRows.slice(i, Math.min(i + QUANTUM, songTableRows.length)) );
  }

  if(addEvents){
    const firstRow = songTableRows[0];
    // const resizeObserver = new ResizeObserver((entries) => {
    //   rowHeight = entries.at(-1).contentBoxSize[0].blockSize+1; //account for table border
    // });
    // resizeObserver.observe(firstRow);

    const firstRowRect = firstRow.getBoundingClientRect();
    firstRowTop = firstRowRect.top;
    rowHeight = firstRowRect.height+1;
  }
}

function onPlayRateUpdate(newRate: number) {
  let stringRate = String(newRate);

  PLAY_RATE_RANGE.value = stringRate;
  PLAY_RATE.value = stringRate;
  updateSeekDurationDisplay();
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

function onPanningUpdate(){
  if(currentHowlExists())
    sounds[currentSongIndex].howl.stereo(Number(PLAY_PAN.value));
  PLAY_PAN.labels[0].textContent = `${Math.floor(Number(PLAY_PAN.value) * 100)}%`;
}

function onVolumeUpdate(){
  if(currentHowlExists())
    sounds[currentSongIndex].howl.volume(Number(VOLUME_CHANGER.value));
  VOLUME_CHANGER.labels[0].textContent = `${Math.floor(Number(VOLUME_CHANGER.value) * 100)}%`;
}

function updateSeekDurationDisplay() {
  const duration = Number(SEEK_DURATION_NUMBER_INPUT.value);
  const playRate = (SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked) ? Number(PLAY_RATE.value) : 1;
  if (duration < 1) {
    SEEK_DURATION_DISPLAY.textContent = `${(duration*playRate) * 1000} ms`;
  } else {
    SEEK_DURATION_DISPLAY.textContent = `${duration*playRate} sec`;
  }
}

function handleShuffleButton(enable: boolean) {
  if (enable) {
    shuffle();
    refreshSongNames();
    for (let i = 0; i < sounds.length; i++) {
      sounds[i].updateFileInfoDisplay();
    }
    if(currentSongIndex !== null)
      updateRowColor(sounds[currentSongIndex].currentRow.tableRow)
    return;
  }

  let tempArray = sounds,
  foundCurrentPlayingSong = false;
  sounds = new Array(tempArray.length);

  for (let i = 0; i < tempArray.length; i++) {
    let sound = tempArray[i];
    sounds[sound.nativeIndex] = sound;
    sound.currentRow = new SongTableRow(PLAYLIST_VIEWER_TABLE.rows[sound.nativeIndex+1]);
    sound.updateFileInfoDisplay();

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
  if(currentSongIndex !== null)
    updateRowColor(sounds[currentSongIndex].currentRow.tableRow)
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
      filePlayingCheckboxes.forEach(box => { box.checked = false; });
      currentCheckbox.checked = true;
    }

    let tempForSwapping = sounds[currentIndex];
    sounds[currentIndex] = sounds[randomIndex];

    //TODO: Optimize row swapping
    tempForSwapping.currentRow = new SongTableRow(PLAYLIST_VIEWER_TABLE.rows[randomIndex+1]);
    sounds[randomIndex].currentRow = new SongTableRow(PLAYLIST_VIEWER_TABLE.rows[currentIndex+1]);

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
  setProgressBarPercentage(0);
  for (let i = 0; i < sounds.length; i++) sounds[i].unload();
  Howler.stop();
  changeStatus(StatusTexts.STOPPED);
  updateRowColor(currentRow);
  return;
}

/**
 * @param percent A number from 0 to 100
 */
function setProgressBarPercentage(percent: number){
  PROGRESS_BAR.value = percent;
  PROGRESS_BAR.style.setProperty("--percentage", String(percent)+'%');
  // PROGRESS_BAR.style.setProperty("--percentageRev", String((-percent)+100)+'%');
}

async function startPlayingSpecificSong(index: number){ //called by HTML element
  if (sounds[index].isInExistence()) sounds[index].howl.stop();
  Howler.stop();

  currentSongIndex = index;
  updateRowColor(sounds[index].currentRow.tableRow)
  const soundName = sounds[index].file.name;
  const fileExtension = getFileExtension(soundName);
  if (SKIP_UNPLAYABLE_CHECKBOX.checked && !isValidExtension(fileExtension)) {
    const error = new TypeError(`The file ${soundName} failed to import because its extension ${fileExtension} is unsupported and cannot be played!`);
    displayError(error, `The file type '${fileExtension}' is unsupported.`, soundName);
    skipSongQueued = true;
    return;
  }

  changeStatus(StatusTexts.DOWNLOADING);
  let song = sounds[index];
  song.loadSong().then(succeeded => {
    if(succeeded && currentSongIndex === index) startPlayingSong(song);
  })
  refreshPreloadedSongs();
}

function startPlayingSong(song: Song) {
  setCurrentFileName(song.file.name);
  reapplySoundAttributes(song.howl);
  if (Number(PLAY_RATE.value) != 0) {
    if(song.howl.state() == "unloaded")
      song.howl.load();
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

function jumpSong(amount: number = 1) { // amount can be negative or positive ;)
  if(currentSongIndex === null) return;
  currentSongIndex = (currentSongIndex+(sounds.length+amount))%sounds.length;

  const playButtonToActivate = filePlayingCheckboxes[currentSongIndex];
  playButtonToActivate.dispatchEvent(new MouseEvent('click'));
}

function togglePauseCurrentSong(){
  if (currentSongIndex !== null && sounds[currentSongIndex].isInExistence()){
    PLAY_BUTTON.checked = !PLAY_BUTTON.checked;
    pauseOrUnpauseCurrentSong();
  }
}

function pauseOrUnpauseCurrentSong(){
  const pause = !PLAY_BUTTON.checked;
  if (!sounds[currentSongIndex] || !sounds[currentSongIndex].isInExistence()){
    PLAY_BUTTON.checked = !PLAY_BUTTON.checked;
    return;
  }

  if (pause) {
    PLAY_BUTTON.checked = PAUSED;
    sounds[currentSongIndex].howl.pause();
    changeStatus(StatusTexts.PAUSED);
  } else {
    sounds[currentSongIndex].howl.play();
    changeStatus(StatusTexts.PLAYING);
  }

}

function refreshSongNames() {
  for (let i = 0; i < sounds.length; i++) {
    sounds[i].currentRow.setSongName(sounds[i].file.name);
  }
}
function setCurrentFileName(name: string) {
  if (CURRENT_FILE_NAME.textContent != name) {
    CURRENT_FILE_NAME.textContent = name; //name is compressed by CSS formatting if too large
    CURRENT_FILE_NAME.setAttribute('title', name);
    curDoc.title = name;
  }
}
function precisionRound(number: number, precision: number) {
  const factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

function currentHowlExists(){ return currentSongIndex !== null && sounds[currentSongIndex].isInExistence() }
function changeStatus(status: string) { STATUS_TEXT.textContent = status; }
function onlyFiles(dataTransfer: DataTransfer) { return dataTransfer.types.length == 1 && dataTransfer.types[0] === 'Files' }
function isValidExtension(extension: string) { return codecsMixin(extension); }
//@ts-ignore
function setAttributes(element: HTMLElement, attrs: { [key: string]: string }) { for (const key in attrs) element.setAttribute(key, attrs[key]); }
// @ts-ignore
function sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
function getInMegabytes(bytes: number): string { return (bytes / 1_048_576).toFixed(2); }
function getFileExtension(fileName: string): string { return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(); }



/*            TABLE INTERACTION FUNCTIONS             */

var longTapTimer: (number | null) = null;
var longTapping = false;
function initializeTableEvents(){
  PLAYLIST_VIEWER_TABLE.addEventListener("keyup", (keyEvent) => {
    if(keyEvent.key == "Tab"){
      if(selectedRows.length == 0 && PLAYLIST_VIEWER_TABLE.rows.length > 1) selectRow(PLAYLIST_VIEWER_TABLE.rows[1]);
      if(selectedRows[0]) scrollRowIntoView(selectedRows[0]);
    }
  });
  PLAYLIST_VIEWER_TABLE.addEventListener("keydown", selectionLogicForKeyboard);
  PLAYLIST_VIEWER_TABLE.addEventListener('click', onSingleClick, { passive: true });
  PLAYLIST_VIEWER_TABLE.addEventListener('dblclick', onDoubleClick, { passive: true });
  PLAYLIST_VIEWER_TABLE.addEventListener("contextmenu", onRowRightClick);

  initializeTouchTableEvents();
}

function initializeTouchTableEvents(){
  PLAYLIST_VIEWER_TABLE.addEventListener('touchstart', function(event) {
    longTapping = false;
    if(event.touches.length > 1 || ((event.target as Element).classList.contains("fileSizeLabel"))){
      cancelLongTapTimer();
    } else {
      // @ts-ignore
      longTapTimer = setTimeout(onLongTap, 425, event);
    }
  }, {passive: true});

  PLAYLIST_VIEWER_TABLE.addEventListener('touchmove', function(_) {
    cancelLongTapTimer();
  }, {passive: true});

  PLAYLIST_VIEWER_TABLE.addEventListener('touchend', function(event) {
    cancelLongTapTimer();
    if(longTapping){
        event.preventDefault(); //prevent default click events from running
        event.stopImmediatePropagation();
    }
    longTapping = false;
  }, {passive: false});

  document.getElementById("mobileDeselectRows").addEventListener("click", deselectAll);
  document.getElementById("trashSelectedRows").addEventListener("click", deleteSelectedSongs);
  document.getElementById("moreOptionsSelectedRows").addEventListener("click", spawnRowContextMenuMobile);
}

function cancelLongTapTimer(){
  if(longTapTimer !== null){
    clearTimeout(longTapTimer);
    longTapTimer = null;
  }
}

function onSelectRowMobile(row: HTMLTableRowElement){
  if(isSelected(row)){
    deselectRow(selectedRows.indexOf(row));
    updateMobilePlaylistOptions();
  } else {
    selectRow(row);
    showMobilePlaylistOptions();
  }
}

function onLongTap(event: TouchEvent) {
  longTapTimer = null;
  longTapping = true;
  if("vibrate" in navigator)
    navigator.vibrate(5);
  const target = event.target;
  const row = findValidTableRow(target as Element)
  if (row) {
    onSelectRowMobile(row);
  }
}

function spawnRowContextMenuMobile(mouseEvent: MouseEvent | PointerEvent){
  if(!contextMenuOpen()){
    mouseEvent.stopPropagation();
    spawnRowContextMenu(mouseEvent.clientX, 30, false);
  }
}

function showMobilePlaylistOptions(){
  MOBILE_PLAYLIST_OPTIONS.querySelector("#mobileSelectStatus").textContent = String(selectedRows.length) + " selected";
  MOBILE_PLAYLIST_OPTIONS.toggleAttribute("data-active", true);
}
function updateMobilePlaylistOptions(){
  if(selectedRows.length === 0){
    hideMobilePlaylistOptions();
  } else {
    MOBILE_PLAYLIST_OPTIONS.querySelector("#mobileSelectStatus").textContent = String(selectedRows.length) + " selected";
  }
}
function hideMobilePlaylistOptions(){
  MOBILE_PLAYLIST_OPTIONS.toggleAttribute("data-active", false);
}



function initializeRowEvents(row: HTMLTableRowElement) {
  if(ON_MOBILE) return; //none of these work on mobile. ill need a polyfill or something
  row.setAttribute('draggable', "true");
  row.addEventListener('dragstart', (event: DragEvent) => {
    if (onlyFiles(event.dataTransfer)) return;
    if (!selectedRows.includes(row)) {
      deselectAll();
      selectRow(row);
    }

    event.dataTransfer.clearData();
    for(const selectedRow of selectedRows){
      event.dataTransfer.items.add(sounds[selectedRow.rowIndex-1].file);
    }
    event.dataTransfer.setData("text/draggingAction", "action:reorganizingPlaylist");

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
  let setColor = false;
  if(currentSongIndex !== null && sounds[currentSongIndex]?.currentRow?.tableRow == row){
    setRowActive(row);
    setColor = true;
  }

  if(row.hasAttribute("data-selected")){
    row.style.backgroundColor = RowColors.SELECTING;
    setColor = true;
  }

  if(!setColor){
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
  if (event.dataTransfer.getData("text/draggingAction") != "action:reorganizingPlaylist") return;
  stopHighlightingRow();
  sortSelectedRows();
  let row: Element = event.target as Element;
  if (!rowValid(row)) {
    row = tryFindTableRowInParents(row);
    if (!rowValid(row)) return;
  }
  moveSelectedSongs((row as HTMLTableRowElement).rowIndex - 1);
  event.stopPropagation();
  event.preventDefault();
}
function stopHighlightingRow() {
  if (hoveredRowInDragAndDrop != null) {
    hoveredRowInDragAndDrop.style.borderBottomColor = "";
    hoveredRowInDragAndDrop.style.borderTopColor = "";
  }
}
function onSingleClick(mouseEvent: MouseEvent | PointerEvent) {
  let row = findValidTableRow(mouseEvent.target as Element)
  if(row == null) return;

  if(mouseEvent instanceof PointerEvent && mouseEvent.pointerType != "mouse") {
    if(selectedRows.length !== 0){
      onSelectRowMobile(row);
    }
    return;
  }

  if (mouseEvent.ctrlKey) {
    if (isSelected(row)){
      deselectRow(selectedRows.indexOf(row as HTMLTableRowElement));
      updateMobilePlaylistOptions();
      return;
    }
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
    updateMobilePlaylistOptions();
  } else {
    deselectAll();
  }

  selectRow(row as HTMLTableRowElement);
  updateMobilePlaylistOptions();
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

function isSelected(row: HTMLTableRowElement){ return row.hasAttribute("data-selected"); }
function scrollRowIntoView(row: HTMLTableRowElement){
  //@ts-ignore
  if(row.scrollIntoViewIfNeeded){
    //@ts-ignore
    row.scrollIntoViewIfNeeded();
  } else {
    row.scrollIntoView({behavior: "instant", block: "nearest"});
  }
}
function selectRow(row: HTMLTableRowElement) {
  row = findValidTableRow(row);
  if(!row || isSelected(row)) return;

  row.toggleAttribute("data-selected", true);
  updateRowColor(row);
  selectedRows.push(row);
  scrollRowIntoView(row);
}
function onDoubleClick(mouseEvent: MouseEvent) {
  if(selectedRows.length > 1) {
    return;
  }

  deselectAll();
  let row: HTMLTableRowElement | null = findValidTableRow(mouseEvent.target as Element);
  if(row) playRow(row);
}
/**
 * @param removeIndex {number} the row index from selectedRows array to remove.
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
  hideMobilePlaylistOptions();
}
function selectInterval() {
  sortSelectedRows();
  if(selectedRows.length < 2) return;
  const startRowIndex = selectedRows[0].rowIndex+1;
  const endRowIndex = selectedRows.at(-1).rowIndex;
  const rows = PLAYLIST_VIEWER_TABLE.rows;
  for (let i = startRowIndex; i < endRowIndex; i++){
    selectRow(rows[i]);
  }

  updateMobilePlaylistOptions();
}
function selectAll() {
  const rows = PLAYLIST_VIEWER_TABLE.rows;
  if(rows.length <= 1) return;

  for (let i = 1; i < rows.length; i++){
    const row = rows[i];
    row.toggleAttribute("data-selected", true);
    updateRowColor(row);
  }

  selectedRows = Array.prototype.slice.call(rows, 1);
  updateMobilePlaylistOptions();
  PLAYLIST_VIEWER_TABLE.focus({focusVisible: true});
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
      setProgressBarPercentage(0);
    } else if (currentSongIndex !== null && currentSongIndex > index){
      --currentSongIndex;
    }

    tableBody.removeChild(selectedRows[i]);
    for (let i = 0; i < sounds.length; i++) {
      if (sounds[i].nativeIndex > sounds[index].nativeIndex) {
        --sounds[i].nativeIndex;
      }
    }

    sounds[index].onDelete();
    sounds.splice(index, 1);
    filePlayingCheckboxes.splice(index, 1);
  }
  deselectAll();
  updateSongNumberings();
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
function updateSongNumberings() {
  for(const song of sounds){
    song.currentRow.updateRowSongNumber();
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

function moveElementsToDocument(oldDoc: Document, newDoc: Document) {
  newDoc.head.append(...oldDoc.head.children)
  newDoc.body.append(...oldDoc.body.children)
  DIALOGS.forEach(dialog => dialog.close()); //Dialogs lose their state when transferring and become glitched
}

/*                       CONTEXT MENU                      */

function onRightClickFileDisplay(mouseEvent: MouseEvent) {
  mouseEvent.preventDefault();
  mouseEvent.stopPropagation();
  return spawnContextMenu(mouseEvent.clientX, mouseEvent.clientY, [{ text: (SHOW_LENGTHS.checked) ? "Show File Sizes" : "Show Sound Lengths", action: () => SHOW_LENGTHS.dispatchEvent(new MouseEvent('click')) }], false);
}
function onRowRightClick(mouseEvent: MouseEvent | PointerEvent) {
  if(mouseEvent instanceof PointerEvent && mouseEvent.pointerType != "mouse") {
    mouseEvent.preventDefault();
    return;
  }

  const row = findValidTableRow(mouseEvent.target as Element);
  if(row !== null){
    if(!selectedRows.includes(row)){
      deselectAll();
      selectRow(row);
    }
  } else if(selectedRows.length == 0) {
    return;
  }

  mouseEvent.preventDefault();
  mouseEvent.stopPropagation();
  spawnRowContextMenu(mouseEvent.clientX, mouseEvent.clientY, true);
}
function spawnRowContextMenu(clientX: number, clientY: number, showDefaultOptions: boolean){
  const contextOptions: ContextMenuOption[] = [];
  if (selectedRows.length == 1)
    contextOptions.push({ text: (currentSongIndex != selectedRows[0].rowIndex - 1) ? "Play" : "Stop", action: () => playRow(selectedRows[0]) });

  contextOptions.push({ text: "Delete", action: deleteSelectedSongs });

  if(selectedRows.length !== PLAYLIST_VIEWER_TABLE.rows.length-1){
    if(selectedRows.length >= 2)
      contextOptions.push({ text: "Select Interval", action: selectInterval });
    contextOptions.push({ text: "Select All", action: selectAll });
  }

  spawnContextMenu(clientX, clientY, contextOptions, showDefaultOptions);
}
function initContextMenu() {
  curDoc.addEventListener('contextmenu', (pointerEvent) => {
    switch ((pointerEvent.target as Element).getAttribute('data-onRightClick')) {
      case "uploadFileMenu": {
        pointerEvent.preventDefault();
        return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [
          { text: "Upload Files", icon: "../Icons/UploadIcon.svg", action: () => UPLOAD_BUTTON.dispatchEvent(new MouseEvent('click')) },
          { text: "Upload Folder", icon: "../Icons/UploadIcon.svg", action: () => UPLOAD_DIRECTORY_BUTTON.dispatchEvent(new MouseEvent('click')) }
        ], false);
      }
      case "quickSettings": {
        pointerEvent.preventDefault();

        const options: ContextMenuOption[] = [];
        if("documentPictureInPicture" in curWin)
          options.push({ text: "Toggle PIP (WIP)", action: () => TOGGLE_PIP_BUTTON.dispatchEvent(new MouseEvent('click')) });

        return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, options, true);
      }
      case "volumeBoost": {
        pointerEvent.preventDefault();

        return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [
          { text: (VOLUME_CHANGER.max == "1") ? "INCREASE VOLUME LIMIT" : "DECREASE VOLUME LIMIT", action: () => {
            if(VOLUME_CHANGER.max == "1"){
              VOLUME_CHANGER.max = "10";
            } else {
              VOLUME_CHANGER.max = "1";
              VOLUME_CHANGER.value = "1";
              onVolumeUpdate();
            }
          }}
        ], false);
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

function spawnContextMenu(clientX: number, clientY: number, contextOptions: ContextMenuOption[], showDefaultOptions: boolean) {
  let childElement: HTMLElement;
  while ((childElement = CONTEXT_MENU.lastChild as HTMLElement) != null) {
    CONTEXT_MENU.removeChild(childElement);
  }

  if (showDefaultOptions) {
    contextOptions = contextOptions.concat([
      { text: COMPACT_MODE_TOGGLE.checked ? "Disable Compact Mode" : "Enable Compact Mode", action: () => { COMPACT_MODE_TOGGLE.dispatchEvent(new MouseEvent('click')); } }
    ]);
  }

  const contextButtons: HTMLDivElement[] = [];
  for (let i = 0; i < contextOptions.length; i++) {
    const contextOption = contextOptions[i];
    const contextButton = curDoc.createElement('div');
    contextButton.setAttribute('class', 'contextOption');
    contextButton.tabIndex = 1;
    if (i < contextOptions.length - 1) contextButton.style.borderBottomWidth = "1px";
    contextButton.addEventListener('click', (event) => { if (CONTEXT_MENU.hasAttribute('open')) contextOption.action(event); closeContextMenu(); });
    contextButton.addEventListener('keyup', (event) => { if (event.key == 'Enter' && CONTEXT_MENU.hasAttribute('open')) {contextOption.action(event); closeContextMenu();} });
    contextButton.addEventListener("keydown", contextButtonScroll, {passive: false});

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

function contextButtonScroll(keyboardEvent: KeyboardEvent){
  let contextButton: HTMLDivElement;
  switch(keyboardEvent.key){
    case "ArrowDown":
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      contextButton = keyboardEvent.currentTarget as HTMLDivElement;
      let nextButton = contextButton.nextElementSibling as (HTMLDivElement | null);
      if(nextButton == null){
        nextButton = contextButton.parentElement.firstElementChild as HTMLDivElement;
      }
      nextButton.focus();
      break;
    case "ArrowUp":
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      contextButton = keyboardEvent.currentTarget as HTMLDivElement;
      let prevButton = contextButton.previousElementSibling as (HTMLDivElement | null);
      if(prevButton == null){
        prevButton = contextButton.parentElement.lastElementChild as HTMLDivElement;
      }
      prevButton.focus();
      break;
  }
}

function contextMenuOpen(){ return CONTEXT_MENU.hasAttribute('open'); }
function closeContextMenu() { CONTEXT_MENU.toggleAttribute('open', false); CONTEXT_MENU.style.height = '0'; }