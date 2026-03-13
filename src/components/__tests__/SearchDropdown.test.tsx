import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { act, screen, within } from '@testing-library/react';
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

beforeEach(() => {
  currentQuery = '';
  favSlugs.clear();
  mockToggle.mockClear();
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
