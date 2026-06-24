import SunCalc from 'suncalc';

export interface SunPosition {
  /** Compass azimuth in degrees: 0 = N, 90 = E, 180 = S, 270 = W. */
  azimuth: number;
  /** Altitude above the horizon in degrees (negative below horizon). */
  altitude: number;
}

const RAD_TO_DEG = 180 / Math.PI;

export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function getSunPosition(
  date: Date,
  latitude: number,
  longitude: number,
): SunPosition {
  const pos = SunCalc.getPosition(date, latitude, longitude);
  // suncalc azimuth: radians measured from south, positive towards west.
  // Compass = south(180) + suncalcDegrees, normalized to [0,360).
  const azimuth = normalizeDegrees(pos.azimuth * RAD_TO_DEG + 180);
  const altitude = pos.altitude * RAD_TO_DEG;
  return { azimuth, altitude };
}
