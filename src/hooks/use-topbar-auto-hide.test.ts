import { describe, expect, it } from 'vitest';
import { getTopbarAutoHideEnabled } from './use-topbar-auto-hide';

describe('getTopbarAutoHideEnabled', () => {
  it('defaults to the effective infinite feed setting', () => {
    expect(getTopbarAutoHideEnabled(null, true)).toBe(true);
    expect(getTopbarAutoHideEnabled(null, false)).toBe(false);
  });

  it('allows auto-hide to be disabled while infinite feed stays enabled', () => {
    expect(getTopbarAutoHideEnabled(false, true)).toBe(false);
  });

  it('does not enable auto-hide without infinite feed', () => {
    expect(getTopbarAutoHideEnabled(true, false)).toBe(false);
  });
});
