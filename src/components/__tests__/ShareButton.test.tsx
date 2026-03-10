import { describe, it, expect, mock, afterAll, beforeEach } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareButton } from '@/components/ShareButton';
import type { ShareCardData } from '@/utils/shareCard';

// Mock shareCard utils to avoid Canvas in tests
mock.module('@/utils/shareCard', () => ({
  renderShareCard: mock(() => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 420;
    return c;
  }),
  shareCardToBlob: mock(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
}));

afterAll(() => {
  mock.restore();
});

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
        snowfallSum: 8,
        precipitationProbabilityMax: 80,
        windSpeedMax: 20,
        windGustsMax: 35,
      },
    ],
    band: 'mid',
    elevation: 3050,
    weekTotalSnow: 8,
    snowUnit: 'in',
    tempUnit: 'F',
    elevUnit: 'ft',
  };
}

/** Save and restore navigator properties between tests */
let origShare: typeof navigator.share;
let origCanShare: typeof navigator.canShare;
let origClipboard: typeof navigator.clipboard;

beforeEach(() => {
  origShare = navigator.share;
  origCanShare = navigator.canShare;
  origClipboard = navigator.clipboard;
});

afterAll(() => {
  Object.defineProperty(navigator, 'share', { value: origShare, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: origCanShare, configurable: true });
  Object.defineProperty(navigator, 'clipboard', { value: origClipboard, configurable: true });
});

function setNavigator(overrides: {
  share?: typeof navigator.share;
  canShare?: typeof navigator.canShare;
  clipboard?: Partial<typeof navigator.clipboard>;
}) {
  if ('share' in overrides) {
    Object.defineProperty(navigator, 'share', { value: overrides.share, configurable: true });
  }
  if ('canShare' in overrides) {
    Object.defineProperty(navigator, 'canShare', { value: overrides.canShare, configurable: true });
  }
  if ('clipboard' in overrides) {
    Object.defineProperty(navigator, 'clipboard', { value: overrides.clipboard, configurable: true });
  }
}

