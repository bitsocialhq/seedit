// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePublishVoteWithChallengeAbandon from './use-publish-vote-with-challenge-abandon';
import useChallengesStore from '../stores/use-challenges-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  abandonPublish: vi.fn().mockResolvedValue(undefined),
  publishVote: vi.fn().mockResolvedValue(undefined),
  lastOptions: undefined as Record<string, any> | undefined,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  usePublishVote: (options: Record<string, any>) => {
    testState.lastOptions = options;
    return { abandonPublish: testState.abandonPublish, publishVote: testState.publishVote };
  },
}));

const comment = { cid: 'comment-cid' } as any;
const publishVoteOptions = { commentCid: 'comment-cid', vote: 1 };

let container: HTMLDivElement;
let latestValue: ReturnType<typeof usePublishVoteWithChallengeAbandon>;
let root: Root;

const HookHarness = () => {
  latestValue = usePublishVoteWithChallengeAbandon(publishVoteOptions, comment);
  return null;
};

describe('usePublishVoteWithChallengeAbandon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.abandonPublish = vi.fn().mockResolvedValue(undefined);
    testState.lastOptions = undefined;
    useChallengesStore.setState({ challenges: [] });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(createElement(HookHarness)));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useChallengesStore.setState({ challenges: [] });
  });

  it('returns the usePublishVote result and forwards the publish options', () => {
    expect(latestValue.publishVote).toBe(testState.publishVote);
    expect(latestValue.abandonPublish).toBe(testState.abandonPublish);
    expect(testState.lastOptions).toMatchObject(publishVoteOptions);
  });

  it('adds the challenge with the voted comment appended for the challenge modal preview', async () => {
    const challenge = { challenges: [] };
    const votePublication = { vote: 1 };
    await act(async () => {
      await testState.lastOptions?.onChallenge(challenge, votePublication);
    });

    const challenges = useChallengesStore.getState().challenges;
    expect(challenges).toHaveLength(1);
    expect(challenges[0].challenge).toEqual([challenge, votePublication, comment]);
  });

  it('routes challenge cancellation to the current usePublishVote abandonPublish', async () => {
    await act(async () => {
      await testState.lastOptions?.onChallenge({ challenges: [] }, { vote: 1 });
    });

    const previousAbandonPublish = testState.abandonPublish;
    const nextAbandonPublish = vi.fn().mockResolvedValue(undefined);
    testState.abandonPublish = nextAbandonPublish;
    act(() => root.render(createElement(HookHarness)));

    await act(async () => {
      await useChallengesStore.getState().abandonCurrentChallenge();
    });

    expect(nextAbandonPublish).toHaveBeenCalledOnce();
    expect(previousAbandonPublish).not.toHaveBeenCalled();
    expect(useChallengesStore.getState().challenges).toHaveLength(0);
  });
});
