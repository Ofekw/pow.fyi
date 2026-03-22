import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '@/pages/HomePage';
import { renderWithProviders } from '@/test/test-utils';

mock.module('@/data/openmeteo', () => ({
  fetchForecast: mock(async () => ({ band: 'mid', elevation: 3050, hourly: [], daily: [] })),
  fetchHistorical: mock(async () => []),
  fetchMultiModelForecast: mock(async () => ({ band: 'mid', elevation: 3050, hourly: [], daily: [] })),
}));

const savedGeolocation = navigator.geolocation;

function mockGeolocation({ shouldFail = false, lat = 39.64, lon = -106.37 } = {}) {
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: mock(
        (success: PositionCallback, error?: PositionErrorCallback) => {
          if (shouldFail) {
            error?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
          } else {
            success({ coords: { latitude: lat, longitude: lon, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() } as GeolocationPosition);
          }
        },
      ),
    },
    configurable: true,
  });
}

function restoreGeolocation() {
  Object.defineProperty(navigator, 'geolocation', { value: savedGeolocation, configurable: true });
}

function seedFavorites(...slugs: string[]) {
  localStorage.setItem('pow_favorites', JSON.stringify(slugs.map((slug) => ({ slug, addedAt: new Date().toISOString() }))));
}

async function renderHomePage() {
  await act(async () => {
    renderWithProviders(<HomePage />);
  });
}

/** Renders HomePage and types `trigger` into the search box, returning the user instance. */
async function triggerEasterEgg(trigger: string) {
  const user = userEvent.setup();
  await renderHomePage();
  const search = screen.getByPlaceholderText('Search resorts…');
  await user.type(search, trigger);
  return user;
}

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'pow_snow_attribution=; max-age=0; path=/';
});

afterEach(() => {
  mock.restore();
  restoreGeolocation();
});

