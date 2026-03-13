/**
 * ConditionsSummary — 3-elevation comparison table for selected day.
 *
 * Inspired by snow-forecast.com's multi-elevation condition table.
 * Shows key conditions (temp, snow, rain, wind, freezing level) across
 * all three elevation bands for an at-a-glance comparison.
 */
import type { BandForecast, DailyMetrics, HourlyMetrics } from '@/types';
import { Snowflake, CloudRain, Wind, Droplets, Thermometer, Layers } from 'lucide-react';
import { WeatherIcon } from '@/components/icons';
import { useUnits } from '@/context/UnitsContext';
import { weatherDescription, fmtTemp, fmtElevation, fmtSnow, cmToIn } from '@/utils/weather';
import {
  getAttributedSnowfallTotal,
  type SnowAttributionMode,
} from '@/components/snowTimelinePeriods';
import './ConditionsSummary.css';

interface Props {
  /** All three band forecasts */
  bands: {
    base: BandForecast;
    mid: BandForecast;
    top: BandForecast;
  };
  /** Index of the selected day within the daily array */
  selectedDayIdx: number;
  /** Elevations in meters */
  elevations: { base: number; mid: number; top: number };
  attributionMode?: SnowAttributionMode;
}

interface BandRow {
  label: string;
  elevation: number;
  daily: DailyMetrics | undefined;
  hourly: HourlyMetrics[];
  displayedSnowfall: number;
}

