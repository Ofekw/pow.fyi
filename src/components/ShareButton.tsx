/**
 * ShareButton — Generates a share card screenshot and shares via
 * the Web Share API or copies to clipboard as fallback.
 */
import { useState, useCallback } from 'react';
import { Share2, Check, Copy, X } from 'lucide-react';
import { renderShareCard, shareCardToBlob } from '@/utils/shareCard';
import type { ShareCardData } from '@/utils/shareCard';

interface Props {
  cardData: ShareCardData | null;
}

type ShareState = 'idle' | 'generating' | 'copied' | 'shared' | 'error';

export function ShareButton({ cardData }: Props) {
  const [state, setState] = useState<ShareState>('idle');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  const handleShare = useCallback(async () => {
    if (!cardData) return;

    setState('generating');

    try {
      const canvas = renderShareCard(cardData);
      const blob = await shareCardToBlob(canvas);
      const shareUrl = `${window.location.origin}/resort/${cardData.resort.slug}`;
      const shareText = `${cardData.resort.name} snow forecast — pow.fyi`;

      // Try Web Share API with file support
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${cardData.resort.slug}-forecast.png`, {
          type: 'image/png',
        });
        const shareData = { title: shareText, text: shareText, url: shareUrl, files: [file] };

        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            setState('shared');
            showToast('Shared successfully!');
            return;
          } catch (err) {
            // User cancelled or share failed — fall through to clipboard
            if (err instanceof Error && err.name === 'AbortError') {
              setState('idle');
              return;
            }
          }
        }
      }

      // Fallback: copy image to clipboard + show URL
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setState('copied');
        showToast('Screenshot copied to clipboard!');
      } catch {
        // Final fallback: copy URL to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setState('copied');
        showToast('Link copied to clipboard!');
      }
    } catch {
      setState('error');
      showToast('Failed to generate share image');
    }

    // Reset state after a delay
    setTimeout(() => setState('idle'), 2000);
  }, [cardData, showToast]);

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
