import { useState, useMemo, useEffect, useRef, forwardRef } from 'react';
import { Snowflake, Star } from 'lucide-react';
import { getResortBySlug } from '@/data/resorts';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteCard } from '@/components/FavoriteCard';
import { SearchDropdown } from '@/components/SearchDropdown';
import { useSnowAttribution } from '@/context/SnowAttributionContext';
import type { SnowAttributionMode } from '@/components/snowTimelinePeriods';
import argoImage from '@/resources/images/argo.jpg';
import babkaImage from '@/resources/images/babka.png';
import mfjhImage from '@/resources/images/mfjh.webp';
import ofekImage from '@/resources/images/ofek.webp';
import './HomePage.css';

const SNOW_ATTRIBUTION_OPTIONS: Array<{ value: SnowAttributionMode; label: string }> = [
  { value: 'calendar', label: 'Calendar day' },
  { value: 'ski', label: 'Ski day' },
];

const BABKA_SIZE = 200;
const BABKA_EYE_LEFT_X = 0.33;
const BABKA_EYE_LEFT_Y = 0.17;
const BABKA_EYE_RIGHT_X = 0.55;
const BABKA_EYE_RIGHT_Y = 0.16;

interface BabkaOverlayProps {
  onDismiss: () => void;
}

const BabkaOverlay = forwardRef<HTMLDivElement, BabkaOverlayProps>(function BabkaOverlay({ onDismiss }, ref) {
  const imgRef = useRef<HTMLImageElement>(null);
  const leftLineRef = useRef<SVGLineElement>(null);
  const rightLineRef = useRef<SVGLineElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ vx: 1.5, vy: 1.2 });

  // Bounce animation via DOM refs — no React state updates on each frame to avoid full-page re-renders
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const startX = Math.random() * Math.max(0, window.innerWidth - BABKA_SIZE);
    const startY = Math.random() * Math.max(0, window.innerHeight - BABKA_SIZE);
    posRef.current = { x: startX, y: startY };
    velRef.current = {
      vx: (Math.random() > 0.5 ? 1 : -1) * 1.5,
      vy: (Math.random() > 0.5 ? 1 : -1) * 1.2,
    };

    function updateDOM(x: number, y: number) {
      if (imgRef.current) {
        imgRef.current.style.left = `${x}px`;
        imgRef.current.style.top = `${y}px`;
      }
      const leftEyeX = x + BABKA_EYE_LEFT_X * BABKA_SIZE;
      const leftEyeY = y + BABKA_EYE_LEFT_Y * BABKA_SIZE;
      const rightEyeX = x + BABKA_EYE_RIGHT_X * BABKA_SIZE;
      const rightEyeY = y + BABKA_EYE_RIGHT_Y * BABKA_SIZE;
      if (leftLineRef.current) {
        leftLineRef.current.setAttribute('x1', String(leftEyeX));
        leftLineRef.current.setAttribute('y1', String(leftEyeY));
        leftLineRef.current.setAttribute('x2', '0');
        leftLineRef.current.setAttribute('y2', String(leftEyeY + leftEyeX));
      }
      if (rightLineRef.current) {
        rightLineRef.current.setAttribute('x1', String(rightEyeX));
        rightLineRef.current.setAttribute('y1', String(rightEyeY));
        rightLineRef.current.setAttribute('x2', String(window.innerWidth));
        rightLineRef.current.setAttribute('y2', String(rightEyeY + (window.innerWidth - rightEyeX)));
      }
    }

    // Set initial DOM position immediately so there is no one-frame flash at (0, 0)
    updateDOM(startX, startY);

    let rafId: number;
    function tick() {
      let { x, y } = posRef.current;
      let { vx, vy } = velRef.current;

      x += vx;
      y += vy;

      const maxX = Math.max(0, window.innerWidth - BABKA_SIZE);
      const maxY = Math.max(0, window.innerHeight - BABKA_SIZE);

      if (x <= 0) { x = 0; vx = Math.abs(vx); }
      if (x >= maxX) { x = maxX; vx = -Math.abs(vx); }
      if (y <= 0) { y = 0; vy = Math.abs(vy); }
      if (y >= maxY) { y = maxY; vy = -Math.abs(vy); }

      posRef.current = { x, y };
      velRef.current = { vx, vy };
      updateDOM(x, y);

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      ref={ref}
      className="home__easter-egg home__easter-egg--babka"
      data-testid="babka-easter-egg"
      role="dialog"
      aria-modal="true"
      aria-label="Babka easter egg overlay"
      tabIndex={0}
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDismiss();
        }
      }}
    >
      <svg className="home__babka-lasers" aria-hidden="true">
        <defs>
          <filter id="babka-laser-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values="1 0 0 0 0.5  0 0 0 0 0  0 0 0 0 0  0 0 0 2 0"
              result="redBlur" />
            <feMerge>
              <feMergeNode in="redBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <line
          ref={leftLineRef}
          x1={0}
          y1={0}
          x2={0}
          y2={0}
          stroke="#ff1111"
          strokeWidth="5"
          filter="url(#babka-laser-glow)"
          className="home__babka-laser"
        />
        <line
          ref={rightLineRef}
          x1={0}
          y1={0}
          x2={0}
          y2={0}
          stroke="#ff1111"
          strokeWidth="5"
          filter="url(#babka-laser-glow)"
          className="home__babka-laser"
        />
      </svg>
      <img
        ref={imgRef}
        src={babkaImage}
        alt="Babka easter egg"
        className="home__babka-image"
        style={{ left: '0px', top: '0px' }}
      />
    </div>
  );
});

