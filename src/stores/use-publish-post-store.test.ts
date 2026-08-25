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
      'crosspost',
      'link',
      'nsfw',
      'onChallengeVerification',
      'onError',
      'spoiler',
      'title',
    ]);
  });

  it('includes and clears an embedded crosspost', () => {
    const crosspost = {
      cid: 'source-cid',
      comment: { title: 'Source post', signature: { signature: 'signed' } },
    };

    usePublishPostStore.getState().setPublishPostStore({ title: 'Source post', crosspost });
    expect(usePublishPostStore.getState().publishCommentOptions.crosspost).toEqual(crosspost);

    usePublishPostStore.getState().setPublishPostStore({ crosspost: undefined });
    expect(usePublishPostStore.getState().publishCommentOptions.crosspost).toBeUndefined();
  });
});
