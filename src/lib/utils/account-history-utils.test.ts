import { type Comment } from '@bitsocial/bitsocial-react-hooks';
import { describe, expect, it } from 'vitest';
import {
  filterOptimisticLocalPosts,
  getAccountHistoryOrder,
  getAccountHistoryPage,
  getOldestAccountHistoryTimestamp,
  mergeRepliesWithPendingAccountReplies,
} from './account-history-utils';

describe('account-history-utils', () => {
  it('maps profile sort labels to hook order values', () => {
    expect(getAccountHistoryOrder('new')).toBe('desc');
    expect(getAccountHistoryOrder('old')).toBe('asc');
    expect(getAccountHistoryOrder('anything-else')).toBe('asc');
  });

  it('converts visible profile pages to zero-based hook pages', () => {
    expect(getAccountHistoryPage(1)).toBe(0);
    expect(getAccountHistoryPage(3)).toBe(2);
    expect(getAccountHistoryPage(0)).toBe(0);
  });

  it('reads the oldest account timestamp from the cheapest paged result', () => {
    expect(getOldestAccountHistoryTimestamp([{ timestamp: 123 }])).toBe(123);
    expect(getOldestAccountHistoryTimestamp([], 456)).toBe(456);
  });

  it('keeps unpublished account replies first without duplicating published replies', () => {
    const publishedReplies: Comment[] = [{ cid: 'published-1' }, { cid: 'published-2' }];
    const accountReplies: Comment[] = [{ cid: 'pending-1' }, { cid: 'published-1' }, { cid: 'pending-2' }];

    expect(mergeRepliesWithPendingAccountReplies(publishedReplies, accountReplies)).toEqual([
      { cid: 'pending-2' },
      { cid: 'pending-1' },
      { cid: 'published-1' },
      { cid: 'published-2' },
    ]);
  });

  it('filters optimistic local posts after narrowing account comments by community and recency', () => {
    const nowSeconds = 10_000;
    const accountComments: Comment[] = [
      { cid: 'keep-subplebbit', postCid: 'keep-subplebbit', state: 'succeeded', timestamp: 9_500, subplebbitAddress: 'cats' },
      { cid: 'keep-community', postCid: 'keep-community', state: 'succeeded', timestamp: 9_700, communityAddress: 'cats' },
      { cid: 'skip-existing', postCid: 'skip-existing', state: 'succeeded', timestamp: 9_800, subplebbitAddress: 'cats' },
      { cid: 'skip-reply', postCid: 'parent', state: 'succeeded', timestamp: 9_900, subplebbitAddress: 'cats' },
      { cid: 'skip-old', postCid: 'skip-old', state: 'succeeded', timestamp: 6_000, subplebbitAddress: 'cats' },
      { cid: 'skip-removed', postCid: 'skip-removed', state: 'succeeded', timestamp: 9_900, subplebbitAddress: 'cats', removed: true },
      { cid: 'skip-pending', postCid: 'skip-pending', state: 'pending', timestamp: 9_900, subplebbitAddress: 'cats' },
      { cid: 'skip-other-community', postCid: 'skip-other-community', state: 'succeeded', timestamp: 9_900, subplebbitAddress: 'dogs' },
    ];

    const feed: Comment[] = [{ cid: 'skip-existing' }];

    expect(filterOptimisticLocalPosts(accountComments, feed, 'cats', nowSeconds)).toEqual([
      { cid: 'keep-subplebbit', postCid: 'keep-subplebbit', state: 'succeeded', timestamp: 9_500, subplebbitAddress: 'cats' },
      { cid: 'keep-community', postCid: 'keep-community', state: 'succeeded', timestamp: 9_700, communityAddress: 'cats' },
    ]);
  });
});
