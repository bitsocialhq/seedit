import { afterEach, describe, expect, it } from 'vitest';
import usePublishReplyStore from './use-publish-reply-store';

const parentCid = 'parent-cid';

afterEach(() => {
  usePublishReplyStore.getState().resetReplyStore(parentCid);
});

describe('usePublishReplyStore', () => {
  it('builds publish options with the current community address field', () => {
    usePublishReplyStore.getState().setReplyStore({
      communityAddress: 'interestingasfuck.bso',
      parentCid,
      content: 'Test reply',
    });

    const publishCommentOptions = usePublishReplyStore.getState().publishCommentOptions[parentCid];
    expect(publishCommentOptions).toMatchObject({
      communityAddress: 'interestingasfuck.bso',
      parentCid,
      content: 'Test reply',
    });
    expect(Object.keys(publishCommentOptions).sort()).toEqual([
      'communityAddress',
      'content',
      'link',
      'nsfw',
      'onChallenge',
      'onChallengeVerification',
      'onError',
      'parentCid',
      'postCid',
      'spoiler',
    ]);
  });
});
