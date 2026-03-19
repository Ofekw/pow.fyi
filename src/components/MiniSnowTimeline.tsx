/**
 * MiniSnowTimeline — Compact snow bar for favorite cards.
 *
 * Shows past 7 days + today + next 7 days.
 * Today is highlighted as the next 24h bar. Future days show AM / PM /
 * Overnight sub-bars when hourly data is available.
 */
import { useMemo } from 'react';
import type { DailyMetrics, HourlyMetrics } from '@/types';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import { cmToIn } from '@/utils/weather';
import { splitDayPeriods, splitSnowAttributionPeriods, type SnowAttributionMode } from './snowTimelinePeriods';
import './MiniSnowTimeline.css';

interface Props {
  /** All past days (chronological oldest→newest). Last element = yesterday. */
  pastDays: DailyMetrics[];
  /** Today + future days (chronological). First = today. */
  forecastDays: DailyMetrics[];
  /** Hourly forecast data — used to split future days into AM/PM/Overnight */
  forecastHourly?: HourlyMetrics[];
  /** Snow attribution mode: 'calendar' (default) or 'ski' */
  attributionMode?: SnowAttributionMode;
}

export function MiniSnowTimeline({ pastDays, forecastDays, forecastHourly, attributionMode = 'calendar' }: Props) {
  const { snow } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = snow === 'in';
  const isSkiMode = attributionMode === 'ski';

  const { pastBars, todayBar, futureBars, maxSnow } = useMemo(() => {
    const toDisplay = (cm: number) =>
      isImperial ? +cmToIn(cm).toFixed(1) : +cm.toFixed(1);

    // Last 7 past days
    const past = pastDays.slice(-7);
    const pastBars = past.map((d) => ({
      date: d.date,
      snow: toDisplay(d.snowfallSum),
    }));

    // Today = first forecast day
    const [todayDay, ...rest] = forecastDays;
    const future = rest.slice(0, 7); // next 7 days

    // Compute per-day period bars — ski mode uses attribution periods, calendar uses AM/PM/Overnight
    function getPeriods(date: string) {
      if (!forecastHourly) return null;
      if (isSkiMode) {
        const skiPeriods = splitSnowAttributionPeriods(date, forecastHourly, 'ski');
        const overnight = skiPeriods.find((p) => p.key === 'overnight')?.snowfall ?? 0;
        const daytime = skiPeriods.find((p) => p.key === 'daytime')?.snowfall ?? 0;
        return { am: 0, pm: toDisplay(daytime), overnight: toDisplay(overnight) };
      }
      const p = splitDayPeriods(date, forecastHourly);
      return { am: toDisplay(p.am), pm: toDisplay(p.pm), overnight: toDisplay(p.overnight) };
    }

    const todayPeriods = todayDay ? getPeriods(todayDay.date) : null;

    const todayBar = todayDay
      ? {
          date: todayDay.date,
          snow: toDisplay(todayDay.snowfallSum),
          am: todayPeriods?.am ?? 0,
          pm: todayPeriods?.pm ?? 0,
          overnight: todayPeriods?.overnight ?? 0,
        }
      : null;

    const futureBars = future.map((d) => {
      const periods = getPeriods(d.date);
      return {
        date: d.date,
        snow: toDisplay(d.snowfallSum),
        am: periods?.am ?? 0,
        pm: periods?.pm ?? 0,
        overnight: periods?.overnight ?? 0,
      };
    });

    // Compute max for scaling
    const todayPeriodSnow = todayBar && forecastHourly
      ? [todayBar.am, todayBar.pm, todayBar.overnight]
      : (todayBar ? [todayBar.snow] : []);
    const allSnow = [
      ...pastBars.map((b) => b.snow),
      ...todayPeriodSnow,
      ...futureBars.flatMap((b) =>
        forecastHourly ? [b.am, b.pm, b.overnight] : [b.snow],
      ),
    ];
    const maxSnow = Math.max(...allSnow, 0.1);

    return { pastBars, todayBar, futureBars, maxSnow };
  }, [pastDays, forecastDays, forecastHourly, isImperial, isSkiMode]);

  const fmtDay = (dateStr: string) =>
    fmtDate(dateStr + 'T12:00:00', { weekday: 'short' });

  const unit = isImperial ? '"' : 'cm';

  /** Render a future-style bar (with optional AM/PM/Overnight sub-bars) */
  const renderFutureBar = (bar: {
    date: string;
    snow: number;
    am: number;
    pm: number;
    overnight: number;
  }) => {
    const hasPeriods = forecastHourly && (bar.am > 0 || bar.pm > 0 || bar.overnight > 0);
    return (
      <div
        key={bar.date}
        className="mini-timeline__col"
        title={`${fmtDay(bar.date)}: ${bar.snow}${unit}`}
      >
        <span className="mini-timeline__value">
          {bar.snow}
        </span>
        {hasPeriods ? (
          <div className="mini-timeline__track mini-timeline__track--periods">
            <div
              className="mini-timeline__bar mini-timeline__bar--am"
              style={{ height: `${Math.max((bar.am / maxSnow) * 100, bar.am > 0 ? 4 : 0)}%` }}
            />
            <div
              className="mini-timeline__bar mini-timeline__bar--pm"
              style={{ height: `${Math.max((bar.pm / maxSnow) * 100, bar.pm > 0 ? 4 : 0)}%` }}
            />
            <div
              className="mini-timeline__bar mini-timeline__bar--overnight"
              style={{ height: `${Math.max((bar.overnight / maxSnow) * 100, bar.overnight > 0 ? 4 : 0)}%` }}
            />
          </div>
        ) : (
          <div className="mini-timeline__track">
            <div
              className="mini-timeline__bar mini-timeline__bar--future"
              style={{ height: `${Math.max((bar.snow / maxSnow) * 100, bar.snow > 0 ? 4 : 0)}%` }}
            />
          </div>
        )}
        <span className="mini-timeline__label">{fmtDay(bar.date)}</span>
      </div>
    );
  };

  return (
    <div className="mini-timeline" role="figure" aria-label="Snow timeline showing past and upcoming snowfall">
      {/* Past 7 days */}
      {pastBars.map((bar) => (
        <div
          key={bar.date}
          className="mini-timeline__col"
          title={`${fmtDay(bar.date)}: ${bar.snow}${unit}`}
        >
          <span className="mini-timeline__value">
            {bar.snow}
          </span>
          <div className="mini-timeline__track">
            <div
              className="mini-timeline__bar mini-timeline__bar--past"
              style={{ height: `${Math.max((bar.snow / maxSnow) * 100, bar.snow > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="mini-timeline__label">{fmtDay(bar.date)}</span>
        </div>
      ))}

      {/* Today */}
      {todayBar && (
        <div
          className="mini-timeline__col mini-timeline__col--today"
          title={`Today: ${todayBar.snow}${unit}`}
        >
          <span className="mini-timeline__value mini-timeline__value--today">
            {todayBar.snow}
          </span>
          {forecastHourly && (todayBar.am > 0 || todayBar.pm > 0 || todayBar.overnight > 0) ? (
            <div className="mini-timeline__track mini-timeline__track--periods mini-timeline__track--today-border">
              <div
                className="mini-timeline__bar mini-timeline__bar--am"
                style={{ height: `${Math.max((todayBar.am / maxSnow) * 100, todayBar.am > 0 ? 4 : 0)}%` }}
              />
              <div
                className="mini-timeline__bar mini-timeline__bar--pm"
                style={{ height: `${Math.max((todayBar.pm / maxSnow) * 100, todayBar.pm > 0 ? 4 : 0)}%` }}
              />
              <div
                className="mini-timeline__bar mini-timeline__bar--overnight"
                style={{ height: `${Math.max((todayBar.overnight / maxSnow) * 100, todayBar.overnight > 0 ? 4 : 0)}%` }}
              />
            </div>
          ) : (
            <div className="mini-timeline__track">
              <div
                className="mini-timeline__bar mini-timeline__bar--today"
                style={{ height: `${Math.max((todayBar.snow / maxSnow) * 100, todayBar.snow > 0 ? 4 : 0)}%` }}
              />
            </div>
          )}
          <span className="mini-timeline__label mini-timeline__label--today">Today</span>
        </div>
      )}

      {/* Next 7 days */}
      {futureBars.map(renderFutureBar)}

      {/* Legend */}
      <div className="mini-timeline__legend" aria-label="Legend">
        {isSkiMode ? (
          <>
            <span className="mini-timeline__legend-item" title="Overnight — 6 pm previous day to 8 am">
              <span className="mini-timeline__legend-swatch mini-timeline__legend-swatch--overnight" />
              Overnight
            </span>
            <span className="mini-timeline__legend-item" title="Daytime — 8 am to 6 pm">
              <span className="mini-timeline__legend-swatch mini-timeline__legend-swatch--pm" />
              Daytime
            </span>
          </>
        ) : (
          <>
            <span className="mini-timeline__legend-item" title="AM — 6 am to 12 pm">
              <span className="mini-timeline__legend-swatch mini-timeline__legend-swatch--am" />
              AM
            </span>
            <span className="mini-timeline__legend-item" title="PM — 12 pm to 6 pm">
              <span className="mini-timeline__legend-swatch mini-timeline__legend-swatch--pm" />
              PM
            </span>
            <span className="mini-timeline__legend-item" title="Night — 6 pm to 6 am">
              <span className="mini-timeline__legend-swatch mini-timeline__legend-swatch--overnight" />
              Night
            </span>
          </>
        )}
      </div>
    </div>
  );
}
