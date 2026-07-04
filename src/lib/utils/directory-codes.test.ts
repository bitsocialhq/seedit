import { describe, expect, it } from 'vitest';
import { SEEDIT_DIRECTORY_CODES, expandSubscriptionAddresses, isDirectoryCode, isResolvableCommunityAddress } from './directory-codes';

describe('isDirectoryCode', () => {
  it('accepts every known directory code', () => {
    for (const code of SEEDIT_DIRECTORY_CODES) {
      expect(isDirectoryCode(code)).toBe(true);
    }
  });

  it('rejects reserved route words', () => {
    expect(isDirectoryCode('all')).toBe(false);
    expect(isDirectoryCode('mod')).toBe(false);
  });

  it('rejects anything containing a dot', () => {
    expect(isDirectoryCode('memes.eth')).toBe(false);
    expect(isDirectoryCode('memes.bso')).toBe(false);
  });

  it('rejects unknown codes, empty and undefined entries', () => {
    expect(isDirectoryCode('notacode')).toBe(false);
    expect(isDirectoryCode('MEMES')).toBe(false);
    expect(isDirectoryCode('')).toBe(false);
    expect(isDirectoryCode(undefined)).toBe(false);
  });
});

describe('isResolvableCommunityAddress', () => {
  it('accepts crypto names and base58 public keys', () => {
    expect(isResolvableCommunityAddress('memes.eth')).toBe(true);
    expect(isResolvableCommunityAddress('something.bso')).toBe(true);
    expect(isResolvableCommunityAddress('12D3KooWFnLrUYHpvqki7gbL4w9JzdxjpQPKE2JBDEd23Ly6X82X')).toBe(true);
  });

  it('rejects placeholders, codes and empty values', () => {
    expect(isResolvableCommunityAddress('PLACEHOLDER-memes')).toBe(false);
    expect(isResolvableCommunityAddress('memes')).toBe(false);
    expect(isResolvableCommunityAddress('')).toBe(false);
    expect(isResolvableCommunityAddress(undefined)).toBe(false);
  });
});

describe('expandSubscriptionAddresses', () => {
  const resolve = (code: string) => (code === 'memes' ? 'memes-winner.eth' : undefined);

  it('resolves directory codes and passes plain addresses through', () => {
    expect(expandSubscriptionAddresses(['memes', 'my-community.eth'], resolve)).toEqual(['memes-winner.eth', 'my-community.eth']);
  });

  it('dedupes a directory winner also subscribed by direct address', () => {
    expect(expandSubscriptionAddresses(['memes', 'memes-winner.eth', 'memes'], resolve)).toEqual(['memes-winner.eth']);
  });

  it('skips codes that resolve to nothing loadable', () => {
    expect(expandSubscriptionAddresses(['funny'], resolve)).toEqual([]);
    expect(expandSubscriptionAddresses(['funny'], () => 'PLACEHOLDER-funny')).toEqual([]);
  });

  it('keeps non-directory entries even when unresolvable-looking, and ignores empty entries', () => {
    expect(expandSubscriptionAddresses(['some-weird-entry', ''], resolve)).toEqual(['some-weird-entry']);
    expect(expandSubscriptionAddresses(undefined, resolve)).toEqual([]);
  });
});
