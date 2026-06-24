export const PLATFORM_NAME = 'SunFacade';
export const PLUGIN_NAME = 'homebridge-sun-facade';

export type UpdateMode = 'onChange' | 'always';

export interface FacadeConfig {
  name: string;
  azimuthMin: number;
  azimuthMax: number;
  altitudeMin: number;
}

export interface SunFacadeConfig {
  platform: string;
  latitude: number;
  longitude: number;
  updateIntervalSeconds: number;
  updateMode: UpdateMode;
  facades: FacadeConfig[];
}
