import { describe, expect, it } from 'vitest';
import {
  type DirectoryListCommunity,
  normalizeDirectoryDefaultsData,
  normalizeDirectoryList,
  pickDirectoryWinner,
  sortDirectoryCommunitiesByRank,
} from './directory-list-utils';

const neverOffline = () => false;

describe('sortDirectoryCommunitiesByRank', () => {
  it('sorts by score descending first', () => {
    const communities: DirectoryListCommunity[] = [
      { address: 'low.eth', score: 1 },
      { address: 'high.eth', score: 10 },
      { address: 'unscored.eth' },
    ];
    expect(sortDirectoryCommunitiesByRank(communities).map((community) => community.address)).toEqual(['high.eth', 'low.eth', 'unscored.eth']);
  });

  it('breaks static-list ties in favor of known developer owners, then addedAt, then address', () => {
    const communities: DirectoryListCommunity[] = [
      { address: 'b.eth', addedAt: 100 },
      { address: 'a.eth', addedAt: 100 },
      { address: 'older.eth', addedAt: 50 },
      { address: 'dev-owned.eth', addedAt: 999, owner: 'plebeius.bso' },
    ];
    expect(sortDirectoryCommunitiesByRank(communities).map((community) => community.address)).toEqual(['dev-owned.eth', 'older.eth', 'a.eth', 'b.eth']);
  });

  it('does not mutate the input array', () => {
    const communities: DirectoryListCommunity[] = [{ address: 'b.eth' }, { address: 'a.eth' }];
    sortDirectoryCommunitiesByRank(communities);
    expect(communities.map((community) => community.address)).toEqual(['b.eth', 'a.eth']);
  });
});

describe('pickDirectoryWinner', () => {
  const communities: DirectoryListCommunity[] = [
    { address: 'first.eth', score: 3 },
    { address: 'second.eth', score: 2 },
    { address: 'third.eth', score: 1 },
  ];

  it('picks the highest-ranked online community', () => {
    expect(pickDirectoryWinner(communities, neverOffline)?.address).toBe('first.eth');
  });

  it('rotates to the next-ranked candidate when the winner is offline', () => {
    const isOffline = (address: string) => address === 'first.eth';
    expect(pickDirectoryWinner(communities, isOffline)?.address).toBe('second.eth');
  });

  it('falls back to the highest-ranked candidate when every candidate is offline', () => {
    expect(pickDirectoryWinner(communities, () => true)?.address).toBe('first.eth');
  });

  it('returns undefined for an empty candidate list', () => {
    expect(pickDirectoryWinner([], neverOffline)).toBeUndefined();
  });
});

describe('normalizeDirectoryList', () => {
  it('accepts a communities array and merges title/tags from the defaults', () => {
    const defaults = normalizeDirectoryDefaultsData({
      directories: { memes: { directoryCode: 'memes', title: 'Memes', tags: ['memes', 'humor'] } },
    });
    const list = normalizeDirectoryList({ communities: [{ address: 'memes-winner.eth', addedAt: 1 }] }, 'memes', defaults);
    expect(list?.directoryCode).toBe('memes');
    expect(list?.title).toBe('Memes');
    expect(list?.tags).toEqual(['memes', 'humor']);
    expect(list?.communities).toEqual([{ address: 'memes-winner.eth', addedAt: 1 }]);
  });

  it('accepts the 5chan-style boards array too', () => {
    const list = normalizeDirectoryList({ boards: [{ address: 'g-board.eth' }] }, 'g');
    expect(list?.communities.map((community) => community.address)).toEqual(['g-board.eth']);
  });

  it('rejects payloads without valid candidates', () => {
    expect(normalizeDirectoryList({ communities: [] }, 'memes')).toBeNull();
    expect(normalizeDirectoryList({ communities: [{ score: 1 }] }, 'memes')).toBeNull();
    expect(normalizeDirectoryList('not-an-object', 'memes')).toBeNull();
    expect(normalizeDirectoryList({}, 'memes')).toBeNull();
  });
});
