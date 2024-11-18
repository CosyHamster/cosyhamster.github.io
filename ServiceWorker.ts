const CACHE_NAME = 'CosyHamsterMusicPlayerOfflineCache';
var cacheStorage: Cache;
self.addEventListener("install", (event) => {
    console.log("[Service Worker] Install");
    const contentToCache: string[] = [
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
    event.waitUntil(new Promise<void>(async (resolve, reject) => {
        if(!cacheStorage) cacheStorage = await caches.open(CACHE_NAME);
        cacheStorage.addAll(contentToCache).then(() => resolve()).catch(() => reject("Failed to add all resources to cache on install"));
    }))
});
self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
})
self.addEventListener("fetch", (e) => {
    if(e.request.method !== "GET") return;
    e.preventDefault();
    e.respondWith(new Promise(async (resolve, reject) => {
        if(!cacheStorage) cacheStorage = await caches.open(CACHE_NAME);
        let requestResolved = false;

        useFetchRequestAndCache(e.request).then(response => {
            if(!requestResolved) resolve(response)
            requestResolved = true;
        }, error => {
            resolveUsingCache();
        });

        setTimeout(() => {
            if(!requestResolved) {
                resolveUsingCache();
            }
        }, 10_000);


        function resolveUsingCache(){
            useCache(e.request).then(response => {
                if (response instanceof Response) {
                    resolve(response);
                    requestResolved = true;
                } else {
                    reject("Failed to fetch and no value in cache.");
                }
            }, rejectReason => {
                reject("Failed to fetch and no value in cache.");
            })
        }

    })); 
});


async function useFetchRequestAndCache(request: Request){
    return new Promise<Response>((resolve, reject) => {
        fetch(request).then(response => {
            if(response.ok){
                console.log(`[Service Worker] Caching resource: ${request.url}`);
                cacheStorage.put(request, response.clone());
            }
            resolve(response);
        }).catch((error) => {
            reject(error);
        });
    });
}

async function useCache(request: Request){
    return new Promise<Response>((resolve, reject) => {
        getCachedResponse(request).then(response => {
            console.log(`[Service Worker] Returning cached resource: ${request.url}`);
            resolve(response);
        }).catch((errorReason) => {
            console.log(`[Service Worker] Uncached resource: ${request.url}`);
            reject(errorReason);
        });
    })
}

async function getCachedResponse(request: Request): Promise<Response | null | undefined>{
    return new Promise((accept, reject) => {
        cacheStorage.match(request).then((response) => {
            accept(response);
        }).catch(() => {
            reject("Cache miss: " + request.url);
        })
    })
}