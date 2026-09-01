import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PublishCommentOptions, usePublishComment } from '@bitsocial/bitsocial-react-hooks';
import useChallengesStore from '../stores/use-challenges-store';

/** onAbandon runs after the pending comment is discarded, so the caller can restore what it published. */
const usePublishCommentWithChallengeAbandon = (publishCommentOptions: PublishCommentOptions, onAbandon?: () => void) => {
  const addChallenge = useChallengesStore((state) => state.addChallenge);
  const abandonPublishRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const abandonCurrentPublish = useCallback(async () => {
    await abandonPublishRef.current?.();
    onAbandon?.();
  }, [onAbandon]);

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
