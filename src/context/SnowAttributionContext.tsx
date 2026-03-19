import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { SnowAttributionMode } from '@/components/snowTimelinePeriods';

interface SnowAttributionContextValue {
  mode: SnowAttributionMode;
  setMode: (mode: SnowAttributionMode) => void;
}

const COOKIE_NAME = 'pow_snow_attribution';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

function readCookie(): SnowAttributionMode {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${COOKIE_NAME}=`);
    if (parts.length === 2) {
      const v = parts.pop()?.split(';').shift();
      if (v === 'calendar' || v === 'ski') return v;
    }
  } catch { /* ignore */ }
  return 'calendar';
}

function writeCookie(mode: SnowAttributionMode) {
  document.cookie = `${COOKIE_NAME}=${mode};max-age=${COOKIE_MAX_AGE};path=/;SameSite=Lax`;
}

const SnowAttributionContext = createContext<SnowAttributionContextValue>({
  mode: 'calendar',
  setMode: () => {},
});

export function SnowAttributionProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SnowAttributionMode>(readCookie);

  const setMode = useCallback((next: SnowAttributionMode) => {
    writeCookie(next);
    setModeState(next);
  }, []);

  return (
    <SnowAttributionContext.Provider value={{ mode, setMode }}>
      {children}
    </SnowAttributionContext.Provider>
  );
}

export function useSnowAttribution() {
  return useContext(SnowAttributionContext);
}
