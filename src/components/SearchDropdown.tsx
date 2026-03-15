import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mountain, Star, MapPin, Loader } from 'lucide-react';
import type { Resort } from '@/types';
import { searchResorts, getNearbyResorts } from '@/data/resorts';
import './SearchDropdown.css';

const MAX_RESULTS = 8;

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  isFav: (slug: string) => boolean;
  onToggleFavorite: (slug: string) => void;
}

export function SearchDropdown({ query, onQueryChange, isFav, onToggleFavorite }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [nearbyResorts, setNearbyResorts] = useState<Resort[] | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const trimmed = query.trim();
  const results: Resort[] = trimmed ? searchResorts(trimmed).slice(0, MAX_RESULTS) : [];
  const totalMatches = trimmed ? searchResorts(trimmed).length : 0;

  const showTypingPanel = open && trimmed.length > 0;
  const showNearbyPanel =
    open &&
    trimmed.length === 0 &&
    (geoLoading || (nearbyResorts !== null && nearbyResorts.length > 0));
  const showPanel = showTypingPanel || showNearbyPanel;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  const goToResort = useCallback(
    (slug: string) => {
      setOpen(false);
      onQueryChange('');
      navigate(`/resort/${slug}`);
    },
    [navigate, onQueryChange],
  );

  function handleLocationClick() {
    if (geoLoading) return;
    setOpen(true);
    inputRef.current?.focus();
    if (nearbyResorts !== null) return; // already have results
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearbyResorts(
          getNearbyResorts(pos.coords.latitude, pos.coords.longitude, MAX_RESULTS),
        );
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
      { timeout: 5000 },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showPanel) return;

    const activeResults = trimmed ? results : nearbyResorts ?? [];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i < activeResults.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : activeResults.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeResults[activeIndex]) {
      e.preventDefault();
      goToResort(activeResults[activeIndex].slug);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function renderItems(items: Resort[]) {
    return items.map((resort, i) => (
      <div
        key={resort.slug}
        id={`search-item-${i}`}
        className="search-dropdown__item"
        role="option"
        data-active={i === activeIndex}
        aria-selected={i === activeIndex}
        onClick={() => goToResort(resort.slug)}
      >
        <Mountain size={16} className="search-dropdown__item-icon" />
        <div className="search-dropdown__item-text">
          <span className="search-dropdown__item-name">{resort.name}</span>
          <span className="search-dropdown__item-region">
            {resort.region}, {resort.country}
          </span>
        </div>
        <button
          className={`search-dropdown__fav ${isFav(resort.slug) ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(resort.slug);
          }}
          aria-label={
            isFav(resort.slug)
              ? `Remove ${resort.name} from favorites`
              : `Add ${resort.name} to favorites`
          }
          title={isFav(resort.slug) ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={16} fill={isFav(resort.slug) ? 'currentColor' : 'none'} />
        </button>
      </div>
    ));
  }

  return (
    <div className="search-dropdown" ref={containerRef}>
      <Search size={18} className="search-dropdown__icon" />
      <input
        ref={inputRef}
        className="search-dropdown__input"
        type="search"
        placeholder="Search resorts…"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-label="Search resorts"
        aria-expanded={showPanel}
        aria-controls="search-dropdown-panel"
        aria-activedescendant={activeIndex >= 0 ? `search-item-${activeIndex}` : undefined}
        role="combobox"
        autoComplete="off"
      />

      <button
        className={`search-dropdown__location-btn ${nearbyResorts !== null ? 'active' : ''}`}
        onClick={handleLocationClick}
        aria-label="Show nearby resorts"
        title="Show nearby resorts"
        tabIndex={0}
      >
        {geoLoading ? (
          <Loader size={16} className="search-dropdown__loading-icon" />
        ) : (
          <MapPin size={16} fill={nearbyResorts !== null ? 'currentColor' : 'none'} />
        )}
      </button>

      {showPanel && (
        <div className="search-dropdown__panel" id="search-dropdown-panel" role="listbox">
          {showNearbyPanel ? (
            geoLoading ? (
              <div className="search-dropdown__nearby-loading">
                <Loader size={14} className="search-dropdown__loading-icon" />
                Finding nearby resorts…
              </div>
            ) : (
              <>
                <div className="search-dropdown__section-header">
                  <MapPin size={13} />
                  Nearby resorts
                </div>
                {renderItems(nearbyResorts!)}
              </>
            )
          ) : results.length === 0 ? (
            <div className="search-dropdown__empty">No resorts match &ldquo;{trimmed}&rdquo;</div>
          ) : (
            <>
              {renderItems(results)}
              {totalMatches > MAX_RESULTS && (
                <div className="search-dropdown__hint">
                  {totalMatches - MAX_RESULTS} more result
                  {totalMatches - MAX_RESULTS > 1 ? 's' : ''} below
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
