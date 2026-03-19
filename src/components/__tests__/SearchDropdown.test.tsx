import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { act, screen, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { act, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchDropdown } from '@/components/SearchDropdown';
import { renderWithProviders } from '@/test/test-utils';

let currentQuery = '';
const favSlugs = new Set<string>();
const mockToggle = mock((slug: string) => {
  if (favSlugs.has(slug)) favSlugs.delete(slug);
  else favSlugs.add(slug);
});

async function renderDropdown(initialQuery = '') {
  currentQuery = initialQuery;
  function onChange(q: string) {
    currentQuery = q;
  }
  let result: ReturnType<typeof renderWithProviders> | null = null;
  await act(async () => {
    result = renderWithProviders(
      <SearchDropdown
        query={currentQuery}
        onQueryChange={onChange}
        isFav={(slug) => favSlugs.has(slug)}
        onToggleFavorite={mockToggle}
      />,
    );
  });

  return result;
}

// Helpers for mocking geolocation APIs
const savedPermissions = navigator.permissions;
const savedGeolocation = navigator.geolocation;

function mockPermissions(state: 'granted' | 'denied' | 'prompt') {
  Object.defineProperty(navigator, 'permissions', {
    value: {
      query: mock(() => Promise.resolve({ state })),
    },
    configurable: true,
  });
}

function mockGeolocation({
  lat = 39.6403,
  lon = -106.3742,
  shouldFail = false,
}: { lat?: number; lon?: number; shouldFail?: boolean } = {}) {
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: mock(
        (success: PositionCallback, error?: PositionErrorCallback) => {
          if (shouldFail) {
            error?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
          } else {
            success({
              coords: { latitude: lat, longitude: lon, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
              timestamp: Date.now(),
            } as GeolocationPosition);
          }
        },
      ),
    },
    configurable: true,
  });
}

function restoreNavigatorAPIs() {
  Object.defineProperty(navigator, 'permissions', {
    value: savedPermissions,
    configurable: true,
  });
  Object.defineProperty(navigator, 'geolocation', {
    value: savedGeolocation,
    configurable: true,
  });
}

beforeEach(() => {
  currentQuery = '';
  favSlugs.clear();
  mockToggle.mockClear();
});

afterEach(() => {
  restoreNavigatorAPIs();
});

