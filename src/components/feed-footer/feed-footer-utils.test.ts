import { describe, expect, it } from 'vitest';
import { shouldShowEmptyFeed, shouldShowFeedLoading } from './feed-footer-utils';

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

  it('does not show the empty state when posts exist or community data is still loading', () => {
    const loadedFeed = {
      requestedCommunityCount: 1,
      communities: [{ updatedAt: 1 }],
    };

    expect(shouldShowEmptyFeed({ ...loadedFeed, feedLength: 1 })).toBe(false);
    expect(shouldShowEmptyFeed({ ...loadedFeed, feedLength: 0, isLoadingCommunityData: true })).toBe(false);
  });
});

describe('shouldShowFeedLoading', () => {
  it('keeps the loading message visible during the first manual page fetch', () => {
    expect(shouldShowFeedLoading({ feedLength: 0, hasMore: true, infiniteFeedEnabled: false })).toBe(true);
  });

  it('hides the loading message once manual pagination can be used', () => {
    expect(shouldShowFeedLoading({ feedLength: 25, hasMore: true, infiniteFeedEnabled: false })).toBe(false);
  });

  it.each([false, true])('hides the loading message when a feed is exhausted and infinite mode is %s', (infiniteFeedEnabled) => {
    expect(shouldShowFeedLoading({ feedLength: 25, hasMore: false, infiniteFeedEnabled })).toBe(false);
  });
});
