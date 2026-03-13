/**
 * SnowTimeline — At-a-glance past + future snowfall bar.
 *
 * Compact snow summary: shows past 7 days + upcoming 7 days
 * as a compact horizontal bar chart with a vertical "today" divider.
 * Forecast days can be broken into attribution-period sub-bars
 * (calendar day or ski day) for more granular visibility into
 * when snowfall is expected.
 */
import { useMemo } from 'react';
import type { DailyMetrics, HourlyMetrics } from '@/types';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import { fmtSnow, cmToIn } from '@/utils/weather';
import {
  getSnowAttributionPeriods,
  getAttributedSnowfallTotal,
  splitSnowAttributionPeriods,
  type SnowAttributionMode,
} from './snowTimelinePeriods';
import './SnowTimeline.css';

interface Props {
  /** Past days (up to 7, chronological order oldest→newest) */
  recentDays: DailyMetrics[];
  /** Forecast days (up to 7, chronological order) */
  forecastDays: DailyMetrics[];
  /** Hourly forecast data — used to split forecast days into the active attribution periods */
  forecastHourly?: HourlyMetrics[];
  attributionMode?: SnowAttributionMode;
}

export function SnowTimeline({
  recentDays,
  forecastDays,
  forecastHourly,
  attributionMode = 'calendar',
}: Props) {
  const { snow } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = snow === 'in';
  const periodDefs = getSnowAttributionPeriods(attributionMode);

  const { pastBars, todayBar, futureBars, maxSnow, pastTotal, futureTotal } = useMemo(() => {
    // Take last 7 past days
    const past = recentDays.slice(-7);
    // First forecast day is today; the rest are future
    const [todayDay, ...rest] = forecastDays;
    const future = rest.slice(0, 7);

    const toDisplay = (cm: number) =>
      isImperial ? +cmToIn(cm).toFixed(1) : +cm.toFixed(1);

    const pastBars = past.map((d) => ({
      date: d.date,
      snow: toDisplay(d.snowfallSum),
      raw: d.snowfallSum,
    }));

    const toDisplayPeriods = (date: string) =>
      forecastHourly
        ? splitSnowAttributionPeriods(date, forecastHourly, attributionMode).map((period) => ({
            ...period,
            snow: toDisplay(period.snowfall),
          }))
        : [];

    const buildForecastBar = (date: string, dailySnowfallSum: number) => {
      const periods = toDisplayPeriods(date);
      const raw = getAttributedSnowfallTotal(date, dailySnowfallSum, forecastHourly, attributionMode);

      return {
        date,
        snow: toDisplay(raw),
        raw,
        periods,
      };
    };

    const todayBar = todayDay
      ? buildForecastBar(todayDay.date, todayDay.snowfallSum)
      : null;

    const futureBars = future.map((d) => buildForecastBar(d.date, d.snowfallSum));

    // For the max calculation, consider individual period values so bars scale correctly
    let todayPeriodSnow: number[] = [];
    if (todayBar) {
      todayPeriodSnow = forecastHourly
        ? todayBar.periods.map((period) => period.snow)
        : [todayBar.snow];
    }
    const allSnow = [
      ...pastBars.map((b) => b.snow),
      ...todayPeriodSnow,
      ...futureBars.flatMap((b) => (forecastHourly ? b.periods.map((period) => period.snow) : [b.snow])),
    ];
    const maxSnow = Math.max(...allSnow, 0.1); // avoid 0 max

    const pastTotal = past.reduce((s, d) => s + d.snowfallSum, 0);
    const futureTotal = (todayBar?.raw ?? 0) + futureBars.reduce((sum, bar) => sum + bar.raw, 0);

    return { pastBars, todayBar, futureBars, maxSnow, pastTotal, futureTotal };
  }, [recentDays, forecastDays, forecastHourly, attributionMode, isImperial]);

  const fmtDay = (dateStr: string) =>
    fmtDate(dateStr + 'T12:00:00', { weekday: 'short' });

  const fmtFull = (dateStr: string) =>
    fmtDate(dateStr + 'T12:00:00', { weekday: 'short', month: 'short', day: 'numeric' });

  const unit = isImperial ? '"' : 'cm';

  return (
    <div className="snow-timeline" role="figure" aria-label="Snow timeline showing past and upcoming snowfall">
      {/* Header */}
      <div className="snow-timeline__header">
        <div className="snow-timeline__totals">
          <span className="snow-timeline__total snow-timeline__total--past">
            <span className="snow-timeline__total-label">Past 7d</span>
            <span className="snow-timeline__total-value">{fmtSnow(pastTotal, snow)}</span>
          </span>
          <span className="snow-timeline__total snow-timeline__total--future">
            <span className="snow-timeline__total-label">Next 7d</span>
            <span className="snow-timeline__total-value">{fmtSnow(futureTotal, snow)}</span>
          </span>
        </div>
      </div>

      {/* Bar chart area */}
      <div className="snow-timeline__chart">
        {/* Past bars */}
        <div className="snow-timeline__section snow-timeline__section--past">
          {pastBars.map((bar) => {
            const pct = (bar.snow / maxSnow) * 100;
            return (
              <div
                key={bar.date}
                className="snow-timeline__bar-col"
                title={`${fmtFull(bar.date)}: ${bar.snow}${unit}`}
              >
                <span className="snow-timeline__bar-value">
                  {bar.snow}
                </span>
                <div className="snow-timeline__bar-track">
                  <div
                    className="snow-timeline__bar snow-timeline__bar--past"
                    style={{ height: `${Math.max(pct, bar.snow > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="snow-timeline__bar-label">{fmtDay(bar.date)}</span>
              </div>
            );
          })}
        </div>

        {/* Today bar — split into the active attribution periods when hourly data is available */}
        <div className="snow-timeline__today" aria-label="Today">
          <span className="snow-timeline__bar-value snow-timeline__bar-value--today">
            {todayBar ? todayBar.snow : ''}
          </span>
          {todayBar ? (
            forecastHourly && todayBar.periods.some((period) => period.snow > 0) ? (
              <div className="snow-timeline__bar-track snow-timeline__bar-track--periods snow-timeline__bar-track--today">
                {todayBar.periods.map((period) => (
                  <div
                    key={period.key}
                    className={`snow-timeline__bar snow-timeline__bar--${period.colorClass}`}
                    style={{ height: `${Math.max((period.snow / maxSnow) * 100, period.snow > 0 ? 4 : 0)}%` }}
                    title={`${period.label} snow: ${period.snow}${unit}`}
                  />
                ))}
              </div>
            ) : (
              <div className="snow-timeline__bar-track">
                <div
                  className="snow-timeline__bar snow-timeline__bar--today"
                  style={{
                    height: `${Math.max((todayBar.snow / maxSnow) * 100, todayBar.snow > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>
            )
          ) : (
            <div className="snow-timeline__bar-track">
              <div className="snow-timeline__divider-line" />
            </div>
          )}
          <span className="snow-timeline__divider-label">Today</span>
        </div>

        {/* Future bars — split into the active attribution period sub-bars */}
        <div className="snow-timeline__section snow-timeline__section--future">
          {futureBars.map((bar) => {
            const hasPeriods = forecastHourly && bar.periods.some((period) => period.snow > 0);
            return (
              <div
                key={bar.date}
                className="snow-timeline__bar-col"
                title={`${fmtFull(bar.date)}: ${bar.snow}${unit}`}
              >
                <span className="snow-timeline__bar-value">
                  {bar.snow}
                </span>
                {hasPeriods ? (
                  <div className="snow-timeline__bar-track snow-timeline__bar-track--periods">
                    {bar.periods.map((period) => (
                      <div
                        key={period.key}
                        className={`snow-timeline__bar snow-timeline__bar--${period.colorClass}`}
                        style={{ height: `${Math.max((period.snow / maxSnow) * 100, period.snow > 0 ? 4 : 0)}%` }}
                        title={`${period.label} snow: ${period.snow}${unit}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="snow-timeline__bar-track">
                    <div
                      className="snow-timeline__bar snow-timeline__bar--future"
                      style={{ height: `${Math.max((bar.snow / maxSnow) * 100, bar.snow > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                )}
                <span className="snow-timeline__bar-label">{fmtDay(bar.date)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="snow-timeline__legend" aria-label="Legend">
        {periodDefs.map((period) => (
          <span key={period.key} className="snow-timeline__legend-item" title={period.tooltip}>
            <span className={`snow-timeline__legend-swatch snow-timeline__legend-swatch--${period.colorClass}`} />
            {period.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
