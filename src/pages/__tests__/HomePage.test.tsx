import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '@/pages/HomePage';
import { renderWithProviders } from '@/test/test-utils';

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
});

afterEach(() => {
  mock.restore();
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

  it('renders resort cards', async () => {
    await renderHomePage();
    // Vail should be listed
    expect(screen.getByText('Vail')).toBeInTheDocument();
  });

  it('groups resorts by region', async () => {
    await renderHomePage();
    expect(screen.getByText('Colorado')).toBeInTheDocument();
    expect(screen.getByText('Utah')).toBeInTheDocument();
  });

  it('filters resorts by search query', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'Vail');

    // Vail appears in both the dropdown and the resort card
    expect(screen.getAllByText('Vail').length).toBeGreaterThanOrEqual(1);
    // Stowe should be filtered out
    expect(screen.queryByText('Stowe')).not.toBeInTheDocument();
  });

  it('shows no-match message when nothing found', async () => {
    const user = userEvent.setup();
    await renderHomePage();

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'zzznotaresort');

    // No-match message appears in both the dropdown and the main section
    expect(screen.getAllByText(/no resorts match/i).length).toBeGreaterThanOrEqual(1);
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
});
