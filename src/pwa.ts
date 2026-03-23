import { registerSW } from 'virtual:pwa-register';
import {
  clearFetchCache,
  FETCH_CACHE_MAX_AGE_MS,
  shouldClearWeatherCachesOnStartup,
} from '@/data/retryFetch';

const SW_UPDATE_INTERVAL_MS = FETCH_CACHE_MAX_AGE_MS;
const STALE_PAGE_INTERVAL_MS = FETCH_CACHE_MAX_AGE_MS;
const WEATHER_CACHE_NAMES = ['open-meteo-cache', 'nws-cache'] as const;

async function clearWeatherCaches() {
  clearFetchCache();

  if (typeof caches === 'undefined') return;

  await Promise.allSettled(WEATHER_CACHE_NAMES.map((cacheName) => caches.delete(cacheName)));
}

export async function registerAppServiceWorker() {
  const loadedAt = Date.now();
  let reloadingStalePage = false;

  if (shouldClearWeatherCachesOnStartup()) {
    await clearWeatherCaches();
  }

  const reloadIfPageIsStale = async () => {
    if (reloadingStalePage) return;
    if (Date.now() - loadedAt < STALE_PAGE_INTERVAL_MS) return;

    reloadingStalePage = true;
    await clearWeatherCaches();
    window.location.reload();
  };

  const checkForStalePage = () => {
    if (document.visibilityState === 'hidden') return;
    void reloadIfPageIsStale();
  };

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      queueMicrotask(() => {
        void clearWeatherCaches().finally(() => {
          void updateSW(true);
        });
      });
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        void registration.update();
      }, SW_UPDATE_INTERVAL_MS);
    },
  });

  window.addEventListener('focus', checkForStalePage);
  window.addEventListener('pageshow', checkForStalePage);
  document.addEventListener('visibilitychange', checkForStalePage);
  setInterval(checkForStalePage, STALE_PAGE_INTERVAL_MS);
}
