import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { UnitsProvider } from '@/context/UnitsContext';
import { TimezoneProvider } from '@/context/TimezoneContext';
import { act, render } from '@testing-library/react';
import type { BandForecast } from '@/types';

function makeBandForecast(band: 'base' | 'mid' | 'top', elevation: number): BandForecast {
  return {
    band,
    elevation,
    hourly: [
      {
        time: '2025-01-15T12:00:00',
        temperature: -5,
        apparentTemperature: -10,
        relativeHumidity: 80,
        precipitation: 0,
        rain: 0,
        snowfall: 2,
        precipitationProbability: 60,
        weatherCode: 73,
        windSpeed: 15,
        windDirection: 270,
        windGusts: 25,
        freezingLevelHeight: 2500,
      },
    ],
    daily: [
      {
        date: '2025-01-15',
        weatherCode: 73,
        temperatureMax: -2,
        temperatureMin: -10,
        apparentTemperatureMax: -5,
        apparentTemperatureMin: -15,
        uvIndexMax: 3,
        precipitationSum: 5,
        rainSum: 0,
        snowfallSum: 5,
        precipitationProbabilityMax: 80,
        windSpeedMax: 20,
        windGustsMax: 35,
      },
    ],
  };
}

// Mock modules before importing ResortPage
mock.module('@/data/openmeteo', () => ({
  fetchForecast: mock(() =>
    Promise.resolve({
      band: 'mid' as const,
      elevation: 3050,
      hourly: [],
      daily: [],
    }),
  ),
  fetchHistorical: mock(() => Promise.resolve([])),
}));

mock.module('@/hooks/useWeather', () => ({
  useForecast: mock(() => ({
    forecast: {
      resort: {
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
      },
      fetchedAt: '2025-01-15T00:00:00.000Z',
      base: makeBandForecast('base', 2475),
      mid: makeBandForecast('mid', 3050),
      top: makeBandForecast('top', 3527),
    },
    loading: false,
    error: null,
    refetch: mock(() => {}),
  })),
  useHistorical: mock(() => ({
    data: [],
    loading: false,
    error: null,
  })),
}));

// Import after mocks are set up
const { ResortPage } = await import('@/pages/ResortPage');

beforeEach(() => {
  localStorage.clear();
});

afterAll(() => {
  mock.restore();
});

async function renderResortPage(slug = 'vail-co') {
  let result: ReturnType<typeof render> | null = null;
  await act(async () => {
    result = render(
      <UnitsProvider>
        <TimezoneProvider>
          <MemoryRouter initialEntries={[`/resort/${slug}`]}>
            <Routes>
              <Route path="/resort/:slug" element={<ResortPage />} />
            </Routes>
          </MemoryRouter>
        </TimezoneProvider>
      </UnitsProvider>,
    );
  });

  return result;
}

describe('ResortPage', () => {
  it('renders resort name', async () => {
    await renderResortPage();
    expect(screen.getByText('Vail')).toBeInTheDocument();
  });

  it('renders region and country', async () => {
    await renderResortPage();
    expect(screen.getByText(/Colorado, US/)).toBeInTheDocument();
  });

  it('renders back link', async () => {
    await renderResortPage();
    expect(screen.getByText('← All Resorts')).toBeInTheDocument();
  });

  it('renders website link', async () => {
    await renderResortPage();
    const link = screen.getByText('Website ↗');
    expect(link).toHaveAttribute('href', 'https://www.vail.com');
  });

  it('renders mountain cams link when available', async () => {
    await renderResortPage();
    const link = screen.getByText('Mountain Cams ↗');
    expect(link).toHaveAttribute(
      'href',
      'https://www.vail.com/the-mountain/mountain-conditions/mountain-cams.aspx',
    );
  });

  it('omits mountain cams link when unavailable', async () => {
    await renderResortPage('lee-canyon-nv');
    expect(screen.queryByText('Mountain Cams ↗')).not.toBeInTheDocument();
  });

  it('renders elevation stats', async () => {
    await renderResortPage();
    // Stats section labels (duplicated by ElevationToggle, so use getAllByText)
    expect(screen.getAllByText('Base').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mid').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Top').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Vertical')).toBeInTheDocument();
  });

  it('renders lifts count', async () => {
    await renderResortPage();
    expect(screen.getByText('Lifts')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('renders acres', async () => {
    await renderResortPage();
    expect(screen.getByText('Acres')).toBeInTheDocument();
    expect(screen.getByText('5,317')).toBeInTheDocument();
  });

  it('renders elevation toggle', async () => {
    await renderResortPage();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('renders refresh button in header', async () => {
    await renderResortPage();
    const refreshBtn = screen.getByText('Refresh');
    expect(refreshBtn).toBeInTheDocument();
    // Refresh button should be inside the header element
    const header = refreshBtn.closest('header');
    expect(header).not.toBeNull();
    expect(header?.classList.contains('resort-page__header')).toBe(true);
  });

  it('shows last refreshed timestamp when data loaded', async () => {
    await renderResortPage();
    // The mock returns forecast data immediately, so lastRefreshed should be set
    const refreshedSpan = document.querySelector('.resort-page__last-refreshed');
    expect(refreshedSpan).toBeTruthy();
  });

  it('renders favorite toggle button', async () => {
    await renderResortPage();
    expect(
      screen.getByLabelText(/add to favorites|remove from favorites/i),
    ).toBeInTheDocument();
  });

  it('renders selected day card buttons before conditions section', async () => {
    await renderResortPage();
    const selectedDayCard = screen.getByRole('button', { pressed: true });
    const conditionsHeading = screen.getByRole('heading', { name: /Conditions —/i });
    expect(
      selectedDayCard.compareDocumentPosition(conditionsHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows not found for invalid slug', async () => {
    await renderResortPage('nonexistent-resort');
    expect(screen.getByText('Resort not found')).toBeInTheDocument();
    expect(screen.getByText('← Back to all resorts')).toBeInTheDocument();
  });
});
