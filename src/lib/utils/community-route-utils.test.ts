import { describe, expect, it } from 'vitest';
import { getCommunityPath, getCommunityPostPath, getCommunityPostUrl, getCommunityRouteSegment, resolveCommunityRouteAddress } from './community-route-utils';

const PUBLIC_KEY = '12D3KooWFnLrUYHpvqki7gbL4w9JzdxjpQPKE2JBDEd23Ly6X82X';

describe('resolveCommunityRouteAddress', () => {
  it('expands bare community names with the default .bso TLD', () => {
    expect(resolveCommunityRouteAddress('aww')).toBe('aww.bso');
    expect(resolveCommunityRouteAddress('aww-posting')).toBe('aww-posting.bso');
  });

  it('leaves dotted names and public keys unchanged', () => {
    expect(resolveCommunityRouteAddress('aww.bso')).toBe('aww.bso');
    expect(resolveCommunityRouteAddress('business.eth')).toBe('business.eth');
    expect(resolveCommunityRouteAddress('topic.community.bso')).toBe('topic.community.bso');
    expect(resolveCommunityRouteAddress(PUBLIC_KEY)).toBe(PUBLIC_KEY);
  });

  it('leaves reserved route segments unchanged regardless of case', () => {
    expect(resolveCommunityRouteAddress('all')).toBe('all');
    expect(resolveCommunityRouteAddress('ALL')).toBe('ALL');
    expect(resolveCommunityRouteAddress('mod')).toBe('mod');
    expect(resolveCommunityRouteAddress('MoD')).toBe('MoD');
  });

  it('leaves empty and missing route segments unchanged', () => {
    expect(resolveCommunityRouteAddress('')).toBe('');
    expect(resolveCommunityRouteAddress(undefined)).toBeUndefined();
  });
});

describe('getCommunityRouteSegment', () => {
  it('shortens single-label .bso addresses', () => {
    expect(getCommunityRouteSegment('aww.bso')).toBe('aww');
    expect(getCommunityRouteSegment('aww-posting.bso')).toBe('aww-posting');
  });

  it('leaves other dotted names, multi-label .bso names and public keys unchanged', () => {
    expect(getCommunityRouteSegment('business.eth')).toBe('business.eth');
    expect(getCommunityRouteSegment('topic.community.bso')).toBe('topic.community.bso');
    expect(getCommunityRouteSegment(PUBLIC_KEY)).toBe(PUBLIC_KEY);
  });

  it('does not shorten reserved or public-key-like .bso labels', () => {
    expect(getCommunityRouteSegment('all.bso')).toBe('all.bso');
    expect(getCommunityRouteSegment('ALL.bso')).toBe('ALL.bso');
    expect(getCommunityRouteSegment('mod.bso')).toBe('mod.bso');
    expect(getCommunityRouteSegment(`${PUBLIC_KEY}.bso`)).toBe(`${PUBLIC_KEY}.bso`);
  });
});

describe('community route builders', () => {
  it('builds canonical shorthand paths for eligible .bso communities', () => {
    expect(getCommunityPath('aww.bso')).toBe('/s/aww');
    expect(getCommunityPostPath('aww.bso', 'bafy-post-cid')).toBe('/s/aww/c/bafy-post-cid');
  });

  it('keeps explicit addresses when shorthand would be ambiguous', () => {
    expect(getCommunityPath('all.bso')).toBe('/s/all.bso');
    expect(getCommunityPath('topic.community.bso')).toBe('/s/topic.community.bso');
    expect(getCommunityPostPath(PUBLIC_KEY, 'bafy-post-cid')).toBe(`/s/${PUBLIC_KEY}/c/bafy-post-cid`);
  });

  it('builds the exact seedit.app external post URL', () => {
    expect(getCommunityPostUrl('aww.bso', 'bafy-post-cid')).toBe('https://seedit.app/s/aww/c/bafy-post-cid');
  });

  it('round-trips every shorthand-eligible address', () => {
    for (const address of ['aww.bso', 'aww-posting.bso']) {
      expect(resolveCommunityRouteAddress(getCommunityRouteSegment(address))).toBe(address);
    }
  });
});
