import type { SunPosition } from './sun';
import type { FacadeConfig } from './settings';

export function isAzimuthInRange(azimuth: number, min: number, max: number): boolean {
  if (min <= max) {
    return azimuth >= min && azimuth <= max;
  }
  // Range wraps across 0/360 (e.g. min=300, max=30).
  return azimuth >= min || azimuth <= max;
}

export function isFacadeActive(sun: SunPosition, facade: FacadeConfig): boolean {
  return (
    isAzimuthInRange(sun.azimuth, facade.azimuthMin, facade.azimuthMax) &&
    sun.altitude >= facade.altitudeMin
  );
}
