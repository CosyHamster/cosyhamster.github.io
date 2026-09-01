declare const CACHE_NAME = "CosyHamsterMusicPlayerOfflineCache";
declare var cacheStorage: Cache;
declare function useFetchRequestAndCache(request: Request): Promise<Response>;
declare function useCache(request: Request): Promise<Response>;
declare function getCachedResponse(request: Request): Promise<Response | null | undefined>;
