import { describe, expect, it } from 'vitest';
import { SEEDIT_DIRECTORY_CODES } from './directory-codes';
import { LEGACY_DEFAULT_SUBSCRIPTIONS, computeDirectoryMigration } from './legacy-default-subscriptions';

const allCodes = [...SEEDIT_DIRECTORY_CODES];

describe('computeDirectoryMigration', () => {
  it('subscribes a new account (empty subscriptions) to all directory codes', () => {
    const result = computeDirectoryMigration([]);
    expect(result.next).toEqual(allCodes);
    expect(result.removed).toEqual([]);
    expect(result.added).toEqual(allCodes);
    expect(result.changed).toBe(true);
  });

  it('removes exactly the legacy dead defaults and keeps every other entry', () => {
    const result = computeDirectoryMigration(['plebtoken.eth', 'my-community.eth', '💩posting.eth', 'another.sol']);
    expect(result.removed).toEqual(['plebtoken.eth', '💩posting.eth']);
    expect(result.next).toEqual(['my-community.eth', 'another.sol', ...allCodes]);
  });

  it('handles a full legacy default subscription list', () => {
    const result = computeDirectoryMigration([...LEGACY_DEFAULT_SUBSCRIPTIONS]);
    expect(result.removed).toEqual([...LEGACY_DEFAULT_SUBSCRIPTIONS]);
    expect(result.next).toEqual(allCodes);
  });

  it('skips directory codes that are already subscribed without duplicating them', () => {
    const result = computeDirectoryMigration(['memes', 'my-community.eth']);
    expect(result.added).toEqual(allCodes.filter((code) => code !== 'memes'));
    expect(result.next.filter((entry) => entry === 'memes')).toHaveLength(1);
  });

  it('never touches non-legacy addresses that merely look similar', () => {
    const result = computeDirectoryMigration(['plebtoken.eth.mycopy', 'notplebtoken.eth']);
    expect(result.removed).toEqual([]);
    expect(result.next.slice(0, 2)).toEqual(['plebtoken.eth.mycopy', 'notplebtoken.eth']);
  });

  it('is idempotent: running it on its own output changes nothing', () => {
    const first = computeDirectoryMigration(['plebtoken.eth', 'my-community.eth']);
    const second = computeDirectoryMigration(first.next);
    expect(second.changed).toBe(false);
    expect(second.removed).toEqual([]);
    expect(second.added).toEqual([]);
    expect(second.next).toEqual(first.next);
  });
});
