import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { UnitsProvider } from '@/context/UnitsContext';
import { TimezoneProvider, useTimezone } from '@/context/TimezoneContext';
import { SnowAttributionProvider } from '@/context/SnowAttributionContext';
import type { BandForecast, Resort } from '@/types';

const todayIsoInTimezoneMock = mock((tz: string) => {
  if (tz === 'America/Los_Angeles') return '2025-01-19';
  return '2025-01-20';
});

const fetchForecastMock = mock(() =>
  Promise.resolve({
    band: 'mid' as const,
    elevation: 3050,
    hourly: [],
    daily: [
      makeRecentDay('2025-01-18', 1),
      makeRecentDay('2025-01-19', 2),
      makeRecentDay('2025-01-20', 3),
    ],
  }),
);

mock.module('@/utils/dateKey', () => ({
  todayIsoInTimezone: todayIsoInTimezoneMock,
}));

mock.module('@/data/openmeteo', () => ({
  fetchForecast: fetchForecastMock,
  fetchHistorical: mock(() => Promise.resolve([])),
}));

mock.module('@/hooks/useWeather', () => ({
  useForecast: mock(() => ({
    forecast: {
      resort: makeResort(),
      fetchedAt: '2025-01-20T00:00:00.000Z',
      base: makeBandForecast('base', 2475),
      mid: makeBandForecast('mid', 3050),
      top: makeBandForecast('top', 3527),
    },
    loading: false,
    error: null,
    refetch: mock(() => {}),
  })),
}));

mock.module('@/components/charts/RecentSnowChart', () => ({
  RecentSnowChart: ({ days }: { days: Array<{ date: string }> }) => (
    <div data-testid="recent-snow-days">Recent days: {days.length} ({days.map((d) => d.date).join(',')})</div>
  ),
}));

mock.module('@/components/charts/DailyForecastChart', () => ({ DailyForecastChart: () => <div /> }));
mock.module('@/components/charts/HourlyDetailChart', () => ({ HourlyDetailChart: () => <div /> }));
mock.module('@/components/charts/HourlySnowChart', () => ({ HourlySnowChart: () => <div /> }));
mock.module('@/components/charts/FreezingLevelChart', () => ({ FreezingLevelChart: () => <div /> }));
mock.module('@/components/charts/UVIndexChart', () => ({ UVIndexChart: () => <div /> }));

const { ResortPage } = await import('@/pages/ResortPage');

function makeResort(): Resort {
  return {
    slug: 'vail-co',
    name: 'Vail',
    region: 'Colorado',
    country: 'US',
    lat: 39.6403,
    lon: -106.3742,
    elevation: { base: 2475, mid: 3050, top: 3527 },
    verticalDrop: 1052,
    lifts: 31,
    acres: 5317,
    website: 'https://www.vail.com',
  };
}

function makeBandForecast(band: 'base' | 'mid' | 'top', elevation: number): BandForecast {
  return {
    band,
    elevation,
    hourly: [
      {
        time: '2025-01-20T12:00:00',
        temperature: -5,
        apparentTemperature: -10,
        relativeHumidity: 80,
        precipitation: 0,
        rain: 0,
        snowfall: 1,
        precipitationProbability: 60,
        weatherCode: 73,
        windSpeed: 15,
        windDirection: 270,
        windGusts: 25,
        freezingLevelHeight: 2500,
      },
    ],
    daily: [makeRecentDay('2025-01-20', 2)],
  };
}

function makeRecentDay(date: string, snowfallSum: number) {
  return {
    date,
    weatherCode: 73,
    temperatureMax: -2,
    temperatureMin: -10,
    apparentTemperatureMax: -5,
    apparentTemperatureMin: -15,
    uvIndexMax: 3,
    precipitationSum: snowfallSum,
    rainSum: 0,
    snowfallSum,
    precipitationProbabilityMax: 80,
    windSpeedMax: 20,
    windGustsMax: 35,
  };
}

function ResortPageTimezoneHarness() {
  const { setTz } = useTimezone();
  return (
    <>
      <button onClick={() => setTz('America/Los_Angeles')}>Set PT</button>
      <MemoryRouter initialEntries={['/resort/vail-co']}>
        <Routes>
          <Route path="/resort/:slug" element={<ResortPage />} />
        </Routes>
      </MemoryRouter>
    </>
  );
}

function renderHarness() {
  return render(
    <UnitsProvider>
      <TimezoneProvider>
        <SnowAttributionProvider>
          <ResortPageTimezoneHarness />
        </SnowAttributionProvider>
      </TimezoneProvider>
    </UnitsProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('pow_tz', 'UTC');
  fetchForecastMock.mockClear();
  todayIsoInTimezoneMock.mockClear();
});

afterAll(() => {
  mock.restore();
});

describe('ResortPage timezone behavior', () => {
  it('recomputes recent days when user changes timezone', async () => {
    const user = userEvent.setup();
    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId('recent-snow-days')).toHaveTextContent('Recent days: 2');
    });

    await user.click(screen.getByRole('button', { name: 'Set PT' }));

    await waitFor(() => {
      expect(screen.getByTestId('recent-snow-days')).toHaveTextContent('Recent days: 1');
    });

    expect(todayIsoInTimezoneMock).toHaveBeenCalledWith('UTC');
    expect(todayIsoInTimezoneMock).toHaveBeenCalledWith('America/Los_Angeles');
  });
});
