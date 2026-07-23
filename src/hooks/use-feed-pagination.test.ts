import { describe, expect, it } from 'vitest';
import { getInfiniteFeedEnabled } from './use-feed-pagination';

describe('getInfiniteFeedEnabled', () => {
  it('defaults to infinite loading on mobile and manual pagination on desktop', () => {
    expect(getInfiniteFeedEnabled(null, true)).toBe(true);
    expect(getInfiniteFeedEnabled(null, false)).toBe(false);
  });

  it('uses an explicit preference on every viewport', () => {
    expect(getInfiniteFeedEnabled(false, true)).toBe(false);
    expect(getInfiniteFeedEnabled(true, false)).toBe(true);
  });
});
