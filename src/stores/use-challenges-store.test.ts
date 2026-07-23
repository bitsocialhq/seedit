import { afterEach, describe, expect, it, vi } from 'vitest';
import useChallengesStore from './use-challenges-store';

const createChallenge = (publisher: Record<string, unknown> = {}) => [{ challenges: [] }, publisher] as never;

afterEach(() => {
  useChallengesStore.setState({ challenges: [] });
  vi.restoreAllMocks();
});

describe('useChallengesStore', () => {
  it('queues unique entries FIFO and removes the head before awaiting abandonment', async () => {
    let finishAbandon: (() => void) | undefined;
    const onAbandon = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishAbandon = resolve;
        }),
    );
    const firstChallenge = createChallenge();
    const secondChallenge = createChallenge();

    useChallengesStore.getState().addChallenge(firstChallenge, onAbandon);
    useChallengesStore.getState().addChallenge(secondChallenge);

    const [first, second] = useChallengesStore.getState().challenges;
    expect(first.challenge).toBe(firstChallenge);
    expect(second.challenge).toBe(secondChallenge);
    expect(first.id).not.toBe(second.id);

    const abandonment = useChallengesStore.getState().abandonCurrentChallenge();

    expect(onAbandon).toHaveBeenCalledOnce();
    expect(useChallengesStore.getState().challenges.map((entry) => entry.challenge)).toEqual([secondChallenge]);

    finishAbandon?.();
    await abandonment;
  });

  it('falls back to stopping the live publisher when no callback is supplied', async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    useChallengesStore.getState().addChallenge(createChallenge({ stop }));

    await useChallengesStore.getState().abandonCurrentChallenge();

    expect(stop).toHaveBeenCalledOnce();
    expect(useChallengesStore.getState().challenges).toEqual([]);
  });

  it('logs abandonment failures after removing the challenge', async () => {
    const error = new Error('stop failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    useChallengesStore.getState().addChallenge(createChallenge(), vi.fn().mockRejectedValue(error));

    await expect(useChallengesStore.getState().abandonCurrentChallenge()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith('Failed to abandon challenge publication:', error);
    expect(useChallengesStore.getState().challenges).toEqual([]);
  });
});
