import { afterEach, describe, expect, it } from 'vitest';
import usePublishPostStore from './use-publish-post-store';

afterEach(() => {
  usePublishPostStore.getState().resetPublishPostStore();
});

describe('usePublishPostStore', () => {
  it('builds publish options with the current community address field', () => {
    usePublishPostStore.getState().setPublishPostStore({ communityAddress: 'interestingasfuck.bso', title: 'Test post' });

    const { publishCommentOptions } = usePublishPostStore.getState();
    expect(publishCommentOptions).toMatchObject({
      communityAddress: 'interestingasfuck.bso',
      title: 'Test post',
    });
    expect(Object.keys(publishCommentOptions).sort()).toEqual([
      'communityAddress',
      'content',
      'link',
      'nsfw',
      'onChallenge',
      'onChallengeVerification',
      'onError',
      'spoiler',
      'title',
    ]);
  });
});
