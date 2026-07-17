import { create } from 'zustand';
import challengesStore from './use-challenges-store';
import { Comment, PublishCommentOptions } from '@bitsocial/bitsocial-react-hooks';
import { alertChallengeVerificationFailed } from '../lib/utils/challenge-utils';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';

const { addChallenge } = challengesStore.getState();

type SubmitState = {
  communityAddress: string | undefined;
  title: string | undefined;
  content: string | undefined;
  link: string | undefined;
  spoiler: boolean | undefined;
  nsfw: boolean | undefined;
  publishCommentOptions: PublishCommentOptions;
  setPublishPostStore: (comment: Comment) => void;
  resetPublishPostStore: () => void;
};

const usePublishPostStore = create<SubmitState>((set) => ({
  communityAddress: undefined,
  title: undefined,
  content: undefined,
  link: undefined,
  spoiler: undefined,
  nsfw: undefined,
  publishCommentOptions: {},
  setPublishPostStore: (comment) =>
    set((state) => {
      const nextState = { ...state };
      const commentCommunityAddress = getCommentCommunityAddress(comment);
      const { title, content, link, spoiler, nsfw } = comment;

      if (commentCommunityAddress !== undefined) nextState.communityAddress = commentCommunityAddress;
      if (title !== undefined) nextState.title = title;
      if (content !== undefined) nextState.content = content || undefined;
      if (link !== undefined) nextState.link = link || undefined;
      if (spoiler !== undefined) nextState.spoiler = spoiler || undefined;
      if (nsfw !== undefined) nextState.nsfw = nsfw || undefined;

      nextState.publishCommentOptions = {
        communityAddress: nextState.communityAddress,
        title: nextState.title,
        content: nextState.content,
        link: nextState.link,
        spoiler: nextState.spoiler,
        nsfw: nextState.nsfw,
        onChallenge: (...args: any) => addChallenge(args),
        onChallengeVerification: alertChallengeVerificationFailed,
        onError: (error: Error) => {
          console.error(error);
          alert(error.message);
        },
      };

      return nextState;
    }),
  resetPublishPostStore: () =>
    set({
      communityAddress: undefined,
      title: undefined,
      content: undefined,
      link: undefined,
      spoiler: undefined,
      nsfw: undefined,
      publishCommentOptions: {},
    }),
}));

export default usePublishPostStore;
