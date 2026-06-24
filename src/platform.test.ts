import { describe, it, expect } from 'vitest';
import { SunFacadePlatform } from './platform';
import type { FacadeConfig } from './settings';

// Minimaler Fake der von der Plattform genutzten Homebridge-API.
function makeFakeApi() {
  const registered: FakePlatformAccessory[] = [];
  const ContactSensorState = { CONTACT_DETECTED: 0, CONTACT_NOT_DETECTED: 1 };

  class FakeService {
    public lastChar: unknown = undefined;
    public lastValue: unknown = undefined;
    constructor(public readonly type: string, public readonly name: string) {}
    updateCharacteristic(char: unknown, value: unknown) {
      this.lastChar = char;
      this.lastValue = value;
      return this;
    }
  }

  class FakePlatformAccessory {
    public UUID: string;
    public context: Record<string, unknown> = {};
    public services: FakeService[] = [];
    constructor(public displayName: string, uuid: string) {
      // Mirror real hap-nodejs: an empty displayName is an assertion error.
      if (!displayName || displayName.trim() === '') {
        throw new Error('Accessories must be created with a non-empty displayName.');
      }
      this.UUID = uuid;
    }
    addService(type: string, name: string) {
      const s = new FakeService(type, name);
      this.services.push(s);
      return s;
    }
    getService(type: string) {
      return this.services.find((s) => s.type === type);
    }
  }

  const api = {
    hap: {
      Service: { ContactSensor: 'ContactSensor' },
      Characteristic: { ContactSensorState },
      uuid: { generate: (s: string) => `uuid:${s}` },
    },
    platformAccessory: FakePlatformAccessory,
    on: () => undefined,
    registerPlatformAccessories: (_p: string, _pl: string, accs: FakePlatformAccessory[]) => {
      registered.push(...accs);
    },
    updatePlatformAccessories: () => undefined,
    unregisterPlatformAccessories: (_p: string, _pl: string, accs: FakePlatformAccessory[]) => {
      for (const a of accs) {
        const i = registered.indexOf(a);
        if (i >= 0) registered.splice(i, 1);
      }
    },
  };

  const log = { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined };

  return { api, log, registered, ContactSensorState, FakePlatformAccessory };
}

const ALWAYS_ON: FacadeConfig = { name: 'AlwaysOn', azimuthMin: 0, azimuthMax: 360, altitudeMin: -90 };
const ALWAYS_OFF: FacadeConfig = { name: 'AlwaysOff', azimuthMin: 0, azimuthMax: 360, altitudeMin: 91 };

describe('SunFacadePlatform', () => {
  it('registers one accessory per configured facade', () => {
    const { api, log } = makeFakeApi();
    const config = {
      platform: 'SunFacade',
      latitude: 52.37,
      longitude: 9.74,
      updateIntervalSeconds: 60,
      updateMode: 'onChange',
      facades: [ALWAYS_ON, ALWAYS_OFF],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = new SunFacadePlatform(log as any, config as any, api as any);
    platform.discoverFacades();

    expect(api.hap).toBeDefined();
    // beide Fassaden wurden registriert
    expect((platform as any).accessories.size).toBe(2);
  });

  it('maps an illuminated facade to CONTACT_NOT_DETECTED and a dark one to CONTACT_DETECTED', () => {
    const { api, log, ContactSensorState } = makeFakeApi();
    const config = {
      platform: 'SunFacade',
      latitude: 52.37,
      longitude: 9.74,
      updateIntervalSeconds: 60,
      updateMode: 'onChange',
      facades: [ALWAYS_ON, ALWAYS_OFF],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = new SunFacadePlatform(log as any, config as any, api as any);
    platform.discoverFacades();
    platform.update(new Date('2026-06-21T12:00:00Z'));

    const accessories = Array.from((platform as any).accessories.values());
    const on = accessories.find((a: any) => a.displayName === 'AlwaysOn');
    const off = accessories.find((a: any) => a.displayName === 'AlwaysOff');
    expect(on.getService('ContactSensor').lastValue).toBe(ContactSensorState.CONTACT_NOT_DETECTED);
    expect(off.getService('ContactSensor').lastValue).toBe(ContactSensorState.CONTACT_DETECTED);
  });

  it('adds ContactSensor service to a cached accessory that is missing it', () => {
    const { api, log, FakePlatformAccessory, ContactSensorState } = makeFakeApi();
    const config = {
      platform: 'SunFacade',
      latitude: 52.37,
      longitude: 9.74,
      updateIntervalSeconds: 60,
      updateMode: 'onChange',
      facades: [ALWAYS_ON],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = new SunFacadePlatform(log as any, config as any, api as any);

    // Simulate a cached accessory with the correct UUID but NO ContactSensor service
    const cachedUuid = `uuid:homebridge-sun-facade:AlwaysOn`;
    const cached = new FakePlatformAccessory('AlwaysOn', cachedUuid);
    platform.configureAccessory(cached as any);

    platform.discoverFacades();

    // The service should now exist on the cached accessory
    expect(cached.getService('ContactSensor')).toBeDefined();

    platform.update(new Date('2026-06-21T12:00:00Z'));

    // AlwaysOn facade is always active → CONTACT_NOT_DETECTED
    expect(cached.getService('ContactSensor')!.lastValue).toBe(ContactSensorState.CONTACT_NOT_DETECTED);
  });

  it('skips facades with a missing or empty name instead of crashing Homebridge', () => {
    const { api } = makeFakeApi();
    const warnings: string[] = [];
    const log = {
      info: () => undefined,
      warn: (m: string) => warnings.push(m),
      error: () => undefined,
      debug: () => undefined,
    };
    const config = {
      platform: 'SunFacade',
      latitude: 52.37,
      longitude: 9.74,
      updateIntervalSeconds: 60,
      updateMode: 'onChange',
      facades: [
        { name: '', azimuthMin: 0, azimuthMax: 360, altitudeMin: 0 },
        { name: '   ', azimuthMin: 0, azimuthMax: 360, altitudeMin: 0 },
        ALWAYS_ON,
      ],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = new SunFacadePlatform(log as any, config as any, api as any);

    expect(() => platform.discoverFacades()).not.toThrow();
    // only the one valid facade is registered
    expect((platform as any).accessories.size).toBe(1);
    // the two invalid entries were each warned about
    expect(warnings.length).toBe(2);
  });

  it('removes cached accessories no longer present in the config', () => {
    const { api, log, FakePlatformAccessory, registered } = makeFakeApi();
    const config = {
      platform: 'SunFacade',
      latitude: 52.37,
      longitude: 9.74,
      updateIntervalSeconds: 60,
      updateMode: 'onChange',
      facades: [ALWAYS_ON],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platform = new SunFacadePlatform(log as any, config as any, api as any);

    const stale = new FakePlatformAccessory('Stale', 'uuid:stale');
    registered.push(stale);
    // simuliert Homebridge-Cache-Restore beim Start
    platform.configureAccessory(stale as any);

    platform.discoverFacades();

    expect((platform as any).accessories.has('uuid:stale')).toBe(false);
    expect(registered.includes(stale)).toBe(false);
  });
});
