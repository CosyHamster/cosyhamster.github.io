// const OFFLINE_VERSION = 1;
// const CACHE_NAME = 'CosyHamsterMusicPlayerOfflineCache';
// let cacheStorage;
// self.addEventListener("install", (e) => {
//     console.log("[Service Worker] Install");
//     const contentToCache = [
//         "/index.html",
//         "/howler.js",
//         "/CSS/background.css",
//         "/CSS/WebLooper.css",
//         "/CSS/PlaylistCreator.css",
//         "/CSS/CompactMode.css",
//         "/HTML/WebLooper.html",
//         "/HTML/PlaylistCreator.html",
//         "/Icons/UploadIcon.svg",
//         "/Icons/SpeakerIcon.svg",
//         "/Icons/SkipIcon.svg",
//         "/Icons/ShuffleIcon.svg",
//         "/Icons/SettingsIcon.svg",
//         "/Icons/SeekIcon.svg",
//         "/Icons/RepeatIcon.svg",
//         "/Icons/Repeat1Icon.svg",
//         "/Icons/PlaybackSpeedIcon.svg",
//         "/Icons/PageFavicon.ico",
//         "/Icons/LoadingIcon.svg",
//         "/Icons/HeadphonesIcon.svg",
//         "/Icons/CancelIcon.svg",
//         "/Javascript/WebLooper.js",
//         "/Javascript/PlaylistCreator.js",
//         "/Javascript/ServiceWorker.js"
//     ];
//     e.waitUntil( (async () => {
//         cacheStorage = await caches.open(CACHE_NAME);
//         await cacheStorage.addAll(contentToCache);
//     })())
// });
// self.addEventListener("fetch", (e) => {
//     e.respondWith((async () => {
        
//         if(!cacheStorage) cacheStorage = await caches.open(CACHE_NAME);
//         fetch(e.request).then( response => {
//             console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
//             cache.put(e.request, response.clone());
//             return response;
//         }).catch( async () => {
//             const cachedResponse = await caches.match(e.request);
//             console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
//             if (cachedResponse) {
//                 return cachedResponse;
//             }
//         });

//     })());
// });