"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-nocheck
var howler_1 = require("../howler");
var PhaseType;
(function (PhaseType) {
    PhaseType[PhaseType["COLLECTING"] = 0] = "COLLECTING";
    PhaseType[PhaseType["RETRIEVING"] = 1] = "RETRIEVING";
    PhaseType[PhaseType["FINISHED"] = 2] = "FINISHED";
})(PhaseType || (PhaseType = {}));
var ProgressBarSeekAction;
(function (ProgressBarSeekAction) {
    ProgressBarSeekAction[ProgressBarSeekAction["SEEK_TO"] = 0] = "SEEK_TO";
    ProgressBarSeekAction[ProgressBarSeekAction["DISPLAY_TIME"] = 1] = "DISPLAY_TIME";
    ProgressBarSeekAction[ProgressBarSeekAction["STOP_DISPLAYING"] = 2] = "STOP_DISPLAYING";
})(ProgressBarSeekAction || (ProgressBarSeekAction = {}));
var OnEventUpdated = /** @class */ (function () {
    function OnEventUpdated() {
        this.registeredCallbacks = [];
    }
    OnEventUpdated.prototype.register = function (func) {
        this.registeredCallbacks.push(func);
    };
    OnEventUpdated.prototype.unregister = function (func) {
        this.registeredCallbacks.splice(this.registeredCallbacks.indexOf(func), 1);
    };
    OnEventUpdated.prototype.clearAll = function () {
        this.registeredCallbacks = [];
    };
    OnEventUpdated.prototype.callAllRegisteredFunctions = function (data) {
        for (var i = 0; i < this.registeredCallbacks.length; i++)
            this.registeredCallbacks[i](data);
    };
    return OnEventUpdated;
}());
var OnKeyDownEvent = /** @class */ (function (_super) {
    __extends(OnKeyDownEvent, _super);
    function OnKeyDownEvent() {
        var _this = _super.call(this) || this;
        window.addEventListener('keydown', function (key) { return _this.callAllRegisteredFunctions(key); }, { passive: false });
        return _this;
    }
    return OnKeyDownEvent;
}(OnEventUpdated));
var OnRequestAnimationFrameEvent = /** @class */ (function (_super) {
    __extends(OnRequestAnimationFrameEvent, _super);
    function OnRequestAnimationFrameEvent() {
        var _this = _super.call(this) || this;
        // @ts-expect-error
        _this.raf = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame).bind(window);
        _this.raf(function (timestamp) { return _this.handleRAFCall(timestamp); });
        return _this;
    }
    OnRequestAnimationFrameEvent.prototype.handleRAFCall = function (timestamp) {
        var _this = this;
        this.callAllRegisteredFunctions(timestamp);
        this.raf(function (timestamp) { return _this.handleRAFCall(timestamp); });
    };
    return OnRequestAnimationFrameEvent;
}(OnEventUpdated));
/** Splits inputted seconds into hours, minutes, & seconds. toString() returns the time in digital format.
*/
var Time = /** @class */ (function () {
    function Time(seconds) {
        this.seconds = 0;
        this.minutes = 0;
        this.hours = 0;
        this.seconds = Time.numberToDigitalTimeString(Math.floor(seconds % 60));
        this.minutes = Math.floor(seconds / 60);
        this.hours = Math.floor(this.minutes / 60);
        this.minutes = Time.numberToDigitalTimeString(this.minutes - this.hours * 60);
        this.hours = Time.numberToDigitalTimeString(this.hours);
    }
    Time.prototype.toString = function () {
        if (this.hours === '00')
            return "".concat(this.minutes, ":").concat(this.seconds);
        return "".concat(this.hours, ":").concat(this.minutes, ":").concat(this.seconds);
    };
    Time.numberToDigitalTimeString = function (number) {
        if (number <= 9)
            return "0".concat(number);
        return "".concat(number);
    };
    return Time;
}());
var DataTransferItemGrabber = /** @class */ (function () {
    /** @param dataTransferItemList this can be any array-like containing DataTransferItems or File / Directory entries (from DataTransferItem.webkitGetAsEntry()) */
    function DataTransferItemGrabber(dataTransferItemList) {
        this.dataTransferItemList = [];
        this.files = [];
        this.promises = [];
        this.filesCollected = 0;
        this.filesAdded = 0;
        this.phase = PhaseType.COLLECTING; //0 == collecting, 1 == retrieving
        this.dataTransferItemList = dataTransferItemList;
    }
    DataTransferItemGrabber.prototype.retrieveContents = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
                        var fileEntryArray, i;
                        var _a, _b, _c;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    if (this.files.length > 0)
                                        resolve(this.files);
                                    fileEntryArray = [];
                                    for (i = 0; i < this.dataTransferItemList.length; i++)
                                        fileEntryArray.push((_c = (_b = (_a = this.dataTransferItemList[i]) === null || _a === void 0 ? void 0 : _a.webkitGetAsEntry) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : this.dataTransferItemList[i]);
                                    return [4 /*yield*/, this.scanFilesInArray(fileEntryArray)];
                                case 1:
                                    _d.sent();
                                    this.phase = PhaseType.RETRIEVING;
                                    return [4 /*yield*/, Promise.allSettled(this.promises)];
                                case 2:
                                    _d.sent();
                                    this.phase = PhaseType.FINISHED;
                                    this.updateLoadingStatus();
                                    return [2 /*return*/, resolve(this.files)];
                            }
                        });
                    }); })];
            });
        });
    };
    DataTransferItemGrabber.prototype.scanFilesInArray = function (fileEntries) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var _loop_1, this_1, i;
                        var _this = this;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _loop_1 = function (i) {
                                        var webkitEntry, reader, index_1, promise;
                                        return __generator(this, function (_b) {
                                            switch (_b.label) {
                                                case 0:
                                                    webkitEntry = fileEntries[i];
                                                    if (!webkitEntry.isDirectory) return [3 /*break*/, 2];
                                                    reader = webkitEntry.createReader();
                                                    return [4 /*yield*/, this_1.addFilesInDirectory(reader)];
                                                case 1:
                                                    _b.sent();
                                                    return [3 /*break*/, 3];
                                                case 2:
                                                    if (webkitEntry.isFile) {
                                                        index_1 = this_1.filesCollected++;
                                                        this_1.files.push(null);
                                                        this_1.updateLoadingStatus();
                                                        promise = this_1.getFile(webkitEntry);
                                                        promise.then(function (file) {
                                                            _this.files[index_1] = file;
                                                            ++_this.filesAdded;
                                                            _this.updateLoadingStatus();
                                                        });
                                                        this_1.promises.push(promise);
                                                    }
                                                    _b.label = 3;
                                                case 3: return [2 /*return*/];
                                            }
                                        });
                                    };
                                    this_1 = this;
                                    i = 0;
                                    _a.label = 1;
                                case 1:
                                    if (!(i < fileEntries.length)) return [3 /*break*/, 4];
                                    return [5 /*yield**/, _loop_1(i)];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3:
                                    i++;
                                    return [3 /*break*/, 1];
                                case 4:
                                    resolve();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    DataTransferItemGrabber.prototype.addFilesInDirectory = function (reader) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
                        var someFiles;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, this.getSomeFilesInDirectory(reader)];
                                case 1:
                                    someFiles = _a.sent();
                                    _a.label = 2;
                                case 2:
                                    if (!(someFiles.length > 0)) return [3 /*break*/, 5];
                                    return [4 /*yield*/, this.scanFilesInArray(someFiles)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, this.getSomeFilesInDirectory(reader)];
                                case 4:
                                    someFiles = _a.sent();
                                    return [3 /*break*/, 2];
                                case 5:
                                    ;
                                    return [2 /*return*/, resolve(this.files)];
                            }
                        });
                    }); })];
            });
        });
    };
    DataTransferItemGrabber.prototype.getSomeFilesInDirectory = function (reader) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            reader.readEntries(function (someFiles) {
                                resolve(someFiles);
                            }, function (error) {
                                console.error(error, reader);
                                resolve([]);
                            });
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    DataTransferItemGrabber.prototype.getFile = function (fileEntry) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            fileEntry.file(function (file) {
                                resolve(file);
                            });
                            return [2 /*return*/];
                        });
                    }); })];
            });
        });
    };
    DataTransferItemGrabber.prototype.updateLoadingStatus = function () {
        switch (this.phase) {
            case PhaseType.COLLECTING: return changeStatus("Collecting: (".concat(this.filesCollected, " files; ").concat(this.filesAdded, " processed)"));
            case PhaseType.RETRIEVING: return changeStatus("Processed: ".concat(this.filesAdded, "/").concat(this.filesCollected, " files"));
            case PhaseType.FINISHED: return changeStatus("Adding ".concat(this.filesAdded, " to the playlist... (this will lag)"));
        }
    };
    return DataTransferItemGrabber;
}());
var REQUEST_ANIMATION_FRAME_EVENT = new OnRequestAnimationFrameEvent(), KEY_DOWN_EVENT = new OnKeyDownEvent(), VALAD_FILE_EXTENSIONS = new Set(["ogg", "webm", "wav", "hls", "flac", "mp3", "opus", "pcm", "vorbis", "aac"]), StatusTexts = {
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
COMPACT_MODE_TOGGLE = document.getElementById('compactMode'), SEEK_DURATION_NUMBER_INPUT = document.getElementById('seekDuration'), SEEK_DURATION_DISPLAY = document.getElementById("seekDurationDisplay"), SEEK_DISTANCE_PROPORTIONAL_CHECKBOX = document.getElementById('seekDistanceProportional'), SKIP_UNPLAYABLE_CHECKBOX = document.getElementById('skipUnplayable'), UPLOAD_BUTTON = document.getElementById('0input'), UPLOAD_DIRECTORY_BUTTON = document.getElementById('inputDirectory'), PLAY_RATE_RANGE = document.getElementById('0playRateSlider'), SETTINGS_PAGE = document.getElementById('settingsPage'), ERROR_POPUP = document.getElementById('errorPopup'), ERROR_LIST = document.getElementById('errorList'), PROGRESS_BAR = document.getElementById('progress-bar'), HOVERED_TIME_DISPLAY = document.getElementById('hoveredTimeDisplay'), VOLUME_CHANGER = document.getElementById('0playVolume'), PLAY_RATE = document.getElementById('0playRate'), PLAY_PAN = document.getElementById('0playPan'), SEEK_BACK = document.getElementById('seekBack'), SEEK_FORWARD = document.getElementById('seekForward'), REPEAT_BUTTON = document.getElementById('repeatButton'), SHUFFLE_BUTTON = document.getElementById('shuffleButton'), MUTE_BUTTON = document.getElementById('0Mute'), PLAY_BUTTON = document.getElementById('playpause'), STATUS_TEXT = document.getElementById('0status'), CURRENT_FILE_NAME = document.getElementById('currentFileName'), DROPPING_FILE_OVERLAY = document.getElementById("dragOverDisplay"), DURATION_OF_SONG_DISPLAY = document.getElementById('secondDurationLabel');
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
var start = (function () {
    if ("serviceWorker" in navigator) {
        try {
            navigator.serviceWorker.register("/Javascript/ServiceWorker.js");
        }
        catch (exception) {
            console.warn(exception);
        }
    }
    KEY_DOWN_EVENT.register(closeContextMenu);
    registerClickEvent('skipBack', function () { return jumpSong(-1); });
    registerClickEvent('skipForward', function () { return jumpSong(1); });
    registerClickEvent('seekBack', function () { return seek(new Number(SEEK_BACK.getAttribute('seekDirection'))); });
    registerClickEvent('seekForward', function () { return seek(new Number(SEEK_FORWARD.getAttribute('seekDirection'))); });
    registerClickEvent(CURRENT_FILE_NAME, function () { return PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1].scrollIntoView(false); });
    KEY_DOWN_EVENT.register(selectionLogicForKeyboard);
    REQUEST_ANIMATION_FRAME_EVENT.register(keepTrackofTimes);
    makeDocumentDroppable();
    document.addEventListener('click', function (mouseEvent) {
        closeContextMenu();
        if (mouseEvent.target == document.querySelector("html") || mouseEvent.target == document.body)
            deselectAll();
    }, { passive: true });
    document.addEventListener('touchend', function (touchEvent) {
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
        howler_1.Howler.unload();
        sounds = [];
    }, { passive: true });
    initContextMenu();
    PLAY_BUTTON.addEventListener('change', playButton, { passive: true });
    COMPACT_MODE_TOGGLE.addEventListener('change', toggleCompactMode, { passive: true });
    registerClickEvent('settingsButton', function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, SETTINGS_PAGE.showModal()];
    }); }); });
    registerClickEvent('exitSettingsButton', function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, SETTINGS_PAGE.close()];
    }); }); });
    registerClickEvent('exitErrorPopup', function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, ERROR_POPUP.close()];
    }); }); });
    ERROR_POPUP.addEventListener("close", onCloseErrorPopup);
    UPLOAD_BUTTON.addEventListener('change', function () { importFiles(UPLOAD_BUTTON.files); }, { passive: true });
    UPLOAD_DIRECTORY_BUTTON.addEventListener('change', function () { importFiles(UPLOAD_DIRECTORY_BUTTON.files); }, { passive: true });
    // document.getElementById('uploadFilesLabel').addEventListener('contextmenu', (pointerEvent) => {
    //   pointerEvent.preventDefault();
    // })
    PLAY_RATE.addEventListener('change', function () { onPlayRateUpdate(PLAY_RATE.value); }, { passive: true });
    SEEK_DURATION_NUMBER_INPUT.addEventListener('input', updateSeekDurationDisplay, { passive: true });
    onRangeInput(PLAY_RATE_RANGE, function () { onPlayRateUpdate(PLAY_RATE_RANGE.value); });
    onRangeInput(PRELOAD_DIST_ELEMENT, function () { PRELOAD_DIST_ELEMENT.labels[0].textContent = "Value: ".concat(PRELOAD_DIST_ELEMENT.value); });
    onRangeInput(PLAY_PAN, function () { PLAY_PAN.labels[0].textContent = "".concat(Math.floor(PLAY_PAN.value * 100), "%"); sounds[currentSongIndex].stereo(parseFloat(PLAY_PAN.value)); });
    onRangeInput(VOLUME_CHANGER, function () { VOLUME_CHANGER.labels[0].textContent = "".concat(Math.floor(VOLUME_CHANGER.value * 100), "%"); sounds[currentSongIndex].volume(VOLUME_CHANGER.value); });
    handleCheckBoxClick(MUTE_BUTTON, REPEAT_BUTTON, SHUFFLE_BUTTON);
    PROGRESS_BAR.addEventListener('pointerenter', function (pointer) { return progressBarSeek(pointer, ProgressBarSeekAction.DISPLAY_TIME); }, { passive: true });
    PROGRESS_BAR.addEventListener('pointerdown', function (pointer) { if (pointer.button == 0)
        progressBarSeek(pointer, ProgressBarSeekAction.SEEK_TO); }, { passive: true });
    PROGRESS_BAR.addEventListener('pointermove', function (pointer) { return progressBarSeek(pointer, ProgressBarSeekAction.DISPLAY_TIME); }, { passive: true });
    PROGRESS_BAR.addEventListener('pointerleave', function (pointer) { return progressBarSeek(pointer, ProgressBarSeekAction.STOP_DISPLAYING); }, { passive: true });
    //END
})();
function makeDocumentDroppable() {
    window.addEventListener("dragover", function (event) {
        if (!onlyFiles(event.dataTransfer))
            return;
        event.preventDefault();
        DROPPING_FILE_OVERLAY.setAttribute("draggingOver", "true");
        stopHighlightingRow();
    });
    window.addEventListener("dragleave", function () {
        DROPPING_FILE_OVERLAY.setAttribute("draggingOver", "false");
        stopHighlightingRow();
    }, { passive: true });
    window.addEventListener("drop", function (event) {
        var dataTransfer = event.dataTransfer;
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
    if (file === null || file instanceof howler_1.Howl)
        return new Promise(function (resolve, reject) { resolve(file); });
    var currentProcessingNumber = processingNumber;
    return new Promise(function (resolve, reject) {
        var fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        var onProgress = function (progressEvent) {
            if (processingNumber === currentProcessingNumber && displayProgress)
                PROGRESS_BAR.value = (100 * progressEvent.loaded) / progressEvent.total;
            if (currentIndex >= 0) {
                fileSizeDisplays[currentIndex].textContent = "".concat(getInMegabytes(progressEvent.loaded), " MB / ").concat(getInMegabytes(file.size), " MB");
                fileSizeDisplays[currentIndex].setAttribute('title', "".concat(progressEvent.loaded, " bytes / ").concat(file.size, " bytes"));
            }
        };
        var onLoaded = function () {
            removeListeners();
            if (processingNumber !== currentProcessingNumber)
                resolve(null);
            resolve(loaded(fileReader, file));
        };
        var errorFunc = function (progressEvent) {
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
            console.warn("File Aborted: ".concat(fileReader.name));
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
    var childElement;
    while ((childElement = ERROR_LIST.lastChild) != null) {
        ERROR_LIST.removeChild(childElement);
    }
}
function registerClickEvent(element, func) {
    if (typeof element === "string")
        element = document.getElementById(element);
    element.addEventListener('click', func, { passive: true });
}
function createNewSong(fileName, index) {
    var row = PLAYLIST_VIEWER_TABLE.insertRow(PLAYLIST_VIEWER_TABLE.rows.length);
    var cell1 = row.insertCell(0);
    initializeRow(row);
    var fileSize = document.createElement('text');
    fileSize.setAttribute('class', 'songName');
    fileSize.setAttribute('style', 'position: absolute; transform: translate(-100%, 0); left: calc(100% - 3px);');
    fileSize.setAttribute('id', "".concat(index, "playButtonLabel"));
    var songName = document.createElement('text');
    songName.setAttribute('class', 'songName');
    songName.setAttribute('title', "".concat(fileName));
    songName.textContent = fileName;
    var songNumber = document.createElement('text');
    songNumber.textContent = "".concat(PLAYLIST_VIEWER_TABLE.rows.length - 1, ". ");
    setAttributes(songNumber, {
        style: 'float: left; display: inline-block;',
        class: 'songNumber',
        index: index
    });
    var playButtonDiv = document.createElement('label');
    playButtonDiv.setAttribute('class', 'smallplaypause playpause');
    playButtonDiv.setAttribute('for', "".concat(index, "playButton"));
    var checkbox = document.createElement('input');
    checkbox.addEventListener('change', function () { return playSpecificSong(filePlayingCheckboxes.indexOf(checkbox)); }, { passive: true });
    setAttributes(checkbox, {
        type: 'checkbox',
        id: "".concat(index, "playButton"),
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
    for (var key in attrs)
        element.setAttribute(key, attrs[key]);
}
function appendChilds(element, childElements) {
    for (var i = 0; i < childElements.length; i++)
        element.appendChild(childElements[i]);
}
function toggleCompactMode() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // COMPACT_MODE_TOGGLE.disabled = true;
            if (COMPACT_MODE_LINK_ELEMENT === null) {
                COMPACT_MODE_LINK_ELEMENT = document.createElement('link');
                setAttributes(COMPACT_MODE_LINK_ELEMENT, {
                    rel: "stylesheet",
                    href: "../CSS/CompactMode.css",
                });
                document.head.appendChild(COMPACT_MODE_LINK_ELEMENT);
            }
            return [2 /*return*/];
        });
    });
}
function keepTrackofTimes() {
    if (skipSongQueued) {
        skipSongQueued = false;
        filePlayingCheckboxes[(currentSongIndex + 1) % filePlayingCheckboxes.length].dispatchEvent(new MouseEvent("click"));
        // playSpecificSong((currentSongIndex+1)%sounds.length);
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
    var songDuration = sounds[currentSongIndex].duration();
    var currentTime = sounds[currentSongIndex].seek(sounds[currentSongIndex]);
    var timeToSet = currentTime / songDuration * 100;
    if (Number.isFinite(timeToSet))
        PROGRESS_BAR.value = timeToSet;
    updateCurrentTimeDisplay(currentTime, songDuration);
    highlightCurrentSongRow();
}
function unHighlightOldCurrentSongRow() {
    for (var i = 0; i < PLAYLIST_VIEWER_TABLE.rows.length; i++) {
        if (PLAYLIST_VIEWER_TABLE.rows[i].style.backgroundColor == RowColors.PLAYING)
            PLAYLIST_VIEWER_TABLE.rows[i].style.backgroundColor = RowColors.NONE;
    }
}
function highlightCurrentSongRow() {
    var style = PLAYLIST_VIEWER_TABLE.rows[currentSongIndex + 1].style;
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
function reapplySoundAttributes(index) {
    var affected = (index instanceof howler_1.Howl) ? index : sounds[index];
    affected.rate(PLAY_RATE.value);
    affected.volume(VOLUME_CHANGER.value);
    affected.mute(MUTE_BUTTON.checked);
    affected.stereo(parseFloat(PLAY_PAN.value));
}
function updateCurrentTimeDisplay(currentTime, songDurationInSeconds) {
    if (HOVERED_TIME_DISPLAY.getAttribute('inUse') == 1)
        return;
    var progressBarDomRect = PROGRESS_BAR.getBoundingClientRect();
    if (progressBarDomRect.top + 50 < 0)
        return; //return if you scrolled away from the progress bar (+50 to include the hoveredTimeDisplay)
    var songDurationFormatted = new Time(songDurationInSeconds).toString(), top = progressBarDomRect.top + window.scrollY, left = (progressBarDomRect.left - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2) + (progressBarDomRect.width * currentTime / songDurationInSeconds) - 1;
    if (DURATION_OF_SONG_DISPLAY.textContent != songDurationFormatted)
        DURATION_OF_SONG_DISPLAY.textContent = songDurationFormatted;
    HOVERED_TIME_DISPLAY.style.top = "".concat(top, "px");
    HOVERED_TIME_DISPLAY.style.left = "".concat(left, "px");
    var currentTimeString = new Time(currentTime).toString();
    if (HOVERED_TIME_DISPLAY.children[0].textContent != currentTimeString)
        HOVERED_TIME_DISPLAY.children[0].textContent = currentTimeString;
}
function progressBarSeek(mouse, hoverType) {
    var _a, _b;
    if (((mouse === null || mouse === void 0 ? void 0 : mouse.pointerType) == "touch" && hoverType !== ProgressBarSeekAction.SEEK_TO) || sounds[currentSongIndex] == null || ((_b = (_a = sounds[currentSongIndex]) === null || _a === void 0 ? void 0 : _a.state) === null || _b === void 0 ? void 0 : _b.call(_a)) != 'loaded' || hoverType === ProgressBarSeekAction.STOP_DISPLAYING)
        return HOVERED_TIME_DISPLAY.setAttribute('inUse', 0);
    var offsetX = mouse.offsetX, progressBarWidth = PROGRESS_BAR.clientWidth, currentSongLength = sounds[currentSongIndex].duration();
    var seekToTime = Math.max(new Number(offsetX * (currentSongLength / progressBarWidth)), 0);
    switch (hoverType) {
        case (ProgressBarSeekAction.SEEK_TO): return sounds[currentSongIndex].seek(seekToTime);
        case (ProgressBarSeekAction.DISPLAY_TIME):
            HOVERED_TIME_DISPLAY.setAttribute('inUse', 1);
            HOVERED_TIME_DISPLAY.style.left = "".concat((mouse.x - HOVERED_TIME_DISPLAY.getBoundingClientRect().width / 2) + 1, "px");
            HOVERED_TIME_DISPLAY.firstChild.textContent = new Time(seekToTime).toString();
    }
}
function loaded(fileReader, sourceFileObject) {
    var result = fileReader.result;
    var index = sourceFileObject.nativeIndex;
    var sound = new howler_1.Howl({
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
    sound.on('end', function () { return jumpSong(+1); }); //jump to next song when they end (or do custom stuff if needed)
    updateFileSizeDisplay(index, sounds[index].size);
    return sound;
}
/**
 * @param {String} errorType The name of the exception
 * @param {String} errorText Generic error message to explain the error better.
 * @param {String} errorMessage The message provided by the error
*/
function displayError(errorType, errorText, errorMessage, fileName) {
    var insertAfter;
    var children = ERROR_LIST.children;
    for (var i = 0; i < children.length; i++) {
        if (children[i].textContent == fileName) {
            insertAfter = children[i];
            break;
        }
    }
    var songTitle = document.createElement('dt');
    songTitle.textContent = fileName;
    var songError = document.createElement('dd');
    songError.textContent = errorType + ": " + errorText;
    songError.title = errorMessage;
    if (insertAfter) {
        insertAfter.after(songError);
    }
    else {
        ERROR_LIST.appendChild(songTitle);
        ERROR_LIST.appendChild(songError);
    }
    ERROR_POPUP.showModal();
    console.error("".concat(errorType, ": ").concat(errorText, " ").concat(errorMessage));
}
function seek(seekDirection) {
    if (isUnloaded(sounds[currentSongIndex]))
        return;
    var seekDuration = new Number(SEEK_DURATION_NUMBER_INPUT.value) * seekDirection;
    var numToAdd = (SEEK_DISTANCE_PROPORTIONAL_CHECKBOX.checked) ? seekDuration * PLAY_RATE.value : seekDuration;
    var currentTime = sounds[currentSongIndex].seek(sounds[currentSongIndex]);
    sounds[currentSongIndex].seek(Math.max(currentTime + numToAdd, 0));
}
function importFiles(element) {
    return __awaiter(this, void 0, void 0, function () {
        function addFiles(files /*: FileList or array-like containing File objects*/) {
            var lengthBeforeBegin = sounds.length;
            changeStatus("Importing ".concat(files.length, " Files..."));
            for (var i = 0, offsetBecauseOfSkipped = 0; i < files.length; i++) {
                var file = files[i];
                if (file == null)
                    continue;
                var fileExtension = getFileExtension(file.name);
                if (SKIP_UNPLAYABLE_CHECKBOX.checked && !VALAD_FILE_EXTENSIONS.has(fileExtension)) {
                    displayError("TypeError", "The file type '".concat(fileExtension, "' is unsupported."), "This file is unsupported and cannot be imported!", file.name);
                    ++offsetBecauseOfSkipped;
                    continue;
                }
                file.nativeIndex = i + lengthBeforeBegin - offsetBecauseOfSkipped;
                createNewSong(file.name, file.nativeIndex); //index (2nd parameter) is used to number the checkboxes
                updateFileSizeDisplay(file.nativeIndex, file.size);
                sounds.push(file);
            }
            changeStatus("".concat(files.length - offsetBecauseOfSkipped, " files added!"));
        }
        var dataTransferItemList, fileReciever, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(element instanceof FileList)) return [3 /*break*/, 1];
                    addFiles(element);
                    return [3 /*break*/, 3];
                case 1:
                    if (!(element instanceof DataTransfer)) return [3 /*break*/, 3];
                    dataTransferItemList = element === null || element === void 0 ? void 0 : element.items;
                    if (!dataTransferItemList || dataTransferItemList.length == 0)
                        return [2 /*return*/];
                    changeStatus(StatusTexts.RETRIEVING);
                    fileReciever = new DataTransferItemGrabber(dataTransferItemList);
                    _a = addFiles;
                    return [4 /*yield*/, fileReciever.retrieveContents()];
                case 2:
                    _a.apply(void 0, [_b.sent()]);
                    _b.label = 3;
                case 3: return [2 /*return*/];
            }
        });
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
        var currentTime = sounds[currentSongIndex].seek(sounds[currentSongIndex]);
        sounds[currentSongIndex].rate(newRate);
        sounds[currentSongIndex].play(); //this starts the song over
        sounds[currentSongIndex].seek(currentTime, sounds[currentSongIndex]); //jump back to where we were
        return;
    }
    sounds[currentSongIndex].rate(newRate);
}
function updateSeekDurationDisplay() {
    var duration = SEEK_DURATION_NUMBER_INPUT.value;
    if (duration < 1) {
        SEEK_DURATION_DISPLAY.textContent = "".concat(new Number(duration) * 1000, " ms");
    }
    else {
        SEEK_DURATION_DISPLAY.textContent = "".concat(new Number(duration), " sec");
    }
}
function handleCheckBoxClick() {
    var elements = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        elements[_i] = arguments[_i];
    }
    elements.forEach(function (el) {
        var onlyText = el.id.replace(/[^a-z]/gi, ''); //grab all text except numbers
        el.addEventListener('change', function () {
            var _a, _b;
            if (onlyText == "Mute" && !isUnloaded(sounds[currentSongIndex])) {
                howler_1.Howler.mute(el.checked);
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
    var tempArray = sounds, foundCurrentPlayingSong = false;
    sounds = [].fill(null, 0, tempArray.length);
    for (var i = 0; i < tempArray.length; i++) {
        var sound = tempArray[i];
        sounds[sound.nativeIndex] = sound;
        updateFileSizeDisplay(sound.nativeIndex, sound.size);
        if (!foundCurrentPlayingSong && currentSongIndex !== null && i == currentSongIndex) {
            currentSongIndex = sound.nativeIndex;
            var currentCheckbox = filePlayingCheckboxes[currentSongIndex];
            filePlayingCheckboxes.forEach(function (it) { it.checked = false; });
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
    var currentIndex = sounds.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        --currentIndex;
        if (currentSongIndex !== null) {
            if (currentSongIndex == currentIndex)
                currentSongIndex = randomIndex;
            else if (currentSongIndex == randomIndex)
                currentSongIndex = currentIndex;
            var currentCheckbox = filePlayingCheckboxes[currentSongIndex];
            filePlayingCheckboxes.forEach(function (it) { it.checked = false; });
            currentCheckbox.checked = true;
        }
        var tempForSwapping = sounds[currentIndex];
        sounds[currentIndex] = sounds[randomIndex];
        sounds[randomIndex] = tempForSwapping;
    }
}
function playSpecificSong(index) {
    return __awaiter(this, void 0, void 0, function () {
        var checkbox, i, soundName, fileType;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            checkbox = filePlayingCheckboxes[index];
            if (((_b = (_a = sounds[currentSongIndex]) === null || _a === void 0 ? void 0 : _a.playing) === null || _b === void 0 ? void 0 : _b.call(_a)) && ((_d = (_c = sounds[currentSongIndex]) === null || _c === void 0 ? void 0 : _c.state) === null || _d === void 0 ? void 0 : _d.call(_c)) == "loaded")
                (_f = (_e = sounds[currentSongIndex]) === null || _e === void 0 ? void 0 : _e.stop) === null || _f === void 0 ? void 0 : _f.call(_e);
            howler_1.Howler.stop();
            if (!checkbox.checked) {
                PLAY_BUTTON.checked = PAUSED;
                currentSongIndex = null;
                for (i = 0; i < sounds.length; i++)
                    removeSongFromRam(i);
                changeStatus(StatusTexts.STOPPED);
                unHighlightOldCurrentSongRow();
                return [2 /*return*/];
            }
            else {
                currentSongIndex = index;
                filePlayingCheckboxes.forEach(function (it) { if (it.id != checkbox.id)
                    it.checked = false; }); //uncheck the play button for all the other sounds except the one u chose
                soundName = sounds[index].name, fileType = getFileExtension(soundName);
                if (SKIP_UNPLAYABLE_CHECKBOX.checked && !VALAD_FILE_EXTENSIONS.has(fileType)) {
                    displayError("TypeError", "The file type '".concat(fileType, "' is unsupported."), "This file is unsupported and cannot be played!", soundName);
                    skipSongQueued = true;
                    return [2 /*return*/];
                }
                changeStatus(StatusTexts.DOWNLOADING);
                retrieveSound(sounds[index], true, index).then(function (retrieved) { return loadSong(retrieved, index, true); });
                refreshPreloadedSongs();
                unHighlightOldCurrentSongRow();
            }
            return [2 /*return*/];
        });
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
    reapplySoundAttributes(currentSongIndex);
    if (PLAY_RATE.value != 0) {
        sounds[currentSongIndex].play();
        PLAY_BUTTON.checked = PLAYING;
    }
}
function refreshPreloadedSongs() {
    if (currentSongIndex == null)
        return;
    var _loop_2 = function (i) {
        if (i == currentSongIndex)
            return "continue";
        if (!isIndexInRangeofCurrent(i)) {
            if (sounds[i] !== null)
                removeSongFromRam(i);
            return "continue";
        }
        retrieveSound(sounds[i], false, i).then(function (retrieved) { return loadSong(retrieved, i, false); });
    };
    for (var i = 0; i < sounds.length; i++) {
        _loop_2(i);
    }
}
function jumpSong(amount) {
    amount = amount || 1; //if no value inputted, assume u want to jump ahead one song
    var repeating = REPEAT_BUTTON.checked;
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
    var playButtonToActivate = filePlayingCheckboxes[currentSongIndex];
    playButtonToActivate.checked = true;
    playButtonToActivate.dispatchEvent(new Event('change'));
}
function playButton() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (isUnloaded(sounds[currentSongIndex]))
                        return [2 /*return*/, PLAY_BUTTON.checked = !PLAY_BUTTON.checked];
                    if (PLAY_BUTTON.checked == PAUSED) { //if set to paused
                        if (((_b = (_a = sounds[currentSongIndex]) === null || _a === void 0 ? void 0 : _a.pause) === null || _b === void 0 ? void 0 : _b.call(_a)) != undefined)
                            changeStatus(StatusTexts.PAUSED);
                        return [2 /*return*/];
                    }
                    if (!(sounds[currentSongIndex].state() != "loaded")) return [3 /*break*/, 2];
                    return [4 /*yield*/, sounds[currentSongIndex].load()];
                case 1:
                    _c.sent();
                    _c.label = 2;
                case 2:
                    sounds[currentSongIndex].play();
                    changeStatus(StatusTexts.PLAYING);
                    return [2 /*return*/];
            }
        });
    });
}
function isIndexInRangeofCurrent(index) {
    var distance = parseInt(PRELOAD_DIST_ELEMENT.value);
    var withinRange = index >= currentSongIndex - distance && index <= currentSongIndex + distance;
    var inRangeWrappedToBegin = index + distance >= sounds.length && (index + distance) % sounds.length >= currentSongIndex;
    var inRangeWrappedToEnd = index - distance < 0 && (index - distance) + sounds.length <= currentSongIndex;
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
    var megabytes = (bytes / 1048576).toFixed(2);
    fileSizeDisplays[index].textContent = "".concat(megabytes, " MB");
    fileSizeDisplays[index].setAttribute('title', "".concat(bytes, " bytes"));
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
    document.querySelectorAll('button').forEach(function (element) {
        var secondsSkipAmount = precisionRound(10 * PLAY_RATE.value, 3);
        element.textContent = "".concat(element.textContent[0]).concat(secondsSkipAmount, " Seconds");
    });
}
function precisionRound(number, precision) {
    var factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}
function setProgress(progressEvent, index) {
    fileSizeDisplays[index].textContent = "".concat((progressEvent.loaded / 1024000).toFixed(2), "/").concat((progressEvent.total / 1024000).toFixed(2), " MB");
}
function changeStatus(status) { STATUS_TEXT.textContent = status; }
function isUnloaded(sound) { var _a; return sound === null || sound instanceof File || ((_a = sound === null || sound === void 0 ? void 0 : sound.state) === null || _a === void 0 ? void 0 : _a.call(sound)) != 'loaded'; }
function isLoading(sound) { var _a; return ((_a = sound === null || sound === void 0 ? void 0 : sound.state) === null || _a === void 0 ? void 0 : _a.call(sound)) == 'loading'; }
function isSongRepeating() { return REPEAT_BUTTON.checked; }
function onRangeInput(elem, func) { elem.addEventListener('input', func, { passive: true }); }
function sleep(ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); }
function isCurrentSoundPaused() { return sounds[currentSongIndex]._sounds[0]._paused; }
function getInMegabytes(bytes) { return (bytes / 1048576).toFixed(2); }
function getFileExtension(fileName) { return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(); }
/*            TABLE INTERACTION FUNCTIONS             */
function initializeRow(row) {
    row.setAttribute('draggable', 'true');
    row.addEventListener('click', onSingleClick, { passive: true });
    // row.addEventListener('contextmenu', onRightClick);
    row.addEventListener('dblclick', onDoubleClick, { passive: true });
    row.addEventListener('dragstart', function (event) {
        if (onlyFiles(event.dataTransfer))
            return;
        if (selectedRows.length == 0)
            selectRow(row);
        event.dataTransfer.clearData();
        event.dataTransfer.setData("text/plain", "action:reorganizingPlaylist");
        whileDraggingRows(event);
    });
    row.addEventListener('dragover', function (event) {
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
    var row = event.target;
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
    var row = pointerEvent.target;
    if (!rowValid(row)) {
        row = tryFindTableRowInParents(row);
        if (!rowValid(row))
            return;
    }
    var indexOf = selectedRows.indexOf(row);
    if (pointerEvent.ctrlKey) {
        if (indexOf != -1)
            return deselectRow(row, indexOf);
    }
    else if (pointerEvent.shiftKey && selectedRows.length != 0) {
        sortSelectedRows();
        var startingIndex = selectedRows[selectedRows.length - 1].rowIndex;
        var endingIndex = row.rowIndex;
        if (endingIndex > startingIndex) {
            for (var i = startingIndex + 1; i < endingIndex; i++)
                selectRow(PLAYLIST_VIEWER_TABLE.rows[i]);
        }
        else {
            startingIndex = selectedRows[0].rowIndex;
            for (var i = startingIndex - 1; i > endingIndex; i--)
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
    for (var i = 0; i < selectedRows.length; i++)
        deselectRow(selectedRows[i], -1);
    selectedRows = [];
}
function playRow(row) {
    if (!rowValid(row)) {
        row = tryFindTableRowInParents(row);
        if (!rowValid(row))
            return;
    }
    var index = row.rowIndex - 1;
    filePlayingCheckboxes[index].checked = !filePlayingCheckboxes[index].checked;
    playSpecificSong(index);
}
function deleteSelectedSongs() {
    for (var i = 0; i < selectedRows.length; i++) {
        var index = selectedRows[i].rowIndex - 1;
        if (index == currentSongIndex) {
            filePlayingCheckboxes[currentSongIndex].checked = false;
            playSpecificSong(currentSongIndex); //stop playing
            PROGRESS_BAR.value = 0;
        }
        var tableBody = PLAYLIST_VIEWER_TABLE.firstElementChild;
        tableBody.removeChild(selectedRows[i]);
        for (var i_1 = 0; i_1 < sounds.length; i_1++) {
            if (sounds[i_1] != sounds[index] && sounds[i_1].nativeIndex >= sounds[index].nativeIndex) { //warning: branch prediction failure
                --sounds[i_1].nativeIndex;
                if (sounds[i_1] instanceof howler_1.Howl)
                    --sounds[i_1].sourceFile.nativeIndex;
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
    for (var i = selectedRows.length - 1; i >= 0; i--) {
        var index = selectedRows[i].rowIndex - 1;
        // if(index == currentSongIndex){
        //   filePlayingCheckboxes[currentSongIndex].checked = false;
        //   playSpecificSong(currentSongIndex); //stop playing
        // }
        var tableBody = PLAYLIST_VIEWER_TABLE.firstElementChild;
        tableBody.removeChild(selectedRows[i]);
        for (var i_2 = 0; i_2 < sounds.length; i_2++) {
            if (sounds[i_2] != sounds[index] && sounds[i_2].nativeIndex >= sounds[index].nativeIndex) { //warning: branch prediction failure
                --sounds[i_2].nativeIndex;
                if (sounds[i_2] instanceof howler_1.Howl)
                    --sounds[i_2].sourceFile.nativeIndex;
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
        for (var i_3 = 0; i_3 < sounds.length; i_3++) {
            if (sounds[i_3] != sounds[toIndex] && sounds[i_3].nativeIndex >= sounds[toIndex].nativeIndex) { //warning: branch prediction failure
                ++sounds[i_3].nativeIndex;
                if (sounds[i_3] instanceof howler_1.Howl)
                    ++sounds[i_3].sourceFile.nativeIndex;
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
            var row = PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + indexIncrement];
            if (row)
                selectRow(row);
        }
        else {
            deselectRow(selectedRows[selectedRows.length - 1], selectedRows.length - 1);
        }
    }
    else {
        var oneElement = (indexIncrement > 0) ? PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex + 1] : PLAYLIST_VIEWER_TABLE.rows[selectedRows[selectedRows.length - 1].rowIndex - 1];
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
    var songNumbers = document.getElementsByClassName('songNumber');
    for (var i = 0; i < songNumbers.length; i++) {
        var songNumber = songNumbers[i];
        var row = tryFindTableRowInParents(songNumber);
        if (row == null)
            continue;
        songNumber.textContent = "".concat(row.rowIndex, ". ");
    }
}
function rowValid(row) { return row instanceof HTMLTableRowElement && row != PLAYLIST_VIEWER_TABLE.rows[0] && row.closest('table') == PLAYLIST_VIEWER_TABLE; }
function sortSelectedRows() { selectedRows.sort(function (a, b) { return a.rowIndex - b.rowIndex; }); }
function isTyping(keyboardEvent) { return keyboardEvent.target instanceof HTMLInputElement; }
/*                       CONTEXT MENU                      */
var CONTEXT_MENU = document.getElementById('rightClickContextMenu');
function initContextMenu() {
    document.addEventListener('contextmenu', function (pointerEvent) {
        pointerEvent.preventDefault();
        selectingSongRow: { //if clicking a row
            var row = pointerEvent.target;
            if (!rowValid(row)) {
                row = tryFindTableRowInParents(row);
                if (!rowValid(row))
                    break selectingSongRow;
            }
            if (!selectedRows.includes(row)) {
                deselectAll();
                selectRow(row);
            }
            var contextOptions = [];
            if (selectedRows.length == 1)
                contextOptions.push({ text: (currentSongIndex != selectedRows[0].rowIndex - 1) ? "Play" : "Stop", action: function () { return playRow(selectedRows[0]); } });
            contextOptions.push({ text: "Delete", action: deleteSelectedSongs });
            return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, contextOptions, true);
        }
        switch (pointerEvent.target.getAttribute('data-onRightClick')) {
            case "uploadFileMenu": {
                return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [
                    { text: "Upload Files", icon: "../Icons/UploadIcon.svg", action: function () { return UPLOAD_BUTTON.dispatchEvent(new MouseEvent('click')); } },
                    { text: "Upload Folder", icon: "../Icons/UploadIcon.svg", action: function () { return UPLOAD_DIRECTORY_BUTTON.dispatchEvent(new MouseEvent('click')); } }
                ], false);
            }
            default: {
                return spawnContextMenu(pointerEvent.clientX, pointerEvent.clientY, [], true);
            }
        }
    });
}
function spawnContextMenu(clientX, clientY, contextOptions, allowDefaultOptions) {
    var childElement;
    while ((childElement = CONTEXT_MENU.lastChild) != null) {
        CONTEXT_MENU.removeChild(childElement);
    }
    if (allowDefaultOptions) {
        contextOptions = contextOptions.concat([{ text: COMPACT_MODE_TOGGLE.checked ? "Disable Compact Mode" : "Enable Compact Mode", action: function () { COMPACT_MODE_TOGGLE.dispatchEvent(new MouseEvent('click')); } }]);
    }
    var _loop_3 = function (i) {
        var contextOption = contextOptions[i];
        var contextButton = document.createElement('div');
        contextButton.setAttribute('class', 'contextOption');
        if (i < contextOptions.length - 1)
            contextButton.style.borderBottomWidth = "1px";
        contextButton.addEventListener('click', function (event) { if (CONTEXT_MENU.getAttribute('open') == 'true')
            contextOption.action(event); });
        if (contextOption.icon) {
            var contextIcon = document.createElement('img');
            contextIcon.setAttribute('class', 'contextIcon');
            contextIcon.src = contextOption.icon;
            contextButton.append(contextIcon, contextOption.text);
        }
        else {
            contextButton.innerText = contextOption.text;
        }
        CONTEXT_MENU.appendChild(contextButton);
    };
    for (var i = 0; i < contextOptions.length; i++) {
        _loop_3(i);
    }
    CONTEXT_MENU.style.height = "".concat(contextOptions.length * 29, "px");
    var leftOffset = clientX + 2, downOffset = clientY + 2;
    var viewportWidth = document.documentElement.clientWidth, viewportHeight = document.documentElement.clientHeight, contextMenuRect = CONTEXT_MENU.getBoundingClientRect();
    if (leftOffset + contextMenuRect.width > viewportWidth) {
        leftOffset = viewportWidth - contextMenuRect.width;
    }
    if (downOffset + contextMenuRect.height > viewportHeight) {
        downOffset = viewportHeight - contextMenuRect.height;
    }
    CONTEXT_MENU.style.left = "".concat(leftOffset, "px");
    CONTEXT_MENU.style.top = "".concat(downOffset, "px");
    CONTEXT_MENU.setAttribute('open', 'true');
}
function closeContextMenu() { CONTEXT_MENU.setAttribute('open', 'false'); CONTEXT_MENU.style.height = '0'; }
;
