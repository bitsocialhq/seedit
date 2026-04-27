import { useMemo } from 'react';
import { useAccountComments, type Comment } from '@bitsocial/bitsocial-react-hooks';
import { getPublishedReplies, mergeRepliesWithPendingAccountReplies } from '../lib/utils/account-history-utils';

const useRepliesAndAccountReplies = (comment: Comment) => {
  const { accountComments } = useAccountComments({ parentCid: comment?.cid || 'n/a' });

  // the account's replies have a delay before getting published, so get them locally from accountComments instead
  const publishedReplies = useMemo(() => getPublishedReplies(comment), [comment?.replies?.pages]);

  const repliesAndNotYetPublishedReplies = useMemo(() => mergeRepliesWithPendingAccountReplies(publishedReplies, accountComments), [publishedReplies, accountComments]);

  return repliesAndNotYetPublishedReplies;
};

export default useRepliesAndAccountReplies;