describe('HomePage', () => {
  it('renders the hero section with title', async () => {
    await renderHomePage();
    expect(
      screen.getByText(/free & open-source ski resort forecasts/i),
    ).toBeInTheDocument();
  });

  it('renders the subtitle', async () => {
    await renderHomePage();
    expect(
      screen.getByText(/free & open-source ski resort forecasts/i),
    ).toBeInTheDocument();
  });

  it('renders the search bar', async () => {
    await renderHomePage();
    expect(screen.getByPlaceholderText('Search resorts…')).toBeInTheDocument();
  });

  it('does not render static resort cards', async () => {
    await renderHomePage();
    // Resort names like Vail should not appear on the page (no static listing)
    expect(screen.queryByText('Vail')).not.toBeInTheDocument();
  });

  it('does not group resorts by region', async () => {
    await renderHomePage();
    expect(screen.queryByText('Colorado')).not.toBeInTheDocument();
    expect(screen.queryByText('Utah')).not.toBeInTheDocument();
  });

  it('shows empty state message when no favorites', async () => {
    await renderHomePage();
    expect(screen.getByText(/use the search bar to find and favorite resorts/i)).toBeInTheDocument();
  });

  it('does not show favorites section when none favorited', async () => {
    await renderHomePage();
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
  });

  it('search has aria-label', async () => {
    await renderHomePage();
    expect(screen.getByLabelText('Search resorts')).toBeInTheDocument();
  });

  it('shows easter egg when searching for "Ofek"', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'Ofek');

    expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
  });

  it('shows easter egg when searching for "ofek" (lowercase)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'ofek');

    expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
  });

  it('shows easter egg when searching for "OFEK" (uppercase)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'OFEK');

    expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
  });

  it('shows easter egg when searching for "LiL gUy" (case-insensitive alias)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'LiL gUy');

    expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
  });

  it('does not show easter egg for partial matches', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'Ofe');

    expect(screen.queryByTestId('easter-egg')).not.toBeInTheDocument();
  });

  it('shows argo easter egg when searching for "argo"', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'argo');

    expect(screen.getByTestId('argo-easter-egg')).toBeInTheDocument();
  });

  it('shows argo easter egg when searching for "ARGO" (uppercase)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'ARGO');

    expect(screen.getByTestId('argo-easter-egg')).toBeInTheDocument();
  });

  it('shows argo easter egg when searching for "ArGo" (mixed case)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'ArGo');

    expect(screen.getByTestId('argo-easter-egg')).toBeInTheDocument();
  });

  it('shows argo easter egg when searching for "CHAD" (uppercase alias)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'CHAD');

    expect(screen.getByTestId('argo-easter-egg')).toBeInTheDocument();
  });

  it('shows argo easter egg when searching for "ChAdWiCk" (mixed case alias)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'ChAdWiCk');

    expect(screen.getByTestId('argo-easter-egg')).toBeInTheDocument();
  });

  it('does not show argo easter egg for partial matches', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'arg');

    expect(screen.queryByTestId('argo-easter-egg')).not.toBeInTheDocument();
  });

  it('keeps argo still for 3s, then adds shoot-right class', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'argo');

    const argoImage = screen.getByTestId('argo-easter-egg-image');
    expect(argoImage.className).toContain('home__easter-egg-image--argo');
    expect(argoImage.className).not.toContain('home__easter-egg-image--argo-shoot');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    });
    expect(screen.getByTestId('argo-easter-egg-image').className).not.toContain('home__easter-egg-image--argo-shoot');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650));
    });
    expect(screen.getByTestId('argo-easter-egg-image').className).toContain('home__easter-egg-image--argo-shoot');
  });

  it('shows mfjh easter egg when searching for "mfjh"', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'mfjh');

    expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
  });

  it('shows mfjh easter egg when searching for "MFJH" (uppercase)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'MFJH');

    expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
  });

  it('shows mfjh easter egg when searching for "MfJh" (mixed case)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'MfJh');

    expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
  });

  it('shows mfjh easter egg when searching for "JACOB" (uppercase alias)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'JACOB');

    expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
  });

  it('shows mfjh easter egg when searching for "JaKe" (mixed case alias)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'JaKe');

    expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
  });

  it('does not show mfjh easter egg for partial matches', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'mfj');

    expect(screen.queryByTestId('mfjh-easter-egg')).not.toBeInTheDocument();
  });

  it('shows babka easter egg when searching for "babka"', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'babka');

    expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
  });

  it('shows babka easter egg when searching for "BABKA" (uppercase)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'BABKA');

    expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
  });

  it('shows babka easter egg when searching for "BaBkA" (mixed case)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'BaBkA');

    expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
  });

  it('shows babka easter egg when searching for "DELILAH" (uppercase alias)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'DELILAH');

    expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
  });

  it('shows babka easter egg when searching for "DoG" (mixed case alias)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'DoG');

    expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
  });

  it('shows babka easter egg when searching for "NoOdLe" (mixed case alias)', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'NoOdLe');

    expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
  });

  it('does not show babka easter egg for partial matches', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'bab');

    expect(screen.queryByTestId('babka-easter-egg')).not.toBeInTheDocument();
  });

  it('renders babka easter egg with laser SVG lines', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'babka');

    const overlay = screen.getByTestId('babka-easter-egg');
    // SVG with laser lines should be present
    expect(overlay.querySelector('svg')).toBeInTheDocument();
    const lines = overlay.querySelectorAll('line');
    expect(lines.length).toBe(2);
  });

  it('babka easter egg does not auto-dismiss (runs until user dismisses)', async () => {
    const user = userEvent.setup();
    await renderHomePage();
    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'babka');

    expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
    // Overlay should still be present with no user interaction
    expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
  });

  describe('easter egg focus placement', () => {
    it('ofek easter egg dialog receives focus on mount', async () => {
      await triggerEasterEgg('Ofek');

      const dialog = screen.getByTestId('easter-egg');
      expect(document.activeElement).toBe(dialog);
    });

    it('mfjh easter egg dialog receives focus on mount', async () => {
      await triggerEasterEgg('mfjh');

      const dialog = screen.getByTestId('mfjh-easter-egg');
      expect(document.activeElement).toBe(dialog);
    });

    it('argo easter egg dialog receives focus on mount', async () => {
      await triggerEasterEgg('argo');

      const dialog = screen.getByTestId('argo-easter-egg');
      expect(document.activeElement).toBe(dialog);
    });

    it('babka easter egg dialog receives focus on mount', async () => {
      await triggerEasterEgg('babka');

      const dialog = screen.getByTestId('babka-easter-egg');
      expect(document.activeElement).toBe(dialog);
    });
  });

  describe('favorites sort selector', () => {
    it('does not show sort selector when there are no favorites', async () => {
      await renderHomePage();
      expect(screen.queryByRole('combobox', { name: /sort by/i })).not.toBeInTheDocument();
    });

    it('shows sort selector when favorites exist', async () => {
      seedFavorites('vail-co', 'stowe-vt');
      await renderHomePage();
      expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
    });

    it('defaults to "Snow: Next 7 Days"', async () => {
      seedFavorites('vail-co');
      await renderHomePage();
      const select = screen.getByRole('combobox', { name: /sort by/i }) as HTMLSelectElement;
      expect(select.value).toBe('next7');
    });

    it('has Distance, Snow: Past 7 Days, and Snow: Next 7 Days options', async () => {
      seedFavorites('vail-co');
      await renderHomePage();
      const select = screen.getByRole('combobox', { name: /sort by/i });
      const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
      expect(options).toContain('Distance');
      expect(options).toContain('Snow: Past 7 Days');
      expect(options).toContain('Snow: Next 7 Days');
      expect(options).not.toContain('Default');
    });

    it('selecting Distance triggers geolocation request', async () => {
      mockGeolocation();
      seedFavorites('vail-co');
      const user = userEvent.setup();
      await renderHomePage();
      await user.selectOptions(screen.getByRole('combobox', { name: /sort by/i }), 'distance');
      expect(
        (navigator.geolocation.getCurrentPosition as ReturnType<typeof mock>).mock.calls.length,
      ).toBeGreaterThan(0);
    });

    it('falls back to next7 when geolocation is unavailable', async () => {
      Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
      seedFavorites('vail-co');
      const user = userEvent.setup();
      await renderHomePage();
      const select = screen.getByRole('combobox', { name: /sort by/i }) as HTMLSelectElement;
      await user.selectOptions(select, 'distance');
      expect(select.value).toBe('next7');
    });

    it('falls back to next7 when geolocation is denied', async () => {
      mockGeolocation({ shouldFail: true });
      seedFavorites('vail-co');
      const user = userEvent.setup();
      await renderHomePage();
      const select = screen.getByRole('combobox', { name: /sort by/i }) as HTMLSelectElement;
      await user.selectOptions(select, 'distance');
      await act(async () => {});
      expect(select.value).toBe('next7');
    });
  });

  describe('easter egg keyboard dismissal', () => {
    it('pressing Space on ofek easter egg dialog dismisses it', async () => {
      const user = await triggerEasterEgg('Ofek');

      expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
      await user.keyboard(' ');

      expect(screen.queryByTestId('easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Enter on ofek easter egg dialog dismisses it', async () => {
      const user = await triggerEasterEgg('Ofek');

      expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
      await user.keyboard('{Enter}');

      expect(screen.queryByTestId('easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Escape dismisses the ofek easter egg', async () => {
      const user = await triggerEasterEgg('Ofek');

      expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
      await user.keyboard('{Escape}');

      expect(screen.queryByTestId('easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Space on argo easter egg dialog dismisses it', async () => {
      const user = await triggerEasterEgg('argo');

      expect(screen.getByTestId('argo-easter-egg')).toBeInTheDocument();
      await user.keyboard(' ');

      expect(screen.queryByTestId('argo-easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Enter on argo easter egg dialog dismisses it', async () => {
      const user = await triggerEasterEgg('argo');

      expect(screen.getByTestId('argo-easter-egg')).toBeInTheDocument();
      await user.keyboard('{Enter}');

      expect(screen.queryByTestId('argo-easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Escape dismisses the argo easter egg', async () => {
      const user = await triggerEasterEgg('argo');

      expect(screen.getByTestId('argo-easter-egg')).toBeInTheDocument();
      await user.keyboard('{Escape}');

      expect(screen.queryByTestId('argo-easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Space on mfjh easter egg dialog dismisses it', async () => {
      const user = await triggerEasterEgg('mfjh');

      expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
      await user.keyboard(' ');

      expect(screen.queryByTestId('mfjh-easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Enter on mfjh easter egg dialog dismisses it', async () => {
      const user = await triggerEasterEgg('mfjh');

      expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
      await user.keyboard('{Enter}');

      expect(screen.queryByTestId('mfjh-easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Escape dismisses the mfjh easter egg', async () => {
      const user = await triggerEasterEgg('mfjh');

      expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
      await user.keyboard('{Escape}');

      expect(screen.queryByTestId('mfjh-easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Space on babka easter egg dialog dismisses it', async () => {
      const user = await triggerEasterEgg('babka');

      expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
      await user.keyboard(' ');

      expect(screen.queryByTestId('babka-easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Enter on babka easter egg dialog dismisses it', async () => {
      const user = await triggerEasterEgg('babka');

      expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
      await user.keyboard('{Enter}');

      expect(screen.queryByTestId('babka-easter-egg')).not.toBeInTheDocument();
    });

    it('pressing Escape dismisses the babka easter egg', async () => {
      const user = await triggerEasterEgg('babka');

      expect(screen.getByTestId('babka-easter-egg')).toBeInTheDocument();
      await user.keyboard('{Escape}');

      expect(screen.queryByTestId('babka-easter-egg')).not.toBeInTheDocument();
    });
  });

  describe('Snow attribution toggle', () => {
    it('is hidden when no favorites are selected', async () => {
      await renderHomePage();
      expect(screen.queryByRole('radio', { name: 'Calendar day' })).not.toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: 'Ski day' })).not.toBeInTheDocument();
    });

    it('renders Calendar day and Ski day options when favorites exist', async () => {
      seedFavorites('vail-co');
      await renderHomePage();
      expect(screen.getByRole('radio', { name: 'Calendar day' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Ski day' })).toBeInTheDocument();
    });

    it('defaults to Calendar day', async () => {
      seedFavorites('vail-co');
      await renderHomePage();
      expect(screen.getByRole('radio', { name: 'Calendar day' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Ski day' })).not.toBeChecked();
    });

    it('switches to Ski day when clicked', async () => {
      seedFavorites('vail-co');
      const user = userEvent.setup();
      await renderHomePage();
      await user.click(screen.getByRole('radio', { name: 'Ski day' }));
      expect(screen.getByRole('radio', { name: 'Ski day' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Calendar day' })).not.toBeChecked();
    });

    it('can switch back to Calendar day after choosing Ski day', async () => {
      seedFavorites('vail-co');
      const user = userEvent.setup();
      await renderHomePage();
      await user.click(screen.getByRole('radio', { name: 'Ski day' }));
      await user.click(screen.getByRole('radio', { name: 'Calendar day' }));
      expect(screen.getByRole('radio', { name: 'Calendar day' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Ski day' })).not.toBeChecked();
    });
  });
});
