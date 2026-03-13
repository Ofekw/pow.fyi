import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { UnitsProvider } from '@/context/UnitsContext';
import { TimezoneProvider } from '@/context/TimezoneContext';
import { render } from '@testing-library/react';
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

mock.module('@/components/charts/DailyForecastChart', () => ({
  DailyForecastChart: () => <div data-testid="daily-forecast-chart" />,
}));

mock.module('@/components/charts/HourlyDetailChart', () => ({
  HourlyDetailChart: () => <div data-testid="hourly-detail-chart" />,
}));

mock.module('@/components/charts/HourlySnowChart', () => ({
  HourlySnowChart: () => <div data-testid="hourly-snow-chart" />,
}));

mock.module('@/components/charts/RecentSnowChart', () => ({
  RecentSnowChart: () => <div data-testid="recent-snow-chart" />,
}));

mock.module('@/components/charts/FreezingLevelChart', () => ({
  FreezingLevelChart: () => <div data-testid="freezing-level-chart" />,
}));

mock.module('@/components/charts/UVIndexChart', () => ({
  UVIndexChart: () => <div data-testid="uv-index-chart" />,
}));

// Import after mocks are set up
const { ResortPage } = await import('@/pages/ResortPage');

beforeEach(() => {
  localStorage.clear();
});

afterAll(() => {
  mock.restore();
});

function renderResortPage(slug = 'vail-co') {
  return render(
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
}

describe('ResortPage', () => {
  it('renders resort name', () => {
    renderResortPage();
    expect(screen.getByText('Vail')).toBeInTheDocument();
  });

  it('renders region and country', () => {
    renderResortPage();
    expect(screen.getByText(/Colorado, US/)).toBeInTheDocument();
  });

  it('renders back link', () => {
    renderResortPage();
    expect(screen.getByText('← All Resorts')).toBeInTheDocument();
  });

  it('renders website link', () => {
    renderResortPage();
    const link = screen.getByText('Website ↗');
    expect(link).toHaveAttribute('href', 'https://www.vail.com');
  });

  it('renders mountain cams link when available', () => {
    renderResortPage();
    const link = screen.getByText('Mountain Cams ↗');
    expect(link).toHaveAttribute(
      'href',
      'https://www.vail.com/the-mountain/mountain-conditions/mountain-cams.aspx',
    );
  });

  it('omits mountain cams link when unavailable', () => {
    renderResortPage('lee-canyon-nv');
    expect(screen.queryByText('Mountain Cams ↗')).not.toBeInTheDocument();
  });

  it('renders elevation stats', () => {
    renderResortPage();
    // Stats section labels (duplicated by ElevationToggle, so use getAllByText)
    expect(screen.getAllByText('Base').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mid').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Top').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Vertical')).toBeInTheDocument();
  });

  it('renders lifts count', () => {
    renderResortPage();
    expect(screen.getByText('Lifts')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('renders acres', () => {
    renderResortPage();
    expect(screen.getByText('Acres')).toBeInTheDocument();
    expect(screen.getByText('5,317')).toBeInTheDocument();
  });

  it('renders elevation toggle', () => {
    renderResortPage();
    expect(screen.getByRole('radiogroup', { name: 'Elevation band' })).toBeInTheDocument();
  });

  it('renders a calendar day / ski day attribution toggle that defaults to calendar day', () => {
    renderResortPage();
    expect(screen.getAllByText('Daily snow attribution').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('radio', { name: 'Calendar day' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ski day' })).not.toBeChecked();
  });

  it('shows the attribution tooltip and allows switching to ski day', async () => {
    const user = userEvent.setup();
    renderResortPage();
    expect(screen.getByTitle(/Calendar day/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Ski day' }));
    expect(screen.getByRole('radio', { name: 'Calendar day' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ski day' })).toBeChecked();
  });

  it('opens and closes the attribution info popover from the info icon', async () => {
    const user = userEvent.setup();
    renderResortPage();

    const infoButton = screen.getByRole('button', { name: 'Snow attribution time ranges' });
    expect(infoButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog', { name: 'Snow attribution time ranges' })).not.toBeInTheDocument();

    await user.click(infoButton);
    expect(infoButton).toHaveAttribute('aria-expanded', 'true');
    const dialog = screen.getByRole('dialog', { name: 'Snow attribution time ranges' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveFocus();
    expect(within(dialog).getByText('Calendar day')).toBeInTheDocument();
    expect(within(dialog).getByText('Morning: 12 am–8 am')).toBeInTheDocument();
    expect(within(dialog).getByText('Overnight: 6 pm previous day–8 am today')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(infoButton).toHaveAttribute('aria-expanded', 'false');
    expect(infoButton).toHaveFocus();
    expect(screen.queryByRole('dialog', { name: 'Snow attribution time ranges' })).not.toBeInTheDocument();
  });

  it('renders refresh button in header', () => {
    renderResortPage();
    const refreshBtn = screen.getByText('Refresh');
    expect(refreshBtn).toBeInTheDocument();
    // Refresh button should be inside the header element
    const header = refreshBtn.closest('header');
    expect(header).not.toBeNull();
    expect(header?.classList.contains('resort-page__header')).toBe(true);
  });

  it('shows last refreshed timestamp when data loaded', () => {
    renderResortPage();
    // The mock returns forecast data immediately, so lastRefreshed should be set
    const refreshedSpan = document.querySelector('.resort-page__last-refreshed');
    expect(refreshedSpan).toBeTruthy();
  });

  it('renders favorite toggle button', () => {
    renderResortPage();
    expect(
      screen.getByLabelText(/add to favorites|remove from favorites/i),
    ).toBeInTheDocument();
  });

  it('renders selected day card buttons before conditions section', () => {
    renderResortPage();
    const selectedDayCard = screen.getByRole('button', { pressed: true });
    const conditionsHeading = screen.getByRole('heading', { name: /Conditions —/i });
    expect(
      selectedDayCard.compareDocumentPosition(conditionsHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows not found for invalid slug', () => {
    renderResortPage('nonexistent-resort');
    expect(screen.getByText('Resort not found')).toBeInTheDocument();
    expect(screen.getByText('← Back to all resorts')).toBeInTheDocument();
  });
});