describe('ShareButton', () => {
  it('renders a share button', () => {
    render(<ShareButton cardData={makeCardData()} />);
    const btn = screen.getByRole('button', { name: /share forecast/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('shows "Share" label', () => {
    render(<ShareButton cardData={makeCardData()} />);
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('is disabled when cardData is null', () => {
    render(<ShareButton cardData={null} />);
    const btn = screen.getByRole('button', { name: /share forecast/i });
    expect(btn).toBeDisabled();
  });

  it('shows "Shared!" and toast on successful Web Share with files', async () => {
    const user = userEvent.setup();
    const shareMock = mock(() => Promise.resolve());
    const canShareMock = mock(() => true);
    setNavigator({ share: shareMock, canShare: canShareMock });

    render(<ShareButton cardData={makeCardData()} />);
    await user.click(screen.getByRole('button', { name: /share forecast/i }));

    await waitFor(() => {
      expect(screen.getByText('Shared!')).toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Shared successfully!');
    expect(shareMock).toHaveBeenCalledTimes(1);
    // Verify files were included since canShare returned true
    const callArg = shareMock.mock.calls[0][0] as { files?: File[] };
    expect(callArg.files).toBeDefined();
    expect(callArg.files!.length).toBe(1);
  });

  it('shares URL-only when canShare rejects files', async () => {
    const user = userEvent.setup();
    const shareMock = mock(() => Promise.resolve());
    const canShareMock = mock(() => false);
    setNavigator({ share: shareMock, canShare: canShareMock });

    render(<ShareButton cardData={makeCardData()} />);
    await user.click(screen.getByRole('button', { name: /share forecast/i }));

    await waitFor(() => {
      expect(screen.getByText('Shared!')).toBeInTheDocument();
    });
    // Verify no files were included since canShare returned false
    const callArg = shareMock.mock.calls[0][0] as { files?: File[]; url?: string };
    expect(callArg.files).toBeUndefined();
    expect(callArg.url).toContain('/resort/vail-co');
  });

  it('resets to idle when user cancels Web Share (AbortError)', async () => {
    const user = userEvent.setup();
    const abortErr = new DOMException('Share cancelled', 'AbortError');
    const shareMock = mock(() => Promise.reject(abortErr));
    setNavigator({ share: shareMock, canShare: mock(() => true) });

    render(<ShareButton cardData={makeCardData()} />);
    await user.click(screen.getByRole('button', { name: /share forecast/i }));

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument();
    });
  });

  it('falls back to clipboard image when Web Share is unavailable', async () => {
    const user = userEvent.setup();
    const writeMock = mock(() => Promise.resolve());
    setNavigator({
      share: undefined,
      canShare: undefined,
      clipboard: { write: writeMock, writeText: mock(() => Promise.resolve()), readText: mock(() => Promise.resolve('')) } as unknown as Clipboard,
    });

    render(<ShareButton cardData={makeCardData()} />);
    await user.click(screen.getByRole('button', { name: /share forecast/i }));

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Screenshot and link copied!');
    expect(writeMock).toHaveBeenCalledTimes(1);
    const clipboardItem = writeMock.mock.calls[0][0][0] as ClipboardItem;
    expect(clipboardItem.types).toContain('image/png');
    expect(clipboardItem.types).toContain('text/plain');
  });

  it('keeps a stable accessible name for icon-only share buttons', async () => {
    const user = userEvent.setup();
    const shareMock = mock(() => Promise.resolve());
    const canShareMock = mock(() => false);
    setNavigator({ share: shareMock, canShare: canShareMock });

    render(<ShareButton cardData={makeCardData()} className="fab fab--icon" iconOnly />);

    const btn = screen.getByRole('button', { name: /share forecast/i });
    expect(btn).not.toHaveTextContent('Share');

    await user.click(btn);

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('button', { name: /share forecast/i })).toBeInTheDocument();
  });

  it('falls back to clipboard URL when image clipboard write fails', async () => {
    const user = userEvent.setup();
    const writeTextMock = mock(() => Promise.resolve());
    setNavigator({
      share: undefined,
      canShare: undefined,
      clipboard: {
        write: mock(() => Promise.reject(new Error('Not allowed'))),
        writeText: writeTextMock,
        readText: mock(() => Promise.resolve('')),
      } as unknown as Clipboard,
    });

    render(<ShareButton cardData={makeCardData()} />);
    await user.click(screen.getByRole('button', { name: /share forecast/i }));

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Link copied to clipboard!');
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock.mock.calls[0][0]).toContain('/resort/vail-co');
  });

  it('includes band and day query params in share URL', async () => {
    const user = userEvent.setup();
    const shareMock = mock(() => Promise.resolve());
    const canShareMock = mock(() => false);
    setNavigator({ share: shareMock, canShare: canShareMock });

    const data = makeCardData();
    data.band = 'top';
    render(<ShareButton cardData={data} selectedDayIdx={3} />);
    await user.click(screen.getByRole('button', { name: /share forecast/i }));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledTimes(1);
    });
    const callArg = shareMock.mock.calls[0][0] as { url?: string };
    expect(callArg.url).toContain('band=top');
    expect(callArg.url).toContain('day=3');
  });

  it('omits query params when band is mid and day is 0', async () => {
    const user = userEvent.setup();
    const shareMock = mock(() => Promise.resolve());
    const canShareMock = mock(() => false);
    setNavigator({ share: shareMock, canShare: canShareMock });

    render(<ShareButton cardData={makeCardData()} selectedDayIdx={0} />);
    await user.click(screen.getByRole('button', { name: /share forecast/i }));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledTimes(1);
    });
    const callArg = shareMock.mock.calls[0][0] as { url?: string };
    expect(callArg.url).not.toContain('?');
  });
});
