"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const OFFLINE_VERSION = 2;
const CACHE_NAME = 'CosyHamsterMusicPlayerOfflineCache';
var cacheStorage;
self.addEventListener("install", (event) => {
    console.log("[Service Worker] Install");
    const contentToCache = [
        "../index.html",
        "../HTML/WebLooper.html",
        "../HTML/PlaylistCreator.html",
        "./howler.js",
        "./WebLooper.js",
        "./PlaylistCreator.js",
        "./ServiceWorker.js",
        "../CSS/background.css",
        "../CSS/WebLooper.css",
        "../CSS/PlaylistCreator.css",
        "../CSS/CompactMode.css",
        "../Icons/UploadIcon.svg",
        "../Icons/SpeakerIcon.svg",
        "../Icons/SkipIcon.svg",
        "../Icons/ShuffleIcon.svg",
        "../Icons/SettingsIcon.svg",
        "../Icons/SeekIcon.svg",
        "../Icons/RepeatIcon.svg",
        "../Icons/Repeat1Icon.svg",
        "../Icons/PlaybackSpeedIcon.svg",
        "../Icons/PageFavicon.ico",
        "../Icons/LoadingIcon.svg",
        "../Icons/HeadphonesIcon.svg",
        "../Icons/CancelIcon.svg"
    ];
    event.waitUntil(new Promise((accept, reject) => __awaiter(void 0, void 0, void 0, function* () {
        if (!cacheStorage)
            cacheStorage = yield caches.open(CACHE_NAME);
        cacheStorage.addAll(contentToCache).then(() => accept()).catch(() => reject("Failed to add all resources to cache on install"));
    })));
});
self.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET")
        return;
    e.respondWith(new Promise((accept, reject) => __awaiter(void 0, void 0, void 0, function* () {
        if (!cacheStorage)
            cacheStorage = yield caches.open(CACHE_NAME);
        fetch(e.request).then((response) => __awaiter(void 0, void 0, void 0, function* () {
            if (response.ok) {
                console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
                cacheStorage.put(e.request, response.clone());
                accept(response);
            }
            else {
                tryUsingCache();
            }
        })).catch(() => __awaiter(void 0, void 0, void 0, function* () {
            tryUsingCache();
        }));
        function tryUsingCache() {
            return __awaiter(this, void 0, void 0, function* () {
                const cachedResponse = yield getCachedResponse(e.request);
                if (cachedResponse) {
                    console.log(`[Service Worker] Returning cached resource: ${e.request.url}`);
                    accept(cachedResponse);
                }
                else {
                    console.log(`[Service Worker] Uncached resource: ${e.request.url}`);
                    reject("The network request failed, and the resource is not cached.");
                }
            });
        }
    })));
});
function getCachedResponse(request) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((accept, reject) => {
            cacheStorage.match(request).then((response) => {
                accept(response);
            }).catch(() => {
                accept(null);
            });
        });
    });
}
//# sourceMappingURL=ServiceWorker.js.map