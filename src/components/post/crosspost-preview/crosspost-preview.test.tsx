// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CrosspostPreview from './crosspost-preview';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  isCommunityVerified: false,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useCrosspost: () => ({
    author: { address: 'source-author.eth', displayName: 'Source author', nameResolved: false },
    cid: 'source-cid',
    communityAddress: 'source-community.eth',
    content: 'A compact source excerpt',
    isCommunityVerified: testState.isCommunityVerified,
    signature: { publicKey: 'source-public-key' },
    title: 'Source post',
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => createElement('a', { href: to }, children),
}));

let container: HTMLDivElement;
let root: Root;

describe('CrosspostPreview', () => {
  beforeEach(() => {
    testState.isCommunityVerified = false;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderPreview = async () => {
    await act(async () => {
      root.render(createElement(CrosspostPreview, { crosspost: { cid: 'source-cid', comment: {} } }));
    });
  };

  it('renders signed source data without claiming an unverified community origin', async () => {
    await renderPreview();

    expect(container.textContent).toContain('Source post');
    expect(container.textContent).toContain('A compact source excerpt');
    expect(container.textContent).toContain('Source author');
    expect(container.textContent).not.toContain('source-community.eth');
  });

  it('links to the source after its community update is loaded', async () => {
    testState.isCommunityVerified = true;
    await renderPreview();

    const links = Array.from(container.querySelectorAll('a'));
    expect(container.textContent).toContain('s/source-community.bso');
    expect(links.some((link) => link.getAttribute('href')?.includes('source-community.eth') && link.getAttribute('href')?.includes('source-cid'))).toBe(true);
  });
});
