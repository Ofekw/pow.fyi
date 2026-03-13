import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { UnitsProvider } from '@/context/UnitsContext';
import { TimezoneProvider } from '@/context/TimezoneContext';
import { ConditionsSummary } from '@/components/ConditionsSummary';
import type { SnowAttributionMode } from '@/components/snowTimelinePeriods';
import type { BandForecast, DailyMetrics, HourlyMetrics } from '@/types';

function makeHourly(time: string, snowfall = 2): HourlyMetrics {
  return {
    time,
    temperature: -5,
    apparentTemperature: -10,
    relativeHumidity: 80,
    precipitation: 0,
    rain: 0,
    snowfall,
    precipitationProbability: 60,
    weatherCode: 73,
    windSpeed: 15,
    windDirection: 270,
    windGusts: 25,
    freezingLevelHeight: 2500,
  };
}

function makeDaily(date: string, snow: number): DailyMetrics {
  return {
    date,
    weatherCode: 73,
    temperatureMax: -2,
    temperatureMin: -10,
    apparentTemperatureMax: -5,
    apparentTemperatureMin: -15,
    uvIndexMax: 3,
    precipitationSum: 5,
    rainSum: 1.2,
    snowfallSum: snow,
    precipitationProbabilityMax: 80,
    windSpeedMax: 20,
    windGustsMax: 35,
  };
}

function makeBand(band: 'base' | 'mid' | 'top', elevation: number): BandForecast {
  return {
    band,
    elevation,
    hourly: [
      makeHourly('2025-01-14T19:00:00', 1),
      makeHourly('2025-01-15T02:00:00', 2),
      makeHourly('2025-01-15T10:00:00', 3),
      makeHourly('2025-01-15T20:00:00', 4),
      makeHourly('2025-01-16T03:00:00', 2),
      makeHourly('2025-01-16T10:00:00', 4),
    ],
    daily: [makeDaily('2025-01-15', 5), makeDaily('2025-01-16', 10)],
  };
}

const bands = {
  base: makeBand('base', 2475),
  mid: makeBand('mid', 3050),
  top: makeBand('top', 3527),
};

const elevations = { base: 2475, mid: 3050, top: 3527 };

function renderSummary(selectedDayIdx = 0, attributionMode?: SnowAttributionMode) {
  return render(
    <UnitsProvider>
      <TimezoneProvider>
        <ConditionsSummary
          bands={bands}
          selectedDayIdx={selectedDayIdx}
          elevations={elevations}
          attributionMode={attributionMode}
        />
      </TimezoneProvider>
    </UnitsProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('ConditionsSummary', () => {
  it('renders a table with accessible label', () => {
    renderSummary();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders all three elevation band headers', () => {
    renderSummary();
    expect(screen.getByText('Top')).toBeInTheDocument();
    expect(screen.getByText('Mid')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
  });

  it('renders row labels', () => {
    renderSummary();
    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.getByText('Temp')).toBeInTheDocument();
    // "Snow" appears in both row label and weather description for code 73
    expect(screen.getAllByText('Snow').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Rain')).toBeInTheDocument();
    expect(screen.getByText('Wind')).toBeInTheDocument();
    expect(screen.getByText('Precip %')).toBeInTheDocument();
  });

  it('renders elevation values', () => {
    renderSummary();
    // Imperial defaults — check for ft values
    const allText = document.body.textContent ?? '';
    expect(allText).toContain('ft');
  });

  it('renders snow values for all bands', () => {
    renderSummary();
    // Calendar attribution sums 2am + 10am + 8pm hourly snowfall = 9cm → 3.5"
    const snowCells = screen.getAllByText('3.5"');
    expect(snowCells.length).toBe(3);
  });

  it('renders weather icons', () => {
    renderSummary();
    // Weather code 73 → Snow → renders SVG icons from Lucide
    const labels = screen.getAllByText('Snow');
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });

  it('renders precipitation probability', () => {
    renderSummary();
    const probCells = screen.getAllByText('80%');
    expect(probCells.length).toBe(3);
  });

  it('renders freezing level', () => {
    renderSummary();
    expect(screen.getByText('Freeze lvl')).toBeInTheDocument();
  });

  it('renders wind info for all bands', () => {
    renderSummary();
    // 20 km/h → 12mph in imperial
    const windCells = screen.getAllByText('12mph');
    expect(windCells.length).toBe(3);
  });

  it('uses second day when selectedDayIdx is 1', () => {
    renderSummary(1);
    // Calendar attribution sums 2am + 10am hourly snowfall = 6cm → 2.4"
    const snowCells = screen.getAllByText('2.4"');
    expect(snowCells.length).toBe(3);
  });

  it('uses attribution-aware totals in ski day mode', () => {
    renderSummary(0, 'ski');
    // Ski attribution sums previous evening + overnight + daytime = 6cm → 2.4"
    const snowCells = screen.getAllByText('2.4"');
    expect(snowCells.length).toBe(3);
  });
});
