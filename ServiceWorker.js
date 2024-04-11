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
        "/",
        "./index.html",
        "./HTML/WebLooper.html",
        "./HTML/PlaylistCreator.html",
        "./Javascript/howler.js",
        "./Javascript/WebLooper.js",
        "./Javascript/PlaylistCreator.js",
        "./CSS/background.css",
        "./CSS/WebLooper.css",
        "./CSS/PlaylistCreator.css",
        "./CSS/CompactMode.css",
        "./Icons/UploadIcon.svg",
        "./Icons/SpeakerIcon.svg",
        "./Icons/SkipIcon.svg",
        "./Icons/ShuffleIcon.svg",
        "./Icons/SettingsIcon.svg",
        "./Icons/SeekIcon.svg",
        "./Icons/RepeatIcon.svg",
        "./Icons/Repeat1Icon.svg",
        "./Icons/PlaybackSpeedIcon.svg",
        "./Icons/PageFavicon.ico",
        "./Icons/LoadingIcon.svg",
        "./Icons/HeadphonesIcon.svg",
        "./Icons/CancelIcon.svg"
    ];
    event.waitUntil(new Promise((accept, reject) => __awaiter(void 0, void 0, void 0, function* () {
        if (!cacheStorage)
            cacheStorage = yield caches.open(CACHE_NAME);
        cacheStorage.addAll(contentToCache).then(() => accept()).catch(() => reject("Failed to add all resources to cache on install"));
    })));
});
self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});
self.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET")
        return;
    e.preventDefault();
    e.respondWith(new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        if (!cacheStorage)
            cacheStorage = yield caches.open(CACHE_NAME);
        useCache(e.request).then(response => {
            resolve(response);
            useFetchRequestAndCache().catch(() => { });
        }, rejectReason => {
            useFetchRequestAndCache(e.request).then(response => {
                resolve(response);
            }).catch(error => {
                reject(error);
            });
        });
        function useFetchRequestAndCache() {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    fetch(e.request).then(response => {
                        if (response.ok) {
                            console.log(`[Service Worker] Caching resource: ${e.request.url}`);
                            cacheStorage.put(e.request, response.clone());
                        }
                        resolve(response);
                    }).catch((error) => {
                        reject(error);
                    });
                });
            });
        }
        function useCache() {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    getCachedResponse(e.request).then(response => {
                        console.log(`[Service Worker] Returning cached resource: ${e.request.url}`);
                        resolve(response);
                    }).catch((errorReason) => {
                        console.log(`[Service Worker] Uncached resource: ${e.request.url}`);
                        reject(errorReason);
                    });
                });
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
                reject("Cache miss: " + request.url);
            });
        });
    });
}
//# sourceMappingURL=ServiceWorker.js.map