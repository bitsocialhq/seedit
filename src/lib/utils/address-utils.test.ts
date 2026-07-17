import { describe, expect, it } from 'vitest';
import getShortAddress, { getDisplayAddress, getShortDisplayAddress } from './address-utils';

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
