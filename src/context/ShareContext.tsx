import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ShareCardData } from '@/utils/shareCard';

interface ShareContextValue {
  cardData: ShareCardData | null;
  selectedDayIdx: number;
  setShareData: (data: ShareCardData | null, dayIdx?: number) => void;
}

const ShareContext = createContext<ShareContextValue>({
  cardData: null,
  selectedDayIdx: 0,
  setShareData: () => {},
});

export function ShareProvider({ children }: { children: ReactNode }) {
  const [cardData, setCardData] = useState<ShareCardData | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const setShareData = useCallback((data: ShareCardData | null, dayIdx = 0) => {
    setCardData(data);
    setSelectedDayIdx(dayIdx);
  }, []);

  return (
    <ShareContext.Provider value={{ cardData, selectedDayIdx, setShareData }}>
      {children}
    </ShareContext.Provider>
  );
}

export function useShare() {
  return useContext(ShareContext);
}
