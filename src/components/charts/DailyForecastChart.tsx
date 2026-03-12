import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { DailyMetrics, HourlyMetrics } from '@/types';
import { cmToIn } from '@/utils/weather';
import { useUnits } from '@/context/UnitsContext';
import { useTimezone } from '@/context/TimezoneContext';
import {
  getSnowAttributionPeriods,
  splitSnowAttributionPeriods,
  type SnowAttributionMode,
} from '@/components/snowTimelinePeriods';
import { BaseChart } from './BaseChart';
import {
  COLORS,
  makeTooltip,
  makeLegend,
  makeGrid,
  makeCategoryAxis,
  makeValueAxis,
  makeBarSeries,
  makeLineSeries,
} from './echarts-theme';

interface Props {
  daily: DailyMetrics[];
  /** Optional hourly data — when provided, snow bars are split by attribution periods */
  hourly?: HourlyMetrics[];
  attributionMode?: SnowAttributionMode;
}

const PERIOD_COLORS: Record<string, string> = {
  morning: 'rgba(251, 191, 36, 0.85)',
  day: 'rgba(56, 189, 248, 0.85)',
  night: 'rgba(139, 92, 246, 0.85)',
  overnight: 'rgba(139, 92, 246, 0.85)',
  daytime: 'rgba(56, 189, 248, 0.85)',
};

export function DailyForecastChart({
  daily,
  hourly,
  attributionMode = 'calendar',
}: Props) {
  const { temp: tempUnit, snow: snowUnit } = useUnits();
  const { fmtDate } = useTimezone();
  const isImperial = tempUnit === 'F';

  const option = useMemo<EChartsOption>(() => {
    const dates = daily.map((d) =>
      fmtDate(d.date + 'T12:00:00', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    );

    const toDisplay = (cm: number) =>
      isImperial ? +cmToIn(cm).toFixed(1) : +cm.toFixed(1);

    // When hourly data is available, split each day into AM/PM/Overnight periods
    const hasPeriods = !!hourly;
    const periodDefs = getSnowAttributionPeriods(attributionMode);
    const periodData = periodDefs.reduce<Record<string, number[]>>((acc, period) => {
      acc[period.key] = [];
      return acc;
    }, {});
    let snowData: number[] = [];

    if (hasPeriods) {
      // Split all days at once to avoid redundant filtering
      const allPeriods = daily.map((d) => {
        const periods = splitSnowAttributionPeriods(d.date, hourly, attributionMode);
        return periods.reduce<Record<string, number>>((acc, period) => {
          acc[period.key] = toDisplay(period.snowfall);
          return acc;
        }, {});
      });

      for (const period of periodDefs) {
        periodData[period.key] = allPeriods.map((dayPeriods) => dayPeriods[period.key] ?? 0);
      }
    } else {
      snowData = daily.map((d) => toDisplay(d.snowfallSum));
    }

    const rainData = daily.map((d) =>
      isImperial ? +(d.rainSum / 25.4).toFixed(2) : +(d.rainSum / 10).toFixed(2),
    );
    const highData = daily.map((d) =>
      isImperial ? Math.round(d.temperatureMax * 9 / 5 + 32) : Math.round(d.temperatureMax),
    );
    const lowData = daily.map((d) =>
      isImperial ? Math.round(d.temperatureMin * 9 / 5 + 32) : Math.round(d.temperatureMin),
    );

    const precipLabel = isImperial ? 'in' : snowUnit;
    const tempLabel = `°${tempUnit}`;

    // Build legend items based on whether we have periods or not
    const legendItems = hasPeriods
      ? [
          ...periodDefs.map((period) => `${period.label} (${precipLabel})`),
          `Rain (${precipLabel})`,
          `High ${tempLabel}`,
          `Low ${tempLabel}`,
        ]
      : [`Snow (${precipLabel})`, `Rain (${precipLabel})`, `High ${tempLabel}`, `Low ${tempLabel}`];

    // Build series array
    const series: Record<string, unknown>[] = [];

    if (hasPeriods) {
      periodDefs.forEach((period, index) => {
        const periodColor = PERIOD_COLORS[period.key] ?? COLORS.snow;
        series.push(
          makeBarSeries(`${period.label} (${precipLabel})`, periodData[period.key] ?? [], periodColor, {
            yAxisIndex: 0,
            ...(index === 0 ? { barGap: '5%', barCategoryGap: '30%' } : {}),
            itemStyle: {
              color: periodColor,
              borderRadius: [3, 3, 0, 0],
            },
          }),
        );
      });
    } else {
      series.push(
        makeBarSeries(`Snow (${precipLabel})`, snowData, COLORS.snow, { yAxisIndex: 0 }),
      );
    }

    series.push(
      makeBarSeries(`Rain (${precipLabel})`, rainData, COLORS.rain, {
        yAxisIndex: 0,
        itemStyle: { color: COLORS.rain, borderRadius: [3, 3, 0, 0], opacity: 0.75 },
      }),
      makeLineSeries(`High ${tempLabel}`, highData, COLORS.tempHigh, { yAxisIndex: 1 }),
      makeLineSeries(`Low ${tempLabel}`, lowData, COLORS.tempLow, { yAxisIndex: 1 }),
    );

    // Map series names to period time-range descriptions for legend tooltips
    const periodDescriptions = periodDefs.reduce<Record<string, string>>((acc, period) => {
      acc[`${period.label} (${precipLabel})`] = period.tooltip;
      return acc;
    }, {});

    return {
      tooltip: makeTooltip(),
      legend: makeLegend(legendItems, {
        bottom: 0,
        tooltip: {
          show: hasPeriods,
          formatter: (params: { name: string }) =>
            periodDescriptions[params.name] ?? '',
        },
      }),
      grid: makeGrid({ bottom: 60, right: 56 }),
      xAxis: [makeCategoryAxis(dates)],
      yAxis: [
        makeValueAxis({
          name: precipLabel,
          nameLocation: 'middle',
          nameGap: 36,
          min: 0,
          max: isImperial ? 12 : 30,
          interval: isImperial ? 2 : 5,
        }),
        makeValueAxis({
          name: tempLabel,
          nameLocation: 'middle',
          nameGap: 36,
          position: 'right',
          splitLine: { show: false },
        }),
        ],
        series,
      };
  }, [daily, hourly, attributionMode, isImperial, tempUnit, snowUnit, fmtDate]);

  return <BaseChart option={option} height={340} group="resort-daily" />;
}
