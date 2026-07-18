import { describe, expect, it } from 'vitest';
import getShortAddress, { getCompactCommunityDisplayName, getDisplayAddress, getShortDisplayAddress } from './address-utils';

describe('getShortAddress', () => {
  it('keeps named addresses unchanged', () => {
    expect(getShortAddress('music-posting.eth')).toBe('music-posting.eth');
    expect(getShortAddress('music-posting.bso')).toBe('music-posting.bso');
  });

  it('preserves existing raw-address shortening behavior', () => {
    expect(getShortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('7890abcdef12');
    expect(getShortAddress('short-address')).toBe('');
    expect(getShortAddress('')).toBe('');
  });
});

describe('getDisplayAddress', () => {
  it('presents .eth aliases with the canonical .bso suffix', () => {
    expect(getDisplayAddress('music-posting.eth')).toBe('music-posting.bso');
    expect(getDisplayAddress('Music-Posting.ETH')).toBe('Music-Posting.bso');
  });

  it('leaves .bso and unrelated named addresses unchanged', () => {
    expect(getDisplayAddress('music-posting.bso')).toBe('music-posting.bso');
    expect(getDisplayAddress('music-posting.example')).toBe('music-posting.example');
  });

  it('leaves raw addresses unchanged', () => {
    expect(getDisplayAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(getDisplayAddress('short-address')).toBe('short-address');
    expect(getDisplayAddress(undefined)).toBe('');
  });
});

describe('getShortDisplayAddress', () => {
  it('canonicalizes named aliases after applying the existing shortening behavior', () => {
    expect(getShortDisplayAddress('music-posting.eth')).toBe('music-posting.bso');
    expect(getShortDisplayAddress('music-posting.bso')).toBe('music-posting.bso');
  });

  it('preserves raw-address shortening behavior', () => {
    expect(getShortDisplayAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('7890abcdef12');
    expect(getShortDisplayAddress('short-address')).toBe('');
  });
});

describe('getCompactCommunityDisplayName', () => {
  it('removes the canonical .bso suffix from compact community labels', () => {
    expect(getCompactCommunityDisplayName('music-posting.bso')).toBe('music-posting');
    expect(getCompactCommunityDisplayName('music-posting.eth')).toBe('music-posting');
    expect(getCompactCommunityDisplayName('topic.community.bso')).toBe('topic.community');
  });

  it('preserves non-Bitsocial names and shortens public keys', () => {
    expect(getCompactCommunityDisplayName('music-posting.example')).toBe('music-posting.example');
    expect(getCompactCommunityDisplayName('12D3KooWFnLrUYHpvqki7gbL4w9JzdxjpQPKE2JBDEd23Ly6X82X')).toBe('FnLrUYHpvqki');
  });
});
