import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import type { FacadeConfig, SunFacadeConfig, UpdateMode } from './settings';
import { getSunPosition } from './sun';
import { isFacadeActive } from './facade';
import { shouldWrite } from './update';

export class SunFacadePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  private readonly accessories: Map<string, PlatformAccessory> = new Map();
  private readonly lastState: Map<string, boolean> = new Map();
  private timer?: ReturnType<typeof setInterval>;

  private readonly latitude: number;
  private readonly longitude: number;
  private readonly updateIntervalSeconds: number;
  private readonly updateMode: UpdateMode;
  private readonly facades: FacadeConfig[];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    const cfg = config as unknown as SunFacadeConfig;
    this.latitude = cfg.latitude;
    this.longitude = cfg.longitude;
    this.updateIntervalSeconds = cfg.updateIntervalSeconds ?? 60;
    this.updateMode = cfg.updateMode ?? 'onChange';
    this.facades = cfg.facades ?? [];

    this.api.on('didFinishLaunching', () => {
      this.discoverFacades();
      this.startLoop();
    });
    this.api.on('shutdown', () => {
      if (this.timer) {
        clearInterval(this.timer);
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.set(accessory.UUID, accessory);
  }

  discoverFacades(): void {
    const validUuids = new Set<string>();

    for (const facade of this.facades) {
      if (!facade || typeof facade.name !== 'string' || facade.name.trim() === '') {
        this.log.warn(
          'Skipping a facade with a missing or empty "name". Every facade needs a non-empty name.',
        );
        continue;
      }

      const uuid = this.api.hap.uuid.generate(`${PLUGIN_NAME}:${facade.name}`);
      validUuids.add(uuid);

      const existing = this.accessories.get(uuid);
      if (existing) {
        existing.context.facade = facade;
        if (!existing.getService(this.Service.ContactSensor)) {
          existing.addService(this.Service.ContactSensor, facade.name);
        }
        this.api.updatePlatformAccessories([existing]);
      } else {
        const accessory = new this.api.platformAccessory(facade.name, uuid);
        accessory.context.facade = facade;
        accessory.addService(this.Service.ContactSensor, facade.name);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.set(uuid, accessory);
      }
    }

    for (const [uuid, accessory] of this.accessories) {
      if (!validUuids.has(uuid)) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.delete(uuid);
        this.lastState.delete(uuid);
      }
    }
  }

  private startLoop(): void {
    this.update();
    this.timer = setInterval(() => this.update(), this.updateIntervalSeconds * 1000);
  }

  update(now: Date = new Date()): void {
    const sun = getSunPosition(now, this.latitude, this.longitude);

    for (const accessory of this.accessories.values()) {
      const facade = accessory.context.facade as FacadeConfig | undefined;
      if (!facade) {
        continue;
      }

      const active = isFacadeActive(sun, facade);
      const previous = this.lastState.get(accessory.UUID);

      if (shouldWrite(previous, active, this.updateMode)) {
        const service = accessory.getService(this.Service.ContactSensor);
        service?.updateCharacteristic(
          this.Characteristic.ContactSensorState,
          active
            ? this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
            : this.Characteristic.ContactSensorState.CONTACT_DETECTED,
        );
      }

      this.lastState.set(accessory.UUID, active);
    }
  }
}
