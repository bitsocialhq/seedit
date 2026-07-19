import { describe, expect, it } from 'vitest';
import type { DirectoryList } from '../lib/utils/directory-list-utils';
import { resolveCommunityRouteSnapshot } from './use-resolved-community-route';

const funnyList: DirectoryList = {
  schemaVersion: 1,
  revision: 2,
  directoryCode: 'funny',
  communities: [
    { address: 'first-funny.bso', score: 1, addedAt: 1 },
    { address: 'best-funny.bso', score: 8, addedAt: 2 },
  ],
};

describe('resolveCommunityRouteSnapshot', () => {
  it('resolves a known directory route to its deterministic exact winner', () => {
    expect(resolveCommunityRouteSnapshot('funny', funnyList, false, null)).toMatchObject({
      communityAddress: 'best-funny.bso',
      directoryCode: 'funny',
      isDirectory: true,
      isResolving: false,
      winner: { address: 'best-funny.bso' },
    });
  });

  it('keeps explicit and unreserved community references independent from directory data', () => {
    expect(resolveCommunityRouteSnapshot('funny.bso', funnyList, false, null)).toMatchObject({
      communityAddress: 'funny.bso',
      directoryCode: undefined,
      directoryList: null,
      isDirectory: false,
    });
    expect(resolveCommunityRouteSnapshot('unreserved-name', null, false, null).communityAddress).toBe('unreserved-name.bso');
  });

  it('reports resolution only when a directory has no usable fallback winner', () => {
    expect(resolveCommunityRouteSnapshot('funny', null, true, null)).toMatchObject({ communityAddress: undefined, isResolving: true });
  });
});
