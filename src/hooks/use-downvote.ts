import { useMemo } from 'react';
import { ChallengeVerification, Comment, useAccountVote } from '@bitsocial/bitsocial-react-hooks';
import usePublishVoteWithChallengeAbandon from './use-publish-vote-with-challenge-abandon';
import { alertChallengeVerificationFailed } from '../lib/utils/challenge-utils';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';

const useDownvote = (comment: Comment): [boolean, () => void] => {
  const { vote } = useAccountVote({ commentCid: comment?.cid });

  const publishVoteOptions = useMemo(
    () => ({
      commentCid: comment?.cid,
      vote: vote !== -1 ? -1 : 0,
      communityAddress: getCommentCommunityAddress(comment),
      onChallengeVerification: (challengeVerification: ChallengeVerification, publication: any) =>
        new Promise<void>((resolve) => {
          alertChallengeVerificationFailed(challengeVerification, publication);
          resolve();
        }),
      onError: (error: Error) => {
        console.error(error);
        alert(error.message);
      },
    }),
    [comment, vote],
  );
  const { publishVote } = usePublishVoteWithChallengeAbandon(publishVoteOptions, comment);

  return [vote === -1, publishVote];
};

export default useDownvote;