describe('SearchDropdown', () => {
  it('renders the search input', async () => {
    await renderDropdown();
    expect(screen.getByPlaceholderText('Search resorts…')).toBeInTheDocument();
  });

  it('has combobox role and aria-label', async () => {
    await renderDropdown();
    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-label', 'Search resorts');
  });

  it('does not show dropdown when query is empty', async () => {
    await renderDropdown();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows dropdown with results when query matches', async () => {
    const user = userEvent.setup();
    await renderDropdown('Vail');
    const input = screen.getByRole('combobox');
    await user.click(input);
    const panel = screen.getByRole('listbox');
    expect(panel).toBeInTheDocument();
    const options = within(panel).getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(within(options[0]).getByText('Vail')).toBeInTheDocument();
  });

  it('shows no-match message for invalid query', async () => {
    const user = userEvent.setup();
    await renderDropdown('zzznotaresort');
    const input = screen.getByRole('combobox');
    await user.click(input);
    expect(screen.getByText(/no resorts match/i)).toBeInTheDocument();
  });

  it('navigates on result click', async () => {
    const user = userEvent.setup();
    await renderDropdown('Vail');
    const input = screen.getByRole('combobox');
    await user.click(input);
    const options = screen.getAllByRole('option');
    await user.click(options[0]);
    // After click, the dropdown should close (no panel)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    await renderDropdown('Colorado');
    const input = screen.getByRole('combobox');
    await user.click(input);

    // Arrow down should activate first item
    await user.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('data-active', 'true');

    // Arrow down again should move to second item
    await user.keyboard('{ArrowDown}');
    expect(options[1]).toHaveAttribute('data-active', 'true');
    expect(options[0]).toHaveAttribute('data-active', 'false');
  });

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup();
    await renderDropdown('Vail');
    const input = screen.getByRole('combobox');
    await user.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('limits results to max 8', async () => {
    // "US" matches many resorts - should cap at 8
    await renderDropdown('US');
    const input = screen.getByRole('combobox');
    await act(async () => {
      input.focus();
    });
    const panel = screen.queryByRole('listbox');
    if (panel) {
      const options = within(panel).queryAllByRole('option');
      expect(options.length).toBeLessThanOrEqual(8);
    }
  });

  it('shows star buttons on each result', async () => {
    const user = userEvent.setup();
    await renderDropdown('Vail');
    await user.click(screen.getByRole('combobox'));
    const favButtons = screen.getAllByTitle('Add to favorites');
    expect(favButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onToggleFavorite when star is clicked', async () => {
    const user = userEvent.setup();
    await renderDropdown('Vail');
    await user.click(screen.getByRole('combobox'));
    const favButton = screen.getAllByTitle('Add to favorites')[0];
    await user.click(favButton);
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when star is clicked', async () => {
    const user = userEvent.setup();
    await renderDropdown('Vail');
    await user.click(screen.getByRole('combobox'));
    const favButton = screen.getAllByTitle('Add to favorites')[0];
    await user.click(favButton);
    // Dropdown should still be open (didn't navigate away)
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});

describe('SearchDropdown geolocation auto-fetch', () => {
  it('auto-fetches nearby resorts when permission is already granted', async () => {
    mockPermissions('granted');
    mockGeolocation();
    await renderDropdown();

    const locationBtn = screen.getByTitle('Show nearby resorts');
    await waitFor(() => {
      expect(locationBtn.className).toContain('active');
    });
  });

  it('does not auto-fetch when permission is denied', async () => {
    mockPermissions('denied');
    mockGeolocation();
    renderDropdown();

    // Give the async effect time to settle
    await new Promise((r) => setTimeout(r, 50));

    const locationBtn = screen.getByTitle('Show nearby resorts');
    expect(locationBtn.className).not.toContain('active');
    expect(
      (navigator.geolocation.getCurrentPosition as ReturnType<typeof mock>).mock.calls.length,
    ).toBe(0);
  });

  it('does not auto-fetch when permission is prompt (not yet decided)', async () => {
    mockPermissions('prompt');
    mockGeolocation();
    renderDropdown();

    await new Promise((r) => setTimeout(r, 50));

    const locationBtn = screen.getByTitle('Show nearby resorts');
    expect(locationBtn.className).not.toContain('active');
    expect(
      (navigator.geolocation.getCurrentPosition as ReturnType<typeof mock>).mock.calls.length,
    ).toBe(0);
  });

  it('handles geolocation error gracefully during auto-fetch', async () => {
    mockPermissions('granted');
    mockGeolocation({ shouldFail: true });
    renderDropdown();

    // Wait for the async effect to complete
    await new Promise((r) => setTimeout(r, 50));

    const locationBtn = screen.getByTitle('Show nearby resorts');
    expect(locationBtn.className).not.toContain('active');
  });

  it('falls back gracefully when permissions API is unavailable', async () => {
    Object.defineProperty(navigator, 'permissions', {
      value: undefined,
      configurable: true,
    });
    mockGeolocation();
    renderDropdown();

    await new Promise((r) => setTimeout(r, 50));

    const locationBtn = screen.getByTitle('Show nearby resorts');
    expect(locationBtn.className).not.toContain('active');
  });

  it('falls back gracefully when permissions.query throws', async () => {
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: mock(() => Promise.reject(new Error('not supported'))),
      },
      configurable: true,
    });
    mockGeolocation();
    renderDropdown();

    await new Promise((r) => setTimeout(r, 50));

    const locationBtn = screen.getByTitle('Show nearby resorts');
    expect(locationBtn.className).not.toContain('active');
  });

  it('shows nearby resorts in dropdown after auto-fetch when clicked', async () => {
    const user = userEvent.setup();
    mockPermissions('granted');
    mockGeolocation();
    await renderDropdown();

    const locationBtn = screen.getByTitle('Show nearby resorts');
    await waitFor(() => {
      expect(locationBtn.className).toContain('active');
    });

    // Click the location button to open the dropdown — data is already loaded
    await user.click(locationBtn);
    const panel = screen.getByRole('listbox');
    const options = within(panel).getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(1);
  });
});
