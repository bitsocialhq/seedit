import { describe, expect, it } from 'vitest';
import { deriveCommunityNsfw } from './nsfw-utils';

describe('deriveCommunityNsfw', () => {
  it('inverts the protocol safeForWork setting exactly once', () => {
    expect(deriveCommunityNsfw({ features: { safeForWork: false } })).toBe(true);
    expect(deriveCommunityNsfw({ features: { safeForWork: true } })).toBe(false);
  });

  it('lets the live community override the curated list entry in both directions', () => {
    expect(deriveCommunityNsfw({ features: { safeForWork: true } }, { nsfw: true })).toBe(false);
    expect(deriveCommunityNsfw({ features: { safeForWork: false } }, { nsfw: false })).toBe(true);
  });

  it('falls back to the curated list entry when no live community declares the setting', () => {
    expect(deriveCommunityNsfw(undefined, { nsfw: true })).toBe(true);
    expect(deriveCommunityNsfw(undefined, { nsfw: false })).toBe(false);
    expect(deriveCommunityNsfw({}, { nsfw: true })).toBe(true);
    expect(deriveCommunityNsfw({ features: {} }, { nsfw: true })).toBe(true);
  });

  it('returns undefined when nothing declares the setting', () => {
    expect(deriveCommunityNsfw()).toBeUndefined();
    expect(deriveCommunityNsfw({}, {})).toBeUndefined();
    expect(deriveCommunityNsfw({ features: {} }, {})).toBeUndefined();
  });

  it('treats non-boolean safeForWork values as undeclared rather than true', () => {
    for (const safeForWork of ['true', 'false', null, 0, 1, {}, []] as unknown[]) {
      expect(deriveCommunityNsfw({ features: { safeForWork } })).toBeUndefined();
      expect(deriveCommunityNsfw({ features: { safeForWork } }, { nsfw: true })).toBe(true);
    }
  });

  it('treats non-boolean curated nsfw values as undeclared rather than true', () => {
    for (const nsfw of ['true', null, 0, 1] as unknown[]) {
      expect(deriveCommunityNsfw(undefined, { nsfw } as { nsfw?: boolean })).toBeUndefined();
    }
  });

  it('tolerates a missing or non-object features field', () => {
    expect(deriveCommunityNsfw({ features: null }, { nsfw: true })).toBe(true);
    expect(deriveCommunityNsfw({ features: undefined })).toBeUndefined();
  });
});
