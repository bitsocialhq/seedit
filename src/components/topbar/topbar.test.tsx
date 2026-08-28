// @vitest-environment jsdom

import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunitiesDropdown } from './topbar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => ({ subscriptions: ['manual-community.bso', 'gaming-posting.bso', 'gaming-runner-up.bso'] }),
  useAccountCommunities: () => ({ accountCommunities: {} }),
}));

vi.mock('../../hooks/use-default-subscriptions', () => ({
  useDefaultSubscriptions: () => [{ address: 'gaming-posting.bso', directoryCode: 'gaming', directoryRevision: 1 }],
  useFilteredDefaultSubscriptions: () => [],
}));

vi.mock('../../hooks/use-resolved-community-route', () => ({
  default: () => ({ communityAddress: undefined, directoryCode: undefined }),
}));

vi.mock('../../stores/use-content-options-store', () => ({
  default: () => ({ hideDefaultCommunities: false }),
}));

let container: HTMLDivElement;
let root: Root;

describe('CommunitiesDropdown', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('links current directory winners by code and leaves other subscriptions as raw short addresses', async () => {
    await act(() => root.render(createElement(HashRouter, null, createElement(CommunitiesDropdown))));

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('a'));
    const linksByLabel = Object.fromEntries(links.map((link) => [link.textContent, link.getAttribute('href')]));

    expect(linksByLabel).toMatchObject({
      gaming: '#/s/gaming',
      'gaming-runner-up': '#/s/gaming-runner-up.bso',
      'manual-community': '#/s/manual-community.bso',
    });
  });
});
