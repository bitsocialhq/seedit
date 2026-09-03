import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Comment, UsePublishVoteOptions, usePublishVote } from '@bitsocial/bitsocial-react-hooks';
import useChallengesStore from '../stores/use-challenges-store';

/** The voted comment is appended to the challenge so the challenge modal can preview the publication target. */
const usePublishVoteWithChallengeAbandon = (publishVoteOptions: UsePublishVoteOptions, comment?: Comment) => {
  const addChallenge = useChallengesStore((state) => state.addChallenge);
  const abandonPublishRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const abandonCurrentPublish = useCallback(async () => {
    await abandonPublishRef.current?.();
  }, []);

  const publishOptionsWithAbandon = useMemo(
    () => ({
      ...publishVoteOptions,
      onChallenge: async (...args: any[]) => {
        addChallenge([...args, comment], abandonCurrentPublish);
      },
    }),
    [abandonCurrentPublish, addChallenge, comment, publishVoteOptions],
  );

  const publishResult = usePublishVote(publishOptionsWithAbandon);
  useEffect(() => {
    abandonPublishRef.current = publishResult.abandonPublish;
  }, [publishResult.abandonPublish]);

  return publishResult;
};

export default usePublishVoteWithChallengeAbandon;
