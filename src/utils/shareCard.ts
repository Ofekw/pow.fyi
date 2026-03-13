/**
 * shareCard — Renders a branded share card image using the Canvas API.
 *
 * Draws a compact forecast summary card for a resort, suitable for
 * sharing on social media or messaging apps. Includes the resort name,
 * 7-day snow forecast bars, temperature range, and pow.fyi branding.
 */
import type { DailyMetrics, Resort, ElevationBand } from '@/types';
import { cmToIn } from '@/utils/weather';

/* ── Theme constants ─────────────────────────────── */
const BG = '#0b1120';
const SURFACE = '#141b2d';
const BORDER = '#1e3a5f';
const ACCENT = '#38bdf8';
const TEXT = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const SNOW_BAR = '#38bdf8';
const SNOW_BAR_HIGHLIGHT = '#7dd3fc';

const CARD_W = 600;
const CARD_H = 420;
const PAD = 24;
const RADIUS = 12;

export interface ShareCardData {
  resort: Resort;
  daily: DailyMetrics[];
  displayedDailySnowfall?: number[];
  band: ElevationBand;
  elevation: number;
  weekTotalSnow: number;
  snowUnit: 'in' | 'cm';
  tempUnit: 'C' | 'F';
  elevUnit: 'ft' | 'm';
}

/* ── Helpers ──────────────────────────────────────── */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fmtSnowVal(cm: number, unit: 'in' | 'cm'): string {
  if (unit === 'in') return `${cmToIn(cm).toFixed(1)}"`;
  return `${cm.toFixed(1)}cm`;
}

function fmtTempVal(celsius: number, unit: 'C' | 'F'): string {
  if (unit === 'F') return `${Math.round(celsius * 9 / 5 + 32)}°`;
  return `${Math.round(celsius)}°`;
}

function fmtElevVal(meters: number, unit: 'ft' | 'm'): string {
  if (unit === 'ft') return `${Math.round(meters * 3.28084).toLocaleString()}ft`;
  return `${Math.round(meters).toLocaleString()}m`;
}

function shortDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

/* ── Main render function ────────────────────────── */

export function renderShareCard(data: ShareCardData): HTMLCanvasElement {
  const {
    resort,
    daily,
    displayedDailySnowfall,
    band,
    elevation,
    weekTotalSnow,
    snowUnit,
    tempUnit,
    elevUnit,
  } = data;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 2;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W * dpr;
  canvas.height = CARD_H * dpr;
  canvas.style.width = `${CARD_W}px`;
  canvas.style.height = `${CARD_H}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = BG;
  roundRect(ctx, 0, 0, CARD_W, CARD_H, RADIUS);
  ctx.fill();

  // Inner card surface
  ctx.fillStyle = SURFACE;
  roundRect(ctx, PAD / 2, PAD / 2, CARD_W - PAD, CARD_H - PAD, RADIUS - 2);
  ctx.fill();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = PAD + 8;

  // ─── Branding row ───
  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'top';
  // Snowflake unicode ❄
  ctx.fillText('❄ Pow.fyi', PAD, y);

  // Date range on the right
  if (daily.length > 0) {
    const first = daily[0]!;
    const last = daily[daily.length - 1]!;
    const dateRange = `${formatShortDate(first.date)} – ${formatShortDate(last.date)}`;
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    const rangeW = ctx.measureText(dateRange).width;
    ctx.fillText(dateRange, CARD_W - PAD - rangeW, y + 2);
  }
  y += 28;

  // ─── Resort name ───
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(resort.name, PAD, y);
  y += 28;

  // Region + elevation
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  const elevLabel = `${resort.region}, ${resort.country} · ${band.toUpperCase()} ${fmtElevVal(elevation, elevUnit)}`;
  ctx.fillText(elevLabel, PAD, y);
  y += 26;

  // ─── Divider ───
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(CARD_W - PAD, y);
  ctx.stroke();
  y += 16;

  // ─── 7-Day Snow Forecast title + total ───
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('7-Day Snow Forecast', PAD, y);

  if (weekTotalSnow > 0) {
    const totalLabel = `${fmtSnowVal(weekTotalSnow, snowUnit)} total`;
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    const totalW = ctx.measureText(totalLabel).width;
    ctx.fillText(totalLabel, CARD_W - PAD - totalW, y);
  }
  y += 24;

  // ─── Bar chart ───
  const barAreaH = 140;
  const barAreaY = y;
  const numDays = Math.min(daily.length, 7);
  const barGap = 12;
  const barAreaW = CARD_W - PAD * 2;
  const barW = numDays > 1 ? (barAreaW - barGap * (numDays - 1)) / numDays : barAreaW;

  // Find max snow for scaling (guard against empty array)
  const snowValues = daily.slice(0, 7).map((d, i) => displayedDailySnowfall?.[i] ?? d.snowfallSum);
  const maxSnow = snowValues.length > 0 ? Math.max(...snowValues, 0.1) : 0.1;

  for (let i = 0; i < numDays; i++) {
    const d = daily[i]!;
    const x = PAD + i * (barW + barGap);
    const snowVal = displayedDailySnowfall?.[i] ?? d.snowfallSum;
    const barH = Math.max((snowVal / maxSnow) * (barAreaH - 52), snowVal > 0 ? 4 : 0);

    // Snow value label above bar
    ctx.fillStyle = snowVal > 0 ? ACCENT : TEXT_MUTED;
    ctx.font = `bold 11px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    const label = snowVal > 0 ? fmtSnowVal(snowVal, snowUnit) : '—';
    ctx.fillText(label, x + barW / 2, barAreaY);

    // Bar
    if (barH > 0) {
      const barY = barAreaY + (barAreaH - 52) - barH + 16;
      const gradient = ctx.createLinearGradient(x, barY, x, barY + barH);
      gradient.addColorStop(0, SNOW_BAR_HIGHLIGHT);
      gradient.addColorStop(1, SNOW_BAR);
      ctx.fillStyle = gradient;
      roundRect(ctx, x + 4, barY, barW - 8, barH, 3);
      ctx.fill();
    }

    // Temperature range
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `${fmtTempVal(d.temperatureMax, tempUnit)}/${fmtTempVal(d.temperatureMin, tempUnit)}`,
      x + barW / 2,
      barAreaY + barAreaH - 28,
    );

    // Day label
    ctx.fillStyle = i === 0 ? ACCENT : TEXT;
    ctx.font = `${i === 0 ? 'bold ' : ''}12px system-ui, -apple-system, sans-serif`;
    ctx.fillText(i === 0 ? 'Today' : shortDay(d.date), x + barW / 2, barAreaY + barAreaH - 14);
  }

  ctx.textAlign = 'left';
  y = barAreaY + barAreaH + 8;

  // ─── Footer with URL ───
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(CARD_W - PAD, y);
  ctx.stroke();
  y += 14;

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText(`pow.fyi/resort/${resort.slug}`, PAD, y);

  // "Powered by Open-Meteo" on the right
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  const attrText = 'Powered by Open-Meteo';
  const attrW = ctx.measureText(attrText).width;
  ctx.fillText(attrText, CARD_W - PAD - attrW, y + 2);

  return canvas;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Export as blob ───────────────────────────────── */

export function shareCardToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create image blob'));
      },
      'image/png',
    );
  });
}
