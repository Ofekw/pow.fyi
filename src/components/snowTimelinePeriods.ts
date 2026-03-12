import type { HourlyMetrics } from '@/types';

export interface PeriodSnow {
  am: number;
  pm: number;
  overnight: number;
}

export type SnowAttributionMode = 'calendar' | 'ski';

export interface SnowAttributionPeriodConfig {
  key: string;
  label: string;
  shortLabel: string;
  tooltip: string;
  colorClass: 'am' | 'pm' | 'overnight';
}

export interface SnowAttributionPeriod extends SnowAttributionPeriodConfig {
  snowfall: number;
}

/**
 * Sum hourly snowfall for a given date into AM / PM / Overnight buckets.
 * AM = target-day hours 6-11, PM = target-day hours 12-17,
 * Overnight = target-day hours 18-23 + next-day hours 0-5.
 */
export function splitDayPeriods(date: string, hourly: HourlyMetrics[]): PeriodSnow {
  const nextDate = new Date(`${date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  let am = 0;
  let pm = 0;
  let overnight = 0;

  for (const h of hourly) {
    const hourDate = h.time.slice(0, 10);
    const hour = Number(h.time.slice(11, 13));
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;

    if (hourDate === date) {
      if (hour >= 6 && hour < 12) am += h.snowfall;
      else if (hour >= 12 && hour < 18) pm += h.snowfall;
      else if (hour >= 18) overnight += h.snowfall;
    } else if (hourDate === nextDateStr && hour < 6) {
      overnight += h.snowfall;
    }
  }

  return { am, pm, overnight };
}

const SNOW_ATTRIBUTION_PERIODS: Record<SnowAttributionMode, SnowAttributionPeriodConfig[]> = {
  calendar: [
    {
      key: 'morning',
      label: 'Morning',
      shortLabel: 'Morning',
      tooltip: 'Morning — 12 am to 8 am',
      colorClass: 'am',
    },
    {
      key: 'day',
      label: 'Day',
      shortLabel: 'Day',
      tooltip: 'Day — 8 am to 6 pm',
      colorClass: 'pm',
    },
    {
      key: 'night',
      label: 'Night',
      shortLabel: 'Night',
      tooltip: 'Night — 6 pm to 12 am',
      colorClass: 'overnight',
    },
  ],
  ski: [
    {
      key: 'overnight',
      label: 'Overnight',
      shortLabel: 'Overnight',
      tooltip: 'Overnight — 6 pm previous day to 8 am',
      colorClass: 'overnight',
    },
    {
      key: 'daytime',
      label: 'Daytime',
      shortLabel: 'Daytime',
      tooltip: 'Daytime — 8 am to 6 pm',
      colorClass: 'pm',
    },
  ],
};

export function getSnowAttributionPeriods(mode: SnowAttributionMode): SnowAttributionPeriodConfig[] {
  return SNOW_ATTRIBUTION_PERIODS[mode];
}

export function splitSnowAttributionPeriods(
  date: string,
  hourly: HourlyMetrics[],
  mode: SnowAttributionMode,
): SnowAttributionPeriod[] {
  const prevDate = new Date(`${date}T00:00:00Z`);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const prevDateStr = prevDate.toISOString().slice(0, 10);

  if (mode === 'calendar') {
    const totals = { morning: 0, day: 0, night: 0 };
    for (const h of hourly) {
      const hourDate = h.time.slice(0, 10);
      const hour = Number(h.time.slice(11, 13));
      if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;
      if (hourDate !== date) continue;
      if (hour < 8) totals.morning += h.snowfall;
      else if (hour < 18) totals.day += h.snowfall;
      else totals.night += h.snowfall;
    }
    return getSnowAttributionPeriods(mode).map((period) => ({
      ...period,
      snowfall: totals[period.key as keyof typeof totals] ?? 0,
    }));
  }

  const totals = { overnight: 0, daytime: 0 };
  for (const h of hourly) {
    const hourDate = h.time.slice(0, 10);
    const hour = Number(h.time.slice(11, 13));
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;

    if ((hourDate === prevDateStr && hour >= 18) || (hourDate === date && hour < 8)) {
      totals.overnight += h.snowfall;
      continue;
    }
    if (hourDate === date && hour >= 8 && hour < 18) {
      totals.daytime += h.snowfall;
    }
  }

  return getSnowAttributionPeriods(mode).map((period) => ({
    ...period,
    snowfall: totals[period.key as keyof typeof totals] ?? 0,
  }));
}
