import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test';

const registerSW = mock();

mock.module('virtual:pwa-register', () => ({
  registerSW,
}));

const originalSetInterval = globalThis.setInterval;
const setIntervalMock = mock(() => 1 as unknown as ReturnType<typeof setInterval>);
globalThis.setInterval = setIntervalMock as unknown as typeof setInterval;

const originalDateNow = Date.now;
const originalWindowAddEventListener = window.addEventListener;
const originalDocumentAddEventListener = document.addEventListener;
const originalLocationDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'location');
const originalCachesDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'caches');

const windowEventListeners = new Map<string, EventListener>();
const documentEventListeners = new Map<string, EventListener>();
const windowAddEventListenerMock = mock((type: string, listener: EventListenerOrEventListenerObject) => {
  if (typeof listener === 'function') {
    windowEventListeners.set(type, listener);
  }
});
const documentAddEventListenerMock = mock((type: string, listener: EventListenerOrEventListenerObject) => {
  if (typeof listener === 'function') {
    documentEventListeners.set(type, listener);
  }
});
const reloadMock = mock();
const deleteCacheMock = mock(() => Promise.resolve(true));

window.addEventListener = windowAddEventListenerMock as unknown as typeof window.addEventListener;
document.addEventListener = documentAddEventListenerMock as unknown as typeof document.addEventListener;

function defineMockGlobalValue(name: 'location' | 'caches', value: unknown) {
  const originalDescriptor = name === 'location' ? originalLocationDescriptor : originalCachesDescriptor;
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    enumerable: originalDescriptor?.enumerable ?? false,
    writable: true,
  });
}

function restoreGlobalValue(name: 'location' | 'caches', descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }

  delete (globalThis as Record<string, unknown>)[name];
}

defineMockGlobalValue('location', { reload: reloadMock });
defineMockGlobalValue('caches', { delete: deleteCacheMock });

const { registerAppServiceWorker } = await import('@/pwa');

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

afterAll(() => {
  globalThis.setInterval = originalSetInterval;
  Date.now = originalDateNow;
  window.addEventListener = originalWindowAddEventListener;
  document.addEventListener = originalDocumentAddEventListener;
  restoreGlobalValue('location', originalLocationDescriptor);
  restoreGlobalValue('caches', originalCachesDescriptor);
});

beforeEach(() => {
  registerSW.mockReset();
  setIntervalMock.mockReset();
  windowAddEventListenerMock.mockClear();
  documentAddEventListenerMock.mockClear();
  reloadMock.mockReset();
  deleteCacheMock.mockReset();
  deleteCacheMock.mockImplementation(() => Promise.resolve(true));
  windowEventListeners.clear();
  documentEventListeners.clear();
  Date.now = mock(() => 0) as typeof Date.now;
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  });
});

describe('registerAppServiceWorker', () => {
  it('forces a refresh when a new service worker is available', async () => {
    const updateSW = mock();
    registerSW.mockImplementation(() => updateSW);

    registerAppServiceWorker();
    const [{ onNeedRefresh }] = registerSW.mock.calls[0];
    onNeedRefresh();
    await Promise.resolve();

    expect(registerSW).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onNeedRefresh: expect.any(Function),
      }),
    );
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it('periodically checks for service worker updates after registration', async () => {
    const updateRegistration = mock(() => Promise.resolve());
    const updateSW = mock();
    registerSW.mockImplementation((options) => {
      options.onRegisteredSW?.('/sw.js', { update: updateRegistration });
      return updateSW;
    });

    registerAppServiceWorker();

    expect(setIntervalMock).toHaveBeenCalledTimes(2);
    for (const [callback, intervalMs] of setIntervalMock.mock.calls) {
      expect(intervalMs).toBe(60 * 60 * 1000);
      await callback();
    }
    expect(updateRegistration).toHaveBeenCalledTimes(1);
  });

  it('reloads the page when it becomes stale on focus', async () => {
    registerSW.mockImplementation(() => mock());

    registerAppServiceWorker();

    expect(windowAddEventListenerMock).toHaveBeenCalledWith('focus', expect.any(Function));
    const handleFocus = windowEventListeners.get('focus');
    expect(handleFocus).toBeDefined();

    Date.now = mock(() => 60 * 60 * 1000) as typeof Date.now;
    handleFocus?.(new Event('focus'));
    await flushMicrotasks();

    expect(deleteCacheMock).toHaveBeenCalledTimes(2);
    expect(deleteCacheMock).toHaveBeenCalledWith('open-meteo-cache');
    expect(deleteCacheMock).toHaveBeenCalledWith('nws-cache');
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('skips stale-page reload checks while the page is hidden', async () => {
    registerSW.mockImplementation(() => mock());

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    registerAppServiceWorker();

    expect(documentAddEventListenerMock).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    const handleVisibilityChange = documentEventListeners.get('visibilitychange');
    expect(handleVisibilityChange).toBeDefined();

    Date.now = mock(() => 2 * 60 * 60 * 1000) as typeof Date.now;
    handleVisibilityChange?.(new Event('visibilitychange'));
    await Promise.resolve();

    expect(deleteCacheMock).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
