"use strict";
const CACHE_NAME = 'CosyHamsterMusicPlayerOfflineCache';
var cacheStorage;
self.addEventListener("install", event => {
    console.log("[Service Worker] Install");
    const contentToCache = [
        "/",
        "./index.html",
        "./manifest.webmanifest",
        "./CSS/background.css",
        "./Javascript/howler.js",
        "./WebLooper/",
        "./WebLooper/WebLooper.js",
        "./WebLooper/WebLooper.css",
        "./PlaylistCreator/",
        "./PlaylistCreator/PlaylistCreator.js",
        "./PlaylistCreator/PlaylistCreator.css",
        "./PlaylistCreator/CompactMode.css",
        "./FrameSkipper/",
        "./FrameSkipper/script.js",
        "./Icons/UploadIcon.svg",
        "./Icons/SpeakerIcon.svg",
        "./Icons/SkipIcon.svg",
        "./Icons/ShuffleIcon.svg",
        "./Icons/SettingsIcon.svg",
        "./Icons/SeekIcon.svg",
        "./Icons/play-button-arrowhead-svgrepo-com.svg",
        "./Icons/pause-alt-svgrepo-com.svg",
        "./Icons/RepeatIcon.svg",
        "./Icons/Repeat1Icon.svg",
        "./Icons/PlaybackSpeedIcon.svg",
        "./Icons/big-sheep-face.png",
        "./Icons/PageFavicon.ico",
        "./Icons/LoadingIcon.svg",
        "./Icons/HeadphonesIcon.svg",
        "./Icons/MoreMenuIcon.svg",
        "./Icons/CancelIcon.svg",
        "./Icons/TrashCan.svg"
    ];
    event.waitUntil(new Promise(async (resolve, reject) => {
        if (!cacheStorage)
            cacheStorage = await caches.open(CACHE_NAME);
        cacheStorage.addAll(contentToCache).then(resolve).catch(() => reject("Failed to add all resources to cache on install"));
    }));
});
self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});
self.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET")
        return;
    e.preventDefault();
    e.respondWith(new Promise(async (resolve, reject) => {
        if (!cacheStorage)
            cacheStorage = await caches.open(CACHE_NAME);
        let requestResolved = false;
        const timeoutID = setTimeout(() => {
            if (!requestResolved) {
                resolveRequest();
                resolveUsingCache();
            }
        }, 10000);
        useFetchRequestAndCache(e.request).then(response => {
            if (!requestResolved) {
                resolveRequest();
                resolve(response);
            }
        }, error => {
            console.log(`Resolving request ${e.request} with cache due to ${error}`);
            if (!requestResolved) {
                resolveRequest();
                resolveUsingCache();
            }
        });
        function resolveUsingCache() {
            useCache(e.request).then(response => {
                resolve(response);
            }, rejectReason => {
                const error = "Cannot resolve using cache due to error " + rejectReason;
                // console.warn(error);
                reject(error);
            });
        }
        function resolveRequest() {
            requestResolved = true;
            clearTimeout(timeoutID);
        }
    }));
});
function useFetchRequestAndCache(request) {
    return new Promise((resolve, reject) => {
        fetch(request).then(response => {
            if (response.ok) {
                // console.log(`[Service Worker] Caching resource: ${request.url}`);
                cacheStorage.put(request, response.clone());
                resolve(response);
            }
            else {
                throw new TypeError("Fetch gave response with ok == false: " + response);
            }
        }).catch(error => {
            // console.warn(`Failed to fetch ${request} due to error ${error}`);
            reject(error);
        });
    });
}
function useCache(request) {
    return new Promise((resolve, reject) => {
        getCachedResponse(request).then(response => {
            // console.log(`[Service Worker] Returning cached resource: ${request.url}`);
            resolve(response);
        }).catch(errorReason => {
            // console.log(`[Service Worker] Uncached resource: ${request.url}. errorReason: ${errorReason}`);
            reject(errorReason);
        });
    });
}
function getCachedResponse(request) {
    return new Promise((resolve, reject) => {
        cacheStorage.match(request).then(response => {
            if (response)
                resolve(response);
            else
                throw new TypeError("bad response from cache: " + response);
        }).catch(reason => {
            // console.warn(reason);
            reject(`Bad or missing value in cache for ${request.url} due to error ${reason}`);
        });
    });
}
//# sourceMappingURL=ServiceWorker.js.map