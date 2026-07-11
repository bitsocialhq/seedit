import { describe, expect, it } from 'vitest';
import { shouldShowEmptyFeed } from './feed-footer-utils';

describe('shouldShowEmptyFeed', () => {
  it.each([0, 1, 60, 1000])('shows the empty state after all %i requested communities load even when pagination has more', (requestedCommunityCount) => {
    const communities = Array.from({ length: requestedCommunityCount }, (_, index) => ({ updatedAt: index + 1 }));
    const emptyLoadedFeed = {
      requestedCommunityCount,
      communities,
      feedLength: 0,
      hasMore: true,
    };

    expect(shouldShowEmptyFeed(emptyLoadedFeed)).toBe(true);
  });

  it('keeps loading while any requested community has not loaded', () => {
    expect(
      shouldShowEmptyFeed({
        requestedCommunityCount: 2,
        communities: [{ updatedAt: 1 }, undefined],
        feedLength: 0,
      }),
    ).toBe(false);

    expect(
      shouldShowEmptyFeed({
        requestedCommunityCount: 2,
        communities: [{ updatedAt: 1 }, {}],
        feedLength: 0,
      }),
    ).toBe(false);
  });

  it('does not show the empty state when posts or a search are present', () => {
    const loadedFeed = {
      requestedCommunityCount: 1,
      communities: [{ updatedAt: 1 }],
    };

    expect(shouldShowEmptyFeed({ ...loadedFeed, feedLength: 1 })).toBe(false);
    expect(shouldShowEmptyFeed({ ...loadedFeed, feedLength: 0, isLoadingCommunityData: true })).toBe(false);
    expect(shouldShowEmptyFeed({ ...loadedFeed, feedLength: 0, isSearching: true })).toBe(false);
    expect(shouldShowEmptyFeed({ ...loadedFeed, feedLength: 0, searchQuery: 'query' })).toBe(false);
  });
});
