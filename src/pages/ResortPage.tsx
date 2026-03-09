import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Snowflake, BarChart3, Clock, Sun, Thermometer,
  TrendingUp, AlertTriangle, RefreshCw, Star, Layers,
} from 'lucide-react';
import { WeatherIcon } from '@/components/icons';
import { getResortBySlug } from '@/data/resorts';
import { useForecast } from '@/hooks/useWeather';
import { fetchForecast } from '@/data/openmeteo';
import { useFavorites } from '@/hooks/useFavorites';
import { ElevationToggle } from '@/components/ElevationToggle';
import { SnowTimeline } from '@/components/SnowTimeline';
import { ConditionsSummary } from '@/components/ConditionsSummary';
import { ShareButton } from '@/components/ShareButton';
import { DailyForecastChart } from '@/components/charts/DailyForecastChart';
import { HourlyDetailChart } from '@/components/charts/HourlyDetailChart';
import { HourlySnowChart } from '@/components/charts/HourlySnowChart';
import { RecentSnowChart } from '@/components/charts/RecentSnowChart';
import { FreezingLevelChart } from '@/components/charts/FreezingLevelChart';
import { UVIndexChart } from '@/components/charts/UVIndexChart';
import { weatherDescription, fmtTemp, fmtElevation, fmtSnow, cmToIn } from '@/utils/weather';
import { todayIsoInTimezone } from '@/utils/dateKey';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import type { ElevationBand, BandForecast, DailyMetrics } from '@/types';
import type { ShareCardData } from '@/utils/shareCard';
import './ResortPage.css';

