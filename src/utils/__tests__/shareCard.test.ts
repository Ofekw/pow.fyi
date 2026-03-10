import { describe, it, expect } from 'bun:test';
import { renderShareCard, shareCardToBlob } from '@/utils/shareCard';
import type { ShareCardData } from '@/utils/shareCard';

function makeShareData(overrides?: Partial<ShareCardData>): ShareCardData {
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
      lifts: 31,
      acres: 5317,
      website: 'https://www.vail.com',
    },
    daily: Array.from({ length: 7 }, (_, i) => ({
      date: `2025-01-${15 + i}`,
      weatherCode: 73,
      temperatureMax: -2 + i,
      temperatureMin: -10 + i,
      apparentTemperatureMax: -5 + i,
      apparentTemperatureMin: -15 + i,
      uvIndexMax: 3,
      precipitationSum: 5,
      rainSum: 0,
      snowfallSum: i === 0 ? 8 : i === 3 ? 12 : i === 5 ? 3 : 0,
      precipitationProbabilityMax: 80,
      windSpeedMax: 20,
      windGustsMax: 35,
    })),
    band: 'mid',
    elevation: 3050,
    weekTotalSnow: 23,
    snowUnit: 'in',
    tempUnit: 'F',
    elevUnit: 'ft',
    ...overrides,
  };
}

describe('renderShareCard', () => {
  it('returns a canvas element', () => {
    const canvas = renderShareCard(makeShareData());
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it('has expected dimensions', () => {
    const canvas = renderShareCard(makeShareData());
    // Base dimensions are 600×420; pixel size may be scaled by DPR
    expect(canvas.width).toBeGreaterThanOrEqual(600);
    expect(canvas.height).toBeGreaterThanOrEqual(420);
  });

  it('works with metric units', () => {
    const canvas = renderShareCard(makeShareData({
      snowUnit: 'cm',
      tempUnit: 'C',
      elevUnit: 'm',
    }));
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it('works with zero snowfall days', () => {
    const data = makeShareData({
      daily: Array.from({ length: 7 }, (_, i) => ({
        date: `2025-01-${15 + i}`,
        weatherCode: 0,
        temperatureMax: 5,
        temperatureMin: -2,
        apparentTemperatureMax: 3,
        apparentTemperatureMin: -5,
        uvIndexMax: 5,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        precipitationProbabilityMax: 10,
        windSpeedMax: 10,
        windGustsMax: 15,
      })),
      weekTotalSnow: 0,
    });
    const canvas = renderShareCard(data);
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it('handles fewer than 7 days', () => {
    const data = makeShareData({
      daily: makeShareData().daily.slice(0, 3),
    });
    const canvas = renderShareCard(data);
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });
});

describe('shareCardToBlob', () => {
  it('produces a PNG blob', async () => {
    const canvas = renderShareCard(makeShareData());
    const blob = await shareCardToBlob(canvas);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });
});
