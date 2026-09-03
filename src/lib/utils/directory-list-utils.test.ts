import { describe, expect, it } from 'vitest';
import {
  normalizeDirectoryDefaultsData,
  normalizeDirectoryList,
  normalizeRemoteDirectoryList,
  pickDirectoryWinner,
  sortDirectoryCommunitiesByRank,
} from './directory-list-utils';

const directoryPayload = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  revision: 1,
  directoryCode: 'funny',
  createdAt: 100,
  updatedAt: 100,
  communities: [{ address: 'funny-posting.bso', owner: 'owner.bso', addedAt: 10 }],
  ...overrides,
});

describe('directory list normalization', () => {
  it('normalizes the current schema and applies shared display defaults', () => {
    const defaults = normalizeDirectoryDefaultsData({
      directories: {
        funny: { title: 'Funny', description: 'Humour.', tags: ['humor', 'humor'] },
      },
    });

    expect(normalizeDirectoryList(directoryPayload({ tags: ['comedy', 'comedy'], rules: ['Be funny.', 'Be funny.', 'Be civil.'] }), 'funny', defaults)).toEqual({
      schemaVersion: 1,
      revision: 1,
      directoryCode: 'funny',
      title: 'Funny',
      description: 'Humour.',
      tags: ['comedy'],
      rules: ['Be funny.', 'Be civil.'],
      createdAt: 100,
      updatedAt: 100,
      communities: [{ address: 'funny-posting.bso', owner: 'owner.bso', addedAt: 10 }],
    });
  });

  it('rejects missing or invalid schema revisions, mismatched codes, and empty candidate lists', () => {
    expect(normalizeDirectoryList(directoryPayload({ schemaVersion: undefined }), 'funny')).toBeNull();
    expect(normalizeDirectoryList(directoryPayload({ revision: 0 }), 'funny')).toBeNull();
    expect(normalizeDirectoryList(directoryPayload({ revision: 1.5 }), 'funny')).toBeNull();
    expect(normalizeDirectoryList(directoryPayload({ revision: Number.MAX_SAFE_INTEGER + 1 }), 'funny')).toBeNull();
    expect(normalizeDirectoryList(directoryPayload({ directoryCode: undefined }), 'funny')).toBeNull();
    expect(normalizeDirectoryList(directoryPayload({ directoryCode: 'news' }), 'funny')).toBeNull();
    expect(normalizeDirectoryList(directoryPayload({ communities: [] }), 'funny')).toBeNull();
  });

  it('drops malformed and duplicate candidate entries', () => {
    const list = normalizeDirectoryList(
      directoryPayload({
        communities: [{ address: 'one.bso' }, { address: '' }, { address: 'funny' }, null, { address: 'one.bso', score: 100 }, { address: 'two.bso' }],
      }),
      'funny',
    );

    expect(list?.communities).toEqual([{ address: 'one.bso' }, { address: 'two.bso' }]);
  });
});

describe('directory winner selection', () => {
  it('ranks by score descending, addedAt ascending, then address', () => {
    const candidates = [
      { address: 'z.bso', score: 5, addedAt: 20, owner: 'first-owner.bso' },
      { address: 'b.bso', score: 8, addedAt: 20, owner: 'second-owner.bso' },
      { address: 'a.bso', score: 8, addedAt: 20, owner: 'third-owner.bso' },
      { address: 'old.bso', score: 8, addedAt: 10, owner: 'unknown.bso' },
    ];

    expect(sortDirectoryCommunitiesByRank(candidates).map(({ address }) => address)).toEqual(['old.bso', 'a.bso', 'b.bso', 'z.bso']);
    expect(pickDirectoryWinner(candidates)?.address).toBe('old.bso');
  });

  it('does not privilege an owner or accept client-local availability input', () => {
    expect(
      pickDirectoryWinner([
        { address: 'ranked-second.bso', score: 1, owner: 'bitsocialist.bso' },
        { address: 'ranked-first.bso', score: 2, owner: 'unknown.bso' },
      ])?.address,
    ).toBe('ranked-first.bso');
  });
});

describe('remote directory revisions', () => {
  const current = normalizeDirectoryList(
    directoryPayload({
      revision: 2,
      communities: [
        { address: 'winner.bso', score: 2 },
        { address: 'other.bso', score: 1 },
      ],
    }),
    'funny',
  )!;

  it('ignores older snapshots', () => {
    expect(normalizeRemoteDirectoryList(directoryPayload({ revision: 1 }), 'funny', current)).toBeNull();
  });

  it('rejects candidate or winner changes at the same revision', () => {
    expect(() =>
      normalizeRemoteDirectoryList(
        directoryPayload({
          revision: 2,
          communities: [
            { address: 'winner.bso', score: 2 },
            { address: 'new.bso', score: 1 },
          ],
        }),
        'funny',
        current,
      ),
    ).toThrow(/without a new revision/);

    expect(() =>
      normalizeRemoteDirectoryList(
        directoryPayload({
          revision: 2,
          communities: [
            { address: 'winner.bso', score: 1 },
            { address: 'other.bso', score: 2 },
          ],
        }),
        'funny',
        current,
      ),
    ).toThrow(/without a new revision/);
  });

  it('accepts a candidate and winner change at a higher revision', () => {
    const remote = normalizeRemoteDirectoryList(directoryPayload({ revision: 3, communities: [{ address: 'new-winner.bso', score: 10 }] }), 'funny', current);

    expect(remote?.revision).toBe(3);
    expect(pickDirectoryWinner(remote?.communities ?? [])?.address).toBe('new-winner.bso');
  });
});
