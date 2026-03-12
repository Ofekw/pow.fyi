import { useState, useMemo, useEffect, useRef } from 'react';
import { Snowflake, Star } from 'lucide-react';
import { searchResorts, RESORTS, getResortBySlug } from '@/data/resorts';
import { useFavorites } from '@/hooks/useFavorites';
import { ResortCard } from '@/components/ResortCard';
import { FavoriteCard } from '@/components/FavoriteCard';
import { SearchDropdown } from '@/components/SearchDropdown';
import './HomePage.css';

const BABKA_SIZE = 200;
// Approximate relative eye positions within the babka image
const BABKA_EYE_LEFT_X = 0.37;
const BABKA_EYE_LEFT_Y = 0.21;
const BABKA_EYE_RIGHT_X = 0.62;
const BABKA_EYE_RIGHT_Y = 0.21;
const BABKA_DURATION = 5000;

export function HomePage() {
  const [query, setQuery] = useState('');
  const { favorites, toggle, isFav } = useFavorites();

  const isEasterEgg = query.toLowerCase() === 'ofek';
  const isMfjhEasterEgg = query.toLowerCase() === 'mfjh';
  const isBabkaEasterEgg = query.toLowerCase() === 'babka';
  const filtered = useMemo(() => searchResorts(query), [query]);

  // Handle Escape key to dismiss easter egg
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEasterEgg) {
        setQuery('');
      }
    };
    if (isEasterEgg) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isEasterEgg]);

  // MFJH easter egg: grow from 10vh to 100vh in 10% increments every 500ms,
  // then auto-dismiss after a 1s hold.
  const [mfjhSize, setMfjhSize] = useState(10);

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

  // Babka easter egg: bounce image around screen for 5s then auto-dismiss.
  const [babkaPos, setBabkaPos] = useState({ x: 100, y: 100 });
  const babkaPosRef = useRef({ x: 100, y: 100 });
  const babkaVelRef = useRef({ vx: 1.5, vy: 1.2 });
  const babkaStartRef = useRef(0);

  useEffect(() => {
    if (!isBabkaEasterEgg) return;

    const startX = Math.random() * Math.max(0, window.innerWidth - BABKA_SIZE);
    const startY = Math.random() * Math.max(0, window.innerHeight - BABKA_SIZE);
    babkaPosRef.current = { x: startX, y: startY };
    babkaVelRef.current = {
      vx: (Math.random() > 0.5 ? 1 : -1) * 1.5,
      vy: (Math.random() > 0.5 ? 1 : -1) * 1.2,
    };
    babkaStartRef.current = performance.now();
    setBabkaPos({ x: startX, y: startY });

    let rafId: number;
    function tick(now: number) {
      if (now - babkaStartRef.current >= BABKA_DURATION) {
        setQuery('');
        return;
      }

      let { x, y } = babkaPosRef.current;
      let { vx, vy } = babkaVelRef.current;

      x += vx;
      y += vy;

      const maxX = Math.max(0, window.innerWidth - BABKA_SIZE);
      const maxY = Math.max(0, window.innerHeight - BABKA_SIZE);

      if (x <= 0) { x = 0; vx = Math.abs(vx); }
      if (x >= maxX) { x = maxX; vx = -Math.abs(vx); }
      if (y <= 0) { y = 0; vy = Math.abs(vy); }
      if (y >= maxY) { y = maxY; vy = -Math.abs(vy); }

      babkaPosRef.current = { x, y };
      babkaVelRef.current = { vx, vy };
      setBabkaPos({ x, y });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isBabkaEasterEgg]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBabkaEasterEgg) setQuery('');
    };
    if (isBabkaEasterEgg) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isBabkaEasterEgg]);

  const babkaLeftEyeX = babkaPos.x + BABKA_EYE_LEFT_X * BABKA_SIZE;
  const babkaLeftEyeY = babkaPos.y + BABKA_EYE_LEFT_Y * BABKA_SIZE;
  const babkaRightEyeX = babkaPos.x + BABKA_EYE_RIGHT_X * BABKA_SIZE;
  const babkaRightEyeY = babkaPos.y + BABKA_EYE_RIGHT_Y * BABKA_SIZE;

  const favoriteResorts = useMemo(
    () =>
      favorites
        .map((f) => getResortBySlug(f.slug))
        .filter((r): r is NonNullable<typeof r> => r != null),
    [favorites],
  );

  // Group by region
  const grouped = useMemo(() => {
    const map = new Map<string, typeof RESORTS>();
    for (const r of filtered) {
      const list = map.get(r.region) ?? [];
      list.push(r);
      map.set(r.region, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

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

      {grouped.length === 0 && (
        <p className="home__empty">No resorts match "{query}"</p>
      )}

      {grouped.map(([region, resorts]) => (
        <section key={region} className="home__region">
          <h2 className="home__region-title">{region}</h2>
          <div className="home__grid">
            {resorts.map((r) => (
              <ResortCard
                key={r.slug}
                resort={r}
                isFavorite={isFav(r.slug)}
                onToggleFavorite={() => toggle(r.slug)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Easter Egg: Show spinning image when user searches for "Ofek" */}
      {isEasterEgg && (
        <div
          className="home__easter-egg"
          data-testid="easter-egg"
          role="dialog"
          aria-modal="true"
          aria-label="Easter egg overlay"
          onClick={() => setQuery('')}
          onKeyDown={(e) => e.key === 'Enter' && setQuery('')}
        >
          <img
            src="https://github.com/user-attachments/assets/1e0bab4c-6ead-4f02-9256-7e21fef78eb9"
            alt="Easter egg"
            className="home__easter-egg-image"
          />
        </div>
      )}

      {/* Easter Egg: Expanding image when user searches for "mfjh" */}
      {isMfjhEasterEgg && (
        <div
          className="home__easter-egg home__easter-egg--mfjh"
          data-testid="mfjh-easter-egg"
          role="dialog"
          aria-modal="true"
          aria-label="MFJH easter egg overlay"
          tabIndex={0}
          onClick={() => setQuery('')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setQuery('')}
        >
          <img
            src="https://github.com/user-attachments/assets/03aabe30-6386-4394-aaa2-f3f618bbeb5d"
            alt="MFJH easter egg"
            className="home__easter-egg-image--mfjh"
            style={{ height: `${mfjhSize}vh`, maxWidth: '100vw' }}
          />
        </div>
      )}

      {/* Easter Egg: Bouncing babka dog with laser eyes when user searches for "babka" */}
      {isBabkaEasterEgg && (
        <div
          className="home__easter-egg home__easter-egg--babka"
          data-testid="babka-easter-egg"
          role="dialog"
          aria-modal="true"
          aria-label="Babka easter egg overlay"
          tabIndex={0}
          onClick={() => setQuery('')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setQuery('')}
        >
          <svg
            className="home__babka-lasers"
            aria-hidden="true"
          >
            <defs>
              <filter id="babka-laser-glow" x="-50%" y="-200%" width="200%" height="500%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Left eye laser shoots left */}
            <line
              x1={babkaLeftEyeX}
              y1={babkaLeftEyeY}
              x2={0}
              y2={babkaLeftEyeY}
              stroke="#ff0000"
              strokeWidth="3"
              filter="url(#babka-laser-glow)"
              className="home__babka-laser"
            />
            {/* Right eye laser shoots right */}
            <line
              x1={babkaRightEyeX}
              y1={babkaRightEyeY}
              x2="100%"
              y2={babkaRightEyeY}
              stroke="#ff0000"
              strokeWidth="3"
              filter="url(#babka-laser-glow)"
              className="home__babka-laser"
            />
          </svg>
          <img
            src="https://github.com/user-attachments/assets/ff10b448-8e80-42f7-87a3-4354516bcf73"
            alt="Babka easter egg"
            className="home__babka-image"
            style={{ left: `${babkaPos.x}px`, top: `${babkaPos.y}px` }}
          />
        </div>
      )}
    </div>
  );
}
