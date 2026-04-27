import { type Comment } from '@bitsocial/bitsocial-react-hooks';

export const getAccountHistoryOrder = (sortType: string): 'asc' | 'desc' => (sortType === 'new' ? 'desc' : 'asc');

export const getAccountHistoryPage = (currentPage: number): number => Math.max(currentPage - 1, 0);

export const getOldestAccountHistoryTimestamp = (accountComments: { timestamp?: number }[] | undefined, fallbackTimestamp = Date.now() / 1000): number =>
  accountComments?.[0]?.timestamp ?? fallbackTimestamp;

export const getPublishedReplies = (comment: Comment | undefined): Comment[] => {
  const pageValues = comment?.replies?.pages ? Object.values(comment.replies.pages) : [];
  const firstPageObject = pageValues[0] as { comments?: Comment[] } | undefined;
  return firstPageObject?.comments || [];
};

export const mergeRepliesWithPendingAccountReplies = (publishedReplies: Comment[], accountReplies: Comment[]): Comment[] => {
  const replyCids = new Set(publishedReplies.map((reply) => reply?.cid));
  const accountRepliesNotYetPublished = accountReplies.filter((accountReply) => !replyCids.has(accountReply?.cid));

  return [
    // Keep the most recent unpublished account replies at the top.
    ...[...accountRepliesNotYetPublished].reverse(),
    ...publishedReplies,
  ];
};

export const filterOptimisticLocalPosts = (accountComments: Comment[], feed: Comment[], subplebbitAddress: string, nowSeconds = Date.now() / 1000): Comment[] =>
  accountComments.filter((comment) => {
    const { cid, deleted, postCid, removed, state, timestamp } = comment || {};
    const commentCommunityAddress = comment?.subplebbitAddress || comment?.communityAddress;

    return (
      !deleted &&
      !removed &&
      timestamp > nowSeconds - 60 * 60 &&
      state === 'succeeded' &&
      cid &&
      cid === postCid &&
      commentCommunityAddress === subplebbitAddress &&
      !feed.some((post) => post.cid === cid)
    );
  });
