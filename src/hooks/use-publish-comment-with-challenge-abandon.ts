import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PublishCommentOptions, usePublishComment } from '@bitsocial/bitsocial-react-hooks';
import useChallengesStore from '../stores/use-challenges-store';

const usePublishCommentWithChallengeAbandon = (publishCommentOptions: PublishCommentOptions) => {
  const addChallenge = useChallengesStore((state) => state.addChallenge);
  const abandonPublishRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const abandonCurrentPublish = useCallback(async () => {
    await abandonPublishRef.current?.();
  }, []);

  const publishOptionsWithAbandon = useMemo(
    () => ({
      ...publishCommentOptions,
      onChallenge: async (...args: any[]) => {
        addChallenge(args, abandonCurrentPublish);
      },
    }),
    [abandonCurrentPublish, addChallenge, publishCommentOptions],
  );

  const publishResult = usePublishComment(publishOptionsWithAbandon);
  useEffect(() => {
    abandonPublishRef.current = publishResult.abandonPublish;
  }, [publishResult.abandonPublish]);

  return publishResult;
};

export default usePublishCommentWithChallengeAbandon;
