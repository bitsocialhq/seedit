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
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'challenge_counter') return `${options?.index}/${options?.total}`;
      if (key === 'iframe_challenge_open_confirmation') return String(options?.defaultValue ?? key);
      return key;
    },
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

const createIframeChallenge = (url: string, publishChallengeAnswers = vi.fn()) =>
  [{ challenges: [{ challenge: url, type: 'url/iframe' }] }, { communityAddress: 'example.bso', content: 'iframe post', publishChallengeAnswers }] as never;

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

  it('shows only the trusted Spamblocker hostname in the confirmation', async () => {
    useChallengesStore.getState().addChallenge(createIframeChallenge('https://spamblocker.bitsocial.net/api/v1/iframe/session-123?token=large-token'));

    await renderModal();

    expect(container.textContent).toContain('wants to open spamblocker.bitsocial.net');
    expect(container.textContent).not.toContain('/api/v1/iframe/session-123');
    expect(container.textContent).not.toContain('large-token');
  });

  it('keeps the full confirmation URL for untrusted challenge providers', async () => {
    useChallengesStore.getState().addChallenge(createIframeChallenge('https://example.com/api/v1/iframe/session-123?token=visible-token'));

    await renderModal();

    expect(container.textContent).toContain('https://example.com/api/v1/iframe/session-123?token=visible-token');
  });

  it('closes automatically when Spamblocker posts a matching challenge answer', async () => {
    const publishChallengeAnswers = vi.fn();
    useChallengesStore.getState().addChallenge(createIframeChallenge('https://spamblocker.bitsocial.net/api/v1/iframe/session-123', publishChallengeAnswers));
    await renderModal();
    await clickButton('open');

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://spamblocker.bitsocial.net',
          data: { type: 'challengeAnswer', challengeAnswers: ['turnstile-token'], sessionId: 'session-123' },
        }),
      );
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://spamblocker.bitsocial.net',
          data: { type: 'challengeAnswer', challengeAnswers: ['duplicate-token'], sessionId: 'session-123' },
        }),
      );
      await Promise.resolve();
    });

    expect(publishChallengeAnswers).toHaveBeenCalledOnce();
    expect(publishChallengeAnswers).toHaveBeenCalledWith(['turnstile-token']);
    expect(useChallengesStore.getState().challenges).toHaveLength(0);
  });

  it('ignores iframe completion messages with a mismatched origin or session', async () => {
    const publishChallengeAnswers = vi.fn();
    useChallengesStore.getState().addChallenge(createIframeChallenge('https://spamblocker.bitsocial.net/api/v1/iframe/session-123', publishChallengeAnswers));
    await renderModal();
    await clickButton('open');

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://example.com',
          data: { type: 'challengeAnswer', challengeAnswers: ['wrong-origin'], sessionId: 'session-123' },
        }),
      );
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://spamblocker.bitsocial.net',
          data: { type: 'challengeAnswer', challengeAnswers: ['wrong-session'], sessionId: 'session-456' },
        }),
      );
      await Promise.resolve();
    });

    expect(publishChallengeAnswers).not.toHaveBeenCalled();
    expect(useChallengesStore.getState().challenges).toHaveLength(1);
  });

  it('keeps the manual Done fallback closing the iframe challenge', async () => {
    const publishChallengeAnswers = vi.fn();
    useChallengesStore.getState().addChallenge(createIframeChallenge('https://spamblocker.bitsocial.net/api/v1/iframe/session-123', publishChallengeAnswers));
    await renderModal();
    await clickButton('open');

    await clickButton('done');

    expect(publishChallengeAnswers).toHaveBeenCalledWith(['']);
    expect(useChallengesStore.getState().challenges).toHaveLength(0);
  });
});
