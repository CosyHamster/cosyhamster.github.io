const OFFLINE_VERSION = 2;
const CACHE_NAME = 'CosyHamsterMusicPlayerOfflineCache';
var cacheStorage: Cache;
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
        "./ServiceWorker.js",
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
    event.waitUntil(new Promise<void>(async (accept, reject) => {
        if(!cacheStorage) cacheStorage = await caches.open(CACHE_NAME);
        cacheStorage.addAll(contentToCache).then(() => accept()).catch(() => reject("Failed to add all resources to cache on install"));
    }))
});
self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
})
self.addEventListener("fetch", (e) => {
    if(e.request.method !== "GET") return;
    e.preventDefault();
    e.respondWith(new Promise(async (accept, reject) => {        
        if(!cacheStorage) cacheStorage = await caches.open(CACHE_NAME);

        fetch(e.request).then( async response => {
            if(response.ok){
                console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
                cacheStorage.put(e.request, response.clone());
                accept(response);
            } else {
                tryUsingCache();
            }
        }).catch( async () => {
            tryUsingCache();
        });

        async function tryUsingCache(){
            const cachedResponse = await getCachedResponse(e.request);
            if(cachedResponse){
                console.log(`[Service Worker] Returning cached resource: ${e.request.url}`);
                accept(cachedResponse);
            } else {
                console.log(`[Service Worker] Uncached resource: ${e.request.url}`); 
                reject("The network request failed, and the resource is not cached.");  
            }
        }
    })); 
});
async function getCachedResponse(request: Request): Promise<Response | null | undefined>{
    return new Promise((accept, reject) => {
        cacheStorage.match(request).then((response) => {
            accept(response?.clone?.());
        }).catch(() => {
            accept(null);
        })
    })
}