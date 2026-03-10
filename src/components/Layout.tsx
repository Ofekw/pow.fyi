import { useState, useRef, useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Globe, ChevronUp, Info } from 'lucide-react';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone, TZ_OPTIONS, getUtcOffset } from '@/context/TimezoneContext';
import { useShare } from '@/context/ShareContext';
import { ShareButton } from '@/components/ShareButton';
// import { useSnowAlerts } from '@/hooks/useSnowAlerts';
import './Layout.css';

export function Layout() {
  const { units, toggle, temp, elev } = useUnits();
  const { tzRaw, tzLabel, setTz } = useTimezone();
  const { cardData, selectedDayIdx } = useShare();
  // const { statusTitle, toggleAlerts, isSupported, enabled, permission } = useSnowAlerts();
  const [tzOpen, setTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const tzRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Show scroll-to-top button when scrolled past 400px
  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 400);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Compute UTC offsets once (they only change with DST, fine to recompute on render)
  const tzWithOffsets = useMemo(
    () =>
      TZ_OPTIONS.map((o) => ({
        ...o,
        offset: o.value ? `UTC${getUtcOffset(o.value)}` : '',
      })),
    [],
  );

  const filteredTz = useMemo(() => {
    if (!tzSearch.trim()) return tzWithOffsets;
    const q = tzSearch.toLowerCase();
    return tzWithOffsets.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        o.offset.toLowerCase().includes(q),
    );
  }, [tzSearch, tzWithOffsets]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!tzOpen && !infoOpen) return;
    function handleClick(e: MouseEvent) {
      if (tzOpen && tzRef.current && !tzRef.current.contains(e.target as Node)) {
        setTzOpen(false);
      }
      if (infoOpen && infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setInfoOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [tzOpen, infoOpen]);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (tzOpen) {
      setTzSearch('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [tzOpen]);

  return (
    <div className="layout">
      <div className="fab-group">
        <button
          className="fab"
          onClick={toggle}
          aria-label={`Switch to ${units === 'imperial' ? 'metric' : 'imperial'} units`}
          title={`Switch to ${units === 'imperial' ? 'metric' : 'imperial'} units`}
        >
          °{temp} / {elev}
        </button>

        {/* Alert bell hidden until a better alerts solution is implemented */}

        <div className="tz-picker" ref={tzRef}>
          <button
            className="fab"
            onClick={() => setTzOpen((p) => !p)}
            aria-label="Change timezone"
            title="Change timezone"
          >
            <Globe size={14} /> {tzLabel}
          </button>
          {tzOpen && (
            <div className="tz-picker__dropdown">
              <div className="tz-picker__search-wrap">
                <input
                  ref={searchRef}
                  className="tz-picker__search"
                  type="text"
                  placeholder="Search timezone…"
                  value={tzSearch}
                  onChange={(e) => setTzSearch(e.target.value)}
                />
              </div>
              <ul className="tz-picker__list">
                {filteredTz.map((o) => (
                  <li key={o.value}>
                    <button
                      className={`tz-picker__option ${tzRaw === o.value ? 'active' : ''}`}
                      onClick={() => { setTz(o.value); setTzOpen(false); }}
                    >
                      <span>{o.label}</span>
                      {o.offset && <span className="tz-picker__offset">{o.offset}</span>}
                    </button>
                  </li>
                ))}
                {filteredTz.length === 0 && (
                  <li className="tz-picker__empty">No matches</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {cardData && (
          <ShareButton
            cardData={cardData}
            selectedDayIdx={selectedDayIdx}
            className="fab fab--icon"
            iconOnly
          />
        )}

        <div className="info-popover" ref={infoRef}>
          <button
            className="fab fab--icon"
            onClick={() => setInfoOpen((p) => !p)}
            aria-label="How snowfall is calculated"
            title="How snowfall is calculated"
          >
            <Info size={14} />
          </button>
          {infoOpen && (
            <div className="info-popover__panel">
              <h3 className="info-popover__title">How Snowfall is Calculated</h3>
              <p className="info-popover__intro">
                Pow.fyi doesn&apos;t just show raw API numbers — it runs a multi-step accuracy
                pipeline to produce snowfall estimates competitive with paid services:
              </p>

              <h4>Multi-model averaging</h4>
              <p>
                Each forecast fetches 3 weather models in parallel from Open-Meteo and averages
                their output. US resorts use GFS + ECMWF + HRRR (3 km high-res). Canadian resorts
                use GFS + ECMWF + GEM. Precipitation uses the median (resistant to outlier spikes);
                temperature and wind use the mean. This alone reduces forecast error by ~15-30% vs
                any single model.
              </p>

              <h4>Temperature-dependent snow-liquid ratio (SLR)</h4>
              <p>
                Open-Meteo&apos;s built-in snowfall uses a fixed ~7:1 ratio, which drastically
                underestimates snow in cold mountain conditions. Pow.fyi recalculates snowfall from
                total precipitation using a variable SLR (10:1 at 0°C up to 20:1 below −15°C),
                adjusted by:
              </p>
              <ul>
                <li>
                  <strong>Humidity:</strong> High moisture (≥80% RH) boosts SLR by 10-15% (larger
                  dendritic crystals → fluffier snow)
                </li>
                <li>
                  <strong>Wind speed:</strong> Strong wind (≥30 km/h) reduces SLR by 10-20%
                  (mechanical compaction + sublimation)
                </li>
              </ul>

              <h4>Freezing level rain/snow split</h4>
              <p>
                The API&apos;s rain/snow split is computed at grid-cell elevation, not your ski
                resort&apos;s actual elevation. Pow.fyi re-splits precipitation using the
                station&apos;s elevation vs the freezing level height, eliminating phantom rain at
                sub-freezing temperatures.
              </p>

              <h4>NWS cross-reference (US only)</h4>
              <p>
                For US resorts, NWS Weather.gov forecaster-adjusted snowfall amounts are fetched and
                blended with the model average (30% NWS / 70% model). NWS forecasters manually tune
                QPF and snow ratios for local terrain — this adds human expertise to the pipeline.
              </p>
            </div>
          )}
        </div>
      </div>

      <main className="main container">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <p>
            Weather data by{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>
            {' '}(CC BY 4.0) — models:{' '}
            <a href="https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast" target="_blank" rel="noopener noreferrer">GFS</a>,{' '}
            <a href="https://www.ecmwf.int/en/forecasts/datasets/open-data" target="_blank" rel="noopener noreferrer">ECMWF</a>,{' '}
            <a href="https://rapidrefresh.noaa.gov/hrrr/" target="_blank" rel="noopener noreferrer">HRRR</a>,{' '}
            <a href="https://weather.gc.ca/grib/grib2_glb_25km_e.html" target="_blank" rel="noopener noreferrer">GEM</a>.
            {' '}US snowfall cross-referenced with{' '}
            <a href="https://www.weather.gov/documentation/services-web-api" target="_blank" rel="noopener noreferrer">NWS Weather.gov</a>.
          </p>
          <p>
            Pow.fyi is{' '}
            <a href="https://github.com/Ofekw/pow.fyi" target="_blank" rel="noopener noreferrer">open-source</a>
            {' '}&amp; non-commercial.
          </p>
          <a
            className="footer__feedback"
            href="https://github.com/Ofekw/pow.fyi/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Submit Feedback
          </a>
        </div>
      </footer>

      {/* Scroll to top */}
      <button
        className={`scroll-top ${showScrollTop ? 'scroll-top--visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        title="Scroll to top"
      >
        <ChevronUp size={20} />
      </button>
    </div>
  );
}
