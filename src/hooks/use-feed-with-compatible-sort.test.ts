// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import type { Comment, Community, CommunityIdentifier } from '@bitsocial/bitsocial-react-hooks';
import { getFeedCommunityGroups, mergeAndSortFeeds } from '../lib/utils/feed-sort-utils';

const identifier = (name: string): CommunityIdentifier => ({ name });
const community = ({ pages, pageCids = {} }: { pages: string[]; pageCids?: Record<string, string> }) =>
  ({
    posts: {
      pages: Object.fromEntries(pages.map((sortType) => [sortType, { comments: [] }])),
      pageCids,
    },
  }) as Community;

const post = (cid: string, timestamp: number, upvoteCount: number, downvoteCount = 0): Comment => ({ cid, timestamp, upvoteCount, downvoteCount }) as Comment;

describe('getFeedCommunityGroups', () => {
  it('uses requested protocol pages when the community publishes the sort', () => {
    const identifiers = [identifier('one.bso')];
    expect(getFeedCommunityGroups(identifiers, [community({ pages: ['hot'], pageCids: { topAll: 'cid' } })], 'topAll')).toEqual({
      requestedSortCommunities: identifiers,
      preloadedSortCommunities: [],
    });
  });

  it.each(['new', 'active', 'topAll'])('uses a complete single preloaded page as the source for the %s client sort', (sortType) => {
    const identifiers = [identifier('one.bso')];
    expect(getFeedCommunityGroups(identifiers, [community({ pages: ['hot'] })], sortType)).toEqual({
      requestedSortCommunities: [],
      preloadedSortCommunities: identifiers,
    });
  });

  it('does not substitute preloaded data for an unavailable custom sort', () => {
    const identifiers = [identifier('one.bso')];
    expect(getFeedCommunityGroups(identifiers, [community({ pages: ['hot'] })], 'custom')).toEqual({
      requestedSortCommunities: [],
      preloadedSortCommunities: [],
    });
  });

  it('does not substitute an incomplete preloaded page for an unavailable built-in sort', () => {
    const identifiers = [identifier('one.bso')];
    expect(getFeedCommunityGroups(identifiers, [community({ pages: ['hot'], pageCids: { hot: 'hot-cid' } })], 'topAll')).toEqual({
      requestedSortCommunities: [],
      preloadedSortCommunities: [],
    });
  });
});

describe('mergeAndSortFeeds', () => {
  it('deduplicates posts and applies the requested client sort to the combined feed', () => {
    const olderPopular = post('popular', 1, 10);
    const newer = post('newer', 2, 1);
    expect(mergeAndSortFeeds([newer], [olderPopular, newer], 'topAll').map(({ cid }) => cid)).toEqual(['popular', 'newer']);
  });
});