export function HomePage() {
  const [query, setQuery] = useState('');
  const { favorites, toggle, isFav } = useFavorites();
  const { mode: snowAttributionMode, setMode: setSnowAttributionMode } = useSnowAttribution();

  const normalizedQuery = query.toLowerCase();
  const isOfekEasterEgg = ['ofek', 'lil guy'].includes(normalizedQuery);
  const isArgoEasterEgg = ['argo', 'chad', 'chadwick'].includes(normalizedQuery);
  const isMfjhEasterEgg = ['mfjh', 'jacob', 'jake'].includes(normalizedQuery);
  const isBabkaEasterEgg = ['babka', 'delilah', 'dog', 'noodle'].includes(normalizedQuery);
  const isAnyEasterEgg = isOfekEasterEgg || isArgoEasterEgg || isMfjhEasterEgg || isBabkaEasterEgg;

  // Easter eggs are mutually exclusive — only one can be active at a time — so easterEggRef
  // is always attached to at most one dialog at a time.
  const easterEggRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to dismiss all easter eggs
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuery('');
    };
    if (isAnyEasterEgg) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isAnyEasterEgg]);

  // Move focus to the active easter egg dialog on mount so keyboard users can interact with it
  useEffect(() => {
    if (isAnyEasterEgg) {
      easterEggRef.current?.focus();
    }
  }, [isAnyEasterEgg]);

  // MFJH easter egg: grow from 10vh to 100vh in 10% increments every 500ms,
  // then auto-dismiss after a 1s hold.
  const [mfjhSize, setMfjhSize] = useState(10);
  const [isArgoShooting, setIsArgoShooting] = useState(false);

  // Argo easter egg: hold for 3s, then animate off-screen to the right in 0.5s,
  // then dismiss once the animation completes.
  useEffect(() => {
    if (!isArgoEasterEgg) {
      setIsArgoShooting(false);
      return;
    }

    setIsArgoShooting(false);
    const shootTimeout = setTimeout(() => {
      setIsArgoShooting(true);
    }, 3000);
    const dismissTimeout = setTimeout(() => {
      setQuery('');
    }, 3500);

    return () => {
      clearTimeout(shootTimeout);
      clearTimeout(dismissTimeout);
    };
  }, [isArgoEasterEgg]);

  useEffect(() => {
    if (!isMfjhEasterEgg) {
      setMfjhSize(10);
      return;
    }

    setMfjhSize(10);
    let step = 1;
    const interval = setInterval(() => {
      step++;
      const newSize = step * 10;
      setMfjhSize(newSize);
      if (newSize >= 100) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isMfjhEasterEgg]);

  useEffect(() => {
    if (!isMfjhEasterEgg || mfjhSize < 100) return;
    const timeout = setTimeout(() => {
      setQuery('');
    }, 1000);
    return () => clearTimeout(timeout);
  }, [isMfjhEasterEgg, mfjhSize]);

  const babkaDismiss = () => setQuery('');

  const favoriteResorts = useMemo(
    () =>
      favorites
        .map((f) => getResortBySlug(f.slug))
        .filter((r): r is NonNullable<typeof r> => r != null),
    [favorites],
  );

  return (
    <div className="home">
      <section className="home__hero">
        <h1 className="home__title">
          <span className="home__title-icon"><Snowflake size={36} /></span>
        </h1>
        <p className="home__subtitle">
          Free &amp; open-source ski resort forecasts for North America
        </p>
        <SearchDropdown query={query} onQueryChange={setQuery} isFav={isFav} onToggleFavorite={toggle} />
        <div className="home__attribution-control">
          <span className="home__attribution-label">Daily snow</span>
          <fieldset className="home__attribution-toggle">
            <legend className="home__sr-only">Daily snow attribution</legend>
            {SNOW_ATTRIBUTION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`home__attribution-btn ${snowAttributionMode === option.value ? 'active' : ''}`}
              >
                <input
                  className="home__attribution-input"
                  type="radio"
                  name="snow-attribution-home"
                  value={option.value}
                  checked={snowAttributionMode === option.value}
                  onChange={() => setSnowAttributionMode(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </section>

      {/* Favourites section — only visible when at least one resort is favourited */}
      {favoriteResorts.length > 0 && (
        <section className="home__region home__favorites">
          <h2 className="home__region-title"><Star size={16} fill="currentColor" className="home__fav-icon" /> Favorites</h2>
          <div className="home__grid">
            {favoriteResorts.map((r, i) => (
              <FavoriteCard
                key={r.slug}
                resort={r}
                onToggleFavorite={() => toggle(r.slug)}
                loadDelay={i * 200}
              />
            ))}
          </div>
        </section>
      )}

      {favoriteResorts.length === 0 && (
        <p className="home__empty">Use the search bar to find and favorite resorts</p>
      )}

      {/* Easter Egg: Show spinning image when user searches for "Ofek" */}
      {isOfekEasterEgg && (
        <div
          ref={easterEggRef}
          className="home__easter-egg"
          data-testid="easter-egg"
          role="dialog"
          aria-modal="true"
          aria-label="Easter egg overlay"
          tabIndex={0}
          onClick={() => setQuery('')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setQuery('');
            }
          }}
        >
          <img
            src={ofekImage}
            alt="Easter egg"
            className="home__easter-egg-image"
          />
        </div>
      )}

      {/* Easter Egg: Show image when user searches for "argo" */}
      {isArgoEasterEgg && (
        <div
          ref={easterEggRef}
          className="home__easter-egg"
          data-testid="argo-easter-egg"
          role="dialog"
          aria-modal="true"
          aria-label="Argo easter egg overlay"
          tabIndex={0}
          onClick={() => setQuery('')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setQuery('');
            }
          }}
        >
          <img
            src={argoImage}
            alt="Argo easter egg"
            className={`home__easter-egg-image home__easter-egg-image--argo${isArgoShooting ? ' home__easter-egg-image--argo-shoot' : ''}`}
            data-testid="argo-easter-egg-image"
          />
        </div>
      )}

      {/* Easter Egg: Expanding image when user searches for "mfjh" */}
      {isMfjhEasterEgg && (
        <div
          ref={easterEggRef}
          className="home__easter-egg home__easter-egg--mfjh"
          data-testid="mfjh-easter-egg"
          role="dialog"
          aria-modal="true"
          aria-label="MFJH easter egg overlay"
          tabIndex={0}
          onClick={() => setQuery('')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setQuery('');
            }
          }}
        >
          <img
            src={mfjhImage}
            alt="MFJH easter egg"
            className="home__easter-egg-image--mfjh"
            style={{ height: `${mfjhSize}vh`, maxWidth: '100vw' }}
          />
        </div>
      )}

      {/* Easter Egg: Bouncing babka dog with laser eyes when user searches for "babka" */}
      {isBabkaEasterEgg && <BabkaOverlay ref={easterEggRef} onDismiss={babkaDismiss} />}
    </div>
  );
}