export function ConditionsSummary({
  bands,
  selectedDayIdx,
  elevations,
  attributionMode = 'calendar',
}: Props) {
  const { temp, elev, snow } = useUnits();
  const isImperial = snow === 'in';

  const bandRows: BandRow[] = (['base', 'mid', 'top'] as const).map((key) => {
    const bandData = bands[key];
    const daily = bandData.daily[selectedDayIdx];
    const dayDate = daily?.date;
    const hourly = dayDate
      ? bandData.hourly.filter((h) => h.time.startsWith(dayDate))
      : [];
    return {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      elevation: elevations[key],
      daily,
      hourly,
      displayedSnowfall: daily
        ? getAttributedSnowfallTotal(daily.date, daily.snowfallSum, bandData.hourly, attributionMode)
        : 0,
    };
  });

  // Compute average freezing level from mid-level hourly (most representative)
  const midHourly = bandRows.find((r) => r.label === 'Mid')?.hourly ?? [];
  const avgFreezing = midHourly.length > 0
    ? midHourly.reduce((s, h) => s + h.freezingLevelHeight, 0) / midHourly.length
    : null;

  const fmtWindSpeed = (kmh: number) => {
    if (isImperial) return `${Math.round(kmh * 0.621371)}mph`;
    return `${Math.round(kmh)}km/h`;
  };

  const fmtPrecip = (mm: number) => {
    if (isImperial) return `${(mm / 25.4).toFixed(1)}"`;
    return `${mm.toFixed(1)}mm`;
  };

  return (
    <div className="conditions-summary" role="table" aria-label="Conditions by elevation">
      <div className="conditions-summary__table">
        {/* Header row */}
        <div className="conditions-summary__row conditions-summary__row--header" role="row">
          <div className="conditions-summary__cell conditions-summary__cell--label" role="columnheader">
            Elevation
          </div>
          {bandRows.map((row) => (
            <div key={row.label} className="conditions-summary__cell conditions-summary__cell--band" role="columnheader">
              <span className="conditions-summary__band-name">{row.label}</span>
              <span className="conditions-summary__band-elev">{fmtElevation(row.elevation, elev)}</span>
            </div>
          ))}
        </div>

        {/* Weather row */}
        <div className="conditions-summary__row" role="row">
          <div className="conditions-summary__cell conditions-summary__cell--label" role="rowheader">
            Weather
          </div>
          {bandRows.map((row) => {
            const desc = row.daily ? weatherDescription(row.daily.weatherCode) : null;
            return (
              <div key={row.label} className="conditions-summary__cell" role="cell">
                {desc ? (
                  <span className="conditions-summary__weather">
                    <span className="conditions-summary__icon"><WeatherIcon name={desc.icon} size={20} /></span>
                    <span className="conditions-summary__weather-label">{desc.label}</span>
                  </span>
                ) : '—'}
              </div>
            );
          })}
        </div>

        {/* Temperature row */}
        <div className="conditions-summary__row" role="row">
          <div className="conditions-summary__cell conditions-summary__cell--label" role="rowheader">
            Temp
          </div>
          {bandRows.map((row) => (
            <div key={row.label} className="conditions-summary__cell" role="cell">
              {row.daily ? (
                <span className="conditions-summary__temp">
                  <span className="conditions-summary__temp-high">{fmtTemp(row.daily.temperatureMax, temp)}</span>
                  <span className="conditions-summary__temp-sep">/</span>
                  <span className="conditions-summary__temp-low">{fmtTemp(row.daily.temperatureMin, temp)}</span>
                </span>
              ) : '—'}
            </div>
          ))}
        </div>

        {/* Snow row */}
        <div className="conditions-summary__row conditions-summary__row--highlight" role="row">
          <div className="conditions-summary__cell conditions-summary__cell--label" role="rowheader">
            <Snowflake size={14} className="label-icon" /> Snow
          </div>
          {bandRows.map((row) => (
            <div key={row.label} className="conditions-summary__cell" role="cell">
              {row.daily ? (
                <span className={`conditions-summary__snow ${row.displayedSnowfall > 0 ? 'has-snow' : ''}`}>
                  {row.displayedSnowfall > 0 ? fmtSnow(row.displayedSnowfall, snow) : '—'}
                </span>
              ) : '—'}
            </div>
          ))}
        </div>

        {/* Rain row */}
        <div className="conditions-summary__row" role="row">
          <div className="conditions-summary__cell conditions-summary__cell--label" role="rowheader">
            <CloudRain size={14} className="label-icon" /> Rain
          </div>
          {bandRows.map((row) => (
            <div key={row.label} className="conditions-summary__cell" role="cell">
              {row.daily ? (
                <span className="conditions-summary__rain">
                  {row.daily.rainSum > 0 ? fmtPrecip(row.daily.rainSum) : '—'}
                </span>
              ) : '—'}
            </div>
          ))}
        </div>

        {/* Wind row */}
        <div className="conditions-summary__row" role="row">
          <div className="conditions-summary__cell conditions-summary__cell--label" role="rowheader">
            <Wind size={14} className="label-icon" /> Wind
          </div>
          {bandRows.map((row) => (
            <div key={row.label} className="conditions-summary__cell" role="cell">
              {row.daily ? (
                <span className="conditions-summary__wind">
                  <span>{fmtWindSpeed(row.daily.windSpeedMax)}</span>
                  <span className="conditions-summary__gusts">
                    gusts {fmtWindSpeed(row.daily.windGustsMax)}
                  </span>
                </span>
              ) : '—'}
            </div>
          ))}
        </div>

        {/* Precip probability row */}
        <div className="conditions-summary__row" role="row">
          <div className="conditions-summary__cell conditions-summary__cell--label" role="rowheader">
            <Droplets size={14} className="label-icon" /> Precip %
          </div>
          {bandRows.map((row) => (
            <div key={row.label} className="conditions-summary__cell" role="cell">
              {row.daily ? (
                <span className="conditions-summary__precip-prob">
                  {row.daily.precipitationProbabilityMax}%
                </span>
              ) : '—'}
            </div>
          ))}
        </div>

        {/* Freezing level row */}
        {avgFreezing !== null && (
          <div className="conditions-summary__row" role="row">
            <div className="conditions-summary__cell conditions-summary__cell--label" role="rowheader">
              <Thermometer size={14} className="label-icon" /> Freeze lvl
            </div>
            <div className="conditions-summary__cell conditions-summary__cell--full" role="cell" style={{ gridColumn: 'span 3' }}>
              <span className="conditions-summary__freezing">
                ~{fmtElevation(avgFreezing, elev)}
              </span>
            </div>
          </div>
        )}

        {/* Snowpack depth row — snow_depth is a grid-cell value, so show
            a single max value across all bands. */}
        {(() => {
          const allDepths = bandRows
            .flatMap((r) => r.hourly)
            .filter((h) => h.snowDepth != null && h.snowDepth > 0)
            .map((h) => h.snowDepth!);
          const maxDepthCm = allDepths.length > 0 ? Math.max(...allDepths) * 100 : null;
          if (maxDepthCm == null || maxDepthCm <= 0) return null;
          return (
            <div className="conditions-summary__row" role="row">
              <div className="conditions-summary__cell conditions-summary__cell--label" role="rowheader">
                <Layers size={14} className="label-icon" /> Total Snow
              </div>
              <div className="conditions-summary__cell conditions-summary__cell--full" role="cell" style={{ gridColumn: 'span 3' }}>
                <span className="conditions-summary__snowpack">
                  {snow === 'in'
                    ? `${Math.round(cmToIn(maxDepthCm))}"`
                    : `${Math.round(maxDepthCm)}cm`}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