export function ResortPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const resort = useMemo(() => getResortBySlug(slug ?? ''), [slug]);
  const { forecast, loading, error, refetch } = useForecast(resort);
  const { toggle: toggleFav, isFav } = useFavorites();
  const { temp, elev, snow } = useUnits();
  const { tz, fmtDate } = useTimezone();

  // Initialise elevation band and selected day from URL query params (deep-link support)
  const initialBand = useMemo(() => {
    const b = searchParams.get('band');
    return b === 'base' || b === 'mid' || b === 'top' ? b : 'mid';
  }, [searchParams]);
  const initialDay = useMemo(() => {
    const d = Number(searchParams.get('day'));
    return Number.isFinite(d) && d >= 0 ? d : 0;
  }, [searchParams]);

  const [band, setBand] = useState<ElevationBand>(initialBand);
  const [selectedDayIdx, setSelectedDayIdx] = useState(initialDay);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const prevFetchedAtRef = useRef<string | undefined>(undefined);

  // Track when forecast data arrives (keyed on fetchedAt to avoid re-runs)
  useEffect(() => {
    const fetchedAt = forecast?.fetchedAt;
    if (fetchedAt && fetchedAt !== prevFetchedAtRef.current) {
      prevFetchedAtRef.current = fetchedAt;
      setLastRefreshed(new Date());
    }
  }, [forecast?.fetchedAt]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Recent 14-day snowfall via forecast endpoint's past_days (no archive lag)
  const [recentDays, setRecentDays] = useState<DailyMetrics[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (!resort) return;
    let cancelled = false;
    setHistLoading(true);
    // Always fetch recent days at mid elevation — this avoids unnecessary
    // refetches when the user toggles the elevation band picker.  The recent
    // snowfall history is a rough reference, so mid-elevation is an acceptable
    // approximation regardless of the selected band.
    fetchForecast(resort.lat, resort.lon, resort.elevation.mid, 'mid', 1, 14, tz)
      .then((result) => {
        if (!cancelled) {
          const today = todayIsoInTimezone(tz);
          setRecentDays(result.daily.filter((d) => d.date < today));
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setHistLoading(false); });
    return () => { cancelled = true; };
  }, [resort, tz]);

  // Reset selected day when forecast data is refetched (not on band change).
  // On first load, clamp the deep-linked day index to the valid range.
  const hasAppliedInitialDay = useRef(false);
  useEffect(() => {
    if (!hasAppliedInitialDay.current) {
      hasAppliedInitialDay.current = true;
      // Clamp the initial day to the actual number of forecast days
      const maxIdx = (forecast?.[band]?.daily.length ?? 1) - 1;
      if (initialDay > maxIdx) setSelectedDayIdx(Math.max(0, maxIdx));
    } else {
      setSelectedDayIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on new forecast data
  }, [forecast?.fetchedAt]);

  const bandData: BandForecast | undefined = forecast?.[band];

  // Compute hourly data for selected day
  const selectedDay = bandData?.daily[selectedDayIdx];
  const selectedDayHourly = useMemo(() => {
    if (!bandData || !selectedDay) return [];
    return bandData.hourly.filter((h) => h.time.startsWith(selectedDay.date));
  }, [bandData, selectedDay]);

  // Compute snowpack depth — max snow_depth across ALL bands for today.
  // snow_depth is a grid-cell value so we take the max across bands to match
  // the Conditions table (which also uses all bands).
  const snowpackDepthCm = useMemo(() => {
    if (!forecast) return null;
    const allBands = [forecast.base, forecast.mid, forecast.top].filter(
      (b): b is BandForecast => b != null,
    );
    const first = allBands[0];
    const todayDate = first?.daily[0]?.date;
    if (!todayDate) return null;
    const depths = allBands
      .flatMap((b) => b.hourly.filter((h) => h.time.startsWith(todayDate)))
      .filter((h) => h.snowDepth != null && h.snowDepth > 0)
      .map((h) => h.snowDepth!);
    if (!depths.length) return null;
    return Math.max(...depths) * 100; // m → cm
  }, [forecast]);

  if (!resort) {
    return (
      <div className="resort-page__empty">
        <h2>Resort not found</h2>
        <Link to="/">← Back to all resorts</Link>
      </div>
    );
  }

  const selectedDayLabel = selectedDay
    ? fmtDate(selectedDay.date + 'T12:00:00', { weekday: 'long', month: 'short', day: 'numeric' })
    : '';

  // Compute 7-day total snowfall
  const weekTotalSnow = bandData
    ? bandData.daily.reduce((s, d) => s + d.snowfallSum, 0)
    : 0;

  // Build share card data for the ShareButton
  const shareCardData: ShareCardData | null = bandData
    ? {
        resort,
        daily: bandData.daily,
        band,
        elevation: bandData.elevation,
        weekTotalSnow,
        snowUnit: snow,
        tempUnit: temp,
        elevUnit: elev,
      }
    : null;

  return (
    <div className="resort-page">
      {/* Header */}
      <header className="resort-page__header">
        <div className="resort-page__header-left">
          <Link to="/" className="resort-page__back">← All Resorts</Link>
          <div className="resort-page__title-row">
            <h1 className="resort-page__name">{resort.name}</h1>
            <button
              className={`resort-page__fav ${isFav(resort.slug) ? 'active' : ''}`}
              onClick={() => toggleFav(resort.slug)}
              aria-label={isFav(resort.slug) ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={24} fill={isFav(resort.slug) ? 'currentColor' : 'none'} />
            </button>
          </div>
          <p className="resort-page__region">
            {resort.region}, {resort.country}
            {resort.website && (
              <>
                {' · '}
                <a href={resort.website} target="_blank" rel="noopener noreferrer">
                  Website ↗
                </a>
              </>
            )}
          </p>
        </div>
        <div className="resort-page__header-right">
          <div className="resort-page__header-actions">
            <ShareButton cardData={shareCardData} selectedDayIdx={selectedDayIdx} />
            <button className="resort-page__refresh" onClick={handleRefresh} disabled={loading}>
              {loading ? 'Loading…' : <><RefreshCw size={14} /> Refresh</>}
            </button>
          </div>
          {lastRefreshed && (
            <span className="resort-page__last-refreshed">
              {fmtDate(lastRefreshed.toISOString(), { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </header>

      {/* Quick stats */}
      <section className="resort-page__stats animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="stat">
          <span className="stat__label">Base</span>
          <span className="stat__value">{fmtElevation(resort.elevation.base, elev)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Mid</span>
          <span className="stat__value">{fmtElevation(resort.elevation.mid, elev)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Top</span>
          <span className="stat__value">{fmtElevation(resort.elevation.top, elev)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Vertical</span>
          <span className="stat__value">{fmtElevation(resort.verticalDrop, elev)}</span>
        </div>
        {resort.lifts && (
          <div className="stat">
            <span className="stat__label">Lifts</span>
            <span className="stat__value">{resort.lifts}</span>
          </div>
        )}
        {resort.acres && (
          <div className="stat">
            <span className="stat__label">Acres</span>
            <span className="stat__value">{resort.acres.toLocaleString()}</span>
          </div>
        )}
        {snowpackDepthCm != null && snowpackDepthCm > 0 && (
          <div className="stat stat--snowpack">
            <span className="stat__label"><Layers size={12} /> Total Snow</span>
            <span className="stat__value">
              {snow === 'in'
                ? `${Math.round(cmToIn(snowpackDepthCm))}"`
                : `${Math.round(snowpackDepthCm)}cm`}
            </span>
          </div>
        )}
      </section>

      {/* ─── SNOW TIMELINE (hero position) ─── */}
      {bandData && recentDays.length > 0 && (
        <section className="resort-page__section animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h2 className="section-title"><Snowflake size={18} className="section-title__icon" /> Snow Timeline</h2>
          <SnowTimeline
            recentDays={recentDays}
            forecastDays={bandData.daily}
            forecastHourly={bandData.hourly}
          />
        </section>
      )}

      {/* Band toggle */}
      <div className="resort-page__toggle-row">
        <ElevationToggle
          value={band}
          onChange={setBand}
          elevations={resort.elevation}
        />
      </div>

      {bandData && (
        <div className="daily-cards stagger-children">
          {bandData.daily.map((d, i) => {
            const desc = weatherDescription(d.weatherCode);
            const isSelected = i === selectedDayIdx;
            return (
              <button
                key={d.date}
                className={`day-card ${isSelected ? 'day-card--selected' : ''}`}
                onClick={() => setSelectedDayIdx(i)}
                aria-pressed={isSelected}
              >
                <span className="day-card__date">
                  {fmtDate(d.date + 'T12:00:00', { weekday: 'short' })}
                </span>
                <span className="day-card__icon" title={desc.label}>
                  <WeatherIcon name={desc.icon} size={24} />
                </span>
                <span className="day-card__temps">
                  {fmtTemp(d.temperatureMax, temp)} / {fmtTemp(d.temperatureMin, temp)}
                </span>
                <span className="day-card__snow">
                  {d.snowfallSum > 0 ? <><Snowflake size={12} /> {fmtSnow(d.snowfallSum, snow)}</> : '—'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="resort-page__error"><AlertTriangle size={14} /> {error}</p>}

      {loading && !forecast && (
        <div className="resort-page__loader-skeleton">
          <div className="skeleton skeleton--chart" />
          <div className="skeleton skeleton--text" style={{ width: '40%', marginTop: 'var(--space-md)' }} />
          <div className="skeleton skeleton--text" style={{ width: '70%', marginTop: 'var(--space-sm)' }} />
          <div className="skeleton skeleton--text" style={{ width: '55%', marginTop: 'var(--space-sm)' }} />
        </div>
      )}

      {bandData && forecast && (
        <>
          {/* ─── CONDITIONS AT A GLANCE ─── */}
          <section className="resort-page__section animate-fade-in-up">
            <div className="resort-page__section-header">
              <h2 className="section-title">
                <BarChart3 size={18} className="section-title__icon" /> Conditions — {selectedDayLabel}
              </h2>
              <span className="resort-page__section-badge">All Elevations</span>
            </div>
            <ConditionsSummary
              bands={{
                base: forecast.base,
                mid: forecast.mid,
                top: forecast.top,
              }}
              selectedDayIdx={selectedDayIdx}
              elevations={resort.elevation}
            />
          </section>

          {/* ─── SNOWFALL SECTION ─── */}
          <section className="resort-page__snow-section animate-fade-in-up">
            <div className="resort-page__snow-section-header">
              <h2 className="section-title">
                <Snowflake size={18} className="section-title__icon" /> 7-Day Snow — {band.toUpperCase()} ({fmtElevation(bandData.elevation, elev)})
              </h2>
              {weekTotalSnow > 0 && (
                <span className="resort-page__week-total">
                  {fmtSnow(weekTotalSnow, snow)} next 7 days
                </span>
              )}
            </div>

            {/* 7-day overview chart */}
            <div className="resort-page__chart-block">
              <h3 className="section-subtitle">7-Day Overview</h3>
              <DailyForecastChart daily={bandData.daily} hourly={bandData.hourly} />
            </div>

            {/* Hourly snow breakdown for selected day */}
            {selectedDayHourly.length > 0 && selectedDay && (
              <HourlySnowChart
                hourly={selectedDayHourly}
                dayLabel={selectedDayLabel}
                snowfallSum={selectedDay.snowfallSum}
              />
            )}
          </section>

          {/* ─── DETAILED CONDITIONS ─── */}
          <section className="resort-page__section animate-fade-in-up">
            <h2 className="section-title"><Clock size={18} className="section-title__icon" /> Hourly Detail — {selectedDayLabel}</h2>
            <HourlyDetailChart hourly={selectedDayHourly.length > 0 ? selectedDayHourly : bandData.hourly.slice(0, 24)} />
          </section>

          {/* ─── UV + FREEZING LEVEL GRID ─── */}
          <div className="resort-page__conditions-grid animate-fade-in-up">
            <section className="resort-page__section resort-page__section--half">
              <h3 className="section-subtitle"><Sun size={16} className="section-title__icon" /> UV Index</h3>
              <UVIndexChart daily={bandData.daily} />
            </section>

            <section className="resort-page__section resort-page__section--half">
              <h3 className="section-subtitle"><Thermometer size={16} className="section-title__icon" /> Freezing Level</h3>
              <FreezingLevelChart hourly={selectedDayHourly.length > 0 ? selectedDayHourly : bandData.hourly.slice(0, 24)} resortElevation={resort.elevation[band]} />
            </section>
          </div>
        </>
      )}

      {/* ─── RECENT SNOWFALL ─── */}
      <section className="resort-page__section">
        <h2 className="section-title"><TrendingUp size={18} className="section-title__icon" /> Recent Snowfall (past 14 days)</h2>
        {histLoading ? (
          <div className="resort-page__loader">Loading history…</div>
        ) : recentDays.length > 0 ? (
          <RecentSnowChart days={recentDays} />
        ) : (
          <p className="resort-page__muted">No recent data available.</p>
        )}
      </section>
    </div>
  );
}
