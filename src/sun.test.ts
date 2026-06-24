import { describe, it, expect } from 'vitest';
import { normalizeDegrees, getSunPosition } from './sun';

describe('normalizeDegrees', () => {
  it('wraps negative and large angles into [0,360)', () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(450)).toBe(90);
    expect(normalizeDegrees(360)).toBe(0);
  });
});

describe('getSunPosition', () => {
  it('returns azimuth in compass degrees and altitude in degrees', () => {
    // Hannover, 2026-06-21 ~12:00 UTC (Sonne hoch, nahe Süden)
    const date = new Date('2026-06-21T12:00:00Z');
    const pos = getSunPosition(date, 52.37, 9.74);

    expect(pos.azimuth).toBeGreaterThanOrEqual(0);
    expect(pos.azimuth).toBeLessThan(360);
    // Mittags steht die Sonne grob im Süden (~180°) und hoch über dem Horizont.
    expect(pos.azimuth).toBeGreaterThan(150);
    expect(pos.azimuth).toBeLessThan(210);
    expect(pos.altitude).toBeGreaterThan(40);
  });

  it('reports a negative altitude at local midnight', () => {
    const date = new Date('2026-06-21T00:00:00Z');
    const pos = getSunPosition(date, 52.37, 9.74);
    expect(pos.altitude).toBeLessThan(0);
  });
});
