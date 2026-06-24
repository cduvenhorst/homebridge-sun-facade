import { describe, it, expect } from 'vitest';
import { isAzimuthInRange, isFacadeActive } from './facade';
import type { FacadeConfig } from './settings';
import type { SunPosition } from './sun';

describe('isAzimuthInRange', () => {
  it('matches values inside a simple range', () => {
    expect(isAzimuthInRange(100, 60, 135)).toBe(true);
    expect(isAzimuthInRange(60, 60, 135)).toBe(true);
    expect(isAzimuthInRange(135, 60, 135)).toBe(true);
  });

  it('rejects values outside a simple range', () => {
    expect(isAzimuthInRange(200, 60, 135)).toBe(false);
  });

  it('handles ranges that wrap across 0/360 (e.g. west-north)', () => {
    expect(isAzimuthInRange(350, 300, 30)).toBe(true);
    expect(isAzimuthInRange(10, 300, 30)).toBe(true);
    expect(isAzimuthInRange(180, 300, 30)).toBe(false);
    expect(isAzimuthInRange(300, 300, 30)).toBe(true); // lower wrap boundary
    expect(isAzimuthInRange(30, 300, 30)).toBe(true);  // upper wrap boundary
  });
});

describe('isFacadeActive', () => {
  const east: FacadeConfig = { name: 'Ost', azimuthMin: 60, azimuthMax: 135, altitudeMin: 10 };

  it('is active when azimuth is in range and altitude meets the minimum', () => {
    const sun: SunPosition = { azimuth: 100, altitude: 20 };
    expect(isFacadeActive(sun, east)).toBe(true);
  });

  it('is inactive when the sun is too low even if azimuth matches', () => {
    const sun: SunPosition = { azimuth: 100, altitude: 5 };
    expect(isFacadeActive(sun, east)).toBe(false);
  });

  it('treats altitude exactly on the minimum as active', () => {
    const sun: SunPosition = { azimuth: 100, altitude: 10 };
    expect(isFacadeActive(sun, east)).toBe(true);
  });

  it('is inactive when azimuth is out of range', () => {
    const sun: SunPosition = { azimuth: 200, altitude: 40 };
    expect(isFacadeActive(sun, east)).toBe(false);
  });

  it('allows overlapping facades to be active at the same time', () => {
    const south: FacadeConfig = { name: 'Süd', azimuthMin: 90, azimuthMax: 225, altitudeMin: 5 };
    const sun: SunPosition = { azimuth: 120, altitude: 30 };
    expect(isFacadeActive(sun, east)).toBe(true);
    expect(isFacadeActive(sun, south)).toBe(true);
  });
});
