import { describe, it, expect, beforeEach } from 'bun:test';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '@/pages/HomePage';
import { renderWithProviders } from '@/test/test-utils';

beforeEach(() => {
  localStorage.clear();
});

describe('HomePage', () => {
  it('renders the hero section with title', () => {
    renderWithProviders(<HomePage />);
    expect(
      screen.getByText(/free & open-source ski resort forecasts/i),
    ).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderWithProviders(<HomePage />);
    expect(
      screen.getByText(/free & open-source ski resort forecasts/i),
    ).toBeInTheDocument();
  });

  it('renders the search bar', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByPlaceholderText('Search resorts…')).toBeInTheDocument();
  });

  it('renders resort cards', () => {
    renderWithProviders(<HomePage />);
    // Vail should be listed
    expect(screen.getByText('Vail')).toBeInTheDocument();
  });

  it('groups resorts by region', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText('Colorado')).toBeInTheDocument();
    expect(screen.getByText('Utah')).toBeInTheDocument();
  });

  it('filters resorts by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'Vail');

    // Vail appears in both the dropdown and the resort card
    expect(screen.getAllByText('Vail').length).toBeGreaterThanOrEqual(1);
    // Stowe should be filtered out
    expect(screen.queryByText('Stowe')).not.toBeInTheDocument();
  });

  it('shows no-match message when nothing found', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'zzznotaresort');

    // No-match message appears in both the dropdown and the main section
    expect(screen.getAllByText(/no resorts match/i).length).toBeGreaterThanOrEqual(1);
  });

  it('does not show favorites section when none favorited', () => {
    renderWithProviders(<HomePage />);
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
  });

  it('search has aria-label', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByLabelText('Search resorts')).toBeInTheDocument();
  });

  it('shows easter egg when searching for "Ofek"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'Ofek');

    expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
  });

  it('shows easter egg when searching for "ofek" (lowercase)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'ofek');

    expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
  });

  it('shows easter egg when searching for "OFEK" (uppercase)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'OFEK');

    expect(screen.getByTestId('easter-egg')).toBeInTheDocument();
  });

  it('does not show easter egg for partial matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'Ofe');

    expect(screen.queryByTestId('easter-egg')).not.toBeInTheDocument();
  });

  it('shows mfjh easter egg when searching for "mfjh"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'mfjh');

    expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
  });

  it('shows mfjh easter egg when searching for "MFJH" (uppercase)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'MFJH');

    expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
  });

  it('shows mfjh easter egg when searching for "MfJh" (mixed case)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'MfJh');

    expect(screen.getByTestId('mfjh-easter-egg')).toBeInTheDocument();
  });

  it('does not show mfjh easter egg for partial matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    const search = screen.getByPlaceholderText('Search resorts…');
    await user.type(search, 'mfj');

    expect(screen.queryByTestId('mfjh-easter-egg')).not.toBeInTheDocument();
  });
});
