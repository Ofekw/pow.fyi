/**
 * ShareButton — Generates a share card screenshot and shares via
 * the Web Share API or copies to clipboard as fallback.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Share2, Check, Copy, X } from 'lucide-react';
import { renderShareCard, shareCardToBlob } from '@/utils/shareCard';
import type { ShareCardData } from '@/utils/shareCard';

interface Props {
  cardData: ShareCardData | null;
  /** Index of the selected forecast day, encoded in the share URL */
  selectedDayIdx?: number;
}

type ShareState = 'idle' | 'generating' | 'copied' | 'shared' | 'error';

export function ShareButton({ cardData, selectedDayIdx }: Props) {
  const [state, setState] = useState<ShareState>('idle');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(toastTimerRef.current);
      clearTimeout(resetTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string, duration = 3000) => {
    clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const scheduleReset = useCallback(() => {
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setState('idle'), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    if (!cardData) return;

    clearTimeout(resetTimerRef.current);
    setState('generating');

    const params = new URLSearchParams();
    if (cardData.band !== 'mid') params.set('band', cardData.band);
    if (selectedDayIdx != null && selectedDayIdx > 0) params.set('day', String(selectedDayIdx));
    const qs = params.toString();
    const shareUrl = `${window.location.origin}/resort/${cardData.resort.slug}${qs ? `?${qs}` : ''}`;

    try {
      const canvas = renderShareCard(cardData);
      const blob = await shareCardToBlob(canvas);
      const shareText = `${cardData.resort.name} snow forecast — pow.fyi`;

      // Try Web Share API — prefer file share, fall back to URL-only share
      if (navigator.share) {
        const file = new File([blob], `${cardData.resort.slug}-forecast.png`, {
          type: 'image/png',
        });
        const fileShareData = { title: shareText, text: shareText, url: shareUrl, files: [file] };
        const urlShareData = { title: shareText, text: shareText, url: shareUrl };

        const canShareFiles = navigator.canShare?.(fileShareData) ?? false;
        const shareData = canShareFiles ? fileShareData : urlShareData;

        try {
          await navigator.share(shareData);
          setState('shared');
          showToast('Shared successfully!');
          scheduleReset();
          return;
        } catch (err) {
          // User cancelled — reset and stop
          if (err instanceof Error && err.name === 'AbortError') {
            setState('idle');
            return;
          }
          // Other share error — fall through to clipboard
        }
      }

      // Fallback: copy image to clipboard + show URL
      if (typeof navigator !== 'undefined' && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setState('copied');
          showToast('Screenshot copied to clipboard!');
        } catch {
          // Final fallback: copy URL to clipboard if available
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareUrl);
            setState('copied');
            showToast('Link copied to clipboard!');
          } else {
            // No clipboard access; show URL so user can copy manually
            setState('copied');
            showToast(`Share link: ${shareUrl}`);
          }
        }
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        // No image clipboard support, but can still copy URL
        await navigator.clipboard.writeText(shareUrl);
        setState('copied');
        showToast('Link copied to clipboard!');
      } else {
        // No clipboard API available; show URL so user can copy manually
        setState('copied');
        showToast(`Share link: ${shareUrl}`);
      }
    } catch {
      // Image generation failed — still try to share the URL
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          setState('copied');
          showToast('Link copied to clipboard!');
        } else {
          // No clipboard API available; show URL so user can copy manually
          setState('copied');
          showToast(`Share link: ${shareUrl}`);
        }
      } catch {
        setState('error');
        showToast('Failed to share forecast');
      }
    }

    scheduleReset();
  }, [cardData, selectedDayIdx, showToast, scheduleReset]);

  const icon = state === 'copied' || state === 'shared'
    ? <Check size={14} />
    : state === 'error'
      ? <X size={14} />
      : state === 'generating'
        ? <Copy size={14} />
        : <Share2 size={14} />;

  const label = state === 'copied'
    ? 'Copied!'
    : state === 'shared'
      ? 'Shared!'
      : state === 'generating'
        ? 'Generating…'
        : 'Share';

  return (
    <>
      <button
        className={`resort-page__share ${state !== 'idle' && state !== 'generating' ? 'resort-page__share--' + state : ''}`}
        onClick={handleShare}
        disabled={!cardData || state === 'generating'}
        aria-label="Share forecast"
        title="Share forecast screenshot"
      >
        {icon} {label}
      </button>
      {toast && (
        <div className="share-toast animate-fade-in" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
