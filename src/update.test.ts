import { describe, it, expect } from 'vitest';
import { shouldWrite } from './update';

describe('shouldWrite', () => {
  it('in onChange mode writes only when the state changes', () => {
    expect(shouldWrite(undefined, true, 'onChange')).toBe(true);
    expect(shouldWrite(false, true, 'onChange')).toBe(true);
    expect(shouldWrite(true, true, 'onChange')).toBe(false);
    expect(shouldWrite(false, false, 'onChange')).toBe(false);
  });

  it('in always mode writes on every tick', () => {
    expect(shouldWrite(true, true, 'always')).toBe(true);
    expect(shouldWrite(false, false, 'always')).toBe(true);
    expect(shouldWrite(undefined, false, 'always')).toBe(true);
  });
});
