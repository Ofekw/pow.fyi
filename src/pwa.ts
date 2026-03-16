import { registerSW } from 'virtual:pwa-register';
import { clearFetchCache } from '@/data/retryFetch';

const SW_UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const STALE_PAGE_INTERVAL_MS = 60 * 60 * 1000;
const WEATHER_CACHE_NAMES = ['open-meteo-cache', 'nws-cache'] as const;

export function registerAppServiceWorker() {
  const loadedAt = Date.now();
  let reloadingStalePage = false;

  const reloadIfPageIsStale = async () => {
    if (reloadingStalePage) return;
    if (Date.now() - loadedAt < STALE_PAGE_INTERVAL_MS) return;

    reloadingStalePage = true;
    clearFetchCache();

    if (typeof caches !== 'undefined') {
      await Promise.allSettled(WEATHER_CACHE_NAMES.map((cacheName) => caches.delete(cacheName)));
    }

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
        void updateSW(true);
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
