import { describe, expect, it } from 'vitest';
import { getAboutLink, isCommunitiesDirectoryAboutView, isCommunitiesDirectoryView } from './view-utils';

describe('isCommunitiesDirectoryView', () => {
  it('matches the directory index and individual directories only', () => {
    expect(isCommunitiesDirectoryView('/communities/directories')).toBe(true);
    expect(isCommunitiesDirectoryView('/communities/directories/askseedit')).toBe(true);
    expect(isCommunitiesDirectoryView('/communities/directories/askseedit/about')).toBe(true);
    expect(isCommunitiesDirectoryView('/communities/directories-extra')).toBe(false);
    expect(isCommunitiesDirectoryView('/communities/vote')).toBe(false);
  });
});

describe('directory about views', () => {
  it('recognizes only directory about routes', () => {
    expect(isCommunitiesDirectoryAboutView('/communities/directories/about')).toBe(true);
    expect(isCommunitiesDirectoryAboutView('/communities/directories/askseedit/about')).toBe(true);
    expect(isCommunitiesDirectoryAboutView('/communities/directories/askseedit')).toBe(false);
  });

  it('links the directory index and candidate list to their own mobile sidebar views', () => {
    expect(getAboutLink('/communities/directories', {})).toBe('/communities/directories/about');
    expect(getAboutLink('/communities/directories/askseedit', { directoryCode: 'askseedit' })).toBe('/communities/directories/askseedit/about');
  });
});
