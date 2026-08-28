// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Profile from './profile';

const testState = vi.hoisted(() => ({
  account: { savedComments: ['saved-cid'] },
}));

vi.mock('react-i18next', () => ({
  Trans: () => null,
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  useAccountComments: () => ({ accountComments: [] }),
  useAccountVotes: () => ({ accountVotes: [] }),
  useComment: ({ commentCid }: { commentCid: string }) => ({ cid: commentCid, communityAddress: 'community.eth' }),
}));

vi.mock('../../components/post', () => ({ default: ({ post }: { post: { cid: string } }) => <div data-testid='saved-post'>{post.cid}</div> }));
vi.mock('../../components/reply', () => ({ default: () => null }));

describe('SavedComments', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderSavedComments = async () => {
    await act(async () => {
      root.render(<Profile.SavedComments />);
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    testState.account.savedComments = ['saved-cid'];
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('keeps an unsaved post visible until the saved page is remounted', async () => {
    await renderSavedComments();
    expect(container.querySelector('[data-testid="saved-post"]')?.textContent).toBe('saved-cid');

    testState.account.savedComments = [];
    await renderSavedComments();
    expect(container.querySelector('[data-testid="saved-post"]')?.textContent).toBe('saved-cid');

    await act(async () => root.unmount());
    root = createRoot(container);
    await renderSavedComments();
    expect(container.querySelector('[data-testid="saved-post"]')).toBeNull();
    expect(container.textContent).toContain('nothing_found');
  });
});
