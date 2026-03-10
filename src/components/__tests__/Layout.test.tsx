import { afterEach, describe, it, expect } from 'bun:test';
import { useEffect } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Layout } from '@/components/Layout';
import { useShare } from '@/context/ShareContext';
import { renderWithProviders } from '@/test/test-utils';
import type { ShareCardData } from '@/utils/shareCard';

function makeCardData(): ShareCardData {
  return {
    resort: {
      slug: 'vail-co',
      name: 'Vail',
      region: 'Colorado',
      country: 'US',
      lat: 39.6403,
      lon: -106.3742,
      elevation: { base: 2475, mid: 3050, top: 3527 },
      verticalDrop: 1052,
    },
    daily: [{
      date: '2025-01-15',
      weatherCode: 73,
      temperatureMax: -2,
      temperatureMin: -10,
      apparentTemperatureMax: -5,
      apparentTemperatureMin: -15,
      uvIndexMax: 3,
      precipitationSum: 5,
      rainSum: 0,
      snowfallSum: 8,
      precipitationProbabilityMax: 80,
      windSpeedMax: 20,
      windGustsMax: 35,
    }],
    band: 'mid',
    elevation: 3050,
    weekTotalSnow: 8,
    snowUnit: 'in',
    tempUnit: 'F',
    elevUnit: 'ft',
  };
}

function ShareDataHarness() {
  const { setShareData } = useShare();

  useEffect(() => {
    setShareData(makeCardData(), 2);
  }, [setShareData]);

  return null;
}

describe('Layout', () => {
  const hadNotification = Object.prototype.hasOwnProperty.call(globalThis, 'Notification');
  const originalNotification = globalThis.Notification;
  const hadServiceWorker = Object.prototype.hasOwnProperty.call(navigator, 'serviceWorker');
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    if (hadNotification) {
      Object.defineProperty(globalThis, 'Notification', {
        value: originalNotification,
        configurable: true,
        writable: true,
      });
    } else {
      delete (globalThis as Partial<typeof globalThis>).Notification;
    }
    if (hadServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true,
      });
    } else {
      delete (navigator as Partial<Navigator>).serviceWorker;
    }
  });

  it('renders the units toggle FAB', () => {
    renderWithProviders(<Layout />);
    // Imperial default — shows °F / ft
    expect(
      screen.getByLabelText(/switch to metric units/i),
    ).toBeInTheDocument();
  });

  it('renders the timezone FAB', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByLabelText(/change timezone/i)).toBeInTheDocument();
  });

  it('does not render the snow alerts FAB while alerts are hidden', () => {
    renderWithProviders(<Layout />);
    expect(screen.queryByLabelText(/snow alerts/i)).toBeNull();
    expect(screen.queryByLabelText(/enable snow alerts/i)).toBeNull();
  });

  it('renders footer with Open-Meteo attribution', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText(/open-meteo/i)).toBeInTheDocument();
  });

  it('renders footer with open-source link', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByText(/open-source/i)).toBeInTheDocument();
  });

  it('renders Submit Feedback link', () => {
    renderWithProviders(<Layout />);
    const link = screen.getByText('Submit Feedback');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://github.com/Ofekw/pow.fyi/issues');
  });

  it('renders the info FAB', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByLabelText(/how snowfall is calculated/i)).toBeInTheDocument();
  });

  it('renders the share FAB when share data is registered in context', async () => {
    renderWithProviders(
      <>
        <ShareDataHarness />
        <Layout />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /share forecast/i })).toBeInTheDocument();
    });
  });

  it('shows info popover when info button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Layout />);
    const btn = screen.getByLabelText(/how snowfall is calculated/i);
    await user.click(btn);
    expect(screen.getByText('How Snowfall is Calculated')).toBeInTheDocument();
    expect(screen.getByText(/multi-model averaging/i)).toBeInTheDocument();
  });
});
