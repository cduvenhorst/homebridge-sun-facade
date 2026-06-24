import { describe, it, expect } from 'vitest';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

describe('settings', () => {
  it('exposes the english platform and plugin identifiers', () => {
    expect(PLATFORM_NAME).toBe('SunFacade');
    expect(PLUGIN_NAME).toBe('homebridge-sun-facade');
  });
});
