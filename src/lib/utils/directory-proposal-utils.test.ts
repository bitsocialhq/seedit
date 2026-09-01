import { describe, expect, it } from 'vitest';
import { getDirectoryCommunityProposalUrl, getNewDirectoryProposalUrl } from './directory-proposal-utils';

describe('directory proposal URLs', () => {
  it('prefills a structured issue for a new directory proposal', () => {
    const url = new URL(getNewDirectoryProposalUrl());

    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/bitsocialnet/lists/issues/new');
    expect(url.searchParams.get('title')).toBe('Propose a new Seedit directory: s/<directory>');
    expect(url.searchParams.get('body')).toContain('## Proposed directory\ns/<directory>');
    expect(url.searchParams.get('body')).toContain('https://github.com/bitsocialnet/lists/tree/master/seedit-directories');
  });

  it('prefills a candidate issue with the exact directory file', () => {
    const url = new URL(getDirectoryCommunityProposalUrl('askseedit'));

    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/bitsocialnet/lists/issues/new');
    expect(url.searchParams.get('title')).toBe('Propose a community for s/askseedit: <community-address>');
    expect(url.searchParams.get('body')).toContain('https://github.com/bitsocialnet/lists/blob/master/seedit-directories/seedit-askseedit-directory.json');
    expect(url.searchParams.get('body')).toContain('https://github.com/bitsocialnet/lists#requirements-to-have-your-community-included');
  });
});
