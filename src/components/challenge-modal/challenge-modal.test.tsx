// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChallengeModal from './challenge-modal';
import useChallengesStore from '../../stores/use-challenges-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (key === 'challenge_counter' ? `${options?.index}/${options?.total}` : key),
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => ({ author: { address: '0xabc' } }),
  useComment: () => undefined,
}));

vi.mock('../../hooks/use-theme', () => ({
  default: () => ['light'],
}));

let container: HTMLDivElement;
let root: Root;

const createChallenge = (prompt: string, publishChallengeAnswers = vi.fn()) =>
  [{ challenges: [{ challenge: prompt, type: 'text/plain' }] }, { communityAddress: 'example.bso', content: prompt, publishChallengeAnswers }] as never;

const renderModal = async () => {
  await act(async () => {
    root.render(createElement(ChallengeModal));
  });
};

const clickButton = async (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === text);
  expect(button).toBeDefined();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
};

const enterAnswer = async (value: string) => {
  const input = container.querySelector<HTMLInputElement>('input');
  expect(input).not.toBeNull();
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    valueSetter?.call(input, value);
    input?.dispatchEvent(new Event('input', { bubbles: true }));
    input?.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

describe('ChallengeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChallengesStore.setState({ challenges: [] });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useChallengesStore.setState({ challenges: [] });
  });

  it('abandons exactly the current challenge when Cancel is clicked', async () => {
    const firstAbandon = vi.fn().mockResolvedValue(undefined);
    const secondAbandon = vi.fn().mockResolvedValue(undefined);
    useChallengesStore.getState().addChallenge(createChallenge('first prompt'), firstAbandon);
    useChallengesStore.getState().addChallenge(createChallenge('second prompt'), secondAbandon);
    await renderModal();

    await clickButton('cancel');

    expect(firstAbandon).toHaveBeenCalledOnce();
    expect(secondAbandon).not.toHaveBeenCalled();
    expect(useChallengesStore.getState().challenges).toHaveLength(1);
    expect(container.textContent).toContain('second prompt');
  });

  it('abandons exactly the current challenge once when Escape is pressed', async () => {
    const firstAbandon = vi.fn().mockResolvedValue(undefined);
    const secondAbandon = vi.fn().mockResolvedValue(undefined);
    useChallengesStore.getState().addChallenge(createChallenge('first prompt'), firstAbandon);
    useChallengesStore.getState().addChallenge(createChallenge('second prompt'), secondAbandon);
    await renderModal();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await Promise.resolve();
    });

    expect(firstAbandon).toHaveBeenCalledOnce();
    expect(secondAbandon).not.toHaveBeenCalled();
    expect(useChallengesStore.getState().challenges).toHaveLength(1);
  });

  it('submits a text answer without abandoning and resets state for the next queue entry', async () => {
    const publishChallengeAnswers = vi.fn();
    const firstAbandon = vi.fn().mockResolvedValue(undefined);
    useChallengesStore.getState().addChallenge(createChallenge('first prompt', publishChallengeAnswers), firstAbandon);
    useChallengesStore.getState().addChallenge(createChallenge('second prompt'));
    await renderModal();

    await enterAnswer('four');
    await clickButton('submit');

    expect(publishChallengeAnswers).toHaveBeenCalledWith(['four']);
    expect(firstAbandon).not.toHaveBeenCalled();
    expect(useChallengesStore.getState().challenges).toHaveLength(1);
    expect(container.textContent).toContain('second prompt');
    expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('');
  });
});
