import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePublishComment } from '@bitsocial/bitsocial-react-hooks';
import usePublishReplyStore from '../stores/use-publish-reply-store';
import useChallengesStore from '../stores/use-challenges-store';

const usePublishReply = ({ cid, communityAddress, postCid }: { cid: string; communityAddress: string; postCid: string | undefined }) => {
  const parentCid = cid;
  const { content, link, spoiler, nsfw, publishCommentOptions, publishReplyOptions } = usePublishReplyStore((state) => ({
    content: state.content[parentCid],
    link: state.link[parentCid],
    spoiler: state.spoiler[parentCid],
    nsfw: state.nsfw[parentCid],
    publishCommentOptions: state.publishCommentOptions[parentCid],
    publishReplyOptions: state.publishReplyOptions[parentCid],
  }));

  const setReplyStore = usePublishReplyStore((state) => state.setReplyStore);
  const resetReplyStore = usePublishReplyStore((state) => state.resetReplyStore);
  const addChallenge = useChallengesStore((state) => state.addChallenge);
  const abandonPublishRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const abandonCurrentPublish = useCallback(async () => {
    await abandonPublishRef.current?.();
  }, []);

  const setPublishReplyOptions = useMemo(
    () => ({
      content: (newContent: string) =>
        setReplyStore({
          communityAddress,
          parentCid,
          postCid: postCid ?? parentCid,
          content: newContent === '' ? undefined : newContent,
          link: link || undefined,
          spoiler: spoiler || false,
          nsfw: nsfw || false,
        }),
      link: (newLink: string) =>
        setReplyStore({
          communityAddress,
          parentCid,
          postCid: postCid ?? parentCid,
          content: content,
          link: newLink || undefined,
          spoiler: spoiler || false,
          nsfw: nsfw || false,
        }),
      spoiler: (newSpoiler: boolean) =>
        setReplyStore({
          communityAddress,
          parentCid,
          postCid: postCid ?? parentCid,
          content: content,
          link: link || undefined,
          spoiler: newSpoiler,
          nsfw: nsfw || false,
        }),
      nsfw: (newNsfw: boolean) =>
        setReplyStore({
          communityAddress,
          parentCid,
          postCid: postCid ?? parentCid,
          content: content,
          link: link || undefined,
          spoiler: spoiler || false,
          nsfw: newNsfw,
        }),
    }),
    [communityAddress, parentCid, setReplyStore, content, link, spoiler, nsfw, postCid],
  );

  const resetPublishReplyOptions = useMemo(() => () => resetReplyStore(parentCid), [parentCid, resetReplyStore]);

  const publishOptionsWithAbandon = useMemo(
    () => ({
      ...publishCommentOptions,
      onChallenge: async (...args: any[]) => {
        addChallenge(args, abandonCurrentPublish);
      },
    }),
    [abandonCurrentPublish, addChallenge, publishCommentOptions],
  );

  const { index, publishComment, abandonPublish } = usePublishComment(publishOptionsWithAbandon);
  useEffect(() => {
    abandonPublishRef.current = abandonPublish;
  }, [abandonPublish]);

  return { setPublishReplyOptions, resetPublishReplyOptions, replyIndex: index, publishReply: publishComment, publishReplyOptions };
};

export default usePublishReply;
