import { describe, expect, it } from 'vitest';
import { normalizeRemoteStarterCommunityList, normalizeStarterCommunityList } from './use-default-subscriptions';

describe('normalizeStarterCommunityList', () => {
  it('accepts a versioned starter list and deduplicates addresses', () => {
    expect(
      normalizeStarterCommunityList({
        schemaVersion: 1,
        revision: 2,
        title: 'Starter communities',
        communities: [
          { address: 'aww.bso', title: 'Aww', tags: ['cute', 'cute'] },
          { address: 'aww.bso', title: 'Duplicate' },
          { address: 'news.bso', nsfw: false },
        ],
      }),
    ).toMatchObject({
      schemaVersion: 1,
      revision: 2,
      communities: [
        { address: 'aww.bso', title: 'Aww', tags: ['cute'] },
        { address: 'news.bso', nsfw: false },
      ],
    });
  });

  it('rejects unversioned, empty, and malformed remote payloads', () => {
    expect(normalizeStarterCommunityList({ schemaVersion: 1, revision: 1 })).toBeNull();
    expect(normalizeStarterCommunityList({ schemaVersion: 1, revision: 1, communities: [] })).toBeNull();
    expect(normalizeStarterCommunityList({ schemaVersion: 1, revision: 0, communities: [{ address: 'aww.bso' }] })).toBeNull();
  });
});

describe('normalizeRemoteStarterCommunityList', () => {
  const payload = (revision: number) => ({
    schemaVersion: 1,
    revision,
    communities: [{ address: `revision-${revision}.bso` }],
  });

  const currentList = normalizeStarterCommunityList(payload(2));
  if (!currentList) throw new Error('Invalid test fixture');

  it('never replaces an accepted list with an older revision', () => {
    expect(normalizeRemoteStarterCommunityList(payload(1), currentList)).toBeNull();
    expect(normalizeRemoteStarterCommunityList(payload(2), currentList)).toMatchObject({ revision: 2 });
    expect(normalizeRemoteStarterCommunityList(payload(3), currentList)).toMatchObject({ revision: 3 });
  });

  it('requires a new revision when community membership changes', () => {
    expect(() => normalizeRemoteStarterCommunityList({ ...payload(2), communities: [{ address: 'different.bso' }] }, currentList)).toThrow(
      'Default community membership changed without a new revision',
    );
  });

  it('throws for a malformed successful response so the caller enters its fallback state', () => {
    expect(() => normalizeRemoteStarterCommunityList({ schemaVersion: 1, revision: 2, communities: [] }, currentList)).toThrow('Invalid default communities response');
  });
});
